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

    // Get Vindi API key from secrets
    const vindiApiKey = Deno.env.get('VINDI_API_KEY');

    if (!vindiApiKey) {
      throw new Error('Chave API Vindi não configurada');
    }

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
        const billsResponse = await fetch(`https://app.vindi.com.br/api/v1/bills?query=subscription_id:${subscriptionId} AND status:pending`, {
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
    const customerSearchResponse = await fetch('https://app.vindi.com.br/api/v1/customers', {
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

      const customerResponse = await fetch('https://app.vindi.com.br/api/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(vindiApiKey + ':')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customer: customerData }),
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

    // Create subscription in Vindi
    const subscriptionData = {
      plan_id: Number(vindiPlanId),
      customer_id: vindiCustomerId,
      payment_method_code: payment_method,
      start_at: new Date().toISOString().split('T')[0],
    };

    console.log('Creating subscription with data:', JSON.stringify(subscriptionData, null, 2));

    const subscriptionResponse = await fetch('https://app.vindi.com.br/api/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(vindiApiKey + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscription: subscriptionData }),
    });

    const subscriptionResult = await subscriptionResponse.json();
    console.log('Subscription creation response:', subscriptionResult);
    
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

    if (subscriptionResult.subscription.bills && subscriptionResult.subscription.bills.length > 0) {
      const firstBill = subscriptionResult.subscription.bills[0];
      if (firstBill.charges && firstBill.charges.length > 0) {
        paymentUrl = firstBill.charges[0].print_url;
        vindiChargeId = firstBill.charges[0].id;
        dueDate = firstBill.due_at;
      }
    }

    if (!paymentUrl) {
      // Try to fetch the bills for this subscription
      console.log('No bill found in subscription response, fetching bills...');
      const billsResponse = await fetch(`https://app.vindi.com.br/api/v1/bills?query=subscription_id:${vindiSubscriptionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(vindiApiKey + ':')}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (billsResponse.ok) {
        const billsData = await billsResponse.json();
        if (billsData.bills && billsData.bills.length > 0) {
          const latestBill = billsData.bills[0];
          if (latestBill.charges && latestBill.charges.length > 0) {
            paymentUrl = latestBill.charges[0].print_url;
            vindiChargeId = latestBill.charges[0].id;
            dueDate = latestBill.due_at;
          }
        }
      }
    }

    if (!paymentUrl) {
      throw new Error('URL de pagamento não retornada pela Vindi');
    }

    if (!paymentUrl) {
      throw new Error('URL de pagamento não foi gerada pela assinatura Vindi');
    }

    console.log('Payment link generated successfully from subscription:', paymentUrl);

    // Save subscription to database
    const { error: subscriptionError } = await supabaseService
      .from('subscriptions')
      .insert({
        user_id: userData.user.id,
        customer_name: beneficiario.nome,
        customer_email: beneficiario.email,
        customer_document: beneficiario.cpf,
        plan_id: beneficiario.plano.id,
        payment_method: payment_method,
        status: 'active',
        vindi_subscription_id: vindiSubscriptionId,
        vindi_plan_id: Number(vindiPlanId),
        start_date: new Date().toISOString().split('T')[0],
        metadata: {
          plan_name: beneficiario.plano.nome,
          plan_price: beneficiario.valor_plano
        }
      });

    if (subscriptionError) {
      console.error('Error saving subscription:', subscriptionError);
    }

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

    return new Response(JSON.stringify({
      success: true,
      payment_url: paymentUrl,
      vindi_charge_id: vindiChargeId,
      vindi_subscription_id: vindiSubscriptionId,
      due_date: dueDate,
      subscription_created: true
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