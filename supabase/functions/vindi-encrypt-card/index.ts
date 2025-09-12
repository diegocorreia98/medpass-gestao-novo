// Import required modules
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Logging utility
function logStep(message: string, data?: any) {
  console.log(`[VINDI-ENCRYPT-CARD] ${message}${data ? ` - ${JSON.stringify(data)}` : ''}`);
}

// Interface for card encryption request
interface CardEncryptionRequest {
  card_number: string;
  card_holder_name: string;
  card_expiry_month: string;
  card_expiry_year: string;
  card_cvv: string;
  public_key: string;
  environment: 'sandbox' | 'production';
}

// Vindi hosted URLs
const VINDI_HOSTED_URLS = {
  sandbox: 'https://sandbox-app.vindi.com.br/api/v1/hosted',
  production: 'https://app.vindi.com.br/api/v1/hosted'
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Function started');

    // Get Vindi private key from environment
    const vindiPrivateKey = Deno.env.get('VINDI_PRIVATE_KEY');
    if (!vindiPrivateKey) {
      throw new Error('Chave privada Vindi não configurada');
    }

    // Parse request body
    const requestData: CardEncryptionRequest = await req.json();
    logStep('Received card encryption request (card data masked for security)');

    // Validate request data
    if (!requestData.card_number || !requestData.card_holder_name || !requestData.card_cvv) {
      throw new Error('Dados do cartão incompletos');
    }

    // Get hosted URL based on environment
    const hostedUrl = VINDI_HOSTED_URLS[requestData.environment] || VINDI_HOSTED_URLS.sandbox;
    logStep('Using Vindi hosted URL', { environment: requestData.environment, url: hostedUrl });

    // Prepare card data for Vindi encryption
    const cardDataForEncryption = {
      holder_name: requestData.card_holder_name,
      card_number: requestData.card_number,
      card_expiration: `${requestData.card_expiry_month}/${requestData.card_expiry_year}`,
      card_cvv: requestData.card_cvv,
      allow_as_fallback: false
    };

    logStep('Calling Vindi hosted payment profile creation endpoint');

    // Call Vindi hosted endpoint to create encrypted payment profile
    const vindiResponse = await fetch(`${hostedUrl}/payment_profile_search/create_unique`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(vindiPrivateKey + ':')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(cardDataForEncryption)
    });

    if (!vindiResponse.ok) {
      const errorText = await vindiResponse.text();
      logStep('Vindi API error', { status: vindiResponse.status, error: errorText });
      throw new Error(`Erro na API Vindi: ${vindiResponse.status} - ${errorText}`);
    }

    const vindiResult = await vindiResponse.json();
    logStep('Vindi encryption successful', { hasGatewayToken: !!vindiResult.gateway_token });

    if (!vindiResult.gateway_token) {
      throw new Error('Gateway token não retornado pela Vindi');
    }

    // Return encrypted data
    const response = {
      success: true,
      gateway_token: vindiResult.gateway_token,
      card_brand: detectCardBrand(requestData.card_number),
      card_last_four: requestData.card_number.slice(-4),
      vindi_response: vindiResult
    };

    logStep('Card encryption completed successfully');

    return new Response(JSON.stringify(response), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      }
    });

  } catch (error) {
    logStep('ERROR in vindi-encrypt-card', { message: error.message });
    
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

// Utility function to detect card brand
function detectCardBrand(cardNumber: string): string {
  const number = cardNumber.replace(/\s/g, '');
  
  if (/^4/.test(number)) return 'visa';
  if (/^5[1-5]/.test(number) || /^2[2-7]/.test(number)) return 'mastercard';
  if (/^3[47]/.test(number)) return 'amex';
  if (/^3[0689]/.test(number)) return 'diners';
  if (/^6/.test(number)) return 'discover';
  if (/^(4011|4312|4389|4514|4573|6277|6362|6363)/.test(number)) return 'elo';
  if (/^(3841|6062)/.test(number)) return 'hipercard';
  
  return 'unknown';
}