import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Logging utility  
function logStep(message: string, data?: any) {
  console.log(`[VINDI-HOSTED-SUBSCRIPTION] ${message}${data ? ` - ${JSON.stringify(data)}` : ''}`);
}

// Interface for subscription request
interface SubscriptionRequest {
  customer_name: string;
  customer_email: string;
  customer_document: string;
  customer_phone?: string;
  plan_id: string;
  payment_method: 'credit_card' | 'bank_slip';
  gateway_token?: string; // For encrypted card data
  installments?: number;
  environment?: 'sandbox' | 'production';
}

// Vindi hosted URLs
const VINDI_HOSTED_URLS = {
  sandbox: 'https://sandbox-app.vindi.com.br/api/v1',
  production: 'https://app.vindi.com.br/api/v1'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Function started');

    // Get environment variables
    const vindiPrivateKey = Deno.env.get('VINDI_PRIVATE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!vindiPrivateKey) {
      throw new Error('Chave privada Vindi não configurada');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuração Supabase não encontrada');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Parse request body
    const requestData: SubscriptionRequest = await req.json();
    logStep('Received subscription request', { 
      email: requestData.customer_email, 
      plan_id: requestData.plan_id,
      payment_method: requestData.payment_method 
    });

    // Validate required fields
    if (!requestData.customer_name || !requestData.customer_email || !requestData.customer_document || !requestData.plan_id) {
      throw new Error('Dados obrigatórios não fornecidos');
    }

    if (requestData.payment_method === 'credit_card' && !requestData.gateway_token) {
      throw new Error('Gateway token obrigatório para pagamento com cartão');
    }

    // Get plan details from Supabase
    const { data: planData, error: planError } = await supabaseClient
      .from('planos')
      .select('*')
      .eq('id', requestData.plan_id)
      .single();

    if (planError || !planData) {
      throw new Error('Plano não encontrado');
    }

    if (!planData.vindi_plan_id) {
      throw new Error('Plano não configurado na Vindi');
    }

    logStep('Plan found', { name: planData.nome, vindi_plan_id: planData.vindi_plan_id });

    // Get API URL
    const apiUrl = VINDI_HOSTED_URLS[requestData.environment || 'production'];

    // Create/get customer via vindi-hosted-customer function
    const customerResult = await supabaseClient.functions.invoke('vindi-hosted-customer', {
      body: {
        name: requestData.customer_name,
        email: requestData.customer_email,
        registry_code: requestData.customer_document,
        phone: requestData.customer_phone,
        environment: requestData.environment || 'production'
      }
    });

    if (customerResult.error || !customerResult.data?.success) {
      throw new Error(`Erro ao criar cliente: ${customerResult.error?.message || 'Erro desconhecido'}`);
    }

    const vindiCustomerId = customerResult.data.vindi_customer_id;
    logStep('Customer ready', { vindi_customer_id: vindiCustomerId });

    // Create subscription in Vindi
    const subscriptionData: any = {
      plan_id: Number(planData.vindi_plan_id),
      customer_id: vindiCustomerId,
      payment_method_code: requestData.payment_method === 'credit_card' ? 'credit_card' : 'bank_slip',
      start_at: new Date().toISOString().split('T')[0],
    };

    if (requestData.payment_method === 'credit_card') {
      subscriptionData.installments = requestData.installments || 1;
    }

    logStep('Creating Vindi subscription', subscriptionData);

    const subscriptionResponse = await fetch(`${apiUrl}/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(vindiPrivateKey + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscription: subscriptionData }),
    });

    if (!subscriptionResponse.ok) {
      const errorText = await subscriptionResponse.text();
      throw new Error(`Erro ao criar assinatura: ${subscriptionResponse.status} - ${errorText}`);
    }

    const subscriptionResult = await subscriptionResponse.json();
    
    if (!subscriptionResult.subscription || !subscriptionResult.subscription.id) {
      throw new Error('Assinatura criada mas ID não retornado');
    }

    const vindiSubscriptionId = subscriptionResult.subscription.id;
    logStep('Subscription created', { id: vindiSubscriptionId });

    // Create bill for immediate payment
    const billData: any = {
      customer_id: vindiCustomerId,
      payment_method_code: requestData.payment_method === 'credit_card' ? 'credit_card' : 'bank_slip',
      bill_items: [
        {
          product_id: planData.vindi_product_id,
          quantity: 1,
          pricing_range_id: planData.vindi_plan_id
        }
      ]
    };

    if (requestData.payment_method === 'credit_card') {
      billData.installments = requestData.installments || 1;
      if (requestData.gateway_token) {
        billData.payment_profile = {
          gateway_token: requestData.gateway_token
        };
      }
    }

    logStep('Creating bill', billData);

    const billResponse = await fetch(`${apiUrl}/bills`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(vindiPrivateKey + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bill: billData }),
    });

    const billResult = await billResponse.json();
    
    if (!billResponse.ok) {
      logStep('Bill creation failed', { status: billResponse.status, error: billResult });
      throw new Error(`Erro ao criar cobrança: ${JSON.stringify(billResult)}`);
    }

    logStep('Bill created', { id: billResult.bill?.id });

    // Save subscription to database
    const { error: subscriptionError } = await supabaseClient
      .from('subscriptions')
      .insert({
        customer_name: requestData.customer_name,
        customer_email: requestData.customer_email,
        customer_document: requestData.customer_document,
        plan_id: requestData.plan_id,
        payment_method: requestData.payment_method,
        status: 'active',
        vindi_subscription_id: vindiSubscriptionId,
        vindi_plan_id: Number(planData.vindi_plan_id),
        start_date: new Date().toISOString().split('T')[0],
        installments: requestData.installments || 1,
        metadata: {
          plan_name: planData.nome,
          plan_price: planData.valor,
          vindi_customer_id: vindiCustomerId,
          vindi_product_id: planData.vindi_product_id
        }
      });

    if (subscriptionError) {
      logStep('Warning: Failed to save subscription', { error: subscriptionError });
    }

    // Save transaction
    const transactionData: any = {
      customer_name: requestData.customer_name,
      customer_email: requestData.customer_email,
      customer_document: requestData.customer_document,
      plan_id: requestData.plan_id,
      plan_name: planData.nome,
      plan_price: planData.valor,
      payment_method: requestData.payment_method,
      status: requestData.payment_method === 'credit_card' ? 'processing' : 'pending',
      vindi_subscription_id: vindiSubscriptionId,
      installments: requestData.installments || 1,
      transaction_type: 'subscription',
      vindi_response: { subscription: subscriptionResult, bill: billResult }
    };

    if (billResult.bill?.id) {
      transactionData.vindi_charge_id = billResult.bill.id.toString();
    }

    const { error: transactionError } = await supabaseClient
      .from('transactions')
      .insert(transactionData);

    if (transactionError) {
      logStep('Warning: Failed to save transaction', { error: transactionError });
    }

    // For credit card payments, try to process immediately if confirmed
    if (requestData.payment_method === 'credit_card' && billResult.bill?.status === 'paid') {
      logStep('Payment confirmed immediately, notifying RMS');
      
      // Trigger RMS notification
      await supabaseClient.functions.invoke('notify-external-api', {
        body: {
          type: 'adesao',
          subscription_id: vindiSubscriptionId,
          customer_data: {
            name: requestData.customer_name,
            email: requestData.customer_email,
            document: requestData.customer_document
          }
        }
      });
    }

    // Prepare response
    const response: any = {
      success: true,
      subscription_id: vindiSubscriptionId,
      customer_id: vindiCustomerId,
      plan_name: planData.nome,
      plan_price: planData.valor,
      payment_method: requestData.payment_method,
      status: requestData.payment_method === 'credit_card' ? 'processing' : 'pending'
    };

    // Add payment-specific details
    if (billResult.bill?.charges && billResult.bill.charges.length > 0) {
      const charge = billResult.bill.charges[0];
      
      if (requestData.payment_method === 'bank_slip') {
        response.payment_url = charge.print_url;
        response.due_date = billResult.bill.due_at;
      } else if (requestData.payment_method === 'credit_card') {
        response.charge_status = charge.status;
        
        if (charge.last_transaction?.gateway_response_fields?.qr_code) {
          response.pix_qr_code = charge.last_transaction.gateway_response_fields.qr_code;
          response.pix_qr_code_url = charge.last_transaction.gateway_response_fields.qr_code_url;
        }
      }
    }

    logStep('Subscription process completed successfully');

    return new Response(JSON.stringify(response), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      }
    });

  } catch (error) {
    logStep('ERROR in vindi-hosted-subscription', { message: error.message });
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Erro interno do servidor'
    }), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      }
    });
  }
});