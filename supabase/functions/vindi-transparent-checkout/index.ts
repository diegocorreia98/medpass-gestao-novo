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

/**
 * Gestão de afiliados conforme especificação do checkout transparente
 * Retorna afiliado apenas se a conta estiver criada e verificada na Vindi Pagamentos
 */
async function processAffiliates(customerData: any, planData: any): Promise<number[] | null> {
  console.log('[VINDI] Processing affiliates for customer:', customerData.email);
  
  try {
    // 1. Consultar afiliados existentes
    const searchResponse = await fetch(`${VINDI_API_URL}/affiliates?query=email:${customerData.email}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(VINDI_PRIVATE_KEY + ':')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!searchResponse.ok) {
      console.log('[VINDI] Affiliate search failed, continuing without split');
      return null;
    }

    const searchResult = await searchResponse.json();
    const existingAffiliates = searchResult.affiliates || [];
    
    if (existingAffiliates.length > 0) {
      // Verificar se afiliados estão ativos e verificados
      const activeAffiliateIds = existingAffiliates
        .filter((affiliate: any) => affiliate.status === 'active' && affiliate.verified)
        .map((affiliate: any) => affiliate.id);
        
      if (activeAffiliateIds.length > 0) {
        console.log('[VINDI] Found active verified affiliates:', activeAffiliateIds);
        return activeAffiliateIds;
      }
    }

    // 2. Se não encontrou afiliados ativos, tentar criar/ativar
    // Só criar se tivermos dados específicos de afiliação
    const affiliateData = extractAffiliateData(customerData, planData);
    
    if (!affiliateData) {
      console.log('[VINDI] No affiliate data found, continuing without split');
      return null;
    }

    console.log('[VINDI] Creating new affiliate');
    const createResponse = await fetch(`${VINDI_API_URL}/affiliates`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(VINDI_PRIVATE_KEY + ':')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(affiliateData)
    });

    if (!createResponse.ok) {
      console.log('[VINDI] Affiliate creation failed, continuing without split');
      return null;
    }

    const createResult = await createResponse.json();
    const newAffiliate = createResult.affiliate;
    
    if (newAffiliate && newAffiliate.id) {
      console.log('[VINDI] Created affiliate:', newAffiliate.id);
      return [newAffiliate.id];
    }
    
    return null;
    
  } catch (error) {
    console.log('[VINDI] Error processing affiliates, continuing without split:', error);
    return null;
  }
}

/**
 * Extrai dados de afiliação do customer/plan
 * Retorna null se não for um caso de afiliação
 */
function extractAffiliateData(customerData: any, planData: any): any | null {
  // Implementar lógica específica do negócio para determinar se é afiliação
  // Por exemplo: se é uma unidade/franquia, usar dados do responsável
  
  // Exemplo básico - ajustar conforme regras do negócio
  if (customerData.affiliate_code || customerData.referrer_code) {
    return {
      name: customerData.affiliate_name || customerData.name,
      email: customerData.affiliate_email || customerData.email,
      registry_code: customerData.affiliate_document || customerData.document,
      percentage: customerData.affiliate_percentage || 10, // 10% padrão
      status: 'pending' // Será ativado após verificação manual
    };
  }
  
  return null;
}

async function processPIXSubscription(customer: any, planData: any, affiliateIds?: number[] | null) {
  console.log('[VINDI] Creating PIX subscription for customer:', customer.id);
  
  const subscriptionPayload: any = {
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
  
  // Adicionar split/afiliados se disponível
  if (affiliateIds && affiliateIds.length > 0) {
    subscriptionPayload.split_rules = affiliateIds.map(id => ({
      affiliate_id: id,
      percentage: 10 // Configurável conforme regra do negócio
    }));
    console.log('[VINDI] Adding split rules for affiliates:', affiliateIds);
  }

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

  // ✅ EXTRAIR DADOS PIX COMPLETOS (incluindo SVG)
  const gatewayFields = pixCharge.last_transaction?.gateway_response_fields || {};
  
  // 🎯 CAMPOS CORRETOS DA VINDI
  const qrcodeSvg = gatewayFields.qrcode_path; // SVG do QR Code
  const pixCopiaCola = gatewayFields.qrcode_original_path; // Código PIX copia e cola
  
  const pixCode = pixCopiaCola || // ✅ PRIORIDADE: Código copia e cola correto
                  gatewayFields.qr_code_text || 
                  gatewayFields.emv ||
                  gatewayFields.copy_paste ||
                  gatewayFields.pix_code ||
                  pixCharge.qr_code || 
                  pixCharge.pix_code;
  
  const qrCodeUrl = gatewayFields.qr_code_url || 
                    gatewayFields.qr_code_image_url;
  
  const qrCodeBase64 = gatewayFields.qr_code_base64 || 
                       gatewayFields.qrcode_base64;

  console.log('[VINDI-PIX] PIX data extraction results:', {
    hasPixCode: !!pixCode,
    hasQrCodeUrl: !!qrCodeUrl,
    hasQrCodeBase64: !!qrCodeBase64,
    hasQrcodeSvg: !!qrcodeSvg,
    pixCodeLength: pixCode?.length,
    svgLength: qrcodeSvg?.length
  });

  if (!pixCode && !qrcodeSvg) {
    console.error('[VINDI-PIX] Neither PIX code nor QR SVG found in response');
    console.error('[VINDI-PIX] Available gateway fields:', Object.keys(gatewayFields));
    throw new Error('PIX data not found in Vindi response');
  }

  return {
    success: true,
    subscription_id: subscription.id,
    subscription: subscription,
    pix_data: {
      qr_code: pixCode,
      pix_code: pixCode, // Compatibility
      pix_copia_cola: pixCopiaCola, // ✅ Código PIX copia e cola da Vindi
      qr_code_url: qrCodeUrl,
      qr_code_base64: qrCodeBase64,
      qr_code_svg: qrcodeSvg, // ✅ SVG QR Code da Vindi
      expires_at: firstBill.due_at,
      amount: pixCharge.amount,
      charge_id: pixCharge.id
    },
    status: 'pending_payment'
  };
}

async function processCreditCardSubscription(customer: any, planData: any, cardData: CardData, installments: number, affiliateIds?: number[] | null) {
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
  
  const subscriptionPayload: any = {
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
  
  // Adicionar split/afiliados se disponível
  if (affiliateIds && affiliateIds.length > 0) {
    subscriptionPayload.split_rules = affiliateIds.map(id => ({
      affiliate_id: id,
      percentage: 10 // Configurável conforme regra do negócio
    }));
    console.log('[VINDI] Adding split rules for affiliates (credit_card):', affiliateIds);
  }

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

async function processBoletoSubscription(customer: any, planData: any, affiliateIds?: number[] | null) {
  console.log('[VINDI] Creating Boleto subscription for customer:', customer.id);
  
  const subscriptionPayload: any = {
    customer_id: customer.id,
    plan_id: planData.vindi_plan_id || planData.id,
    payment_method_code: 'bank_slip',
    code: `medpass-boleto-${Date.now()}`,
    metadata: {
      checkout_type: 'transparent',
      created_by: 'medpass',
      plan_name: planData.name
    }
  };
  
  // Adicionar split/afiliados se disponível
  if (affiliateIds && affiliateIds.length > 0) {
    subscriptionPayload.split_rules = affiliateIds.map(id => ({
      affiliate_id: id,
      percentage: 10 // Configurável conforme regra do negócio
    }));
    console.log('[VINDI] Adding split rules for affiliates (boleto):', affiliateIds);
  }

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
  const boletoCharge = firstBill?.charges?.find((c: any) => c.payment_method.code === 'bank_slip');

  if (!boletoCharge) {
    throw new Error('Boleto charge not found in subscription');
  }

  console.log('[VINDI-BOLETO] Boleto Charge structure:', JSON.stringify(boletoCharge, null, 2));

  const boletoData = {
    url: boletoCharge.print_url,
    barcode: boletoCharge.code,
    due_date: boletoCharge.due_at
  };

  console.log('[VINDI-BOLETO] Extracted boleto data:', boletoData);

  return {
    success: true,
    subscription_id: subscription.id,
    customer_id: customer.id,
    boleto_data: boletoData,
    status: boletoCharge?.status || 'processing'
  };
}

async function processBolepixSubscription(customer: any, planData: any, affiliateIds?: number[] | null) {
  console.log('[VINDI] Creating Bolepix subscription for customer:', customer.id);
  
  // Bolepix é um método híbrido que oferece boleto E PIX na mesma cobrança
  const subscriptionPayload: any = {
    customer_id: customer.id,
    plan_id: planData.vindi_plan_id || planData.id,
    payment_method_code: 'bolepix', // Método híbrido
    code: `medpass-bolepix-${Date.now()}`,
    metadata: {
      checkout_type: 'transparent',
      created_by: 'medpass',
      plan_name: planData.name,
      payment_type: 'hybrid_bolepix'
    }
  };
  
  // Adicionar split/afiliados se disponível
  if (affiliateIds && affiliateIds.length > 0) {
    subscriptionPayload.split_rules = affiliateIds.map(id => ({
      affiliate_id: id,
      percentage: 10 // Configurável conforme regra do negócio
    }));
    console.log('[VINDI] Adding split rules for affiliates (bolepix):', affiliateIds);
  }

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
  const charges = firstBill?.charges || [];

  console.log('[VINDI-BOLEPIX] All charges:', JSON.stringify(charges, null, 2));

  // Extrair dados tanto do PIX quanto do boleto
  const bolepixData: any = {};
  
  for (const charge of charges) {
    const paymentMethod = charge.payment_method.code;
    
    if (paymentMethod === 'pix') {
      const pixCode = charge.qr_code || 
                      charge.pix_code || 
                      charge.last_transaction?.gateway_response_fields?.qr_code_text;
      const qrCodeUrl = charge.pix_qr_url || 
                        charge.last_transaction?.gateway_response_fields?.qr_code_url;
      
      bolepixData.pix = {
        qr_code: pixCode,
        qr_code_url: qrCodeUrl,
        expires_at: charge.due_at
      };
    } else if (paymentMethod === 'bank_slip') {
      bolepixData.boleto = {
        url: charge.print_url,
        barcode: charge.code,
        due_date: charge.due_at
      };
    }
  }

  console.log('[VINDI-BOLEPIX] Extracted bolepix data:', bolepixData);

  return {
    success: true,
    subscription_id: subscription.id,
    customer_id: customer.id,
    bolepix_data: bolepixData,
    status: charges[0]?.status || 'processing'
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

    // Step 2: Process affiliates/split (opcional conforme especificação)
    const affiliateIds = await processAffiliates(clinicData, planData);
    if (affiliateIds) {
      console.log('[VINDI-CHECKOUT] Affiliates processed:', affiliateIds);
    }

    // Step 3: Process payment based on method
    let result;
    
    if (paymentMethod === 'pix') {
      result = await processPIXSubscription(customer, planData, affiliateIds);
    } else if (paymentMethod === 'boleto') {
      result = await processBoletoSubscription(customer, planData, affiliateIds);
    } else if (paymentMethod === 'bolepix') {
      // Bolepix: híbrido boleto + PIX conforme especificação
      result = await processBolepixSubscription(customer, planData, affiliateIds);
    } else if (paymentMethod === 'credit_card') {
      if (!cardData) {
        throw new Error('Dados do cartão são obrigatórios');
      }
      result = await processCreditCardSubscription(customer, planData, cardData, installments || 1, affiliateIds);
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