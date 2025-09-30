import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface CustomerData {
  name: string;
  email: string;
  document: string;
  documentType?: 'cpf' | 'cnpj';
  phone?: string;
  address?: {
    street: string;
    number: string;
    neighborhood?: string;
    city: string;
    state: string;
    zipcode: string;
  };
}

interface CardData {
  holder_name: string;
  number: string; // gateway_token from frontend tokenization
  cvv: string;
  expiry_month: string;
  expiry_year: string;
}

interface PlanData {
  id: string;
  name: string;
  price: number;
  vindi_plan_id?: number;
  vindi_product_id?: string;
}

interface CheckoutRequest {
  clinicData: CustomerData;
  planData: PlanData;
  paymentMethod: 'credit_card' | 'pix' | 'boleto' | 'bolepix';
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

console.log(`🔧 Using Vindi ${VINDI_ENVIRONMENT} environment: ${VINDI_API_URL}`);

/**
 * 1. CONSULTAR OU CRIAR CLIENTE
 * Seguindo documentação Vindi: GET /customers?query[email] ou POST /customers
 */
async function createOrGetCustomer(customerData: CustomerData) {
  console.log(`🔍 [VINDI-STEP-1] Buscando cliente: ${customerData.email}`);

  // 1.1 Consultar cliente existente
  const searchUrl = `${VINDI_API_URL}/customers?query[email]=${encodeURIComponent(customerData.email)}`;

  const searchResponse = await fetch(searchUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${btoa(VINDI_PRIVATE_KEY + ':')}`,
      'Content-Type': 'application/json',
      'User-Agent': 'MedPass-Sistema/1.0'
    }
  });

  if (!searchResponse.ok) {
    const errorText = await searchResponse.text();
    throw new Error(`Erro ao buscar cliente: ${searchResponse.status} - ${errorText}`);
  }

  const searchResult = await searchResponse.json();

  // 1.2 Se cliente existe, retornar
  if (searchResult.customers && searchResult.customers.length > 0) {
    const existingCustomer = searchResult.customers[0];
    console.log(`✅ [VINDI-STEP-1] Cliente encontrado: ${existingCustomer.id}`);
    return existingCustomer;
  }

  // 1.3 Se não existe, criar novo cliente
  console.log(`🆕 [VINDI-STEP-1] Criando novo cliente`);

  const customerPayload = {
    name: customerData.name,
    email: customerData.email,
    registry_code: customerData.document.replace(/[^\d]/g, ''), // CPF/CNPJ apenas números
    phone: customerData.phone?.replace(/[^\d]/g, ''),
    address: customerData.address ? {
      street: customerData.address.street,
      number: customerData.address.number,
      zipcode: customerData.address.zipcode.replace(/[^\d]/g, ''),
      city: customerData.address.city,
      state: customerData.address.state,
      country: 'BR'
    } : undefined
  };

  const createResponse = await fetch(`${VINDI_API_URL}/customers`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(VINDI_PRIVATE_KEY + ':')}`,
      'Content-Type': 'application/json',
      'User-Agent': 'MedPass-Sistema/1.0'
    },
    body: JSON.stringify(customerPayload)
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Erro ao criar cliente: ${createResponse.status} - ${errorText}`);
  }

  const createResult = await createResponse.json();

  if (!createResult.customer) {
    throw new Error('Cliente não foi criado corretamente');
  }

  console.log(`✅ [VINDI-STEP-1] Cliente criado: ${createResult.customer.id}`);
  return createResult.customer;
}

/**
 * 2. CRIAR PAYMENT PROFILE (opcional, apenas para cartão)
 * Seguindo documentação Vindi: POST /payment_profiles
 */
async function createPaymentProfile(customer: any, cardData: CardData): Promise<any> {
  console.log(`💳 [VINDI-STEP-2] Criando payment profile para cliente: ${customer.id}`);

  const paymentProfilePayload = {
    holder_name: cardData.holder_name,
    card_expiration: `${cardData.expiry_month}/${cardData.expiry_year}`,
    card_number_token: cardData.number, // gateway_token da tokenização frontend
    customer_id: customer.id,
    payment_method_code: 'credit_card'
  };

  const response = await fetch(`${VINDI_API_URL}/payment_profiles`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(VINDI_PRIVATE_KEY + ':')}`,
      'Content-Type': 'application/json',
      'User-Agent': 'MedPass-Sistema/1.0'
    },
    body: JSON.stringify(paymentProfilePayload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao criar payment profile: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  if (!result.payment_profile) {
    throw new Error('Payment profile não foi criado corretamente');
  }

  console.log(`✅ [VINDI-STEP-2] Payment profile criado: ${result.payment_profile.id}`);
  return result.payment_profile;
}

/**
 * 3. CRIAR ASSINATURA
 * Seguindo documentação Vindi: POST /subscriptions
 */
async function createSubscription(
  customer: any,
  planData: PlanData,
  paymentMethod: string,
  paymentProfile?: any,
  cardData?: CardData
) {
  console.log(`📝 [VINDI-STEP-3] Criando assinatura para plano: ${planData.vindi_plan_id}`);

  if (!planData.vindi_plan_id) {
    throw new Error('vindi_plan_id não encontrado no plano selecionado');
  }

  // Preparar payload base da assinatura
  const subscriptionPayload: any = {
    plan_id: planData.vindi_plan_id,
    customer_id: customer.id,
    payment_method_code: paymentMethod,
    code: `medpass_${customer.id}_${Date.now()}`, // código único
    metadata: {
      origem: 'checkout_transparente',
      sistema: 'medpass',
      plano_interno_id: planData.id
    }
  };

  // Adicionar método de pagamento específico
  if (paymentMethod === 'credit_card') {
    if (paymentProfile) {
      subscriptionPayload.payment_profile_id = paymentProfile.id;
    } else if (cardData) {
      // Usar gateway_token diretamente (alternativa ao payment_profile)
      subscriptionPayload.gateway_token = cardData.number;
    } else {
      throw new Error('Payment profile ou gateway_token obrigatório para cartão de crédito');
    }
  }
  // Para PIX, Boleto, BoletoPIX não precisa de dados adicionais

  console.log(`📤 [VINDI-STEP-3] Enviando payload:`, {
    ...subscriptionPayload,
    gateway_token: subscriptionPayload.gateway_token ? '[HIDDEN]' : undefined
  });

  const response = await fetch(`${VINDI_API_URL}/subscriptions`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(VINDI_PRIVATE_KEY + ':')}`,
      'Content-Type': 'application/json',
      'User-Agent': 'MedPass-Sistema/1.0'
    },
    body: JSON.stringify(subscriptionPayload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ [VINDI-STEP-3] Erro na criação da assinatura: ${response.status}`);
    throw new Error(`Erro ao criar assinatura: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  if (!result.subscription) {
    throw new Error('Assinatura não foi criada corretamente');
  }

  console.log(`✅ [VINDI-STEP-3] Assinatura criada: ${result.subscription.id}`);
  console.log(`📄 [VINDI-STEP-3] Fatura: ${result.bill?.id}, Status: ${result.bill?.status}`);

  return result;
}

/**
 * 4. PROCESSAR DADOS DE PAGAMENTO
 * Extrair informações de PIX/Boleto das charges
 */
function processPaymentData(subscriptionResult: any) {
  console.log(`🔍 [VINDI-STEP-4] Processando dados de pagamento`);

  const bill = subscriptionResult.bill;
  if (!bill || !bill.charges || bill.charges.length === 0) {
    console.warn(`⚠️ [VINDI-STEP-4] Nenhuma charge encontrada na fatura`);
    return null;
  }

  const charge = bill.charges[0];
  const lastTransaction = charge.last_transaction;

  if (!lastTransaction) {
    console.warn(`⚠️ [VINDI-STEP-4] Nenhuma transação encontrada na charge`);
    return null;
  }

  const gatewayFields = lastTransaction.gateway_response_fields;

  // Processar dados PIX
  if (gatewayFields?.qrcode_original_path || gatewayFields?.qrcode_path) {
    console.log(`✅ [VINDI-STEP-4] Dados PIX encontrados`);

    return {
      type: 'pix',
      qr_code: gatewayFields.qrcode_original_path, // Código PIX para cópia
      qr_code_url: gatewayFields.qrcode_path, // URL da imagem QR Code
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
      pix_copia_cola: gatewayFields.qrcode_original_path // Código copia e cola
    };
  }

  // Processar dados Boleto
  if (gatewayFields?.barcode || gatewayFields?.bank_slip_url) {
    console.log(`✅ [VINDI-STEP-4] Dados Boleto encontrados`);

    return {
      type: 'boleto',
      barcode: gatewayFields.barcode,
      bank_slip_url: gatewayFields.bank_slip_url,
      expires_at: gatewayFields.due_date
    };
  }

  console.log(`ℹ️ [VINDI-STEP-4] Pagamento por cartão - dados não necessários`);
  return null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`🚀 [VINDI-CHECKOUT] Iniciando checkout transparente`);

    if (!VINDI_PRIVATE_KEY) {
      throw new Error('VINDI_PRIVATE_KEY não configurada');
    }

    const requestBody: CheckoutRequest = await req.json();
    const { clinicData, planData, paymentMethod, cardData, installments } = requestBody;

    console.log(`📋 [VINDI-CHECKOUT] Dados recebidos:`, {
      customer: clinicData.email,
      plan: planData.name,
      method: paymentMethod,
      vindi_plan_id: planData.vindi_plan_id
    });

    // Validações básicas
    if (!clinicData || !planData || !paymentMethod) {
      throw new Error('Dados obrigatórios ausentes');
    }

    if (!planData.vindi_plan_id) {
      throw new Error(`Plano "${planData.name}" não possui vindi_plan_id configurado`);
    }

    if (paymentMethod === 'credit_card' && !cardData) {
      throw new Error('Dados do cartão obrigatórios para pagamento com cartão');
    }

    // ===== FLUXO VINDI OFICIAL =====

    // PASSO 1: Consultar ou criar cliente
    const customer = await createOrGetCustomer(clinicData);

    // PASSO 2: Criar payment profile (apenas para cartão)
    let paymentProfile = null;
    if (paymentMethod === 'credit_card' && cardData) {
      paymentProfile = await createPaymentProfile(customer, cardData);
    }

    // PASSO 3: Criar assinatura
    const subscriptionResult = await createSubscription(
      customer,
      planData,
      paymentMethod,
      paymentProfile,
      cardData
    );

    // PASSO 4: Processar dados de pagamento
    const paymentData = processPaymentData(subscriptionResult);

    // ===== RESPOSTA FINAL =====

    // Extract gateway response details for better error handling
    const charge = subscriptionResult.bill?.charges?.[0];
    const lastTransaction = charge?.last_transaction;
    const gatewayFields = lastTransaction?.gateway_response_fields;

    const response = {
      success: true,
      subscription_id: subscriptionResult.subscription.id,
      customer_id: customer.id,
      bill_id: subscriptionResult.bill?.id,
      charge_id: charge?.id,
      status: subscriptionResult.subscription.status,
      payment_method: paymentMethod,

      // Gateway response details
      gateway_message: lastTransaction?.gateway_message || null,
      gateway_code: lastTransaction?.gateway_response_code || null,
      transaction_status: lastTransaction?.status || null,
      charge_status: charge?.status || null,

      // Dados específicos do método de pagamento
      pix_data: paymentData?.type === 'pix' ? paymentData : undefined,
      boleto_data: paymentData?.type === 'boleto' ? paymentData : undefined,

      // Metadados
      environment: VINDI_ENVIRONMENT,
      created_at: new Date().toISOString()
    };

    console.log(`🎉 [VINDI-CHECKOUT] Checkout concluído com sucesso!`);
    console.log(`📊 [VINDI-CHECKOUT] Resumo:`, {
      subscription_id: response.subscription_id,
      customer_id: response.customer_id,
      status: response.status,
      payment_method: response.payment_method,
      has_pix: !!response.pix_data,
      has_boleto: !!response.boleto_data
    });

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error(`❌ [VINDI-CHECKOUT] Erro no checkout:`, error);

    // Extract detailed error information
    let errorMessage = 'Erro desconhecido';
    let gatewayCode: string | null = null;
    let gatewayMessage: string | null = null;

    if (error instanceof Error) {
      errorMessage = error.message;

      // Try to extract Vindi error details from error message
      const vindiErrorMatch = errorMessage.match(/Vindi API error: (.+)/);
      if (vindiErrorMatch) {
        errorMessage = vindiErrorMatch[1];
      }

      // Try to parse JSON error for gateway details
      try {
        const errorTextMatch = errorMessage.match(/\{.*\}/);
        if (errorTextMatch) {
          const parsedError = JSON.parse(errorTextMatch[0]);
          if (parsedError.errors?.[0]) {
            errorMessage = parsedError.errors[0].message || errorMessage;
            gatewayCode = parsedError.errors[0].id || null;
          }
        }
      } catch (parseError) {
        // Continue with original error message
      }
    }

    const errorResponse = {
      success: false,
      error: errorMessage,
      gateway_code: gatewayCode,
      gateway_message: gatewayMessage,
      environment: VINDI_ENVIRONMENT,
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(errorResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});