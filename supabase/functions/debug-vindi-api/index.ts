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
    console.log('🔍 [DEBUG-VINDI] Iniciando debug da API Vindi');

    // Verificar variáveis de ambiente
    const vindiApiKey = Deno.env.get('VINDI_PRIVATE_KEY') || Deno.env.get('VINDI_API_KEY');
    const vindiEnvironment = Deno.env.get('VINDI_ENVIRONMENT') || 'production';

    console.log('🔧 [DEBUG-VINDI] Environment:', vindiEnvironment);
    console.log('🔧 [DEBUG-VINDI] API Key exists:', !!vindiApiKey);
    console.log('🔧 [DEBUG-VINDI] API Key length:', vindiApiKey?.length || 0);

    if (!vindiApiKey) {
      throw new Error('VINDI_PRIVATE_KEY não configurada');
    }

    const VINDI_API_URLS = {
      sandbox: 'https://sandbox-app.vindi.com.br/api/v1',
      production: 'https://app.vindi.com.br/api/v1'
    };

    const vindiApiUrl = VINDI_API_URLS[vindiEnvironment as keyof typeof VINDI_API_URLS];
    console.log('🌐 [DEBUG-VINDI] API URL:', vindiApiUrl);

    // Teste 1: Listar planos
    console.log('📋 [DEBUG-VINDI] Testando GET /plans');
    const plansResponse = await fetch(`${vindiApiUrl}/plans`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(vindiApiKey + ':')}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MedPass-Debug/1.0'
      }
    });

    console.log('📋 [DEBUG-VINDI] Plans response status:', plansResponse.status);

    let plansData = null;
    if (plansResponse.ok) {
      plansData = await plansResponse.json();
      console.log('📋 [DEBUG-VINDI] Plans found:', plansData.plans?.length || 0);

      // Verificar se nossos planos existem
      const plan539682 = plansData.plans?.find((p: any) => p.id === 539682);
      const plan539703 = plansData.plans?.find((p: any) => p.id === 539703);

      console.log('📋 [DEBUG-VINDI] Plan 539682 exists:', !!plan539682);
      console.log('📋 [DEBUG-VINDI] Plan 539703 exists:', !!plan539703);
    } else {
      const errorText = await plansResponse.text();
      console.error('❌ [DEBUG-VINDI] Plans error:', errorText);
    }

    // Teste 2: Testar criação de assinatura com dados mínimos
    console.log('📝 [DEBUG-VINDI] Testando criação de assinatura');

    const testSubscriptionData = {
      plan_id: 539682,
      customer_id: 999999, // ID inexistente para testar erro específico
      payment_method_code: 'bank_slip'
    };

    console.log('📤 [DEBUG-VINDI] Enviando subscription test:', testSubscriptionData);

    const testSubResponse = await fetch(`${vindiApiUrl}/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(vindiApiKey + ':')}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MedPass-Debug/1.0'
      },
      body: JSON.stringify(testSubscriptionData)
    });

    console.log('📝 [DEBUG-VINDI] Test subscription response status:', testSubResponse.status);

    const testSubResult = await testSubResponse.json();
    console.log('📝 [DEBUG-VINDI] Test subscription response:', JSON.stringify(testSubResult, null, 2));

    // Resposta com dados de debug
    const debugResult = {
      success: true,
      environment: vindiEnvironment,
      api_url: vindiApiUrl,
      api_key_configured: !!vindiApiKey,
      api_key_length: vindiApiKey?.length || 0,
      plans_response: {
        status: plansResponse.status,
        ok: plansResponse.ok,
        plans_count: plansData?.plans?.length || 0,
        plan_539682_exists: !!plansData?.plans?.find((p: any) => p.id === 539682),
        plan_539703_exists: !!plansData?.plans?.find((p: any) => p.id === 539703)
      },
      test_subscription: {
        status: testSubResponse.status,
        ok: testSubResponse.ok,
        response: testSubResult
      },
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(debugResult, null, 2),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ [DEBUG-VINDI] Erro:', error);

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