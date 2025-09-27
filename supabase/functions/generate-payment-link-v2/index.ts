import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeneratePaymentLinkRequest {
  beneficiario_id: string;
  payment_method?: 'credit_card' | 'bank_slip' | 'pix';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 [GENERATE-PAYMENT-LINK-V2] Function started - Clean version without syntax errors');

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const authToken = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(authToken);

    if (userError || !userData.user) {
      throw new Error('User not authenticated');
    }

    const { beneficiario_id, payment_method = 'credit_card' } = await req.json() as GeneratePaymentLinkRequest;

    if (!beneficiario_id) {
      throw new Error('beneficiario_id is required');
    }

    // Service role client for database operations
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get beneficiary data
    const { data: beneficiario, error: beneficiarioError } = await supabaseService
      .from('beneficiarios')
      .select(`
        *,
        plano:planos(*)
      `)
      .eq('id', beneficiario_id)
      .eq('user_id', userData.user.id)
      .single();

    if (beneficiarioError || !beneficiario) {
      throw new Error('Beneficiário não encontrado ou sem permissão de acesso');
    }

    if (beneficiario.status !== 'ativo') {
      throw new Error('Beneficiário deve estar ativo para gerar link de pagamento');
    }

    // Validate required fields
    if (!beneficiario.nome || !beneficiario.cpf || !beneficiario.email) {
      throw new Error('Beneficiário deve ter nome, CPF e email para gerar link de pagamento');
    }

    if (!beneficiario.plano || !beneficiario.plano.nome) {
      throw new Error('Plano do beneficiário não encontrado');
    }

    if (!beneficiario.valor_plano || beneficiario.valor_plano <= 0) {
      throw new Error('Valor do plano deve ser maior que zero');
    }

    // Validate Vindi plan ID for subscriptions
    const vindiPlanId = (beneficiario.plano as any).vindi_plan_id;
    if (!vindiPlanId) {
      console.error('Plan does not have a valid vindi_plan_id:', beneficiario.plano);
      throw new Error(`O plano "${beneficiario.plano.nome}" não está configurado na Vindi. Por favor, configure o plano de assinatura na Vindi primeiro.`);
    }

    console.log('📋 [PAYMENT-LINK-V2] Beneficiary data:', {
      id: beneficiario.id,
      nome: beneficiario.nome,
      cpf: beneficiario.cpf,
      email: beneficiario.email,
      valor_plano: beneficiario.valor_plano,
      plano_nome: beneficiario.plano.nome,
      vindi_plan_id: vindiPlanId
    });

    // Get Vindi API configuration
    const vindiApiKey = Deno.env.get('VINDI_PRIVATE_KEY') || Deno.env.get('VINDI_API_KEY');
    const vindiEnvironment = Deno.env.get('VINDI_ENVIRONMENT') || 'production';

    if (!vindiApiKey) {
      throw new Error('VINDI_PRIVATE_KEY ou VINDI_API_KEY não configurada');
    }

    const VINDI_API_URLS = {
      sandbox: 'https://sandbox-app.vindi.com.br/api/v1',
      production: 'https://app.vindi.com.br/api/v1'
    };

    const vindiApiUrl = VINDI_API_URLS[vindiEnvironment as keyof typeof VINDI_API_URLS] || VINDI_API_URLS.production;

    console.log(`🔧 [PAYMENT-LINK-V2] Using Vindi ${vindiEnvironment} environment:`, vindiApiUrl);

    // Create Vindi customer if not exists
    let vindiCustomerId: number;

    console.log('🔍 [PAYMENT-LINK-V2] Searching for existing Vindi customer...');

    // Search for existing customer by email
    const customerSearchResponse = await fetch(`${vindiApiUrl}/customers?query[email]=${encodeURIComponent(beneficiario.email)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(vindiApiKey + ':')}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MedPass-Sistema/1.0'
      },
    });

    if (!customerSearchResponse.ok) {
      throw new Error(`Erro ao buscar clientes Vindi: ${customerSearchResponse.status}`);
    }

    const customerSearchData = await customerSearchResponse.json();
    const existingCustomer = customerSearchData.customers?.find(
      (c: any) => c.email === beneficiario.email || c.registry_code === beneficiario.cpf.replace(/[^\d]/g, '')
    );

    if (existingCustomer) {
      console.log('✅ [PAYMENT-LINK-V2] Found existing Vindi customer:', existingCustomer.id);
      vindiCustomerId = existingCustomer.id;
    } else {
      console.log('🆕 [PAYMENT-LINK-V2] Creating new Vindi customer...');

      const newCustomerData = {
        name: beneficiario.nome,
        email: beneficiario.email,
        registry_code: beneficiario.cpf.replace(/[^\d]/g, ''),
        phone: beneficiario.telefone?.replace(/[^\d]/g, '') || '',
        address: {
          street: beneficiario.endereco || '',
          city: beneficiario.cidade || '',
          state: beneficiario.estado || '',
          zipcode: beneficiario.cep?.replace(/[^\d]/g, '') || '',
          country: 'BR'
        }
      };

      console.log('👤 [PAYMENT-LINK-V2] Customer data:', newCustomerData);

      const customerResponse = await fetch(`${vindiApiUrl}/customers`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(vindiApiKey + ':')}`,
          'Content-Type': 'application/json',
          'User-Agent': 'MedPass-Sistema/1.0'
        },
        body: JSON.stringify(newCustomerData),
      });

      const customerResult = await customerResponse.json();
      console.log('👤 [PAYMENT-LINK-V2] Customer creation response:', customerResult);

      if (!customerResponse.ok) {
        throw new Error(`Erro ao criar cliente Vindi: ${JSON.stringify(customerResult)}`);
      }

      if (!customerResult.customer || !customerResult.customer.id) {
        throw new Error('Cliente criado mas ID não retornado pela Vindi');
      }

      vindiCustomerId = customerResult.customer.id;
      console.log('✅ [PAYMENT-LINK-V2] Created new Vindi customer with ID:', vindiCustomerId);
    }

    // Create subscription in Vindi
    console.log('📝 [PAYMENT-LINK-V2] Creating subscription...');

    const vindiSubscriptionPayload = {
      plan_id: Number(vindiPlanId),
      customer_id: vindiCustomerId,
      payment_method_code: payment_method,
      start_at: new Date().toISOString().split('T')[0],
    };

    console.log('📤 [PAYMENT-LINK-V2] Subscription payload:', JSON.stringify(vindiSubscriptionPayload, null, 2));

    const subscriptionResponse = await fetch(`${vindiApiUrl}/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(vindiApiKey + ':')}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MedPass-Sistema/1.0'
      },
      body: JSON.stringify(vindiSubscriptionPayload),
    });

    const subscriptionResult = await subscriptionResponse.json();
    console.log('📝 [PAYMENT-LINK-V2] Subscription response:', subscriptionResult);

    if (!subscriptionResponse.ok) {
      throw new Error(`Erro ao criar assinatura Vindi: ${JSON.stringify(subscriptionResult)}`);
    }

    if (!subscriptionResult.subscription || !subscriptionResult.subscription.id) {
      throw new Error('Assinatura criada mas ID não retornado pela Vindi');
    }

    const vindiSubscriptionId = subscriptionResult.subscription.id;
    console.log('✅ [PAYMENT-LINK-V2] Created subscription with ID:', vindiSubscriptionId);

    // Get payment URL from the first bill
    let paymentUrl = null;
    let vindiChargeId = null;
    let dueDate = null;

    if (subscriptionResult.subscription.bills && subscriptionResult.subscription.bills.length > 0) {
      const firstBill = subscriptionResult.subscription.bills[0];
      if (firstBill.charges && firstBill.charges.length > 0) {
        paymentUrl = firstBill.charges[0].print_url;
        vindiChargeId = firstBill.charges[0].id;
        dueDate = firstBill.due_at;
      }
    }

    if (!paymentUrl) {
      throw new Error('URL de pagamento não foi gerada pela Vindi');
    }

    console.log('✅ [PAYMENT-LINK-V2] Payment URL generated:', paymentUrl);

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      payment_url: paymentUrl,
      vindi_charge_id: vindiChargeId,
      vindi_subscription_id: vindiSubscriptionId,
      vindi_customer_id: vindiCustomerId,
      due_date: dueDate,
      beneficiario_id: beneficiario.id,
      function_version: 'v2-clean'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('❌ [PAYMENT-LINK-V2] Error:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      function_version: 'v2-clean'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});