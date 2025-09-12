import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-VINDI-SUBSCRIPTION] ${step}${detailsStr}`);
};

interface SubscriptionRequest {
  customer: {
    name: string;
    email: string;
    document: string;
    phone?: string;
    birth_date?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      zipcode: string;
    };
  };
  plan_id: string;
  unidade_id?: string;
  empresa_id?: string;
  payment_method: 'credit_card' | 'pix' | 'boleto';
  installments?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get user from JWT token first
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header missing' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: 'User authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep("User authenticated", { userId: userData.user.id });

    const subscriptionRequest: SubscriptionRequest = await req.json();
    logStep("Processing subscription request", { request: subscriptionRequest });

    // Validate required fields
    if (!subscriptionRequest.customer?.name || !subscriptionRequest.customer?.email || !subscriptionRequest.customer?.document) {
      throw new Error('Missing required customer data');
    }

    if (!subscriptionRequest.plan_id) {
      throw new Error('Missing required plan ID');
    }

    const vindiApiKey = Deno.env.get('VINDI_API_KEY');
    if (!vindiApiKey) {
      throw new Error('Vindi API key not configured');
    }

    const vindiBaseUrl = 'https://app.vindi.com.br/api/v1';
    const authVindi = `Basic ${btoa(vindiApiKey + ':')}`;

    // Get plan details from our database to get vindi_plan_id
    const { data: planData, error: planError } = await supabaseClient
      .from('planos')
      .select('*')
      .eq('id', subscriptionRequest.plan_id)
      .single();

    if (planError || !planData?.vindi_plan_id) {
      throw new Error('Plan not found or missing Vindi plan ID. Please configure the plan in Vindi first.');
    }

    logStep("Found plan data", { planName: planData.nome, vindiPlanId: planData.vindi_plan_id });

    // Check if customer already exists in Vindi
    let customerId;
    const existingCustomerResponse = await fetch(
      `${vindiBaseUrl}/customers?query=${encodeURIComponent(subscriptionRequest.customer.email)}`,
      {
        headers: {
          'Authorization': authVindi,
          'Content-Type': 'application/json',
        },
      }
    );

    const existingCustomerData = await existingCustomerResponse.json();
    
    if (existingCustomerData.customers?.length > 0) {
      customerId = existingCustomerData.customers[0].id;
      logStep("Found existing customer", { customerId });
    } else {
      // Create customer in Vindi
      const createCustomerResponse = await fetch(`${vindiBaseUrl}/customers`, {
        method: 'POST',
        headers: {
          'Authorization': authVindi,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: subscriptionRequest.customer.name,
          email: subscriptionRequest.customer.email,
          registry_code: subscriptionRequest.customer.document,
          phone: subscriptionRequest.customer.phone,
          address: subscriptionRequest.customer.address ? {
            street: subscriptionRequest.customer.address.street,
            city: subscriptionRequest.customer.address.city,
            state: subscriptionRequest.customer.address.state,
            zipcode: subscriptionRequest.customer.address.zipcode,
            country: 'BR',
          } : undefined,
        }),
      });

      const customerResult = await createCustomerResponse.json();
      
      if (!createCustomerResponse.ok) {
        logStep("Error creating customer", { error: customerResult });
        throw new Error(customerResult.errors?.[0]?.detail || 'Failed to create customer');
      }

      customerId = customerResult.customer.id;
      logStep("Created new customer", { customerId });
    }

    // Save customer mapping in our database
    await supabaseClient
      .from('vindi_customers')
      .upsert({
        user_id: userData.user.id,
        vindi_customer_id: customerId,
        customer_email: subscriptionRequest.customer.email,
        customer_document: subscriptionRequest.customer.document,
      }, {
        onConflict: 'customer_email'
      });

    logStep("Customer created/found successfully - subscription will be created at payment", { customerId });

    // Generate checkout link
    const checkoutToken = crypto.randomUUID();
    const baseUrl = getBaseUrl(req.url);
    const checkoutLink = `${baseUrl}/subscription-checkout/${checkoutToken}`;

    // Save to pending_adesoes - only customer created, subscription will be created at payment
    const { data: pendingAdesao, error: pendingError } = await supabaseClient
      .from('pending_adesoes')
      .insert({
        user_id: userData.user.id,
        unidade_id: subscriptionRequest.unidade_id,
        plano_id: subscriptionRequest.plan_id,
        empresa_id: subscriptionRequest.empresa_id,
        vindi_customer_id: customerId,
        checkout_link: checkoutLink,
        status: 'pending_customer_created',
        
        // Beneficiary data (temporary)
        nome: subscriptionRequest.customer.name,
        cpf: subscriptionRequest.customer.document,
        email: subscriptionRequest.customer.email,
        telefone: subscriptionRequest.customer.phone || '',
        data_nascimento: subscriptionRequest.customer.birth_date ? new Date(subscriptionRequest.customer.birth_date).toISOString().split('T')[0] : null,
        endereco: subscriptionRequest.customer.address?.street || '',
        cidade: subscriptionRequest.customer.address?.city || '',
        estado: subscriptionRequest.customer.address?.state || '',
        cep: subscriptionRequest.customer.address?.zipcode || '',
        valor_plano: planData.valor,
        observacoes: ''
      })
      .select()
      .single();

    if (pendingError) {
      logStep("Error saving pending adesao", { error: pendingError });
      throw new Error(`Failed to save pending adesao: ${pendingError.message}`);
    }

    logStep("Pending adesao saved successfully", { id: pendingAdesao.id });

    // Save initial subscription record - will be updated when actual Vindi subscription is created
    const { data: subscriptionRecord, error: subscriptionError } = await supabaseClient
      .from('subscriptions')
      .insert({
        user_id: userData.user.id,
        customer_name: subscriptionRequest.customer.name,
        customer_email: subscriptionRequest.customer.email,
        customer_document: subscriptionRequest.customer.document,
        payment_method: subscriptionRequest.payment_method,
        plan_id: subscriptionRequest.plan_id,
        status: 'pending_customer_created',
        metadata: {
          plan_name: planData.nome,
          plan_price: planData.valor,
          vindi_customer_id: customerId,
          vindi_plan_id: planData.vindi_plan_id,
          vindi_product_id: planData.vindi_product_id,
          original_request: subscriptionRequest,
          pending_adesao_id: pendingAdesao.id
        },
        installments: subscriptionRequest.installments || 1,
        checkout_link: checkoutLink
      })
      .select()
      .single();

    if (subscriptionError) {
      logStep("Error saving subscription", { error: subscriptionError });
      throw new Error('Failed to save subscription');
    }

    // Save checkout link
    await supabaseClient.from("subscription_checkout_links").insert({
      subscription_id: subscriptionRecord.id,
      token: checkoutToken,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    });

    logStep("Subscription record saved - ready for checkout", { subscriptionId: subscriptionRecord.id });

    // Prepare response - customer created, ready for checkout
    let responseData: any = {
      success: true,
      vindi_customer_id: customerId,
      vindi_plan_id: planData.vindi_plan_id,
      vindi_product_id: planData.vindi_product_id,
      checkout_url: checkoutLink,
      token: checkoutToken,
      pending_adesao_id: pendingAdesao.id,
      plan_name: planData.nome,
      plan_price: planData.valor,
      status: 'pending_customer_created'
    };

    logStep("Response prepared", { responseData });

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    logStep("Subscription processing error", { error: error.message });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Helper function to determine base URL
function getBaseUrl(requestUrl: string): string {
  const url = new URL(requestUrl);
  
  // Localhost development
  if (url.hostname.includes('localhost') || url.hostname.includes('127.0.0.1')) {
    return url.origin;
  }
  
  // Lovable preview environment
  if (url.hostname.includes('lovableproject.com')) {
    return url.origin;
  }
  
  // Production
  return 'https://www.medpassbeneficios.com.br';
}