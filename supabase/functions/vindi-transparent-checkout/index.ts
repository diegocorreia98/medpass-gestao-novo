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
  number: string;
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

const VINDI_HOSTED_URLS = {
  sandbox: 'https://app.vindi.com.br/api/v1',
  production: 'https://app.vindi.com.br/api/v1'
};

const VINDI_HOSTED_URL = VINDI_HOSTED_URLS[VINDI_ENVIRONMENT as keyof typeof VINDI_HOSTED_URLS];

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
  const searchResponse = await fetch(`${VINDI_HOSTED_URL}/customers?query=email:${customerData.email}`, {
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
    
    const updateResponse = await fetch(`${VINDI_HOSTED_URL}/customers/${customerId}`, {
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
    
    const createResponse = await fetch(`${VINDI_HOSTED_URL}/customers`, {
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

  const response = await fetch(`${VINDI_HOSTED_URL}/subscriptions`, {
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

  return {
    success: true,
    subscription_id: subscription.id,
    subscription: subscription,
    pix_data: {
      qr_code: pixCharge.qr_code,
      pix_code: pixCharge.pix_code,
      expires_at: firstBill.due_at,
      amount: pixCharge.amount,
      charge_id: pixCharge.id
    },
    status: 'pending_payment'
  };
}

async function processCreditCardSubscription(customer: any, planData: any, cardData: CardData, installments: number) {
  console.log('[VINDI] Creating credit card subscription for customer:', customer.id);
  
  const subscriptionPayload = {
    customer_id: customer.id,
    plan_id: planData.vindi_plan_id || planData.id,
    payment_method_code: 'credit_card',
    code: `medpass-cc-${Date.now()}`,
    installments: installments || 1,
    gateway_token: cardData.number, // This should be encrypted token in real implementation
    metadata: {
      checkout_type: 'transparent',
      created_by: 'medpass',
      plan_name: planData.name,
      installments: installments
    }
  };

  const response = await fetch(`${VINDI_HOSTED_URL}/subscriptions`, {
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
  const charge = firstBill?.charges?.[0];

  return {
    success: true,
    subscription_id: subscription.id,
    subscription: subscription,
    charge_id: charge?.id,
    status: charge?.status || 'processing'
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[TRANSPARENT-CHECKOUT] Request received');
    
    if (!VINDI_PRIVATE_KEY) {
      throw new Error('VINDI_PRIVATE_KEY not configured');
    }

    const { clinicData, planData, paymentMethod, cardData, installments }: CheckoutRequest = await req.json();
    
    console.log('[TRANSPARENT-CHECKOUT] Processing checkout:', {
      customer: clinicData.email,
      plan: planData.name, 
      method: paymentMethod
    });

    // Validate required fields
    if (!clinicData.name || !clinicData.email || !clinicData.document) {
      throw new Error('Dados obrigatórios do cliente não informados');
    }

    if (!planData.id) {
      throw new Error('Plano não selecionado');
    }

    // Step 1: Create/update customer
    const customer = await createOrUpdateCustomer(clinicData);
    console.log('[TRANSPARENT-CHECKOUT] Customer processed:', customer.id);

    // Step 2: Process based on payment method
    let result;
    
    if (paymentMethod === 'pix') {
      result = await processPIXSubscription(customer, planData);
    } else if (paymentMethod === 'credit_card') {
      if (!cardData) {
        throw new Error('Dados do cartão não informados');
      }
      result = await processCreditCardSubscription(customer, planData, cardData, installments || 1);
    } else {
      throw new Error(`Método de pagamento não suportado: ${paymentMethod}`);
    }

    console.log('[TRANSPARENT-CHECKOUT] Checkout completed successfully');
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('[TRANSPARENT-CHECKOUT] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});