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
    if (!vindiApiKey) throw new Error("VINDI_API_KEY is not set");

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
      .eq("is_used", false)
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

    // =======================
    // CORREÇÃO PRINCIPAL: FLUXO CORRETO PARA PIX
    // =======================
    
    let billData = null;
    let vindiSubscriptionId = subscription.vindi_subscription_id;
    
    // PASSO 1: Criar assinatura na Vindi (apenas se não existir)
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
        // IMPORTANTE: Para PIX não precisa de payment_profile
      };
      
      // Se for cartão de crédito, adiciona o payment profile
      if (paymentData.paymentMethod === 'credit_card' && paymentData.cardData) {
        // Criar payment profile primeiro
        const paymentProfilePayload = {
          holder_name: paymentData.cardData.holder_name,
          card_expiration: `${paymentData.cardData.expiry_month}/${paymentData.cardData.expiry_year}`,
          card_number: paymentData.cardData.number,
          card_cvv: paymentData.cardData.cvv,
          customer_id: vindiCustomerId,
          payment_method_code: "credit_card",
        };

        const vindiProfileResponse = await fetch("https://app.vindi.com.br/api/v1/payment_profiles", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${btoa(vindiApiKey + ":")}`,
          },
          body: JSON.stringify(paymentProfilePayload),
        });

        if (!vindiProfileResponse.ok) {
          const errorData = await vindiProfileResponse.json();
          logStep("Failed to create payment profile", { error: errorData });
          throw new Error(errorData.errors?.[0]?.message || "Erro ao criar perfil de pagamento");
        }

        const profileData = await vindiProfileResponse.json();
        subscriptionPayload['payment_profile_id'] = profileData.payment_profile.id;
        logStep("Created payment profile", { paymentProfileId: profileData.payment_profile.id });
      }
      
      const vindiSubscriptionResponse = await fetch("https://app.vindi.com.br/api/v1/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(vindiApiKey + ":")}`,
        },
        body: JSON.stringify(subscriptionPayload),
      });

      if (!vindiSubscriptionResponse.ok) {
        const errorData = await vindiSubscriptionResponse.json();
        logStep("Failed to create Vindi subscription", { error: errorData });
        throw new Error(errorData.errors?.[0]?.message || "Erro ao criar assinatura na Vindi");
      }

      const subscriptionResult = await vindiSubscriptionResponse.json();
      vindiSubscriptionId = subscriptionResult.subscription.id;
      
      logStep("Vindi subscription created successfully", { vindiSubscriptionId });

      // Update our subscription record with the Vindi subscription ID
      await supabaseClient
        .from("subscriptions")
        .update({ 
          vindi_subscription_id: vindiSubscriptionId,
          status: 'active'
        })
        .eq("id", subscription.id);

      // IMPORTANTE: Aguardar um pouco para a Vindi processar e gerar a fatura
      logStep("Waiting for Vindi to generate the bill...");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // =======================
    // PASSO 2: BUSCAR A FATURA GERADA AUTOMATICAMENTE (NÃO CRIAR!)
    // =======================
    logStep("Fetching bills for subscription", { vindiSubscriptionId });
    
    // Buscar faturas da assinatura
    const billsResponse = await fetch(
      `https://app.vindi.com.br/api/v1/subscriptions/${vindiSubscriptionId}/bills`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(vindiApiKey + ":")}`,
        }
      }
    );

    if (!billsResponse.ok) {
      logStep("Failed to fetch bills", { status: billsResponse.status });
      
      // Fallback: tentar buscar bills por query
      const fallbackResponse = await fetch(
        `https://app.vindi.com.br/api/v1/bills?query=subscription_id:${vindiSubscriptionId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${btoa(vindiApiKey + ":")}`,
          }
        }
      );
      
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        const pendingBill = fallbackData.bills?.find((bill: any) => 
          bill.status === 'pending' || bill.status === 'review'
        );
        
        if (pendingBill) {
          billData = { bill: pendingBill };
          logStep("Found bill via fallback query", { billId: pendingBill.id });
        }
      }
    } else {
      const billsData = await billsResponse.json();
      const pendingBill = billsData.bills?.find((bill: any) => 
        bill.status === 'pending' || bill.status === 'review'
      );
      
      if (pendingBill) {
        billData = { bill: pendingBill };
        logStep("Found existing pending bill", { billId: pendingBill.id });
      }
    }

    // Se não encontrou nenhuma fatura, pode ser necessário aguardar mais
    if (!billData && paymentData.paymentMethod === 'pix') {
      logStep("No bill found yet, waiting more for PIX generation...");
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Tentar buscar novamente
      const retryResponse = await fetch(
        `https://app.vindi.com.br/api/v1/bills?query=subscription_id:${vindiSubscriptionId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${btoa(vindiApiKey + ":")}`,
          }
        }
      );
      
      if (retryResponse.ok) {
        const retryData = await retryResponse.json();
        const pendingBill = retryData.bills?.[0];
        if (pendingBill) {
          billData = { bill: pendingBill };
          logStep("Found bill after retry", { billId: pendingBill.id });
        }
      }
    }

    if (!billData) {
      throw new Error("Não foi possível obter a fatura. Tente novamente em alguns segundos.");
    }

    // =======================
    // PASSO 3: BUSCAR DETALHES COMPLETOS DA FATURA (COM DADOS DO PIX)
    // =======================
    logStep("Fetching complete bill details", { billId: billData.bill.id });
    
    const billDetailsResponse = await fetch(
      `https://app.vindi.com.br/api/v1/bills/${billData.bill.id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(vindiApiKey + ":")}`,
        }
      }
    );

    if (billDetailsResponse.ok) {
      const fullBillData = await billDetailsResponse.json();
      billData = fullBillData;
      logStep("Got full bill details", { 
        billId: billData.bill.id,
        status: billData.bill.status,
        hasCharges: !!billData.bill.charges?.length
      });
      
      // DEBUG: Log completo da estrutura para PIX
      if (paymentData.paymentMethod === 'pix' && billData.bill.charges?.[0]) {
        logStep("PIX Charge Structure", {
          charge: billData.bill.charges[0],
          hasLastTransaction: !!billData.bill.charges[0].last_transaction,
          chargeKeys: Object.keys(billData.bill.charges[0])
        });
      }
    }

    // =======================
    // PASSO 4: EXTRAIR DADOS DO PIX CORRETAMENTE
    // =======================
    let responseData: any = {
      success: true,
      message: "Pagamento processado com sucesso",
      bill_id: billData.bill.id,
      status: billData.bill.status,
    };

    if (paymentData.paymentMethod === 'pix') {
      const charge = billData.bill?.charges?.[0];
      
      if (charge) {
        // CORREÇÃO: Buscar dados do PIX nos campos CORRETOS
        // Opção 1: Campos diretos na charge
        let pixCode = charge.pix_qr || 
                      charge.pix_emv || 
                      charge.pix_code ||
                      charge.pix_copia_e_cola;
        
        let pixQrBase64 = charge.pix_qr_base64 || 
                          charge.pix_qrcode_base64 ||
                          charge.qr_code_base64;
        
        let pixQrUrl = charge.pix_qr_url || 
                       charge.pix_qrcode_url ||
                       charge.qr_code_url ||
                       charge.print_url;
        
        let pixExpiration = charge.pix_expiration_date || 
                           charge.pix_expires_at ||
                           charge.due_at ||
                           billData.bill.due_at;
        
        // Opção 2: Se não encontrou, buscar em metadata
        if (!pixCode && charge.metadata) {
          pixCode = charge.metadata.pix_qr || 
                   charge.metadata.pix_emv ||
                   charge.metadata.pix_copia_e_cola;
          pixQrBase64 = charge.metadata.pix_qr_base64;
          pixQrUrl = charge.metadata.pix_qr_url;
        }
        
        // Opção 3: Buscar em last_transaction (se existir)
        if (!pixCode && charge.last_transaction) {
          const lt = charge.last_transaction;
          pixCode = lt.pix_qr || 
                   lt.pix_emv ||
                   lt.gateway_response_fields?.qr_code_text ||
                   lt.gateway_response_fields?.emv ||
                   lt.gateway_response_fields?.pix_copia_e_cola;
          
          pixQrBase64 = lt.pix_qr_base64 ||
                       lt.gateway_response_fields?.qr_code_base64;
          
          pixQrUrl = lt.pix_qr_url ||
                    lt.gateway_response_fields?.qr_code_url;
        }
        
        // Opção 4: Buscar print_url como alternativa para o QR Code
        if (!pixQrUrl && charge.id) {
          // Construir a URL de impressão manualmente se necessário
          pixQrUrl = `https://app.vindi.com.br/customer/bills/${billData.bill.id}/charge/${charge.id}/print`;
        }
        
        // Log para debug
        logStep("PIX Data Extraction", {
          hasPixCode: !!pixCode,
          hasPixQrBase64: !!pixQrBase64,
          hasPixQrUrl: !!pixQrUrl,
          pixCodeLength: pixCode?.length,
          chargeId: charge.id,
          chargeStatus: charge.status
        });
        
        // Adicionar ao response
        if (pixCode) responseData.pix_code = pixCode;
        if (pixQrBase64) responseData.pix_qr_code = pixQrBase64;
        if (pixQrUrl) responseData.pix_qr_code_url = pixQrUrl;
        if (pixExpiration) responseData.due_at = pixExpiration;
        
        // Se ainda não encontrou o PIX, fazer uma chamada adicional específica
        if (!pixCode && !pixQrBase64) {
          logStep("PIX data not found in bill, fetching charge details", { chargeId: charge.id });
          
          try {
            const chargeDetailsResponse = await fetch(
              `https://app.vindi.com.br/api/v1/charges/${charge.id}`,
              {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Basic ${btoa(vindiApiKey + ":")}`,
                }
              }
            );
            
            if (chargeDetailsResponse.ok) {
              const chargeData = await chargeDetailsResponse.json();
              const detailedCharge = chargeData.charge;
              
              logStep("Detailed charge data", {
                chargeId: detailedCharge.id,
                keys: Object.keys(detailedCharge),
                hasPixData: !!(detailedCharge.pix_qr || detailedCharge.pix_emv)
              });
              
              // Tentar extrair novamente dos detalhes da charge
              responseData.pix_code = detailedCharge.pix_qr || 
                                      detailedCharge.pix_emv || 
                                      detailedCharge.pix_copia_e_cola ||
                                      responseData.pix_code;
              
              responseData.pix_qr_code = detailedCharge.pix_qr_base64 || 
                                         detailedCharge.pix_qrcode_base64 ||
                                         responseData.pix_qr_code;
              
              responseData.pix_qr_code_url = detailedCharge.pix_qr_url || 
                                             detailedCharge.print_url ||
                                             responseData.pix_qr_code_url;
            }
          } catch (error) {
            logStep("Error fetching charge details", { error: error.message });
          }
        }
      }
    }

    // Mark checkout link as used
    await supabaseClient
      .from("subscription_checkout_links")
      .update({ is_used: true, updated_at: new Date().toISOString() })
      .eq("id", checkoutLink.id);

    // Update subscription status
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
      user_id: user_id || subscription.user_id,
      subscription_id: subscription.id,
      vindi_subscription_id: vindiSubscriptionId,
      vindi_charge_id: billData.bill.charges?.[0]?.id?.toString(),
      customer_name: subscription.customer_name,
      customer_email: subscription.customer_email,
      customer_document: subscription.customer_document,
      plan_id: plan.id.toString(),
      plan_name: plan.nome,
      plan_price: billData.bill.amount,
      payment_method: paymentData.paymentMethod,
      status: billData.bill.status,
      installments: 1,
      vindi_response: billData,
      transaction_type: 'subscription_charge'
    });

    logStep("Transaction saved successfully");
    
    // Log final do response para debug
    logStep("Final response data", {
      success: responseData.success,
      hasBillId: !!responseData.bill_id,
      hasPixCode: !!responseData.pix_code,
      hasPixQrCode: !!responseData.pix_qr_code,
      hasPixQrUrl: !!responseData.pix_qr_code_url,
      status: responseData.status
    });

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