import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CustomerData {
  name: string;
  email: string;
  document: string;
  phone?: string;
  address?: {
    street: string;
    number: string;
    city: string;
    state: string;
    zipcode: string;
  };
}

interface CardData {
  holder_name: string;
  number: string; // This will contain the gateway_token from frontend tokenization
  cvv: string;
  expiry_month: string;
  expiry_year: string;
}

interface CheckoutRequest {
  clinicData: CustomerData;
  planData: {
    id: string;
    name: string;
    price: number;
    vindi_plan_id?: number;
    vindi_product_id?: string;
  };
  paymentMethod: 'credit_card' | 'pix' | 'boleto';
  cardData?: CardData;
  installments?: number;
}

const VINDI_PRIVATE_KEY = Deno.env.get('VINDI_PRIVATE_KEY');
const VINDI_ENVIRONMENT = Deno.env.get('VINDI_ENVIRONMENT') || 'production';

const VINDI_API_URLS = {
  sandbox: 'https://sandbox-app.vindi.com.br/api/v1',
  production: 'https://app.vindi.com.br/api/v1'
};

const VINDI_API_URL = VINDI_API_URLS[VINDI_ENVIRONMENT as keyof typeof VINDI_API_URLS];

async function createOrUpdateCustomer(customerData: CustomerData) {
  console.log('[VINDI] Creating/updating customer:', customerData.email);
  
  const customerPayload = {
    name: customerData.name,
    email: customerData.email,
    registry_code: customerData.document.replace(/[^\d]/g, ''),
    phone: customerData.phone?.replace(/[^\d]/g, ''),
    address: customerData.address ? {
      street: customerData.address.street,
      number: customerData.address.number,
      city: customerData.address.city,
      state: customerData.address.state,
      zipcode: customerData.address.zipcode.replace(/[^\d]/g, ''),
      country: 'BR'
    } : undefined
  };

  // Check if customer exists first
  const searchResponse = await fetch(`${VINDI_API_URL}/customers?query=email:${customerData.email}`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${btoa(VINDI_PRIVATE_KEY + ':')}`,
      'Content-Type': 'application/json'
    }
  });

  const searchResult = await searchResponse.json();
  
  if (searchResult.customers && searchResult.customers.length > 0) {
    // Update existing customer
    const customerId = searchResult.customers[0].id;
    console.log('[VINDI] Updating existing customer:', customerId);
    
    const updateResponse = await fetch(`${VINDI_API_URL}/customers/${customerId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${btoa(VINDI_PRIVATE_KEY + ':')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(customerPayload)
    });

    const updateResult = await updateResponse.json();
    return updateResult.customer;
  } else {
    // Create new customer
    console.log('[VINDI] Creating new customer');
    
    const createResponse = await fetch(`${VINDI_API_URL}/customers`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(VINDI_PRIVATE_KEY + ':')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(customerPayload)
    });

    const createResult = await createResponse.json();
    return createResult.customer;
  }
}

async function createPaymentProfile(customer: any, gateway_token: string): Promise<any> {
  console.log('[VINDI] Creating payment profile for customer:', customer.id);
  
  const paymentProfilePayload = {
    customer_id: customer.id,
    gateway_token: gateway_token
  };

  const response = await fetch(`${VINDI_API_URL}/payment_profiles`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(VINDI_PRIVATE_KEY + ':')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(paymentProfilePayload)
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(`Vindi payment profile error: ${result.errors?.[0]?.message || 'Unknown error'}`);
  }

  return result.payment_profile;
}

async function processPIXSubscription(customer: any, planData: any) {
  console.log('[VINDI] Creating PIX subscription for customer:', customer.id);
  
  const subscriptionPayload = {
    customer_id: customer.id,
    plan_id: planData.vindi_plan_id || planData.id,
    payment_method_code: 'pix',
    code: `medpass-pix-${Date.now()}`,
    metadata: {
      checkout_type: 'transparent',
      created_by: 'medpass',
      plan_name: planData.name
    }
  };

  const response = await fetch(`${VINDI_API_URL}/subscriptions`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(VINDI_PRIVATE_KEY + ':')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(subscriptionPayload)
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(`Vindi API error: ${result.errors?.[0]?.message || 'Unknown error'}`);
  }

  const subscription = result.subscription;
  const firstBill = subscription.bills?.[0];
  const pixCharge = firstBill?.charges?.find((c: any) => c.payment_method.code === 'pix');

  if (!pixCharge) {
    throw new Error('PIX charge not found in subscription');
  }

  // Debug: Log the actual structure of pixCharge to understand Vindi's response
  console.log('[VINDI-PIX] PIX Charge structure:', JSON.stringify(pixCharge, null, 2));
  console.log('[VINDI-PIX] First bill structure:', JSON.stringify(firstBill, null, 2));

  // Try different possible field names for PIX EMV code from Vindi
  const pixCode = pixCharge.qr_code || 
                  pixCharge.pix_code || 
                  pixCharge.emv_code || 
                  pixCharge.code ||
                  pixCharge.payment_method?.pix_code ||
                  pixCharge.payment_method?.qr_code ||
                  pixCharge.last_transaction?.gateway_response_fields?.pix_code ||
                  pixCharge.last_transaction?.gateway_response_fields?.qr_code;

  console.log('[VINDI-PIX] Extracted PIX code:', pixCode ? pixCode.substring(0, 50) + '...' : 'NOT FOUND');

  if (!pixCode) {
    console.error('[VINDI-PIX] PIX code not found in any expected fields');
    throw new Error('PIX code not found in Vindi response');
  }

  return {
    success: true,
    subscription_id: subscription.id,
    subscription: subscription,
    pix_data: {
      qr_code: pixCode,
      pix_code: pixCode, // Provide both for compatibility
      expires_at: firstBill.due_at,
      amount: pixCharge.amount,
      charge_id: pixCharge.id
    },
    status: 'pending_payment'
  };
}

