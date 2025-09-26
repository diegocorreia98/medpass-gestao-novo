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

    // Check if subscription already has a bill in Vindi
    let billData = null;
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
       const billPayload: any = {
        customer_id: vindiCustomerId,
        payment_method_code: paymentData.paymentMethod,
        bill_items: [
          {
            product_id: vindiProductId,
            amount: subscription.metadata?.plan_price || 0,
          },
        ],
      };

      if (paymentProfileId) {
        billPayload.payment_profile = { id: paymentProfileId };
      }

      if (paymentData.paymentMethod === 'pix') {
        billPayload.installments = 1;
      }

      // Link the bill to the subscription
      if (vindiSubscriptionId) {
        billPayload.subscription_id = vindiSubscriptionId;
      }

      // Force immediate charge processing for credit card
      if (paymentData.paymentMethod === 'credit_card') {
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
    }
     logStep(isExistingBill ? "Reused existing bill" : "Bill created successfully", { billId: billData.bill.id });

     // 🔍 DEBUG: Log complete bill structure for analysis
     logStep("🔍 COMPLETE BILL DATA STRUCTURE", {
       billId: billData.bill.id,
       billStatus: billData.bill.status,
       chargesCount: billData.bill.charges?.length || 0,
       hasCharges: !!(billData.bill.charges && billData.bill.charges.length > 0)
     });

     if (billData.bill.charges && billData.bill.charges.length > 0) {
       const charge = billData.bill.charges[0];
       logStep("🔍 CHARGE STRUCTURE", {
         chargeId: charge.id,
         chargeStatus: charge.status,
         hasLastTransaction: !!charge.last_transaction,
         transactionId: charge.last_transaction?.id
       });

       if (charge.last_transaction) {
         logStep("🔍 TRANSACTION STRUCTURE", {
           transactionId: charge.last_transaction.id,
           transactionStatus: charge.last_transaction.status,
           hasGatewayResponseFields: !!charge.last_transaction.gateway_response_fields
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
         }
       }
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
      const gwFields = billData.bill?.charges?.[0]?.last_transaction?.gateway_response_fields || {};
      const qrUrl = gwFields.qr_code_url || gwFields.qr_code_image_url || gwFields.pix_qr_code_url;
      const qrBase64 = gwFields.qr_code_base64 || gwFields.qr_code_png_base64 || gwFields.qrcode_base64 || gwFields.pix_qr_code_base64;
      const pixCode = gwFields.qr_code_text || gwFields.emv || gwFields.copy_paste || gwFields.pix_code;
      
      // 🎯 CAMPOS CORRETOS DA VINDI - VÁRIAS POSSIBILIDADES
      const qrcodeSvg = gwFields.qrcode_path || gwFields.qr_code_svg || gwFields.svg || gwFields.qrcode_svg || gwFields.pix_qr_svg; // SVG do QR Code
      const pixCopiaCola = gwFields.qrcode_original_path || gwFields.qr_code_text || gwFields.emv || gwFields.copy_paste || gwFields.pix_code; // Código PIX copia e cola

      if (qrUrl) responseData.pix_qr_code_url = qrUrl;
      if (qrBase64) responseData.pix_qr_code = qrBase64;
      if (pixCode) responseData.pix_code = pixCode;
      
      // ✅ ADICIONAR SVG E COPIA E COLA AO RESPONSE
      if (qrcodeSvg) {
        responseData.pix_qr_svg = qrcodeSvg;
        logStep('SVG QR Code found and included', {
          svgLength: qrcodeSvg.length,
          svgPreview: qrcodeSvg.substring(0, 200) + '...'
        });
      } else {
        logStep('❌ SVG QR Code NOT FOUND', {
          searchedFields: ['qrcode_path', 'qr_code_svg', 'svg', 'qrcode_svg', 'pix_qr_svg'],
          availableGwFields: Object.keys(gwFields),
          gwFieldsValues: gwFields
        });
      }
      
      if (pixCopiaCola) {
        responseData.pix_copia_cola = pixCopiaCola;
        responseData.pix_code = pixCopiaCola; // Override com valor correto
        logStep('PIX copia e cola found and included', { 
          copiaColaLength: pixCopiaCola.length,
          copiaColaStart: pixCopiaCola.substring(0, 50) + '...'
        });
      }

      responseData.due_at = billData.bill?.due_at || gwFields.expires_at || gwFields.expiration_date || gwFields.expiration_time;
      
      logStep('PIX response prepared', {
        hasPixCode: !!pixCode,
        hasQrUrl: !!qrUrl,
        hasQrBase64: !!qrBase64,
        hasQrSvg: !!qrcodeSvg
      });
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