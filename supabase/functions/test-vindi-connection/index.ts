import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
    // Get Vindi API key from environment
    const vindiApiKey = Deno.env.get('VINDI_API_KEY');

    if (!vindiApiKey) {
      throw new Error('Vindi API key not configured');
    }

    console.log('Testing Vindi API connection...');

    // Test basic API connectivity by fetching merchant info
    const response = await fetch('https://app.vindi.com.br/api/v1/merchant', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(vindiApiKey + ':')}`,
        'Content-Type': 'application/json',
      },
    });

    const responseData = await response.json();
    
    console.log('Vindi API Response Status:', response.status);
    console.log('Vindi API Response:', responseData);

    if (!response.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Vindi API authentication failed',
        status: response.status,
        details: responseData,
        message: 'Verifique se a API key do Vindi está correta'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Conexão com Vindi API bem sucedida',
      merchant: responseData.merchant,
      api_key_valid: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error testing Vindi connection:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || 'Internal server error',
      message: 'Erro ao testar conexão com Vindi'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});