async function processCreditCardSubscription(customer: any, planData: any, cardData: CardData, installments: number) {
  console.log('[VINDI] Creating credit card subscription for customer:', customer.id);
  
  // cardData.number now contains the gateway_token from frontend tokenization
  const gateway_token = cardData.number;
  
  // Create payment profile first (optional step as per transparent checkout specification)
  let payment_profile_id = null;
  try {
    const paymentProfile = await createPaymentProfile(customer, gateway_token);
    payment_profile_id = paymentProfile.id;
    console.log('[VINDI] Payment profile created:', payment_profile_id);
  } catch (error) {
    console.log('[VINDI] Payment profile creation failed, using gateway_token directly:', error);
  }
  
  const subscriptionPayload = {
    customer_id: customer.id,
    plan_id: planData.vindi_plan_id || planData.id,
    payment_method_code: 'credit_card',
    code: `medpass-cc-${Date.now()}`,
    installments: installments || 1,
    // Use payment_profile_id if created, otherwise gateway_token directly
    ...(payment_profile_id ? { payment_profile_id } : { gateway_token }),
    metadata: {
      checkout_type: 'transparent',
      created_by: 'medpass',
      plan_name: planData.name,
      installments: installments,
      payment_profile_id: payment_profile_id || 'direct_token'
    }
  };

  console.log('[VINDI] Creating subscription with payment profile or gateway token');

  const response = await fetch(`${VINDI_API_URL}/subscriptions`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(VINDI_PRIVATE_KEY + ':')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(subscriptionPayload)
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(`Vindi API error: ${result.errors?.[0]?.message || 'Unknown error'}`);
  }

  const subscription = result.subscription;
  const firstBill = subscription.bills?.[0];
  const creditCardCharge = firstBill?.charges?.find((c: any) => c.payment_method.code === 'credit_card');

  return {
    success: true,
    subscription_id: subscription.id,
    charge_id: creditCardCharge?.id,
    subscription: subscription,
    payment_profile_id: payment_profile_id,
    status: creditCardCharge?.status || 'processing'
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { clinicData, planData, paymentMethod, cardData, installments }: CheckoutRequest = await req.json();

    console.log('[VINDI-CHECKOUT] Processing transparent checkout:', { 
      paymentMethod, 
      customerEmail: clinicData.email,
      planId: planData.id 
    });

    // Validate required data
    if (!clinicData.name || !clinicData.email || !clinicData.document) {
      throw new Error('Dados do cliente incompletos');
    }

    if (!planData.id && !planData.vindi_plan_id) {
      throw new Error('ID do plano é obrigatório');
    }

    if (paymentMethod === 'credit_card' && !cardData) {
      throw new Error('Dados do cartão são obrigatórios para pagamento com cartão');
    }

    // Step 1: Create or update customer
    const customer = await createOrUpdateCustomer(clinicData);
    if (!customer) {
      throw new Error('Falha ao criar/atualizar cliente na Vindi');
    }

    console.log('[VINDI-CHECKOUT] Customer processed:', customer.id);

    // Step 2: Process payment based on method
    let result;
    
    if (paymentMethod === 'pix') {
      result = await processPIXSubscription(customer, planData);
    } else if (paymentMethod === 'credit_card') {
      if (!cardData) {
        throw new Error('Dados do cartão são obrigatórios');
      }
      result = await processCreditCardSubscription(customer, planData, cardData, installments || 1);
    } else {
      throw new Error(`Método de pagamento não suportado: ${paymentMethod}`);
    }

    console.log('[VINDI-CHECKOUT] Checkout completed successfully');

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[VINDI-CHECKOUT] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro interno do servidor' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});