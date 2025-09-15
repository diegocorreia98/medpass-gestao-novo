import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeneratePaymentLinkRequest {
  beneficiario_id: string;
  payment_method?: 'credit_card' | 'bank_slip';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 [GENERATE-PAYMENT-LINK] Function updated - Version 2.1 - Syntax Fixed');
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

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error('User not authenticated');
    }

    const { beneficiario_id, payment_method = 'bank_slip' } = await req.json() as GeneratePaymentLinkRequest;

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

    console.log('Generating payment link for beneficiario:', {
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

    // ✅ SANDBOX SUPPORT: Dynamic API URLs
    const VINDI_API_URLS = {
      sandbox: 'https://sandbox-app.vindi.com.br/api/v1',
      production: 'https://app.vindi.com.br/api/v1'
    };
    
    const vindiApiUrl = VINDI_API_URLS[vindiEnvironment as keyof typeof VINDI_API_URLS] || VINDI_API_URLS.production;
    
    console.log(`🔧 Using Vindi ${vindiEnvironment} environment:`, vindiApiUrl);

    // Check if there's already an active subscription
    const { data: existingSubscriptions } = await supabaseService
      .from('subscriptions')
      .select('*')
      .eq('customer_document', beneficiario.cpf)
      .eq('status', 'active');

    if (existingSubscriptions && existingSubscriptions.length > 0) {
      // Check for pending bills in the existing subscription
      const subscriptionId = existingSubscriptions[0].vindi_subscription_id;
      
      if (subscriptionId) {
        console.log('Found existing subscription, checking for pending bills...');
        const billsResponse = await fetch(`${vindiApiUrl}/bills?query=subscription_id:${subscriptionId} AND status:pending`, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${btoa(vindiApiKey + ':')}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (billsResponse.ok) {
          const billsData = await billsResponse.json();
          if (billsData.bills && billsData.bills.length > 0) {
            const pendingBill = billsData.bills[0];
            if (pendingBill.charges && pendingBill.charges.length > 0) {
              const paymentUrl = pendingBill.charges[0].print_url;
              if (paymentUrl) {
                console.log('Returning existing payment link from active subscription');
                return new Response(JSON.stringify({
                  success: true,
                  payment_url: paymentUrl,
                  vindi_charge_id: pendingBill.charges[0].id,
                  due_date: pendingBill.due_at,
                  subscription_id: subscriptionId
                }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  status: 200,
                });
              }
            }
          }
        }
      }
    }

    // Create Vindi customer if not exists
    let vindiCustomerId: number;
    
    console.log('Searching for existing Vindi customer...');
    const customerSearchResponse = await fetch(`${vindiApiUrl}/customers`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(vindiApiKey + ':')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!customerSearchResponse.ok) {
      throw new Error(`Erro ao buscar clientes Vindi: ${customerSearchResponse.status}`);
    }

    const customerSearchData = await customerSearchResponse.json();
    const existingCustomer = customerSearchData.customers?.find(
      (c: any) => c.email === beneficiario.email || c.registry_code === beneficiario.cpf
    );

    if (existingCustomer) {
      console.log('Found existing Vindi customer:', existingCustomer.id);
      vindiCustomerId = existingCustomer.id;
    } else {
      console.log('Creating new Vindi customer...');
      // Create new customer
      const customerData = {
        name: beneficiario.nome,
        email: beneficiario.email,
        registry_code: beneficiario.cpf,
        phone: beneficiario.telefone || '',
        address: {
          street: beneficiario.endereco || '',
          city: beneficiario.cidade || '',
          state: beneficiario.estado || '',
          zipcode: beneficiario.cep || '',
          country: 'BR'
        }
      };

      console.log('Customer data:', customerData);

      const customerResponse = await fetch(`${vindiApiUrl}/customers`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(vindiApiKey + ':')}`,
          'Content-Type': 'application/json',
          'User-Agent': 'MedPass-Sistema/1.0'
        },
        body: JSON.stringify(customerData),
      });

      const customerResult = await customerResponse.json();
      console.log('Customer creation response:', customerResult);
      
      if (!customerResponse.ok) {
        throw new Error(`Erro ao criar cliente Vindi: ${JSON.stringify(customerResult)}`);
      }

      if (!customerResult.customer || !customerResult.customer.id) {
        throw new Error('Cliente criado mas ID não retornado pela Vindi');
      }

      vindiCustomerId = customerResult.customer.id;
      console.log('Created new Vindi customer with ID:', vindiCustomerId);
    }

    // Ensure we have a valid customer ID before proceeding
    if (!vindiCustomerId) {
      throw new Error('Não foi possível obter ID do cliente Vindi');
    }

    // Debug: Log all values before creating subscription
    console.log('🔍 [DEBUG] Values before subscription creation:');
    console.log('  - vindiPlanId:', vindiPlanId, '(type:', typeof vindiPlanId, ')');
    console.log('  - vindiCustomerId:', vindiCustomerId, '(type:', typeof vindiCustomerId, ')');
    console.log('  - payment_method:', payment_method, '(type:', typeof payment_method, ')');

    // Create subscription in Vindi
    const subscriptionData = {
      plan_id: Number(vindiPlanId),
      customer_id: vindiCustomerId,
      payment_method_code: payment_method,
      start_at: new Date().toISOString().split('T')[0],
    };

    console.log('🚀 [DEBUG] Final subscription data:', JSON.stringify(subscriptionData, null, 2));
    console.log('🌐 [DEBUG] Sending to URL:', `${vindiApiUrl}/subscriptions`);

    const subscriptionResponse = await fetch(`${vindiApiUrl}/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(vindiApiKey + ':')}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MedPass-Sistema/1.0'
      },
      body: JSON.stringify(subscriptionData),
    });

    const subscriptionResult = await subscriptionResponse.json();
    console.log('🔍 [VINDI-DEBUG] Complete subscription response:', JSON.stringify(subscriptionResult, null, 2));

    // Check if there's a bill with URL directly in the response
    let billFromResponse = null;
    if (subscriptionResult.bill && subscriptionResult.bill.url) {
      billFromResponse = subscriptionResult.bill;
      console.log('✅ [BILL-URL] Found bill URL in response:', billFromResponse.url);
    }

    if (!subscriptionResponse.ok) {
      throw new Error(`Erro ao criar assinatura Vindi: ${JSON.stringify(subscriptionResult)}`);
    }

    if (!subscriptionResult.subscription || !subscriptionResult.subscription.id) {
      throw new Error('Assinatura criada mas ID não retornado pela Vindi');
    }

    const vindiSubscriptionId = subscriptionResult.subscription.id;
    console.log('Created subscription with ID:', vindiSubscriptionId);

    // The subscription automatically generates a bill - get it
    let paymentUrl = null;
    let vindiChargeId = null;
    let dueDate = null;

    console.log('🔍 [BILL-DEBUG] Checking subscription for bills...');
    console.log('🔍 [BILL-DEBUG] subscription.bills exists:', !!subscriptionResult.subscription.bills);
    console.log('🔍 [BILL-DEBUG] subscription.bills length:', subscriptionResult.subscription.bills?.length || 0);

    if (subscriptionResult.subscription.bills && subscriptionResult.subscription.bills.length > 0) {
      const firstBill = subscriptionResult.subscription.bills[0];
      console.log('🔍 [BILL-DEBUG] First bill structure:', JSON.stringify(firstBill, null, 2));
      console.log('🔍 [BILL-DEBUG] First bill charges exists:', !!firstBill.charges);
      console.log('🔍 [BILL-DEBUG] First bill charges length:', firstBill.charges?.length || 0);

      if (firstBill.charges && firstBill.charges.length > 0) {
        const firstCharge = firstBill.charges[0];
        console.log('🔍 [BILL-DEBUG] First charge structure:', JSON.stringify(firstCharge, null, 2));

        paymentUrl = firstCharge.print_url;
        vindiChargeId = firstCharge.id;
        dueDate = firstBill.due_at;

        console.log('🔍 [BILL-DEBUG] Extracted payment data:', {
          paymentUrl,
          vindiChargeId,
          dueDate
        });
      }
    }

    if (!paymentUrl) {
      // Try to fetch the bills for this subscription
      console.log('🔍 [BILLS-SEARCH] No bill found in subscription response, fetching bills...');
      const billsResponse = await fetch(`${vindiApiUrl}/bills?query=subscription_id:${vindiSubscriptionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(vindiApiKey + ':')}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('🔍 [BILLS-SEARCH] Bills search response status:', billsResponse.status);

      if (billsResponse.ok) {
        const billsData = await billsResponse.json();
        console.log('🔍 [BILLS-SEARCH] Bills search data:', JSON.stringify(billsData, null, 2));
        console.log('🔍 [BILLS-SEARCH] Bills found:', billsData.bills?.length || 0);

        if (billsData.bills && billsData.bills.length > 0) {
          const latestBill = billsData.bills[0];
          console.log('🔍 [BILLS-SEARCH] Latest bill structure:', JSON.stringify(latestBill, null, 2));

          if (latestBill.charges && latestBill.charges.length > 0) {
            paymentUrl = latestBill.charges[0].print_url;
            vindiChargeId = latestBill.charges[0].id;
            dueDate = latestBill.due_at;

            console.log('🔍 [BILLS-SEARCH] Extracted payment data from search:', {
              paymentUrl,
              vindiChargeId,
              dueDate
            });
          }
        }
      } else {
        console.log('🔍 [BILLS-SEARCH] Bills search failed:', billsResponse.status, billsResponse.statusText);
      }
    }

    // ✅ FALLBACK: Use bill URL if no charge print_url found
    if (!paymentUrl && billFromResponse && billFromResponse.url) {
      paymentUrl = billFromResponse.url;
      vindiChargeId = billFromResponse.charges?.[0]?.id || null;
      dueDate = billFromResponse.due_at;
      console.log('✅ [BILL-URL-FALLBACK] Using bill URL as payment URL:', {
        paymentUrl,
        vindiChargeId,
        dueDate
      });
    }

    if (!paymentUrl) {
      console.log('❌ [ERROR] No payment URL found anywhere:', {
        subscriptionBills: !!subscriptionResult.subscription.bills,
        billFromResponse: !!billFromResponse,
        billUrl: billFromResponse?.url
      });
      throw new Error('URL de pagamento não retornada pela Vindi');
    }

    if (!paymentUrl) {
      throw new Error('URL de pagamento não foi gerada pela assinatura Vindi');
    }

    console.log('Payment link generated successfully from subscription:', paymentUrl);

    // ✅ STEP 1: Save subscription to database
    const { data: subscriptionRecord, error: subscriptionError } = await supabaseService
      .from('subscriptions')
      .insert({
        user_id: userData.user.id,
        customer_name: beneficiario.nome,
        customer_email: beneficiario.email,
        customer_document: beneficiario.cpf,
        plan_id: beneficiario.plano.id,
        payment_method: payment_method,
        status: 'pending_payment', // Pending until payment is confirmed
        vindi_subscription_id: vindiSubscriptionId,
        vindi_plan_id: Number(vindiPlanId),
        start_date: new Date().toISOString().split('T')[0],
        installments: 1,
        metadata: {
          plan_name: beneficiario.plano.nome,
          plan_price: beneficiario.valor_plano,
          generated_from: 'generate-payment-link'
        }
      })
      .select()
      .single();

    if (subscriptionError) {
      console.error('❌ Error saving subscription:', subscriptionError);
      throw new Error('Erro ao salvar assinatura: ' + subscriptionError.message);
    }

    console.log('✅ Subscription saved with ID:', subscriptionRecord.id);

    // ✅ STEP 2: Generate and save checkout link token
    const checkoutToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const { error: linkError } = await supabaseService
      .from('subscription_checkout_links')
      .insert({
        subscription_id: subscriptionRecord.id,
        token: checkoutToken,
        expires_at: expiresAt.toISOString(),
        is_used: false
      });

    if (linkError) {
      console.error('❌ Error saving checkout link:', linkError);
      throw new Error('Erro ao salvar link de checkout: ' + linkError.message);
    }

    console.log('✅ Checkout link saved with token:', checkoutToken);

    // Save transaction for the bill generated by the subscription
    if (vindiChargeId) {
      const { error: transactionError } = await supabaseService
        .from('transactions')
        .insert({
          user_id: userData.user.id,
          beneficiario_id: beneficiario_id,
          subscription_id: vindiSubscriptionId,
          vindi_subscription_id: vindiSubscriptionId,
          plan_id: beneficiario.plano.id.toString(),
          plan_name: beneficiario.plano.nome,
          plan_price: beneficiario.valor_plano,
          payment_method: payment_method,
          status: 'pending',
          customer_name: beneficiario.nome,
          customer_email: beneficiario.email,
          customer_document: beneficiario.cpf,
          vindi_charge_id: vindiChargeId.toString(),
          transaction_type: 'subscription',
          vindi_response: subscriptionResult,
        });

      if (transactionError) {
        console.error('Error saving transaction:', transactionError);
      }
    }

    // Update beneficiary with subscription info
    const { error: updateError } = await supabaseService
      .from('beneficiarios')
      .update({ 
        payment_status: 'payment_requested'
      })
      .eq('id', beneficiario_id);

    if (updateError) {
      console.error('Error updating beneficiary:', updateError);
    }

    // ✅ STEP 3: Create checkout URL for the client
    const baseUrl = req.headers.get('origin') || 'http://localhost:8082';
    const checkoutUrl = `${baseUrl}/subscription-checkout/${checkoutToken}`;

    // ✅ STEP 4: Update beneficiary with both URLs
    const { error: finalUpdateError } = await supabaseService
      .from('beneficiarios')
      .update({ 
        checkout_link: checkoutUrl,
        vindi_payment_url: paymentUrl // Backup direct Vindi URL
      })
      .eq('id', beneficiario_id);

    if (finalUpdateError) {
      console.warn('⚠️ Error updating beneficiary with URLs:', finalUpdateError);
    }

    console.log('✅ Payment link generation completed successfully');

    return new Response(JSON.stringify({
      success: true,
      payment_url: paymentUrl, // Direct Vindi URL
      checkout_url: checkoutUrl, // Our checkout page URL
      checkout_token: checkoutToken, // Token for checkout validation
      vindi_charge_id: vindiChargeId,
      vindi_subscription_id: vindiSubscriptionId,
      subscription_id: subscriptionRecord.id,
      due_date: dueDate,
      expires_at: expiresAt.toISOString(),
      subscription_created: true,
      checkout_link_created: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in generate-payment-link:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Erro interno do servidor' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});