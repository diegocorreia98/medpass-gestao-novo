import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧪 [TEST-VINDI] Iniciando teste simples da API Vindi');

    // Usar chaves diretas para teste
    const vindiApiKey = Deno.env.get('VINDI_PRIVATE_KEY') || Deno.env.get('VINDI_API_KEY');
    const vindiEnvironment = Deno.env.get('VINDI_ENVIRONMENT') || 'production';

    if (!vindiApiKey) {
      throw new Error('Chave Vindi não configurada');
    }

    const vindiApiUrl = vindiEnvironment === 'sandbox'
      ? 'https://sandbox-app.vindi.com.br/api/v1'
      : 'https://app.vindi.com.br/api/v1';

    console.log('🔧 [TEST-VINDI] Environment:', vindiEnvironment);
    console.log('🔧 [TEST-VINDI] API URL:', vindiApiUrl);
    console.log('🔧 [TEST-VINDI] API Key length:', vindiApiKey.length);

    // Teste 1: Criar cliente simples
    const customerData = {
      name: "Diego Beu Correia TESTE",
      email: "diego.teste@medpass.com.br",
      registry_code: "08600756995",
      phone: "11999999999"
    };

    console.log('👤 [TEST-VINDI] Criando cliente teste:', customerData);

    const customerResponse = await fetch(`${vindiApiUrl}/customers`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(vindiApiKey + ':')}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MedPass-Test/1.0'
      },
      body: JSON.stringify(customerData)
    });

    console.log('👤 [TEST-VINDI] Customer response status:', customerResponse.status);

    const customerResult = await customerResponse.json();
    console.log('👤 [TEST-VINDI] Customer response:', JSON.stringify(customerResult, null, 2));

    if (!customerResponse.ok) {
      throw new Error(`Erro ao criar cliente: ${JSON.stringify(customerResult)}`);
    }

    const customerId = customerResult.customer?.id;
    if (!customerId) {
      throw new Error('Cliente criado mas ID não retornado');
    }

    console.log('✅ [TEST-VINDI] Cliente criado com ID:', customerId);

    // Teste 2: Criar assinatura simples com dados hardcoded
    const subscriptionData = {
      plan_id: 539682, // ID real do plano Individual
      customer_id: customerId,
      payment_method_code: "bank_slip",
      start_at: new Date().toISOString().split('T')[0]
    };

    console.log('📝 [TEST-VINDI] Criando assinatura:', subscriptionData);

    const subscriptionResponse = await fetch(`${vindiApiUrl}/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(vindiApiKey + ':')}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MedPass-Test/1.0'
      },
      body: JSON.stringify(subscriptionData)
    });

    console.log('📝 [TEST-VINDI] Subscription response status:', subscriptionResponse.status);

    const subscriptionResult = await subscriptionResponse.json();
    console.log('📝 [TEST-VINDI] Subscription response:', JSON.stringify(subscriptionResult, null, 2));

    // Resultado final
    const result = {
      success: true,
      test_results: {
        customer_creation: {
          status: customerResponse.status,
          ok: customerResponse.ok,
          customer_id: customerId
        },
        subscription_creation: {
          status: subscriptionResponse.status,
          ok: subscriptionResponse.ok,
          subscription_id: subscriptionResult.subscription?.id,
          subscription_status: subscriptionResult.subscription?.status
        }
      },
      raw_responses: {
        customer: customerResult,
        subscription: subscriptionResult
      },
      environment: vindiEnvironment,
      timestamp: new Date().toISOString()
    };

    console.log('🎉 [TEST-VINDI] Teste concluído:', result.success ? 'SUCESSO' : 'FALHA');

    return new Response(
      JSON.stringify(result, null, 2),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ [TEST-VINDI] Erro:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});