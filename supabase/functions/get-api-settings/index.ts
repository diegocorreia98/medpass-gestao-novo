import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Buscar as configurações da tabela api_settings
    const { data: apiSettings, error } = await supabase
      .from('api_settings')
      .select('setting_name, masked_value')
      .in('setting_name', ['EXTERNAL_API_KEY', 'EXTERNAL_API_ADESAO_URL', 'EXTERNAL_API_CANCELAMENTO_URL']);

    if (error) {
      console.error('Error fetching API settings:', error);
      // Fallback para variáveis de ambiente se a tabela não existir ainda
      const externalApiAdesaoUrl = Deno.env.get('EXTERNAL_API_ADESAO_URL');
      const externalApiCancelamentoUrl = Deno.env.get('EXTERNAL_API_CANCELAMENTO_URL');
      const externalApiKey = Deno.env.get('EXTERNAL_API_KEY');
      
      return new Response(JSON.stringify({
        apiKey: externalApiKey ? `${externalApiKey.substring(0, 8)}...` : '',
        adesaoUrl: externalApiAdesaoUrl || '',
        cancelamentoUrl: externalApiCancelamentoUrl || '',
        isConfigured: !!(externalApiKey && externalApiAdesaoUrl && externalApiCancelamentoUrl)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Processar as configurações
    const settingsMap = (apiSettings || []).reduce((acc, setting) => {
      acc[setting.setting_name] = setting.masked_value || '';
      return acc;
    }, {} as Record<string, string>);

    const settings = {
      apiKey: settingsMap['EXTERNAL_API_KEY'] || '',
      adesaoUrl: settingsMap['EXTERNAL_API_ADESAO_URL'] || '',
      cancelamentoUrl: settingsMap['EXTERNAL_API_CANCELAMENTO_URL'] || '',
      isConfigured: !!(settingsMap['EXTERNAL_API_KEY'] && settingsMap['EXTERNAL_API_ADESAO_URL'] && settingsMap['EXTERNAL_API_CANCELAMENTO_URL'])
    };

    return new Response(JSON.stringify(settings), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    return new Response(JSON.stringify({ 
      error: 'Erro ao buscar configurações',
      details: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});