import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createHash, createHmac } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, vindi-signature',
  'Strict-Transport-Security': 'max-age=31536000',
  'Content-Security-Policy': "default-src 'self'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY'
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VINDI-WEBHOOK] ${step}${detailsStr}`);
};

/**
 * Verifica a assinatura do webhook da Vindi para garantir autenticidade
 * Implementação conforme especificação do checkout transparente
 */
async function verifyWebhookSignature(
  payload: string, 
  signature: string | null, 
  secret: string
): Promise<boolean> {
  if (!signature || !secret) {
    logStep("Webhook signature verification skipped", { 
      hasSignature: !!signature, 
      hasSecret: !!secret 
    });
    return false;
  }

  try {
    // A Vindi usa HMAC-SHA256 para assinar webhooks
    const encoder = new TextEncoder();
    const key = encoder.encode(secret);
    const data = encoder.encode(payload);
    
    const hmacKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature_bytes = await crypto.subtle.sign('HMAC', hmacKey, data);
    const expectedSignature = Array.from(new Uint8Array(signature_bytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // A assinatura da Vindi pode vir em diferentes formatos
    const receivedSignature = signature.replace('sha256=', '').toLowerCase();
    const isValid = expectedSignature === receivedSignature;
    
    logStep("Webhook signature verification", { 
      isValid,
      expectedLength: expectedSignature.length,
      receivedLength: receivedSignature.length
    });
    
    return isValid;
  } catch (error) {
    logStep("Error verifying webhook signature", { error: error.message });
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Use service role for database operations
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Webhook received");
    
    // Get the raw payload for signature verification
    const rawPayload = await req.text();
    const webhookSignature = req.headers.get('vindi-signature') || req.headers.get('x-hub-signature-256');
    const webhookSecret = Deno.env.get('VINDI_WEBHOOK_SECRET');
    
    // Parse JSON after getting raw text
    const webhookData = JSON.parse(rawPayload);
    
    // SECURITY: Verify webhook signature (critical for production)
    if (webhookSecret) {
      const isValidSignature = await verifyWebhookSignature(rawPayload, webhookSignature, webhookSecret);
      if (!isValidSignature) {
        logStep("Invalid webhook signature - rejecting", { 
          hasSignature: !!webhookSignature,
          hasSecret: !!webhookSecret 
        });
        return new Response(JSON.stringify({ 
          error: 'Invalid webhook signature',
          success: false 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        });
      }
      logStep("Webhook signature verified successfully");
    } else {
      logStep("WARNING: Webhook signature verification disabled - no secret configured");
    }
    
    // Log complete payload for debugging (after verification)
    logStep("Complete webhook payload", { payload: webhookData });
    
    // Robust event type extraction - try different properties
    let eventType = webhookData.type || webhookData.event || webhookData.event_type;
    
    // If still no event type, try nested properties
    if (!eventType && webhookData.data) {
      eventType = webhookData.data.type || webhookData.data.event || webhookData.data.event_type;
    }
    
    // If still no event type, check if it's in the root with different naming
    if (!eventType) {
      eventType = webhookData.kind || webhookData.action || 'unknown';
    }
    
    const eventData = webhookData.data || webhookData;
    const eventId = webhookData.id?.toString() || 
                   webhookData.event_id?.toString() || 
                   `${Date.now()}_${Math.random()}`;

    logStep("Processing webhook event", { eventType, eventId, hasData: !!eventData });
    
    // Validate required fields before database insertion
    if (!eventType) {
      throw new Error(`Could not determine event type from payload. Available keys: ${Object.keys(webhookData).join(', ')}`);
    }

    // Verificar se evento já foi processado (idempotência)
    const { data: existingEvent } = await supabaseClient
      .from('vindi_webhook_events')
      .select('id, processed')
      .eq('event_id', eventId)
      .single();

    if (existingEvent) {
      logStep("Event already processed", { eventId, processed: existingEvent.processed });
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Event already processed',
        processed: existingEvent.processed 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Salvar evento na tabela de webhook events
    const { error: insertError } = await supabaseClient
      .from('vindi_webhook_events')
      .insert({
        event_id: eventId,
        event_type: eventType,
        event_data: eventData,
        processed: false
      });

    if (insertError) {
      logStep("Error inserting webhook event", { error: insertError });
      throw insertError;
    }

    // Processar diferentes tipos de eventos
    let processResult = null;
    
    try {
      switch (eventType) {
        case 'charge.paid':
          processResult = await processChargePaid(supabaseClient, eventData);
          break;
        case 'charge.rejected':
        case 'charge.failed':
          processResult = await processChargeFailed(supabaseClient, eventData);
          break;
        case 'subscription.canceled':
          processResult = await processSubscriptionCanceled(supabaseClient, eventData);
          break;
        case 'bill.created':
          processResult = await processBillCreated(supabaseClient, eventData);
          break;
        default:
          logStep("Event type not handled", { eventType });
          processResult = { handled: false, message: `Event type ${eventType} not handled` };
      }

      // Marcar evento como processado
      await supabaseClient
        .from('vindi_webhook_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString()
        })
        .eq('event_id', eventId);

      logStep("Event processed successfully", { eventId, eventType, result: processResult });

    } catch (processingError) {
      logStep("Error processing event", { eventId, eventType, error: processingError });
      
      // Marcar erro no processamento
      await supabaseClient
        .from('vindi_webhook_events')
        .update({
          error_message: processingError.message,
          processed_at: new Date().toISOString()
        })
        .eq('event_id', eventId);

      throw processingError;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      eventId, 
      eventType,
      result: processResult 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    logStep("Webhook processing error", { error: error.message });
    
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

async function processChargePaid(supabaseClient: any, eventData: any) {
  console.log('Processing charge.paid event', { chargeId: eventData.charge.id });
  
  try {
    // Update transaction status to 'paid'
    const { error: transactionError } = await supabaseClient
      .from('transactions')
      .update({ status: 'paid' })
      .eq('vindi_charge_id', eventData.charge.id.toString());

    if (transactionError) {
      console.error('Error updating transaction:', transactionError);
      return { success: false, error: transactionError.message };
    }

    // Process pending adesao if this charge is related to a subscription
    if (eventData.charge.subscription) {
      const subscriptionId = eventData.charge.subscription.id;
      console.log('Processing payment confirmation for subscription', { subscriptionId });

      // Find pending adesao by vindi_subscription_id
      const { data: pendingAdesao, error: pendingError } = await supabaseClient
        .from('pending_adesoes')
        .select('*')
        .eq('vindi_subscription_id', subscriptionId)
        .eq('status', 'pending_payment')
        .single();

      if (pendingError && pendingError.code !== 'PGRST116') {
        console.error('Error finding pending adesao:', pendingError);
        return { success: false, error: pendingError.message };
      }

      if (pendingAdesao) {
        console.log('Found pending adesao, processing RMS API call', { pendingAdesaoId: pendingAdesao.id });
        
        // Update status to payment_confirmed
        await supabaseClient
          .from('pending_adesoes')
          .update({ 
            status: 'payment_confirmed',
            updated_at: new Date().toISOString()
          })
          .eq('id', pendingAdesao.id);

        // Call RMS API for adesao
        try {
          const rmsResponse = await supabaseClient.functions.invoke('notify-external-api', {
            body: {
              beneficiario_id: pendingAdesao.id,
              operation: 'adesao',
              beneficiario_data: {
                nome: pendingAdesao.nome,
                cpf: pendingAdesao.cpf,
                email: pendingAdesao.email,
                telefone: pendingAdesao.telefone,
                data_nascimento: pendingAdesao.data_nascimento,
                endereco: pendingAdesao.endereco,
                cidade: pendingAdesao.cidade,
                estado: pendingAdesao.estado,
                cep: pendingAdesao.cep,
                valor_plano: pendingAdesao.valor_plano,
                plano_id: pendingAdesao.plano_id
              }
            }
          });

          if (rmsResponse.error) {
            console.error('RMS API call failed:', rmsResponse.error);
            
            // Mark as failed for retry
            await supabaseClient
              .from('pending_adesoes')
              .update({ 
                status: 'rms_failed',
                last_rms_error: rmsResponse.error.message || 'Unknown RMS API error',
                last_rms_attempt_at: new Date().toISOString(),
                rms_retry_count: (pendingAdesao.rms_retry_count || 0) + 1,
                updated_at: new Date().toISOString()
              })
              .eq('id', pendingAdesao.id);

            return { success: false, error: 'RMS API call failed' };
          }

          console.log('RMS API call successful, creating final beneficiario');

          // Create final beneficiario record
          const { data: beneficiario, error: beneficiarioError } = await supabaseClient
            .from('beneficiarios')
            .insert({
              user_id: pendingAdesao.user_id,
              unidade_id: pendingAdesao.unidade_id,
              plano_id: pendingAdesao.plano_id,
              empresa_id: pendingAdesao.empresa_id,
              nome: pendingAdesao.nome,
              cpf: pendingAdesao.cpf,
              email: pendingAdesao.email,
              telefone: pendingAdesao.telefone,
              data_nascimento: pendingAdesao.data_nascimento,
              endereco: pendingAdesao.endereco,
              cidade: pendingAdesao.cidade,
              estado: pendingAdesao.estado,
              cep: pendingAdesao.cep,
              valor_plano: pendingAdesao.valor_plano,
              observacoes: pendingAdesao.observacoes,
              status: 'ativo',
              payment_status: 'paid',
              data_adesao: new Date().toISOString().split('T')[0]
            })
            .select()
            .single();

          if (beneficiarioError) {
            console.error('Error creating beneficiario:', beneficiarioError);
            
            // Mark as failed
            await supabaseClient
              .from('pending_adesoes')
              .update({ 
                status: 'rms_failed',
                last_rms_error: `Error creating beneficiario: ${beneficiarioError.message}`,
                last_rms_attempt_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', pendingAdesao.id);

            return { success: false, error: beneficiarioError.message };
          }

          console.log('Beneficiario created successfully, cleaning up pending adesao');

          // Mark as completed and remove from pending
          await supabaseClient
            .from('pending_adesoes')
            .update({ 
              status: 'rms_sent',
              updated_at: new Date().toISOString()
            })
            .eq('id', pendingAdesao.id);

          // Update subscription status
          await supabaseClient
            .from('subscriptions')
            .update({ status: 'active' })
            .eq('vindi_subscription_id', subscriptionId);

          console.log('Payment processing completed successfully');

        } catch (rmsError) {
          console.error('Error in RMS processing:', rmsError);
          
          await supabaseClient
            .from('pending_adesoes')
            .update({ 
              status: 'rms_failed',
              last_rms_error: rmsError.message || 'Unknown error in RMS processing',
              last_rms_attempt_at: new Date().toISOString(),
              rms_retry_count: (pendingAdesao.rms_retry_count || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', pendingAdesao.id);

          return { success: false, error: rmsError.message };
        }
      }
    }

    console.log('Successfully processed charge.paid event');
    return { success: true };
  } catch (error) {
    console.error('Error in processChargePaid:', error);
    return { success: false, error: error.message };
  }
}

// Processar cobrança rejeitada/falhou
async function processChargeFailed(supabase: any, eventData: any) {
  const chargeId = eventData.id;
  
  logStep("Processing charge failed", { chargeId });

  // Atualizar transactions
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .update({ 
      status: 'failed',
      updated_at: new Date().toISOString()
    })
    .eq('vindi_charge_id', chargeId.toString())
    .select();

  if (txError) {
    logStep("Error updating transactions", { error: txError });
  }

  // Atualizar beneficiários relacionados
  const { data: beneficiarios, error: benError } = await supabase
    .from('beneficiarios')
    .update({ 
      payment_status: 'failed',
      updated_at: new Date().toISOString()
    })
    .in('id', (transactions || []).map((tx: any) => tx.beneficiario_id).filter(Boolean))
    .select();

  if (benError) {
    logStep("Error updating beneficiarios", { error: benError });
  }

  return { 
    transactionsUpdated: transactions?.length || 0,
    beneficiariosUpdated: beneficiarios?.length || 0 
  };
}

// Processar cancelamento de assinatura
async function processSubscriptionCanceled(supabase: any, eventData: any) {
  const subscriptionId = eventData.id;
  
  logStep("Processing subscription canceled", { subscriptionId });

  // Atualizar subscriptions
  const { data: subscriptions, error: subError } = await supabase
    .from('subscriptions')
    .update({ 
      status: 'canceled',
      updated_at: new Date().toISOString()
    })
    .eq('vindi_subscription_id', subscriptionId)
    .select();

  if (subError) {
    logStep("Error updating subscriptions", { error: subError });
  }

  return { subscriptionsUpdated: subscriptions?.length || 0 };
}

// Processar criação de fatura (conforme fluxo de ciclos recorrentes)
async function processBillCreated(supabase: any, eventData: any) {
  const billId = eventData.id;
  const subscriptionId = eventData.subscription?.id;
  const customerId = eventData.subscription?.customer?.id;
  const amount = eventData.amount;
  const dueDate = eventData.due_at;
  const status = eventData.status;
  const charges = eventData.charges || [];
  
  logStep("Processing bill created", { 
    billId, 
    subscriptionId, 
    customerId, 
    amount, 
    status, 
    dueDate,
    chargesCount: charges.length 
  });

  try {
    // Atualizar subscription com próxima data de cobrança
    if (subscriptionId) {
      const { error: subUpdateError } = await supabase
        .from('subscriptions')
        .update({ 
          next_billing_at: dueDate,
          updated_at: new Date().toISOString()
        })
        .eq('vindi_subscription_id', subscriptionId);

      if (subUpdateError) {
        logStep("Error updating subscription next billing date", { error: subUpdateError });
      }
    }

    // Para métodos PIX/Boleto, extrair instruções de pagamento
    const paymentInstructions: any = {};
    
    for (const charge of charges) {
      const paymentMethod = charge.payment_method?.code;
      
      if (paymentMethod === 'pix') {
        // Extrair dados PIX conforme especificação
        const pixData = extractPIXData(charge);
        if (pixData) {
          paymentInstructions.pix = pixData;
          logStep("PIX payment instructions extracted", { chargeId: charge.id });
        }
      } else if (paymentMethod === 'bank_slip' || paymentMethod === 'boleto') {
        // Extrair dados do boleto
        const boletoData = extractBoletoData(charge);
        if (boletoData) {
          paymentInstructions.boleto = boletoData;
          logStep("Boleto payment instructions extracted", { chargeId: charge.id });
        }
      }
    }

    // Registrar transação para controle
    const { error: transactionError } = await supabase
      .from('transactions')
      .upsert({
        vindi_bill_id: billId.toString(),
        vindi_subscription_id: subscriptionId,
        status: status || 'pending',
        plan_price: amount,
        payment_instructions: paymentInstructions,
        due_date: dueDate,
        transaction_type: 'recurring_bill',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'vindi_bill_id'
      });

    if (transactionError) {
      logStep("Error saving transaction for bill", { error: transactionError });
    }

    // Registrar na tabela de logs para auditoria
    const { error: logError } = await supabase
      .from('api_integrations_log')
      .insert({
        operation: 'vindi-webhook-bill-created',
        request_data: { bill_id: billId, subscription_id: subscriptionId },
        response_data: eventData,
        status: 'success'
      });

    if (logError) {
      logStep("Error logging bill created", { error: logError });
    }

    return { 
      billProcessed: true, 
      billId, 
      paymentInstructions: Object.keys(paymentInstructions).length > 0 ? paymentInstructions : null
    };
    
  } catch (error) {
    logStep("Error processing bill created", { error: error.message });
    return { success: false, error: error.message };
  }
}

// Extrair dados PIX da cobrança (múltiplos campos possíveis)
function extractPIXData(charge: any) {
  const transaction = charge.last_transaction;
  const gatewayFields = transaction?.gateway_response_fields || {};
  
  const pixCode = gatewayFields.qr_code_text || 
                  gatewayFields.emv || 
                  gatewayFields.pix_code ||
                  charge.pix_code ||
                  charge.qr_code;
                  
  const qrCodeUrl = gatewayFields.qr_code_url || 
                    gatewayFields.qr_code_image_url ||
                    charge.pix_qr_url ||
                    charge.print_url;
                    
  const expiresAt = gatewayFields.expires_at || 
                    charge.due_at ||
                    transaction?.expires_at;

  if (pixCode || qrCodeUrl) {
    return {
      qr_code: pixCode,
      qr_code_url: qrCodeUrl,
      expires_at: expiresAt
    };
  }
  
  return null;
}

// Extrair dados do boleto da cobrança
function extractBoletoData(charge: any) {
  const printUrl = charge.print_url;
  const barcode = charge.code;
  const dueDate = charge.due_at;
  
  if (printUrl || barcode) {
    return {
      url: printUrl,
      barcode: barcode,
      due_date: dueDate
    };
  }
  
  return null;
}