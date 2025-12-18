import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SECURE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Iniciando validação segura de checkout");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { token } = await req.json();
    if (!token) {
      throw new Error("Token de checkout não fornecido");
    }

    logStep("Validando token de checkout", { token: token.substring(0, 8) + "..." });

    // Usar a função segura que mascara dados sensíveis
    const { data, error } = await supabaseClient
      .rpc('get_checkout_subscription', { checkout_token: token });

    if (error) {
      logStep("Erro ao validar token", error);
      throw new Error(`Erro na validação: ${error.message}`);
    }

    if (!data || data.length === 0) {
      logStep("Token inválido ou expirado");
      throw new Error("Link de pagamento inválido ou expirado");
    }

    const subscriptionData = data[0];
    logStep("Dados de checkout validados com sucesso (mascarados)", {
      id: subscriptionData.id,
      customer_name_masked: subscriptionData.customer_name_masked,
      plan_name: subscriptionData.plan_name
    });

    // Retornar dados mascarados e seguros para o frontend + IDs da Vindi
    // ❌ NÃO retornar payment_method fixo - usuário escolhe no checkout
    return new Response(JSON.stringify({
      success: true,
      data: {
        id: subscriptionData.id,
        customer_name: subscriptionData.customer_name_masked,
        customer_email: subscriptionData.customer_email_masked,
        customer_document: '***.***.***-**', // Sempre mascarado
        plan_price: subscriptionData.plan_price,
        // payment_method: subscriptionData.payment_method, // ❌ REMOVIDO: usuário escolhe no frontend
        status: subscriptionData.status,
        plan_name: subscriptionData.plan_name,
        // ✅ Dados para assinatura de contrato
        contract_status: subscriptionData.contract_status || 'not_requested',
        telefone: subscriptionData.telefone,
        endereco: subscriptionData.endereco,
        cidade: subscriptionData.cidade,
        estado: subscriptionData.estado,
        cep: subscriptionData.cep,
        data_nascimento: subscriptionData.data_nascimento,
        // IDs da Vindi necessários para o checkout
        vindi_customer_id: subscriptionData.vindi_customer_id,
        vindi_plan_id: subscriptionData.vindi_plan_id,
        vindi_product_id: subscriptionData.vindi_product_id
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERRO na validação de checkout", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});