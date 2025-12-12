import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { assertBeneficiarioAccess, HttpError } from "../_shared/beneficiario-access.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface CreateCustomerRequest {
  beneficiario_id: string;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-VINDI-CUSTOMER] ${step}${detailsStr}`);
};

// CPF Validation Function
const isValidCPF = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/\D/g, '');

  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 >= 10) digit1 = 0;
  if (digit1 !== parseInt(cleanCPF.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 >= 10) digit2 = 0;
  if (digit2 !== parseInt(cleanCPF.charAt(10))) return false;

  return true;
};

serve(async (req) => {
  let beneficiarioIdForErrorLog: string | undefined;

  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const body = await req.json();
    const beneficiario_id = body.beneficiario_id;
    beneficiarioIdForErrorLog = beneficiario_id;

    logStep(`🚀 CREATE-VINDI-CUSTOMER - Iniciado para beneficiario_id: ${beneficiario_id}`);

    // Validação prévia de variáveis de ambiente críticas
    const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
    for (const envVar of requiredEnvVars) {
      if (!Deno.env.get(envVar)) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    logStep("🔧 Environment check", {
      hasVindiKey: !!Deno.env.get('VINDI_PRIVATE_KEY'),
      hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
      hasServiceRole: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      hasAnonKey: !!Deno.env.get('SUPABASE_ANON_KEY')
    });

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !userData.user) {
      logStep("❌ User authentication failed", { error: userError });
      throw new Error('User not authenticated');
    }

    logStep("✅ User authenticated", { userId: userData.user.id });

    if (!beneficiario_id) {
      throw new Error('beneficiario_id is required');
    }

    // Service role client for database operations
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    logStep("🔍 Buscando beneficiário", { beneficiario_id, user_id: userData.user.id });

    // Verificar permissão de acesso (matriz/unidade/dono)
    await assertBeneficiarioAccess({
      supabaseService,
      userId: userData.user.id,
      beneficiarioId: beneficiario_id,
    });

    // Get beneficiario with plan details
    const { data: beneficiario, error: beneficiarioError } = await supabaseService
      .from('beneficiarios')
      .select(`
        *,
        plano:planos (*)
      `)
      .eq('id', beneficiario_id)
      .single();

    if (beneficiarioError || !beneficiario) {
      logStep("❌ Beneficiário não encontrado", {
        error: beneficiarioError,
        beneficiario_id,
        user_id: userData.user.id
      });
      throw new Error('Erro ao carregar dados do beneficiário');
    }

    logStep("📋 Beneficiário encontrado", {
      id: beneficiario.id,
      nome: beneficiario.nome?.substring(0, 20) + '...',
      status: beneficiario.status,
      hasPlano: !!beneficiario.plano,
      valorPlano: beneficiario.valor_plano
    });

    if (beneficiario.status !== 'ativo') {
      logStep("❌ Status inválido", { status: beneficiario.status });
      throw new Error('Beneficiário deve estar ativo para criar cliente');
    }

    // Validate required fields
    if (!beneficiario.nome || !beneficiario.cpf || !beneficiario.email) {
      logStep("❌ Campos obrigatórios ausentes", {
        hasNome: !!beneficiario.nome,
        hasCpf: !!beneficiario.cpf,
        hasEmail: !!beneficiario.email
      });
      throw new Error('Beneficiário deve ter nome, CPF e email');
    }

    // Validate CPF
    if (!isValidCPF(beneficiario.cpf)) {
      logStep("❌ CPF inválido", { cpf: beneficiario.cpf });
      throw new Error(`CPF inválido: ${beneficiario.cpf}. Por favor, verifique o CPF cadastrado.`);
    }

    logStep("✅ CPF válido", { cpf: beneficiario.cpf });

    if (!beneficiario.plano || !beneficiario.plano.nome) {
      logStep("❌ Plano não encontrado", { plano: beneficiario.plano });
      throw new Error('Plano do beneficiário não encontrado');
    }

    if (!beneficiario.valor_plano || beneficiario.valor_plano <= 0) {
      logStep("❌ Valor do plano inválido", { valor_plano: beneficiario.valor_plano });
      throw new Error('Valor do plano deve ser maior que zero');
    }

    // Get Vindi plan ID for future subscription (optional)
    const vindiPlanId = (beneficiario.plano as any).vindi_plan_id;
    const vindiProductId = (beneficiario.plano as any).vindi_product_id;

    if (!vindiPlanId) {
      logStep("⚠️ Plan missing vindi_plan_id - checkout será criado mas precisará de configuração posterior", {
        plano: beneficiario.plano.nome,
        plan_id: beneficiario.plano.id
      });
      // Não bloquear a criação do checkout, apenas avisar
    } else {
      logStep("✅ Plan has vindi_plan_id configured", { vindi_plan_id: vindiPlanId });
    }

    logStep("✅ Beneficiário validado", {
      id: beneficiario.id,
      nome: beneficiario.nome,
      email: beneficiario.email,
      valor_plano: beneficiario.valor_plano,
      vindi_plan_id: vindiPlanId
    });

    // Get Vindi API configuration
    const vindiApiKey = Deno.env.get('VINDI_PRIVATE_KEY') || Deno.env.get('VINDI_API_KEY');
    const vindiEnvironment = Deno.env.get('VINDI_ENVIRONMENT') || 'production';

    if (!vindiApiKey) {
      throw new Error('VINDI_PRIVATE_KEY ou VINDI_API_KEY não configurada');
    }

    // Dynamic API URLs for sandbox/production
    const VINDI_API_URLS = {
      sandbox: 'https://sandbox-app.vindi.com.br/api/v1',
      production: 'https://app.vindi.com.br/api/v1'
    };

    const vindiApiUrl = VINDI_API_URLS[vindiEnvironment as keyof typeof VINDI_API_URLS] || VINDI_API_URLS.production;
    logStep(`🌐 Using Vindi ${vindiEnvironment} environment`, { url: vindiApiUrl });

    // ========================================
    // STEP 1: CREATE OR GET VINDI CUSTOMER
    // ========================================
    let vindiCustomerId: number;

    logStep("🔍 Searching for existing Vindi customer");
    const customerSearchResponse = await fetch(`${vindiApiUrl}/customers?query=registry_code:${beneficiario.cpf}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(vindiApiKey + ':')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!customerSearchResponse.ok) {
      throw new Error('Erro ao buscar cliente na Vindi');
    }

    const existingCustomers = await customerSearchResponse.json();
    const existingCustomer = existingCustomers.customers?.find((customer: any) =>
      customer.registry_code === beneficiario.cpf
    );

    if (existingCustomer) {
      vindiCustomerId = existingCustomer.id;
      logStep("✅ Found existing Vindi customer", { vindiCustomerId });

      // ✅ CRITICAL: Validate existing customer has complete address for PIX
      const hasCompleteAddress = existingCustomer.address &&
        existingCustomer.address.street &&
        existingCustomer.address.zipcode &&
        existingCustomer.address.city &&
        existingCustomer.address.state &&
        existingCustomer.address.zipcode.replace(/\D/g, '').length === 8;

      if (!hasCompleteAddress) {
        logStep("⚠️ Existing customer missing complete address, updating for PIX compatibility");

        // Update customer with complete address required by Yapay gateway
        const updateCustomerPayload = {
          address: {
            street: beneficiario.endereco || 'Rua Consolação',
            number: beneficiario.numero || '100',
            neighborhood: beneficiario.bairro || 'Consolação',
            city: beneficiario.cidade || 'São Paulo',
            state: beneficiario.estado || 'SP',
            zipcode: (() => {
              const cep = beneficiario.cep || '01302000';
              const cleanCep = cep.replace(/\D/g, '');
              return cleanCep.length === 8 ? cleanCep : '01302000';
            })(),
            country: 'BR'
          }
        };

        const updateResponse = await fetch(`${vindiApiUrl}/customers/${vindiCustomerId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Basic ${btoa(vindiApiKey + ':')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateCustomerPayload),
        });

        if (!updateResponse.ok) {
          const updateError = await updateResponse.json();
          logStep("⚠️ Failed to update customer address", { error: updateError });
        } else {
          logStep("✅ Customer address updated successfully");
        }
      }
    } else {
      logStep("🆕 Creating new Vindi customer");

      // Create new customer with complete address (required for PIX)
      const customerData = {
        name: beneficiario.nome,
        email: beneficiario.email,
        registry_code: beneficiario.cpf,
        phone: beneficiario.telefone || '',
        address: {
          street: beneficiario.endereco || 'Rua Consolação',
          number: beneficiario.numero || '100',
          neighborhood: beneficiario.bairro || 'Consolação',
          city: beneficiario.cidade || 'São Paulo',
          state: beneficiario.estado || 'SP',
          zipcode: (() => {
            const cep = beneficiario.cep || '01302000';
            const cleanCep = cep.replace(/\D/g, '');
            return cleanCep.length === 8 ? cleanCep : '01302000';
          })(),
          country: 'BR'
        }
      };

      // Validate customer data before sending
      logStep("🔍 Customer data validation", {
        hasName: !!customerData.name,
        hasEmail: !!customerData.email,
        hasCpf: !!customerData.registry_code,
        addressValidation: {
          street: customerData.address.street,
          zipcode: customerData.address.zipcode,
          zipcodeLength: customerData.address.zipcode.length,
          city: customerData.address.city,
          state: customerData.address.state,
          isZipcodeValid: /^\d{8}$/.test(customerData.address.zipcode)
        }
      });

      const customerResponse = await fetch(`${vindiApiUrl}/customers`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(vindiApiKey + ':')}`,
          'Content-Type': 'application/json',
          'User-Agent': 'MedPass-Sistema/1.0'
        },
        body: JSON.stringify(customerData),
      });

      const customerResult = await customerResponse.json();

      if (!customerResponse.ok) {
        logStep("❌ Failed to create Vindi customer", { error: customerResult });
        throw new Error(`Erro ao criar cliente Vindi: ${JSON.stringify(customerResult)}`);
      }

      if (!customerResult.customer || !customerResult.customer.id) {
        throw new Error('Cliente criado mas ID não retornado pela Vindi');
      }

      vindiCustomerId = customerResult.customer.id;
      logStep("✅ Vindi customer created successfully", { vindiCustomerId });
    }

    // ========================================
    // STEP 2: CREATE SUBSCRIPTION RECORD (NO VINDI SUBSCRIPTION YET!)
    // ========================================
    logStep("📝 Creating local subscription record");

    const subscriptionData = {
      user_id: userData.user.id,
      plan_id: beneficiario.plano.id,
      customer_name: beneficiario.nome,
      customer_email: beneficiario.email,
      customer_document: beneficiario.cpf,
      payment_method: 'pending', // Will be updated when payment method is chosen
      status: 'pending', // Will be 'pending_payment' after choosing payment method
      installments: 1, // Default, can be changed in checkout
      metadata: {
        plan_name: beneficiario.plano.nome,
        plan_price: beneficiario.valor_plano,
        vindi_customer_id: vindiCustomerId,
        vindi_plan_id: vindiPlanId || null,
        vindi_product_id: vindiProductId || null,
        generated_from: 'create-vindi-customer',
        needs_vindi_plan_config: !vindiPlanId
      }
    };

    const { data: subscriptionRecord, error: subscriptionError } = await supabaseService
      .from('subscriptions')
      .insert(subscriptionData)
      .select()
      .single();

    if (subscriptionError) {
      logStep("❌ Failed to create subscription record", { error: subscriptionError });
      throw new Error('Erro ao criar registro de assinatura: ' + subscriptionError.message);
    }

    logStep("✅ Subscription record created", { subscriptionId: subscriptionRecord.id });

    // ========================================
    // STEP 3: CREATE CHECKOUT TOKEN
    // ========================================
    logStep("🔗 Creating checkout token");

    const checkoutToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Token valid for 24 hours

    // Criar dados do checkout link
    const insertData = {
      token: checkoutToken,
      subscription_id: subscriptionRecord.id,
      user_id: userData.user.id,
      expires_at: expiresAt.toISOString(),
      is_used: false
    };

    logStep("✅ Criando checkout link com user_id");

    const { data: checkoutLinkData, error: checkoutError } = await supabaseService
      .from('subscription_checkout_links')
      .insert(insertData)
      .select()
      .single();

    if (checkoutError) {
      logStep("❌ Failed to create checkout link", { error: checkoutError });
      throw new Error('Erro ao criar link de checkout: ' + checkoutError.message);
    }

    logStep("✅ Checkout link created", { token: checkoutToken });

    // ========================================
    // STEP 4: GENERATE CHECKOUT URL
    // ========================================
    // Priorizar URL de produção sobre headers que podem estar incorretos
    const origin = req.headers.get('origin');
    let baseUrl = 'https://www.medpassbeneficios.com.br';

    // Usar origin apenas se for localhost (desenvolvimento)
    if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      baseUrl = origin;
    }

    const checkoutUrl = `${baseUrl}/subscription-checkout/${checkoutToken}`;

    logStep("🔗 Checkout URL gerada", {
      origin,
      baseUrl,
      checkoutUrl: `${checkoutUrl.substring(0, 80)}...`
    });

    // Update beneficiary with checkout link
    const { error: updateError } = await supabaseService
      .from('beneficiarios')
      .update({
        checkout_link: checkoutUrl
      })
      .eq('id', beneficiario_id);

    if (updateError) {
      logStep("⚠️ Warning: Failed to update beneficiary with checkout link", { error: updateError });
    }

    logStep("🎉 Create Vindi customer completed successfully");

    // ========================================
    // RETURN RESPONSE
    // ========================================
    const responseData = {
      success: true,
      message: "Cliente criado na Vindi e checkout preparado",
      vindi_customer_id: vindiCustomerId,
      checkout_url: checkoutUrl,
      checkout_token: checkoutToken,
      subscription_id: subscriptionRecord.id,
      expires_at: expiresAt.toISOString(),
      next_step: "Acesse o checkout para escolher método de pagamento e criar assinatura"
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("❌ ERROR in create-vindi-customer", {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      beneficiario_id: beneficiarioIdForErrorLog || 'unknown'
    });

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      debug_info: {
        function: 'create-vindi-customer',
        beneficiario_id: beneficiarioIdForErrorLog || 'unknown',
        timestamp: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error instanceof HttpError ? error.status : 500,
    });
  }
});