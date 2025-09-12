import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VINDI-WEBHOOK] ${step}${detailsStr}`);
};

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
    
    const webhookData = await req.json();
    
    // Log complete payload for debugging
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

// Processar criação de fatura
async function processBillCreated(supabase: any, eventData: any) {
  const billId = eventData.id;
  const subscriptionId = eventData.subscription?.id;
  const customerId = eventData.subscription?.customer?.id;
  const amount = eventData.amount;
  
  logStep("Processing bill created", { billId, subscriptionId, customerId, amount });

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

  return { billProcessed: true, billId };
}