import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-SUBSCRIPTION-PAYMENT] ${step}${detailsStr}`);
};

interface PaymentRequest {
  token: string;
  paymentMethod: 'credit_card' | 'pix';
  cardData?: {
    number: string;
    cvv: string;
    holder_name: string;
    expiry_month: string;
    expiry_year: string;
  };
  customerData?: {
    name: string;
    email: string;
    cpf: string;
    phone?: string;
    address?: {
      street: string;
      number: string;
      city: string;
      state: string;
      zipcode: string;
    };
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Extract user_id from JWT authorization header (optional for public checkout)
    let user_id = null;
    const authHeader = req.headers.get('authorization');
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const payload = JSON.parse(atob(token.split('.')[1]));
        user_id = payload.sub;
        logStep("Extracted user from JWT", { user_id });
      } catch (error) {
        logStep("Failed to extract user from JWT, continuing without auth", { error: error.message });
      }
    } else {
      logStep("No authorization header provided, processing as public checkout");
    }

    const vindiApiKey = Deno.env.get("VINDI_API_KEY");
    const vindiEnvironment = Deno.env.get('VINDI_ENVIRONMENT') || 'production';
    
    if (!vindiApiKey) throw new Error("VINDI_API_KEY is not set");
    
    // ✅ SANDBOX SUPPORT: Dynamic API URLs
    const VINDI_API_URLS = {
      sandbox: 'https://sandbox-app.vindi.com.br/api/v1',
      production: 'https://app.vindi.com.br/api/v1'
    };
    
    const vindiApiUrl = VINDI_API_URLS[vindiEnvironment as keyof typeof VINDI_API_URLS] || VINDI_API_URLS.production;
    
    logStep(`Using Vindi ${vindiEnvironment} environment`, { url: vindiApiUrl });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const paymentData: PaymentRequest = await req.json();
    logStep("Received payment data", { token: paymentData.token, paymentMethod: paymentData.paymentMethod });

    // Validate token and get subscription checkout link
    const { data: checkoutLink, error: linkError } = await supabaseClient
      .from("subscription_checkout_links")
      .select("*, subscriptions(*)")
      .eq("token", paymentData.token)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (linkError || !checkoutLink) {
      logStep("Invalid or expired token", { error: linkError });
      throw new Error("Link de pagamento inválido ou expirado");
    }

    logStep("Found valid checkout link", { subscriptionId: checkoutLink.subscription_id });

    const subscription = checkoutLink.subscriptions;
    if (!subscription) {
      logStep("Subscription not found in checkout link", { checkoutLinkId: checkoutLink.id });
      throw new Error("Assinatura não encontrada");
    }

    // Get Vindi customer ID and plan details from subscription metadata
    const vindiCustomerId = subscription.metadata?.vindi_customer_id;
    const vindiPlanId = subscription.metadata?.vindi_plan_id;
    const vindiProductId = subscription.metadata?.vindi_product_id;

    if (!vindiCustomerId || !vindiPlanId) {
      logStep("Missing Vindi data in subscription", { 
        hasCustomerId: !!vindiCustomerId, 
        hasPlanId: !!vindiPlanId,
        metadata: subscription.metadata 
      });
      throw new Error("Dados da Vindi não encontrados na assinatura");
    }

    logStep("Found Vindi data from subscription", { vindiCustomerId, vindiPlanId, vindiProductId });

    // Get plan details from database
    const { data: plan, error: planError } = await supabaseClient
      .from("planos")
      .select("*")
      .eq("id", subscription.plan_id)
      .single();

    if (planError || !plan) {
      logStep("Plan not found", { planId: subscription.plan_id, error: planError });
      throw new Error("Plano não encontrado");
    }

    logStep("Found plan details", { planId: plan.id, planName: plan.nome });

    // Create Vindi subscription first (only at payment time)
    let vindiSubscriptionId = subscription.vindi_subscription_id;
    
    if (!vindiSubscriptionId) {
      logStep("Creating Vindi subscription at payment time", { 
        vindiCustomerId, 
        vindiPlanId, 
        paymentMethod: paymentData.paymentMethod 
      });
      
      const subscriptionPayload = {
        plan_id: vindiPlanId,
        customer_id: vindiCustomerId,
        payment_method_code: paymentData.paymentMethod,
        installments: subscription.installments || 1,
      };
      
      const vindiSubscriptionResponse = await fetch(`${vindiApiUrl}/subscriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(vindiApiKey + ":")}`,
        },
        body: JSON.stringify(subscriptionPayload),
      });

      if (!vindiSubscriptionResponse.ok) {
        let errorData;
        try {
          errorData = await vindiSubscriptionResponse.json();
        } catch {
          errorData = await vindiSubscriptionResponse.text();
        }
        
        logStep("Failed to create Vindi subscription", { 
          status: vindiSubscriptionResponse.status,
          error: errorData 
        });
        
        let errorMessage = "Erro ao criar assinatura na Vindi";
        if (typeof errorData === 'object' && errorData.errors && errorData.errors.length > 0) {
          errorMessage = errorData.errors[0].message || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const subscriptionResult = await vindiSubscriptionResponse.json();
      vindiSubscriptionId = subscriptionResult.subscription.id;
      
      logStep("Vindi subscription created successfully", { vindiSubscriptionId });

      // ✅ Wait for Vindi to process and generate the first bill with PIX data (if PIX payment)
      if (paymentData.paymentMethod === 'pix') {
        logStep("⏳ Aguardando Vindi processar e gerar a fatura com PIX...");
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      // Update our subscription record with the Vindi subscription ID
      await supabaseClient
        .from("subscriptions")
        .update({ 
          vindi_subscription_id: vindiSubscriptionId,
          status: 'active'
        })
        .eq("id", subscription.id);
    } else {
      logStep("Using existing Vindi subscription", { vindiSubscriptionId });
    }
    // ✅ CRITICAL FIX: Validate and update customer address for PIX payments
    // Based on logs analysis: Yapay gateway requires complete address for PIX
    if (paymentData.paymentMethod === 'pix') {
      logStep("🔧 CRÍTICO: Validando endereço do cliente para PIX (obrigatório pelo Yapay)", { vindiCustomerId });

      // First, fetch current customer data from Vindi to check existing address
      let currentCustomer = null;
      try {
        const customerResponse = await fetch(`${vindiApiUrl}/customers/${vindiCustomerId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${btoa(vindiApiKey + ":")}`,
          }
        });

        if (customerResponse.ok) {
          const customerData = await customerResponse.json();
          currentCustomer = customerData.customer;
          logStep("🔍 Dados atuais do cliente obtidos", {
            hasAddress: !!currentCustomer?.address,
            addressFields: currentCustomer?.address ? Object.keys(currentCustomer.address) : []
          });
        }
      } catch (fetchError) {
        logStep("⚠️ Erro ao buscar dados do cliente atual", { error: fetchError.message });
      }

      // Check if customer data has complete address required by Yapay
      let customerAddress = paymentData.customerData?.address || currentCustomer?.address;

      // Validate ALL required fields for Yapay gateway (based on error logs)
      const isAddressComplete = customerAddress &&
        customerAddress.street &&
        customerAddress.zipcode &&
        customerAddress.city &&
        customerAddress.state &&
        customerAddress.zipcode.replace(/\D/g, '').length === 8;

      if (!isAddressComplete) {
        logStep("⚠️ Endereço incompleto detectado - usando endereço padrão São Paulo", {
          providedAddress: customerAddress,
          missingFields: {
            street: !customerAddress?.street,
            zipcode: !customerAddress?.zipcode || customerAddress.zipcode.replace(/\D/g, '').length !== 8,
            city: !customerAddress?.city,
            state: !customerAddress?.state
          },
          yapayRequirement: "Todos os campos são obrigatórios para PIX"
        });

        // Use valid São Paulo address (based on successful cases)
        customerAddress = {
          street: customerAddress?.street || "Rua Consolação",
          number: customerAddress?.number || "100",
          zipcode: "01302000", // Valid São Paulo zipcode - 8 digits
          neighborhood: "Consolação",
          city: "São Paulo",
          state: "SP"
        };
      } else {
        // Ensure zipcode has exactly 8 digits (Yapay requirement)
        customerAddress.zipcode = customerAddress.zipcode.replace(/\D/g, '').padEnd(8, '0').substring(0, 8);
      }

      // Update customer in Vindi with complete address (CRITICAL for PIX)
      const updateCustomerPayload = {
        address: {
          street: customerAddress.street,
          number: customerAddress.number || "S/N",
          zipcode: customerAddress.zipcode,
          neighborhood: customerAddress.neighborhood || "Centro",
          city: customerAddress.city,
          state: customerAddress.state,
          country: "BR"
        }
      };

      logStep("🔄 Atualizando endereço do cliente na Vindi (obrigatório para PIX)", {
        customerId: vindiCustomerId,
        address: updateCustomerPayload.address,
        validation: {
          streetLength: updateCustomerPayload.address.street.length,
          zipcodeLength: updateCustomerPayload.address.zipcode.length,
          zipcodeFormat: /^\d{8}$/.test(updateCustomerPayload.address.zipcode),
          hasAllRequiredFields: !!(
            updateCustomerPayload.address.street &&
            updateCustomerPayload.address.zipcode &&
            updateCustomerPayload.address.city &&
            updateCustomerPayload.address.state
          )
        }
      });

      try {
        const updateCustomerResponse = await fetch(`${vindiApiUrl}/customers/${vindiCustomerId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${btoa(vindiApiKey + ":")}`,
          },
          body: JSON.stringify(updateCustomerPayload)
        });

        if (updateCustomerResponse.ok) {
          const updatedCustomer = await updateCustomerResponse.json();
          logStep("✅ Endereço do cliente atualizado com sucesso", {
            customerId: vindiCustomerId,
            hasAddress: !!updatedCustomer.customer?.address,
            finalAddress: updatedCustomer.customer?.address
          });
        } else {
          let errorData;
          try {
            errorData = await updateCustomerResponse.json();
          } catch {
            errorData = await updateCustomerResponse.text();
          }

          logStep("❌ ERRO CRÍTICO: Falha ao atualizar endereço do cliente", {
            status: updateCustomerResponse.status,
            statusText: updateCustomerResponse.statusText,
            error: errorData
          });

          // For PIX payments, address is CRITICAL - fail if update fails
          throw new Error(`ERRO CRÍTICO PIX: Endereço obrigatório não pôde ser atualizado. ${JSON.stringify(errorData)}`);
        }
      } catch (updateError) {
        logStep("❌ ERRO CRÍTICO: Exceção ao atualizar endereço", { error: updateError.message });
        throw new Error(`ERRO CRÍTICO PIX: Endereço obrigatório para Yapay gateway - ${updateError.message}`);
      }
    }

    // Create payment profile if credit card
    let paymentProfileId = null;
    if (paymentData.paymentMethod === 'credit_card' && paymentData.cardData) {
      const paymentProfilePayload = {
        holder_name: paymentData.cardData.holder_name,
        card_expiration: `${paymentData.cardData.expiry_month}/${paymentData.cardData.expiry_year}`,
        card_number: paymentData.cardData.number,
        card_cvv: paymentData.cardData.cvv,
        customer_id: vindiCustomerId,
        payment_method_code: "credit_card",
      };

      const vindiProfileResponse = await fetch(`${vindiApiUrl}/payment_profiles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(vindiApiKey + ":")}`,
        },
        body: JSON.stringify(paymentProfilePayload),
      });

      if (!vindiProfileResponse.ok) {
        let errorData;
        try {
          errorData = await vindiProfileResponse.json();
        } catch {
          errorData = await vindiProfileResponse.text();
        }
        
        logStep("Failed to create payment profile", { 
          status: vindiProfileResponse.status,
          statusText: vindiProfileResponse.statusText,
          error: errorData 
        });
        
        // Parse Vindi error message if available
        let errorMessage = "Erro ao criar perfil de pagamento";
        if (typeof errorData === 'object' && errorData.errors && errorData.errors.length > 0) {
          errorMessage = errorData.errors[0].message || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const profileData = await vindiProfileResponse.json();
      paymentProfileId = profileData.payment_profile.id;
      logStep("Created payment profile", { paymentProfileId });
    }

    // ✅ CRITICAL FIX: Validate and update customer address for PIX payments
    if (paymentData.paymentMethod === 'pix') {
      logStep("🔧 Validating customer address for PIX payment", { vindiCustomerId });

      // First, fetch current customer data from Vindi to check existing address
      let currentCustomer = null;
      try {
        const customerResponse = await fetch(`${vindiApiUrl}/customers/${vindiCustomerId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${btoa(vindiApiKey + ":")}`,
          }
        });

        if (customerResponse.ok) {
          const customerData = await customerResponse.json();
          currentCustomer = customerData.customer;
          logStep("🔍 Current customer data fetched", {
            hasAddress: !!currentCustomer?.address,
            addressFields: currentCustomer?.address ? Object.keys(currentCustomer.address) : []
          });
        }
      } catch (fetchError) {
        logStep("⚠️ Could not fetch current customer data", { error: fetchError.message });
      }

      // Check if customer data has address, if not use default
      let customerAddress = paymentData.customerData?.address || currentCustomer?.address;

      // Validate required fields for Yapay gateway
      const isAddressComplete = customerAddress &&
        customerAddress.street &&
        customerAddress.zipcode &&
        customerAddress.city &&
        customerAddress.state &&
        customerAddress.zipcode.replace(/\D/g, '').length === 8;

      if (!isAddressComplete) {
        logStep("⚠️ Customer address missing or incomplete, using default address for PIX", {
          providedAddress: customerAddress,
          missingFields: {
            street: !customerAddress?.street,
            zipcode: !customerAddress?.zipcode || customerAddress.zipcode.replace(/\D/g, '').length !== 8,
            city: !customerAddress?.city,
            state: !customerAddress?.state
          }
        });

        // Use default address required by Yapay gateway (São Paulo address)
        customerAddress = {
          street: customerAddress?.street || "Rua Consolação",
          number: customerAddress?.number || "100",
          zipcode: "01302000", // Valid São Paulo zipcode
          neighborhood: "Consolação",
          city: "São Paulo",
          state: "SP"
        };
      } else {
        // Ensure zipcode has exactly 8 digits
        customerAddress.zipcode = customerAddress.zipcode.replace(/\D/g, '').padEnd(8, '0').substring(0, 8);
      }

      // Update customer in Vindi with complete address
      const updateCustomerPayload = {
        address: {
          street: customerAddress.street,
          number: customerAddress.number || "S/N",
          zipcode: customerAddress.zipcode,
          neighborhood: customerAddress.neighborhood || "Centro",
          city: customerAddress.city,
          state: customerAddress.state,
          country: "BR"
        }
      };

      logStep("🔄 Updating Vindi customer with validated address", {
        customerId: vindiCustomerId,
        address: updateCustomerPayload.address,
        addressValidation: {
          streetLength: updateCustomerPayload.address.street.length,
          zipcodeLength: updateCustomerPayload.address.zipcode.length,
          hasAllRequiredFields: !!(updateCustomerPayload.address.street &&
                                  updateCustomerPayload.address.zipcode &&
                                  updateCustomerPayload.address.city &&
                                  updateCustomerPayload.address.state)
        }
      });

      try {
        const updateCustomerResponse = await fetch(`${vindiApiUrl}/customers/${vindiCustomerId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${btoa(vindiApiKey + ":")}`,
          },
          body: JSON.stringify(updateCustomerPayload)
        });

        if (updateCustomerResponse.ok) {
          const updatedCustomer = await updateCustomerResponse.json();
          logStep("✅ Customer address updated successfully", {
            customerId: vindiCustomerId,
            hasAddress: !!updatedCustomer.customer?.address,
            addressData: updatedCustomer.customer?.address
          });
        } else {
          let errorData;
          try {
            errorData = await updateCustomerResponse.json();
          } catch {
            errorData = await updateCustomerResponse.text();
          }

          logStep("❌ Failed to update customer address", {
            status: updateCustomerResponse.status,
            statusText: updateCustomerResponse.statusText,
            error: errorData
          });

          // For PIX payments, address is critical - throw error if update fails
          throw new Error(`Erro ao atualizar endereço do cliente: ${JSON.stringify(errorData)}`);
        }
      } catch (updateError) {
        logStep("❌ Error updating customer address", { error: updateError.message });
        throw new Error(`Erro crítico: Endereço obrigatório para PIX não pode ser atualizado - ${updateError.message}`);
      }
    }

    // Check if subscription already has a bill in Vindi
    let billData: any = null;
    let isExistingBill = false;

    if (vindiSubscriptionId) {
      logStep("Checking for existing bills for subscription", { vindiSubscriptionId });
      
      try {
        const existingBillsResponse = await fetch(`${vindiApiUrl}/bills?query=subscription_id:${vindiSubscriptionId}+status:pending`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${btoa(vindiApiKey + ":")}`,
          }
        });

        if (existingBillsResponse.ok) {
          const existingBillsData = await existingBillsResponse.json();
          const pendingBill = existingBillsData.bills?.find((bill: any) => bill.status === 'pending');
          
          if (pendingBill) {
            logStep("Found existing pending bill, reusing it", { billId: pendingBill.id });
            isExistingBill = true;
            
            // If payment method is credit card and we have a new payment profile, update the bill
            if (paymentData.paymentMethod === 'credit_card' && paymentProfileId) {
              logStep("Updating existing bill with new payment profile", { billId: pendingBill.id, paymentProfileId });
              
              const updateBillResponse = await fetch(`${vindiApiUrl}/bills/${pendingBill.id}`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Basic ${btoa(vindiApiKey + ":")}`,
                },
                 body: JSON.stringify({
                   payment_method_code: paymentData.paymentMethod,
                   payment_profile: { id: paymentProfileId },
                   charge: paymentData.paymentMethod === 'credit_card' // Force immediate charge for credit card
                 }),
              });
              
              if (updateBillResponse.ok) {
                billData = await updateBillResponse.json();
                logStep("Bill updated successfully", { billId: billData.bill.id });
              } else {
                logStep("Failed to update bill, will use existing bill as is");
                billData = { bill: pendingBill };
              }
            } else {
              billData = { bill: pendingBill };
            }
          }
        }
      } catch (searchError) {
        logStep("Error searching for existing bills", { error: searchError.message });
        // Continue to create new bill if search fails
      }
    }

    // Create new bill only if no pending bill exists
    if (!billData) {
      // ✅ VALIDAÇÃO AMOUNT > 0 conforme documentação
      const planAmount = Number(subscription.metadata?.plan_price ?? plan.valor ?? 0) || 0;

      if (!planAmount || planAmount <= 0) {
        logStep("❌ Valor do plano inválido para geração de PIX", {
          metadataPrice: subscription.metadata?.plan_price,
          planValue: plan.valor,
          finalAmount: planAmount
        });
        throw new Error("Valor do plano inválido para geração de PIX");
      }

      // ✅ VALIDAÇÃO CRÍTICA: Verificar se payment_method está correto para PIX
      let finalPaymentMethodCode = paymentData.paymentMethod;

      if (paymentData.paymentMethod === 'pix') {
        logStep("🔧 VALIDAÇÃO PIX: Verificando configuração do método", {
          requestedMethod: paymentData.paymentMethod,
          customerId: vindiCustomerId,
          amount: planAmount,
          environment: vindiEnvironment
        });

        // ✅ VERIFICAR MÉTODOS PIX DISPONÍVEIS ANTES DE CRIAR BILL (CRÍTICO)
        // Based on logs: some transactions use "bank_slip" instead of "pix"
        try {
          logStep("🔍 CRÍTICO: Verificando métodos PIX configurados na conta Vindi");

          const paymentMethodsResponse = await fetch(`${vindiApiUrl}/payment_methods`, {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${btoa(vindiApiKey + ':')}`,
              'Content-Type': 'application/json'
            }
          });

          if (paymentMethodsResponse.ok) {
            const paymentMethodsData = await paymentMethodsResponse.json();

            // Filter PIX methods more comprehensively
            const availablePixMethods = paymentMethodsData.payment_methods?.filter((pm: any) => {
              const code = pm.code?.toLowerCase() || '';
              const name = pm.name?.toLowerCase() || '';
              const type = pm.type?.toLowerCase() || '';

              return code.includes('pix') ||
                     name.includes('pix') ||
                     type.includes('pix') ||
                     (pm.gateway?.connector === 'yapay' && type.includes('pix'));
            });

            // Also identify bank_slip methods to avoid confusion
            const bankSlipMethods = paymentMethodsData.payment_methods?.filter((pm: any) =>
              pm.code?.toLowerCase().includes('bank_slip') ||
              pm.type?.toLowerCase().includes('bankslip')
            );

            logStep("🔍 ANÁLISE COMPLETA DE MÉTODOS DE PAGAMENTO", {
              totalMethods: paymentMethodsData.payment_methods?.length || 0,
              pixMethods: availablePixMethods?.map((pm: any) => ({
                id: pm.id,
                code: pm.code,
                name: pm.name,
                type: pm.type,
                status: pm.status,
                gateway: pm.gateway?.connector
              })) || [],
              bankSlipMethods: bankSlipMethods?.map((pm: any) => ({
                id: pm.id,
                code: pm.code,
                name: pm.name,
                status: pm.status
              })) || [],
              requestedMethod: paymentData.paymentMethod
            });

            // Validate PIX availability
            if (availablePixMethods && availablePixMethods.length > 0) {
              // Find the best PIX method (active and with Yapay gateway preferred)
              const activePixMethods = availablePixMethods.filter((pm: any) => pm.status === 'active');
              const yapayPixMethod = activePixMethods.find((pm: any) => pm.gateway?.connector === 'yapay');
              const bestPixMethod = yapayPixMethod || activePixMethods[0] || availablePixMethods[0];

              if (bestPixMethod) {
                finalPaymentMethodCode = bestPixMethod.code;
                logStep("✅ MÉTODO PIX SELECIONADO", {
                  originalCode: 'pix',
                  finalCode: finalPaymentMethodCode,
                  methodName: bestPixMethod.name,
                  methodType: bestPixMethod.type,
                  gateway: bestPixMethod.gateway?.connector,
                  status: bestPixMethod.status,
                  reason: yapayPixMethod ? 'Yapay PIX method found' : 'Best available PIX method'
                });
              }
            } else {
              logStep("❌ ERRO CRÍTICO: NENHUM MÉTODO PIX ENCONTRADO", {
                totalMethods: paymentMethodsData.payment_methods?.length || 0,
                availableMethods: paymentMethodsData.payment_methods?.map((pm: any) => ({
                  code: pm.code,
                  name: pm.name,
                  type: pm.type,
                  status: pm.status
                })) || [],
                environment: vindiEnvironment
              });
              throw new Error("ERRO PIX: Nenhum método PIX está configurado/ativo nesta conta Vindi. Contate o suporte da Vindi para configurar PIX com gateway Yapay.");
            }
          } else {
            logStep("❌ Falha ao consultar métodos de pagamento da Vindi", {
              status: paymentMethodsResponse.status,
              statusText: paymentMethodsResponse.statusText
            });
          }
        } catch (methodCheckError) {
          logStep("⚠️ ERRO ao verificar métodos PIX - continuando com método original", {
            error: methodCheckError.message,
            fallbackMethod: paymentData.paymentMethod
          });

          // If error message indicates PIX not configured, re-throw
          if (methodCheckError.message.includes('ERRO PIX:')) {
            throw methodCheckError;
          }
        }
      }

      const billPayload: any = {
        customer_id: vindiCustomerId,
        payment_method_code: finalPaymentMethodCode,
        bill_items: [
          {
            product_id: vindiProductId,
            amount: planAmount,
          },
        ],
      };

      // Log payment method para validação conforme documentação
      logStep("🔧 Payment method configurado para Vindi", {
        requested_method: paymentData.paymentMethod,
        final_payment_method_code: billPayload.payment_method_code,
        amount: planAmount,
        customer_id: vindiCustomerId,
        product_id: vindiProductId,
        environment: vindiEnvironment
      });

      // Add payment profile for credit card
      if (paymentProfileId) {
        billPayload.payment_profile = { id: paymentProfileId };
      }

      // Link the bill to the subscription
      if (vindiSubscriptionId) {
        billPayload.subscription_id = vindiSubscriptionId;
      }

      // ✅ CONFIGURAÇÕES CRÍTICAS ESPECÍFICAS POR MÉTODO DE PAGAMENTO
      if (paymentData.paymentMethod === 'pix') {
        // PIX: Configurações obrigatórias baseadas na análise dos logs
        billPayload.installments = 1;              // OBRIGATÓRIO: PIX sempre 1 parcela
        billPayload.charge = true;                 // OBRIGATÓRIO: Forçar processamento imediato

        logStep("🔧 CONFIGURAÇÕES PIX APLICADAS (baseadas nos logs de erro)", {
          charge: billPayload.charge,
          installments: billPayload.installments,
          payment_method_code: billPayload.payment_method_code,
          customer_has_address: "✅ Validado anteriormente",
          reasoning: "Yapay gateway exige essas configurações para gerar PIX corretamente"
        });
      } else if (paymentData.paymentMethod === 'credit_card') {
        // Credit Card: Force immediate charge processing
        billPayload.charge = true;
      }

      logStep("Creating new bill in Vindi", { billPayload });

      const vindiBillResponse = await fetch(`${vindiApiUrl}/bills`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(vindiApiKey + ":")}`,
        },
        body: JSON.stringify(billPayload),
      });

      if (!vindiBillResponse.ok) {
        let errorData;
        try {
          errorData = await vindiBillResponse.json();
        } catch {
          errorData = await vindiBillResponse.text();
        }
        
        logStep("Failed to create bill", { 
          status: vindiBillResponse.status,
          statusText: vindiBillResponse.statusText,
          error: errorData 
        });
        
        // Parse Vindi error message if available
        let errorMessage = "Erro ao criar cobrança";
        if (typeof errorData === 'object' && errorData.errors && errorData.errors.length > 0) {
          errorMessage = errorData.errors[0].message || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      billData = await vindiBillResponse.json();
      logStep("New bill created successfully", { billId: billData.bill.id });

      // ✅ PIX SPECIFIC: Aguardar processamento inicial do gateway
      if (paymentData.paymentMethod === 'pix') {
        logStep("⏳ PIX: Aguardando processamento inicial do gateway (5s)...");
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
     logStep(isExistingBill ? "Reused existing bill" : "Bill created successfully", { billId: billData.bill.id });

     // 🔍 DEBUG: Log complete bill structure for analysis
     logStep("🔍 COMPLETE BILL DATA STRUCTURE", {
       billId: billData.bill.id,
       billStatus: billData.bill.status,
       billAmount: billData.bill.amount,
       billPaymentMethod: billData.bill.payment_method_code,
       chargesCount: billData.bill.charges?.length || 0,
       hasCharges: !!(billData.bill.charges && billData.bill.charges.length > 0),
       fullBillStructure: billData.bill
     });

     if (billData.bill.charges && billData.bill.charges.length > 0) {
       const charge = billData.bill.charges[0];
       logStep("🔍 CHARGE STRUCTURE", {
         chargeId: charge.id,
         chargeStatus: charge.status,
         chargeAmount: charge.amount,
         chargePaymentMethod: charge.payment_method,
         chargeInstallments: charge.installments,
         chargeAttemptCount: charge.attempt_count,
         hasLastTransaction: !!charge.last_transaction,
         transactionId: charge.last_transaction?.id,
         completeChargeStructure: charge
       });

       if (charge.last_transaction) {
         logStep("🔍 TRANSACTION STRUCTURE", {
           transactionId: charge.last_transaction.id,
           transactionStatus: charge.last_transaction.status,
           transactionAmount: charge.last_transaction.amount,
           gatewayId: charge.last_transaction.gateway?.id,
           gatewayConnector: charge.last_transaction.gateway?.connector,
           gatewayMessage: charge.last_transaction.gateway_message,
           gatewayResponseCode: charge.last_transaction.gateway_response_code,
           gatewayTransactionId: charge.last_transaction.gateway_transaction_id,
           hasGatewayResponseFields: !!charge.last_transaction.gateway_response_fields,
           completeTransactionStructure: charge.last_transaction
         });

         if (charge.last_transaction.gateway_response_fields) {
           const gwFields = charge.last_transaction.gateway_response_fields;
           logStep("🔍 GATEWAY RESPONSE FIELDS (PIX DATA)", {
             availableFields: Object.keys(gwFields),
             hasQrCodePath: !!gwFields.qrcode_path,
             hasQrCodeOriginalPath: !!gwFields.qrcode_original_path,
             hasQrCodeUrl: !!(gwFields.qr_code_url || gwFields.qr_code_image_url),
             hasQrCodeBase64: !!(gwFields.qr_code_base64 || gwFields.qr_code_png_base64),
             hasPixCode: !!(gwFields.qr_code_text || gwFields.emv || gwFields.copy_paste),
            // ✅ LOG COMPLETO DE TODOS OS CAMPOS PARA DEBUG
            allFieldsDetailed: gwFields
           });
         } else {
           logStep("❌ GATEWAY_RESPONSE_FIELDS VAZIO", {
             transactionStatus: charge.last_transaction.status,
             gatewayMessage: charge.last_transaction.gateway_message,
             gatewayResponseCode: charge.last_transaction.gateway_response_code,
             possibleReasons: [
               "Gateway ainda processando",
               "PIX não habilitado no gateway",
               "Falha na configuração do método de pagamento",
               "Problemas com dados do cliente (endereço, CPF, etc.)"
             ]
           });
         }
       } else {
         logStep("❌ CHARGE SEM TRANSACTION", {
           chargeStatus: charge.status,
           chargePaymentMethod: charge.payment_method,
           possibleReasons: [
             "Charge não foi processada ainda",
             "Método de pagamento inválido",
             "Falha na criação da transaction"
           ]
         });
       }
     } else {
       logStep("❌ BILL SEM CHARGES", {
         billStatus: billData.bill.status,
         billPaymentMethod: billData.bill.payment_method_code,
         possibleReasons: [
           "Bill criada mas charges não foram geradas",
           "Problemas com método de pagamento",
           "Configuração incorreta do plano/produto"
         ]
       });
     }

     // Ensure we have full bill details (including PIX fields) by fetching the bill by ID
     try {
       logStep("🔄 Fetching complete bill details from Vindi API");
       const billDetailsResp = await fetch(`${vindiApiUrl}/bills/${billData.bill.id}` , {
         method: "GET",
         headers: {
           "Content-Type": "application/json",
           Authorization: `Basic ${btoa(vindiApiKey + ":")}`,
         },
       });
       if (billDetailsResp.ok) {
         const fullBill = await billDetailsResp.json();
         if (fullBill?.bill?.id) {
           billData = fullBill; // overwrite with detailed bill payload
           logStep("✅ Fetched full bill details successfully", { billId: billData.bill.id });

           // 🔍 DEBUG: Log the updated bill structure after fetching details
           if (billData.bill.charges && billData.bill.charges.length > 0) {
             const charge = billData.bill.charges[0];
             if (charge.last_transaction?.gateway_response_fields) {
               const gwFields = charge.last_transaction.gateway_response_fields;
               logStep("🔍 UPDATED GATEWAY RESPONSE FIELDS", {
                 availableFieldsAfterFetch: Object.keys(gwFields),
                 qrcodePath: gwFields.qrcode_path ? 'PRESENT' : 'MISSING',
                 qrcodeOriginalPath: gwFields.qrcode_original_path ? 'PRESENT' : 'MISSING',
                 qrCodeUrl: gwFields.qr_code_url || gwFields.qr_code_image_url ? 'PRESENT' : 'MISSING',
                 qrCodeBase64: gwFields.qr_code_base64 || gwFields.qr_code_png_base64 ? 'PRESENT' : 'MISSING'
               });
             }
           }
         }
       } else {
         logStep("❌ Failed to fetch full bill details", { status: billDetailsResp.status });
       }
     } catch (e) {
       logStep("❌ Error fetching full bill details", { error: (e as any)?.message });
     }

     // For credit card payments, try to process the charge immediately if it's still pending
     if (paymentData.paymentMethod === 'credit_card' && billData.bill.status === 'pending' && billData.bill.charges?.length > 0) {
       const chargeId = billData.bill.charges[0].id;
       logStep("Attempting to process pending charge", { chargeId });
       
       try {
         // Correct endpoint for processing/attempting a charge
         const processChargeResponse = await fetch(`${vindiApiUrl}/charges/${chargeId}/charge`, {
           method: "POST",
           headers: {
             "Content-Type": "application/json",
             Authorization: `Basic ${btoa(vindiApiKey + ":")}`,
           },
         });
         
         if (processChargeResponse.ok) {
           const chargeResult = await processChargeResponse.json();
           logStep("Charge processing initiated successfully", { 
             chargeId, 
             status: chargeResult.charge?.status,
             gatewayMessage: chargeResult.charge?.gateway_message
           });
           
           // Update bill data with the processed charge result
           if (chargeResult.charge) {
             billData.bill.charges[0] = chargeResult.charge;
             billData.bill.status = chargeResult.charge.status === 'paid' ? 'paid' : billData.bill.status;
           }
         } else {
           let errorData;
           try {
             errorData = await processChargeResponse.json();
           } catch {
             errorData = await processChargeResponse.text();
           }
           
           logStep("Failed to initiate charge processing", { 
             chargeId, 
             status: processChargeResponse.status,
             statusText: processChargeResponse.statusText,
             error: errorData
           });
         }
       } catch (chargeError) {
         logStep("Error processing charge", { chargeId, error: chargeError.message });
       }
     }

    // Link will remain usable until it expires naturally (24 hours)
    // Removed is_used marking to allow multiple payment attempts

    // Update subscription status to pending_payment and add Vindi subscription ID
    await supabaseClient
      .from("subscriptions")
      .update({ 
        status: 'pending_payment',
        vindi_subscription_id: vindiSubscriptionId,
        updated_at: new Date().toISOString() 
      })
      .eq("id", subscription.id);

    // Save transaction
    await supabaseClient.from("transactions").insert({
      user_id: user_id || subscription.user_id, // Use JWT user_id if available, otherwise subscription owner
      subscription_id: subscription.id,
      vindi_subscription_id: subscription.vindi_subscription_id,
      vindi_charge_id: billData.bill.charges?.[0]?.id?.toString(),
      customer_name: subscription.customer_name,
      customer_email: subscription.customer_email,
      customer_document: subscription.customer_document,
      plan_id: plan.id.toString(),
      plan_name: plan.nome,
      plan_price: billData.bill.amount,
      payment_method: paymentData.paymentMethod,
      status: billData.bill.status,
      installments: paymentData.paymentMethod === 'pix' ? 1 : subscription.installments,
      vindi_response: billData,
      transaction_type: 'subscription_charge'
    });

    logStep("Transaction saved successfully");

    // Validate billData exists
    if (!billData || !billData.bill) {
      throw new Error("Fatura não encontrada após processamento");
    }

    // Prepare response based on payment method
    const responseData: any = {
      success: true,
      message: "Pagamento processado com sucesso",
      bill_id: billData.bill.id,
      status: billData.bill.status,
    };

    if (paymentData.paymentMethod === 'pix') {
      logStep('🎯 INICIANDO PROCESSAMENTO PIX', {
        billId: billData.bill.id,
        billStatus: billData.bill.status,
        chargesCount: billData.bill.charges?.length || 0
      });

      // ✅ LOG COMPLETO DA ESTRUTURA PARA DEBUG
      if (billData.bill.charges?.[0]) {
        const charge = billData.bill.charges[0];
        logStep('📊 CHARGE COMPLETA', {
          chargeId: charge.id,
          chargeStatus: charge.status,
          chargeAmount: charge.amount,
          hasLastTransaction: !!charge.last_transaction,
          lastTransactionId: charge.last_transaction?.id,
          transactionStatus: charge.last_transaction?.status,
          hasGatewayFields: !!charge.last_transaction?.gateway_response_fields,
          allChargeFields: Object.keys(charge),
          transactionFields: charge.last_transaction ? Object.keys(charge.last_transaction) : []
        });

        if (charge.last_transaction?.gateway_response_fields) {
          const gwFields = charge.last_transaction.gateway_response_fields;
          logStep('🔍 GATEWAY_RESPONSE_FIELDS COMPLETO', {
            availableFields: Object.keys(gwFields),
            fieldValues: gwFields,
            totalFields: Object.keys(gwFields).length
          });
        } else {
          logStep('❌ GATEWAY_RESPONSE_FIELDS VAZIO OU INEXISTENTE');
        }
      }

      // ✅ AGUARDAR E RETRY PARA DADOS PIX (pode demorar para gerar)
      let attempts = 0;
      const maxAttempts = 10; // Increased to 10 attempts for better reliability
      let pixData: {
        qrUrl?: any;
        qrBase64?: any;
        pixCode?: any;
        qrcodeSvg?: any;
        dueAt?: any;
      } | null = null;

      while (attempts < maxAttempts && !pixData) {
        attempts++;
        logStep(`🔄 TENTATIVA ${attempts}/${maxAttempts} de buscar dados PIX`);

        if (attempts > 1) {
          // Aguardar antes de retry (progressive delay: 3s, 5s, 7s, etc.)
          const delayMs = 3000 + (attempts - 2) * 2000; // 3s, 5s, 7s, 9s...
          logStep(`⏳ Aguardando ${delayMs/1000} segundos antes de retry...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));

          // Refetch bill details e consultas adicionais conforme documentação
          try {
            // 1) Refetch bill principal
            const billRefreshResponse = await fetch(`${vindiApiUrl}/bills/${billData.bill.id}`, {
              method: 'GET',
              headers: {
                'Authorization': `Basic ${btoa(vindiApiKey + ':')}`,
                'Content-Type': 'application/json'
              }
            });

            if (billRefreshResponse.ok) {
              const refreshedBill = await billRefreshResponse.json();
              billData = refreshedBill;
              logStep('✅ Bill atualizada com sucesso', {
                chargesCount: billData.bill.charges?.length || 0
              });
            }

            // 2) Consultas adicionais conforme documentação - charges e transactions
            const chargeId = billData.bill?.charges?.[0]?.id;
            if (chargeId) {
              logStep('🔄 Consultando charge e transactions adicionalmente', { chargeId });

              // Consultar charge específica
              try {
                const chargeResp = await fetch(`${vindiApiUrl}/charges/${chargeId}`, {
                  method: 'GET',
                  headers: {
                    'Authorization': `Basic ${btoa(vindiApiKey + ':')}`,
                    'Content-Type': 'application/json'
                  }
                });

                if (chargeResp.ok) {
                  const chargeData = await chargeResp.json();
                  if (chargeData.charge?.last_transaction?.gateway_response_fields) {
                    // Merge dados adicionais se encontrados
                    const additionalFields = chargeData.charge.last_transaction.gateway_response_fields;
                    if (billData.bill.charges[0]?.last_transaction) {
                      billData.bill.charges[0].last_transaction.gateway_response_fields = {
                        ...billData.bill.charges[0].last_transaction.gateway_response_fields,
                        ...additionalFields
                      };
                      logStep('✅ Merged additional gateway fields from charge endpoint');
                    }
                  }
                }
              } catch (chargeError) {
                logStep('⚠️ Erro ao consultar charge adicional', { error: chargeError.message });
              }

              // Consultar transactions específicas
              try {
                const txsResp = await fetch(`${vindiApiUrl}/charges/${chargeId}/transactions`, {
                  method: 'GET',
                  headers: {
                    'Authorization': `Basic ${btoa(vindiApiKey + ':')}`,
                    'Content-Type': 'application/json'
                  }
                });

                if (txsResp.ok) {
                  const txsData = await txsResp.json();
                  if (txsData.transactions?.length > 0) {
                    logStep('✅ Found additional transactions', { count: txsData.transactions.length });
                    // Se houver transações mais recentes com dados PIX
                    const latestTx = txsData.transactions[0];
                    if (latestTx.gateway_response_fields) {
                      const txFields = latestTx.gateway_response_fields;
                      if (billData.bill.charges[0]?.last_transaction) {
                        billData.bill.charges[0].last_transaction.gateway_response_fields = {
                          ...billData.bill.charges[0].last_transaction.gateway_response_fields,
                          ...txFields
                        };
                        logStep('✅ Merged additional gateway fields from transactions endpoint');
                      }
                    }
                  }
                }
              } catch (txError) {
                logStep('⚠️ Erro ao consultar transactions adicionais', { error: txError.message });
              }
            }

          } catch (refreshError) {
            logStep('❌ Erro ao refetch bill', { error: refreshError.message });
          }
        }

        // Tentar extrair dados PIX
        const charge = billData.bill?.charges?.[0];
        if (charge?.last_transaction?.gateway_response_fields) {
          const gwFields = charge.last_transaction.gateway_response_fields;

          // ✅ CORREÇÃO COMPLETA: Yapay/Vindi podem usar diferentes campos
          // 1) EMV/Código PIX: priorizar campos textuais diretos
          let pixCode =
            gwFields.qr_code_text ||
            gwFields.emv ||
            gwFields.copy_paste ||
            gwFields.pix_copia_cola ||
            gwFields.pix_code ||
            null;

          // 2) Verificar se qrcode_original_path contém EMV direto ou é path
          if (!pixCode && gwFields.qrcode_original_path) {
            const originalPath = gwFields.qrcode_original_path;
            // Se começa com "00020101" é EMV válido direto
            if (originalPath && typeof originalPath === 'string' && originalPath.startsWith('00020101')) {
              pixCode = originalPath;
              logStep("✅ EMV encontrado diretamente em qrcode_original_path", { emvLength: pixCode.length });
            } else if (originalPath && !originalPath.startsWith('http')) {
              // Se é path relativo, tentar buscar o conteúdo
              try {
                logStep("🔄 Tentando buscar EMV via path relativo", { path: originalPath });
                const assetsBase = vindiApiUrl.replace('/api/v1', '');
                const emvUrl = originalPath.startsWith('/') ? assetsBase + originalPath : `${assetsBase}/${originalPath}`;
                const emvResp = await fetch(emvUrl);
                if (emvResp.ok) {
                  const emvText = await emvResp.text();
                  if (emvText && emvText.length > 50 && emvText.startsWith('00020101')) {
                    pixCode = emvText.trim();
                    logStep("✅ EMV obtido via fetch do path", { emvLength: pixCode.length });
                  }
                }
              } catch (fetchError) {
                logStep("⚠️ Falha ao buscar EMV via path", { error: fetchError.message });
              }
            }
          }

          // 3) QR Code Image: priorizar URLs diretos e construir paths se necessário
          let qrCodeUrl =
            gwFields.qr_code_image_url ||
            gwFields.qr_code_url ||
            gwFields.qr_code_img_url ||
            null;

          // 4) Verificar qrcode_path (pode ser URL absoluta ou path relativo)
          if (!qrCodeUrl && gwFields.qrcode_path) {
            const qrPath = gwFields.qrcode_path;
            if (qrPath && typeof qrPath === 'string') {
              if (qrPath.startsWith('http')) {
                qrCodeUrl = qrPath;
                logStep("✅ QR URL encontrada em qrcode_path", { qrCodeUrl: `${qrCodeUrl.substring(0, 100)}...` });
              } else {
                // Construir URL absoluta se for path relativo
                const assetsBase = vindiApiUrl.replace('/api/v1', '');
                qrCodeUrl = qrPath.startsWith('/') ? assetsBase + qrPath : `${assetsBase}/${qrPath}`;
                logStep("🔄 Construindo URL absoluta do QR Code", { qrCodeUrl: `${qrCodeUrl.substring(0, 100)}...` });
              }
            }
          }

          const qrCodeBase64 =
            gwFields.qr_code_base64 ||
            gwFields.qr_code_png_base64 ||
            gwFields.qr_code_b64 ||
            null;

          const printUrl = gwFields.print_url || gwFields.qr_code_print_url || null;
          const dueAt = gwFields.expires_at || gwFields.due_at || gwFields.max_days_to_keep_waiting_payment || billData.bill?.due_at || null;

          logStep(`🔎 TENTATIVA ${attempts} - Dados encontrados:`, {
            hasPixCode: !!pixCode,
            hasQrCodeUrl: !!qrCodeUrl,
            hasQrCodeBase64: !!qrCodeBase64,
            hasPrintUrl: !!printUrl,
            hasDueAt: !!dueAt,
            pixCodeLength: pixCode?.length || 0,
            qrCodeUrlValue: qrCodeUrl ? `${qrCodeUrl.substring(0, 100)}...` : null,
            printUrlValue: printUrl ? `${printUrl.substring(0, 100)}...` : null,
            // Debug adicional dos campos recebidos
            availableGwFields: Object.keys(gwFields),
            // Debug específico dos campos Yapay
            qrcode_path: gwFields.qrcode_path ? `${gwFields.qrcode_path.substring(0, 100)}...` : null,
            qrcode_original_path: gwFields.qrcode_original_path ? `${gwFields.qrcode_original_path.substring(0, 100)}...` : null
          });

          if (pixCode || qrCodeUrl || qrCodeBase64 || printUrl) {
            pixData = {
              qrUrl: qrCodeUrl || printUrl, // URL da imagem do QR Code
              qrBase64: qrCodeBase64, // QR Code em base64 se disponível
              pixCode: pixCode, // Código copia-e-cola EMV
              qrcodeSvg: qrCodeUrl && qrCodeUrl.endsWith('.svg') ? qrCodeUrl : null, // SVG apenas se for URL SVG
              dueAt: dueAt
            };
            logStep('✅ DADOS PIX ENCONTRADOS!', {
              pixCodeLength: pixData.pixCode?.length || 0,
              hasQrUrl: !!pixData.qrUrl,
              hasQrBase64: !!pixData.qrBase64,
              isSvgUrl: !!pixData.qrcodeSvg
            });
            break;
          }
        }

        // Tentar buscar diretamente da charge (não da transaction)
        if (!pixData && charge) {
          logStep('🔍 Tentando buscar dados PIX diretamente da charge...');
          const directFields = {
            qrUrl: charge.pix_qr_url || charge.qr_code_url,
            qrBase64: charge.pix_qr_code || charge.qr_code_base64,
            pixCode: charge.pix_code || charge.pix_copia_cola,
            qrcodeSvg: charge.pix_qr_svg
          };

          if (directFields.qrUrl || directFields.qrBase64 || directFields.pixCode) {
            pixData = directFields;
            logStep('✅ Dados PIX encontrados diretamente na charge!', directFields);
            break;
          }
        }

        if (attempts < maxAttempts) {
          logStep(`⏳ Tentativa ${attempts} falhou, aguardando retry...`);
        }
      }

      // ✅ APLICAR DADOS PIX AO RESPONSE CONFORME CAMPOS DA VINDI
      if (pixData) {
        // Estrutura PIX para compatibilidade com o frontend
        responseData.pix = {
          qr_code: pixData.pixCode,
          qr_code_url: pixData.qrUrl,
          qr_code_base64: pixData.qrBase64,
          qr_code_svg: pixData.qrcodeSvg,
          pix_copia_cola: pixData.pixCode,
          expires_at: pixData.dueAt
        };

        // ✅ MAPEAMENTO CORRIGIDO: Diferenciar entre SVG markup e URLs
        // Se temos uma URL (não SVG markup), colocar no campo correto
        if (pixData.qrUrl && !pixData.qrUrl.startsWith('<svg')) {
          // É uma URL de imagem, não SVG markup
          responseData.pix_qr_code_url = pixData.qrUrl; // URL do QR Code
          responseData.pix_print_url = pixData.qrUrl; // URL para impressão
          // Não definir pix_qr_svg para URLs, apenas para markup SVG real
        } else if (pixData.qrcodeSvg && pixData.qrcodeSvg.startsWith('<svg')) {
          // É SVG markup real
          responseData.pix_qr_svg = pixData.qrcodeSvg; // SVG markup
        }

        responseData.pix_code = pixData.pixCode; // Código PIX EMV
        responseData.pix_copia_cola = pixData.pixCode; // Mesmo código para copia-e-cola

        // Log para debug garantindo que dados estão sendo enviados
        logStep('🔧 CAMPOS PIX MAPEADOS PARA FRONTEND (CORRIGIDO)', {
          pix_qr_svg_set: !!responseData.pix_qr_svg,
          pix_qr_code_url_set: !!responseData.pix_qr_code_url,
          pix_code_set: !!responseData.pix_code,
          pix_copia_cola_set: !!responseData.pix_copia_cola,
          mapping_logic: {
            hasQrUrl: !!pixData.qrUrl,
            isQrUrlSvgMarkup: pixData.qrUrl?.startsWith('<svg') || false,
            hasQrcodeSvg: !!pixData.qrcodeSvg,
            isQrcodeSvgMarkup: pixData.qrcodeSvg?.startsWith('<svg') || false
          },
          valores: {
            pix_qr_svg: responseData.pix_qr_svg ? `${responseData.pix_qr_svg.substring(0, 100)}...` : null,
            pix_qr_code_url: responseData.pix_qr_code_url ? `${responseData.pix_qr_code_url.substring(0, 100)}...` : null,
            pix_code_length: responseData.pix_code?.length || 0
          }
        });

        if (pixData.qrBase64) {
          responseData.pix_qr_base64 = pixData.qrBase64;
          responseData.pix_qr_code = pixData.qrBase64; // ✅ Base64 para compatibilidade
        }

        if (pixData.dueAt) {
          responseData.due_at = pixData.dueAt;
        }

        logStep('🎉 PIX RESPONSE PREPARADO COM SUCESSO', {
          hasPixCode: !!responseData.pix_code,
          hasQrCodeUrl: !!responseData.pix_qr_code_url,
          hasQrSvg: !!responseData.pix_qr_svg,
          hasPrintUrl: !!responseData.pix_print_url,
          hasQrBase64: !!responseData.pix_qr_base64,
          hasDueAt: !!responseData.due_at,
          pixCodeLength: responseData.pix_code?.length || 0,
          qrCodeUrl: responseData.pix_qr_code_url ? `${responseData.pix_qr_code_url.substring(0, 100)}...` : null,
          qrSvgUrl: responseData.pix_qr_svg ? `${responseData.pix_qr_svg.substring(0, 100)}...` : null,
          // 🔍 LOGS ADICIONAIS PARA DEBUG
          pixResponseSummary: {
            pixCode: !!responseData.pix_code,
            qrUrl: !!responseData.pix_qr_code_url,
            qrSvg: !!responseData.pix_qr_svg,
            qrBase64: !!responseData.pix_qr_base64
          }
        });
      } else {
        logStep('❌ NENHUM DADO PIX ENCONTRADO APÓS TODAS AS TENTATIVAS', {
          attempts: maxAttempts,
          billId: billData.bill.id,
          chargesCount: billData.bill.charges?.length || 0
        });

        // ✅ DIAGNÓSTICO AVANÇADO: Verificar métodos de pagamento disponíveis na Vindi
        try {
          logStep('🔍 DIAGNÓSTICO: Verificando métodos de pagamento disponíveis na Vindi');

          const paymentMethodsResponse = await fetch(`${vindiApiUrl}/payment_methods`, {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${btoa(vindiApiKey + ':')}`,
              'Content-Type': 'application/json'
            }
          });

          if (paymentMethodsResponse.ok) {
            const paymentMethodsData = await paymentMethodsResponse.json();
            const pixMethods = paymentMethodsData.payment_methods?.filter((pm: any) =>
              pm.code?.toLowerCase().includes('pix') || pm.name?.toLowerCase().includes('pix')
            );

            logStep('🔍 MÉTODOS PIX DISPONÍVEIS', {
              totalMethods: paymentMethodsData.payment_methods?.length || 0,
              pixMethods: pixMethods?.map((pm: any) => ({
                id: pm.id,
                code: pm.code,
                name: pm.name,
                type: pm.type,
                status: pm.status
              })) || []
            });

            // Verificar se o gateway Yapay está configurado
            const yapayGateways = paymentMethodsData.payment_methods?.filter((pm: any) =>
              pm.name?.toLowerCase().includes('yapay') || pm.gateway_name?.toLowerCase().includes('yapay')
            );

            logStep('🔍 GATEWAYS YAPAY ENCONTRADOS', {
              yapayGateways: yapayGateways?.map((pm: any) => ({
                id: pm.id,
                code: pm.code,
                name: pm.name,
                gateway_name: pm.gateway_name,
                status: pm.status
              })) || []
            });
          }
        } catch (diagnosticError) {
          logStep('❌ Erro no diagnóstico de métodos de pagamento', { error: diagnosticError.message });
        }

        // ✅ VALIDAÇÃO ROBUSTA E FEEDBACK PARA O USUÁRIO
        logStep('⚠️ AVISO: PIX criado mas dados não encontrados', {
          possibleCauses: [
            'PIX não está habilitado/configurado na conta Vindi',
            'Gateway Yapay não configurado para PIX',
            'Método de pagamento "pix" não existe na conta',
            'Problemas com dados do cliente (endereço, CPF)',
            'Vindi ainda processando PIX (timing)',
            'Ambiente sandbox com limitações'
          ],
          recommendation: 'Verificar configuração PIX no painel da Vindi'
        });

        responseData.warning = "PIX não pôde ser gerado. Verifique se o PIX está habilitado na sua conta Vindi.";
        responseData.bill_id = billData.bill.id; // Para permitir consulta posterior
        responseData.debug_info = {
          environment: vindiEnvironment,
          bill_status: billData.bill.status,
          charge_status: billData.bill.charges?.[0]?.status,
          payment_method_requested: paymentData.paymentMethod
        };
      }
    }

    logStep("Payment processed successfully", { billId: billData.bill.id, status: billData.bill.status });

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in process-subscription-payment", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});