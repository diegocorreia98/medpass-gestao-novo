import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Logging utility
function logStep(message: string, data?: any) {
  console.log(`[VINDI-HOSTED-CUSTOMER] ${message}${data ? ` - ${JSON.stringify(data)}` : ''}`);
}

// Interface for customer request
interface CustomerRequest {
  name: string;
  email: string;
  registry_code: string; // CPF or CNPJ
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipcode: string;
    country?: string;
  };
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

    // Get Vindi private key from environment
    const vindiPrivateKey = Deno.env.get('VINDI_PRIVATE_KEY');
    if (!vindiPrivateKey) {
      throw new Error('Chave privada Vindi não configurada');
    }

    // Parse request body
    const customerData: CustomerRequest = await req.json();
    logStep('Received customer request', { email: customerData.email, name: customerData.name });

    // Validate required fields
    if (!customerData.name || !customerData.email || !customerData.registry_code) {
      throw new Error('Nome, email e documento são obrigatórios');
    }

    // Get API URL based on environment
    const apiUrl = VINDI_HOSTED_URLS[customerData.environment || 'production'];
    logStep('Using Vindi API URL', { environment: customerData.environment || 'production', url: apiUrl });

    // Check if customer already exists
    logStep('Checking for existing customer');
    const searchResponse = await fetch(`${apiUrl}/customers?query=email:${customerData.email} OR registry_code:${customerData.registry_code}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(vindiPrivateKey + ':')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!searchResponse.ok) {
      throw new Error(`Erro ao buscar cliente: ${searchResponse.status}`);
    }

    const searchResult = await searchResponse.json();
    let vindiCustomerId: number;
    let isNewCustomer = false;

    if (searchResult.customers && searchResult.customers.length > 0) {
      // Customer exists, update if needed
      const existingCustomer = searchResult.customers[0];
      vindiCustomerId = existingCustomer.id;
      logStep('Found existing customer', { id: vindiCustomerId });

      // Update customer data
      const updateData = {
        name: customerData.name,
        email: customerData.email,
        registry_code: customerData.registry_code,
        phone: customerData.phone || existingCustomer.phone,
        address: customerData.address ? {
          ...customerData.address,
          country: customerData.address.country || 'BR'
        } : existingCustomer.address
      };

      const updateResponse = await fetch(`${apiUrl}/customers/${vindiCustomerId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Basic ${btoa(vindiPrivateKey + ':')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customer: updateData }),
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        logStep('Customer update failed', { status: updateResponse.status, error: errorText });
        // Don't fail completely if update fails, use existing customer
      } else {
        logStep('Customer updated successfully');
      }

    } else {
      // Create new customer
      logStep('Creating new customer');
      
      const createData = {
        name: customerData.name,
        email: customerData.email,
        registry_code: customerData.registry_code,
        phone: customerData.phone || '',
        address: customerData.address ? {
          ...customerData.address,
          country: customerData.address.country || 'BR'
        } : undefined
      };

      const createResponse = await fetch(`${apiUrl}/customers`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(vindiPrivateKey + ':')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customer: createData }),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Erro ao criar cliente: ${createResponse.status} - ${errorText}`);
      }

      const createResult = await createResponse.json();
      if (!createResult.customer || !createResult.customer.id) {
        throw new Error('Cliente criado mas ID não retornado');
      }

      vindiCustomerId = createResult.customer.id;
      isNewCustomer = true;
      logStep('Customer created successfully', { id: vindiCustomerId });
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Upsert customer mapping in Supabase
    const { error: upsertError } = await supabaseClient
      .from('vindi_customers')
      .upsert({
        vindi_customer_id: vindiCustomerId,
        customer_email: customerData.email,
        customer_document: customerData.registry_code,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'customer_email'
      });

    if (upsertError) {
      logStep('Warning: Failed to save customer mapping', { error: upsertError });
      // Don't fail the function if we can't save the mapping
    } else {
      logStep('Customer mapping saved successfully');
    }

    return new Response(JSON.stringify({
      success: true,
      vindi_customer_id: vindiCustomerId,
      customer_email: customerData.email,
      customer_document: customerData.registry_code,
      is_new_customer: isNewCustomer
    }), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      }
    });

  } catch (error) {
    logStep('ERROR in vindi-hosted-customer', { message: error.message });
    
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