import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TRANSPARENT-CHECKOUT-PAYMENT] ${step}${detailsStr}`);
};

interface TransparentPaymentRequest {
  customer_name: string;
  customer_email: string;
  customer_document: string;
  customer_phone?: string;
  plan_id: string;
  payment_method: 'pix' | 'boleto';
  environment?: 'sandbox' | 'production';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Extract user_id from JWT token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const token = authHeader.replace('Bearer ', '');
    const jwt = JSON.parse(atob(token.split('.')[1]));
    const user_id = jwt.sub;
    
    logStep("User authenticated", { user_id });

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

    const paymentData: TransparentPaymentRequest = await req.json();
    logStep("Received payment data", { 
      customer_email: paymentData.customer_email, 
      payment_method: paymentData.payment_method,
      plan_id: paymentData.plan_id 
    });

    // Get plan details
    const { data: plan, error: planError } = await supabaseClient
      .from("planos")
      .select("*")
      .eq("id", paymentData.plan_id)
      .single();

    if (planError || !plan) {
      logStep("Plan not found", { planId: paymentData.plan_id, error: planError });
      throw new Error("Plano não encontrado");
    }

    logStep("Found plan details", { planId: plan.id, planName: plan.nome, vindiPlanId: plan.vindi_plan_id });

    // Step 1: Create/find customer in Vindi
    logStep("Creating/finding Vindi customer");
    
    // First, try to find existing customer
    const searchCustomerResponse = await fetch(`${vindiApiUrl}/customers?query=email:${encodeURIComponent(paymentData.customer_email)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(vindiApiKey + ":")}`,
      },
    });

    let vindiCustomerId;
    let existingCustomer = null;

    if (searchCustomerResponse.ok) {
      const searchResult = await searchCustomerResponse.json();
      existingCustomer = searchResult.customers?.find((c: any) => 
        c.email === paymentData.customer_email
      );
      
      if (existingCustomer) {
        vindiCustomerId = existingCustomer.id;
        logStep("Found existing Vindi customer", { vindiCustomerId });
      }
    }

    // Create customer if not found
    if (!vindiCustomerId) {
      const customerPayload = {
        name: paymentData.customer_name,
        email: paymentData.customer_email,
        registry_code: paymentData.customer_document,
        phone: paymentData.customer_phone,
      };

      const vindiCustomerResponse = await fetch(`${vindiApiUrl}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(vindiApiKey + ":")}`,
        },
        body: JSON.stringify(customerPayload),
      });

      if (!vindiCustomerResponse.ok) {
        let errorData;
        try {
          errorData = await vindiCustomerResponse.json();
        } catch {
          errorData = await vindiCustomerResponse.text();
        }
        
        logStep("Failed to create Vindi customer", { 
          status: vindiCustomerResponse.status,
          error: errorData 
        });
        
        let errorMessage = "Erro ao criar cliente na Vindi";
        if (typeof errorData === 'object' && errorData.errors && errorData.errors.length > 0) {
          errorMessage = errorData.errors[0].message || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const customerResult = await vindiCustomerResponse.json();
      vindiCustomerId = customerResult.customer.id;
      logStep("Vindi customer created successfully", { vindiCustomerId });
    }

    // Step 2: Create subscription in Vindi
    logStep("Creating Vindi subscription", { vindiCustomerId, vindiPlanId: plan.vindi_plan_id });
    
    const subscriptionPayload = {
      plan_id: plan.vindi_plan_id,
      customer_id: vindiCustomerId,
      payment_method_code: paymentData.payment_method,
      installments: 1,
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
    const vindiSubscriptionId = subscriptionResult.subscription.id;
    logStep("Vindi subscription created successfully", { vindiSubscriptionId });

    // Step 3: Create bill for immediate payment
    logStep("Creating Vindi bill for immediate payment");
    
    const billPayload = {
      customer_id: vindiCustomerId,
      payment_method_code: paymentData.payment_method,
      subscription_id: vindiSubscriptionId,
      bill_items: [
        {
          product_id: plan.vindi_product_id,
          amount: plan.valor,
        },
      ],
      installments: 1,
    };

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
      
      logStep("Failed to create Vindi bill", { 
        status: vindiBillResponse.status,
        error: errorData 
      });
      
      let errorMessage = "Erro ao criar cobrança na Vindi";
      if (typeof errorData === 'object' && errorData.errors && errorData.errors.length > 0) {
        errorMessage = errorData.errors[0].message || errorMessage;
      }
      
      throw new Error(errorMessage);
    }

    const billResult = await vindiBillResponse.json();
    logStep("Vindi bill created successfully", { 
      billId: billResult.bill.id, 
      status: billResult.bill.status 
    });

    // Step 4: Save subscription and transaction to Supabase
    const subscriptionInsert = {
      user_id: user_id,
      customer_name: paymentData.customer_name,
      customer_email: paymentData.customer_email,
      customer_document: paymentData.customer_document,
      customer_phone: paymentData.customer_phone,
      plan_id: plan.id,
      payment_method: paymentData.payment_method,
      status: 'pending_payment',
      vindi_subscription_id: vindiSubscriptionId,
      installments: 1,
      metadata: {
        vindi_customer_id: vindiCustomerId,
        vindi_plan_id: plan.vindi_plan_id,
        vindi_product_id: plan.vindi_product_id,
        plan_name: plan.nome,
        plan_price: plan.valor
      }
    };

    const { data: subscription, error: subscriptionError } = await supabaseClient
      .from("subscriptions")
      .insert(subscriptionInsert)
      .select()
      .single();

    if (subscriptionError) {
      logStep("Failed to save subscription", { error: subscriptionError });
      throw new Error("Erro ao salvar assinatura");
    }

    logStep("Subscription saved successfully", { subscriptionId: subscription.id });

    // Save transaction
    const transactionInsert = {
      user_id: user_id,
      subscription_id: subscription.id,
      vindi_subscription_id: vindiSubscriptionId,
      vindi_charge_id: billResult.bill.charges?.[0]?.id?.toString(),
      customer_name: paymentData.customer_name,
      customer_email: paymentData.customer_email,
      customer_document: paymentData.customer_document,
      plan_id: plan.id.toString(),
      plan_name: plan.nome,
      plan_price: plan.valor,
      payment_method: paymentData.payment_method,
      status: billResult.bill.status,
      installments: 1,
      vindi_response: billResult,
      transaction_type: 'subscription_charge'
    };

    await supabaseClient.from("transactions").insert(transactionInsert);
    logStep("Transaction saved successfully");

    // Step 5: Prepare response with PIX/Boleto data
    let responseData: any = {
      success: true,
      message: "Pagamento processado com sucesso",
      subscription_id: subscription.id,
      charge_id: billResult.bill.charges?.[0]?.id,
      status: billResult.bill.status,
    };

    // Extract PIX data from Vindi response
    if (paymentData.payment_method === 'pix' && billResult.bill.charges?.[0]) {
      const charge = billResult.bill.charges[0];
      const gatewayFields = charge.last_transaction?.gateway_response_fields;
      
      if (gatewayFields) {
        // 🎯 CAMPO CORRETO: qrcode_path retorna SVG do QR Code
        const qrcodeSvg = gatewayFields.qrcode_path;
        
        responseData.pix = {
          qr_code: gatewayFields.qr_code_text || gatewayFields.emv || gatewayFields.copy_paste,
          qr_code_url: gatewayFields.qr_code_url || gatewayFields.qr_code_image_url,
          qr_code_base64: gatewayFields.qr_code_base64 || gatewayFields.qrcode_base64,
          qr_code_svg: qrcodeSvg, // ✅ SVG QR Code da Vindi
          expires_at: gatewayFields.expires_at || charge.due_at
        };
        
        logStep("PIX data extracted successfully", { 
          hasQrCode: !!responseData.pix.qr_code,
          hasQrCodeUrl: !!responseData.pix.qr_code_url,
          hasQrCodeBase64: !!responseData.pix.qr_code_base64,
          hasQrCodeSvg: !!responseData.pix.qr_code_svg,
          qrcodeSvgLength: qrcodeSvg ? qrcodeSvg.length : 0
        });
      } else {
        logStep("Warning: PIX data not found in Vindi response", { 
          charge: charge,
          lastTransaction: charge.last_transaction
        });
      }
    }

    // Extract Boleto data from Vindi response
    if (paymentData.payment_method === 'boleto' && billResult.bill.charges?.[0]) {
      const charge = billResult.bill.charges[0];
      
      responseData.boleto = {
        url: charge.print_url,
        barcode: charge.code,
        due_date: charge.due_at
      };
      
      logStep("Boleto data extracted successfully", { 
        hasUrl: !!charge.print_url,
        hasBarcode: !!charge.code
      });
    }

    logStep("Payment processed successfully", { 
      subscriptionId: subscription.id,
      billId: billResult.bill.id, 
      status: billResult.bill.status 
    });

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in transparent-checkout-payment", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});