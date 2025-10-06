import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.json();
    console.log('[RMS-ADESAO-MANUAL] Payload recebido:', payload);

    // Buscar configurações da API
    const { data: settings, error: settingsError } = await supabaseClient
      .from('api_settings')
      .select('setting_name, setting_value')
      .in('setting_name', ['EXTERNAL_API_KEY', 'EXTERNAL_API_ADESAO_URL']);

    if (settingsError || !settings || settings.length === 0) {
      console.error('[RMS-ADESAO-MANUAL] Erro ao buscar configurações:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Configurações da API RMS não encontradas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const settingsMap = Object.fromEntries(
      settings.map(s => [s.setting_name, s.setting_value])
    );

    const apiKey = settingsMap['EXTERNAL_API_KEY'];
    const apiUrl = settingsMap['EXTERNAL_API_ADESAO_URL'];

    if (!apiKey || !apiUrl) {
      console.error('[RMS-ADESAO-MANUAL] API Key ou URL não configuradas');
      return new Response(
        JSON.stringify({ error: 'API Key ou URL de Adesão não configuradas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[RMS-ADESAO-MANUAL] Chamando API RMS:', apiUrl);

    // Chamar API RMS
    const rmsResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const responseData = await rmsResponse.json();
    console.log('[RMS-ADESAO-MANUAL] Resposta RMS status:', rmsResponse.status);
    console.log('[RMS-ADESAO-MANUAL] Resposta RMS data:', responseData);

    if (!rmsResponse.ok) {
      return new Response(
        JSON.stringify({
          error: responseData.mensagem || `Erro ${rmsResponse.status}: ${rmsResponse.statusText}`,
          details: responseData
        }),
        { status: rmsResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[RMS-ADESAO-MANUAL] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
