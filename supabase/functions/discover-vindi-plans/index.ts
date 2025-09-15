import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface VindiPlan {
  id: number;
  name: string;
  description?: string;
  price: number;
  product: {
    id: number;
    name: string;
  };
  status: string;
  created_at: string;
}

interface VindiResponse {
  plans: VindiPlan[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔍 Starting Vindi Plans Discovery...");

    // Get Vindi API configuration
    const vindiApiKey = Deno.env.get('VINDI_API_KEY');
    const vindiEnvironment = Deno.env.get('VINDI_ENVIRONMENT') || 'production';

    if (!vindiApiKey) {
      throw new Error('VINDI_API_KEY não configurada nas variáveis de ambiente');
    }

    // Dynamic API URLs
    const VINDI_API_URLS = {
      sandbox: 'https://sandbox-app.vindi.com.br/api/v1',
      production: 'https://app.vindi.com.br/api/v1'
    };
    
    const vindiApiUrl = VINDI_API_URLS[vindiEnvironment as keyof typeof VINDI_API_URLS] || VINDI_API_URLS.production;
    
    console.log(`🔧 Using Vindi ${vindiEnvironment} environment:`, vindiApiUrl);

    // Encode API key for Basic Auth
    const encodedApiKey = btoa(`${vindiApiKey}:`);

    // Fetch plans from Vindi
    console.log("📡 Fetching plans from Vindi...");
    
    const vindiResponse = await fetch(`${vindiApiUrl}/plans`, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${encodedApiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "MedPass-Sistema/1.0"
      }
    });

    if (!vindiResponse.ok) {
      const errorText = await vindiResponse.text();
      console.error("❌ Vindi API Error:", {
        status: vindiResponse.status,
        statusText: vindiResponse.statusText,
        error: errorText
      });
      throw new Error(`Erro da API Vindi: ${vindiResponse.status} - ${errorText}`);
    }

    const vindiData: VindiResponse = await vindiResponse.json();
    console.log("✅ Vindi Plans Retrieved:", vindiData.plans?.length || 0);

    if (!vindiData.plans || vindiData.plans.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Nenhum plano encontrado na Vindi",
          environment: vindiEnvironment,
          plans: []
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Format plans for easy use
    const formattedPlans = vindiData.plans.map(plan => ({
      vindi_plan_id: plan.id,
      name: plan.name,
      description: plan.description || `Plano ${plan.name}`,
      price: plan.price,
      vindi_product_id: plan.product.id.toString(),
      product_name: plan.product.name,
      status: plan.status,
      created_at: plan.created_at,
      // SQL Insert statement ready
      sql_insert: `('${crypto.randomUUID()}', '${plan.name}', '${plan.description || `Plano ${plan.name}`}', ${plan.price}, ${plan.id}, '${plan.product.id}', true)`
    }));

    // Generate complete SQL script
    const sqlScript = `
-- ========================================
-- SCRIPT GERADO AUTOMATICAMENTE
-- Planos encontrados na Vindi (${vindiEnvironment})
-- ========================================

-- Limpar planos existentes (opcional)
-- DELETE FROM public.planos WHERE vindi_plan_id IS NOT NULL;

-- Inserir planos reais da Vindi
INSERT INTO public.planos (id, nome, descricao, valor, vindi_plan_id, vindi_product_id, ativo) VALUES 
${formattedPlans.map(p => p.sql_insert).join(',\n')}
ON CONFLICT (vindi_plan_id) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  valor = EXCLUDED.valor,
  vindi_product_id = EXCLUDED.vindi_product_id,
  updated_at = now();

-- Verificar planos inseridos
SELECT 
  'PLANOS DA VINDI INSERIDOS:' as status,
  nome, 
  valor, 
  vindi_plan_id,
  vindi_product_id,
  ativo
FROM public.planos 
WHERE vindi_plan_id IS NOT NULL
ORDER BY valor;
`;

    const result = {
      success: true,
      environment: vindiEnvironment,
      total_plans: formattedPlans.length,
      plans: formattedPlans,
      sql_script: sqlScript.trim(),
      instructions: [
        "1. Copie o 'sql_script' abaixo",
        "2. Execute no Supabase Dashboard > SQL Editor", 
        "3. Teste o fluxo de adesão novamente",
        "4. Os planos agora terão os IDs corretos da Vindi!"
      ]
    };

    console.log("🎉 Plans discovery completed successfully!");

    return new Response(
      JSON.stringify(result, null, 2),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("❌ Error in discover-vindi-plans:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: "Verifique se VINDI_API_KEY está configurada corretamente nas variáveis de ambiente"
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
