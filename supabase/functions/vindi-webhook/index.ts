import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VINDI-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let savedEventId: string | null = null;

  try {
    logStep("Webhook received");

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse webhook data
    const webhookData = await req.json();

    // ✅ LOG COMPLETO DO PAYLOAD
    logStep("RAW WEBHOOK PAYLOAD RECEIVED", webhookData);
    logStep("Payload type check", {
      typeofData: typeof webhookData,
      hasType: 'type' in webhookData,
      typeValue: webhookData.type,
      typeofTypeValue: typeof webhookData.type,
      keys: Object.keys(webhookData)
    });

    // ✅ CRITICAL FIX: Safely extract event type as string
    let eventType: string = 'unknown'; // Default value to prevent null

    try {
      if (typeof webhookData === 'string') {
        // If webhook data is a string, parse it
        const parsed = JSON.parse(webhookData);
        eventType = parsed.type || parsed.event?.type || 'unknown';
      } else if (webhookData && typeof webhookData === 'object') {
        // Extract from object structure
        if (typeof webhookData.type === 'string' && webhookData.type.trim()) {
          eventType = webhookData.type.trim();
        } else if (webhookData.event && typeof webhookData.event.type === 'string' && webhookData.event.type.trim()) {
          eventType = webhookData.event.type.trim();
        } else if (webhookData.type && typeof webhookData.type === 'object') {
          // ⚠️ CRITICAL: If webhookData.type is an object (the entire webhook), extract type from it
          eventType = webhookData.type.type || 'unknown';
        } else if (webhookData.type) {
          // Try to convert to string
          eventType = String(webhookData.type).trim() || 'unknown';
        }
      }

      // Final safety check: ensure eventType is never null/undefined/empty
      if (!eventType || eventType === 'null' || eventType === 'undefined' || eventType.trim() === '') {
        eventType = 'unknown';
        logStep("⚠️ WARNING: event type was null/undefined/empty, using 'unknown'", {
          originalType: webhookData?.type,
          webhookDataKeys: Object.keys(webhookData || {})
        });
      }

      logStep("✅ Event type extracted successfully", { eventType });
    } catch (parseError) {
      logStep("❌ ERROR parsing event type", { error: parseError.message });
      eventType = 'unknown';
    }

    const eventData = webhookData.data || webhookData.event?.data;

    logStep("Extracted event info", {
      eventType,
      eventTypeLength: eventType.length,
      hasEventData: !!eventData
    });

    // ✅ CRITICAL: Persistir TODOS os eventos imediatamente
    const eventId = webhookData.event?.id || `${eventType}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    logStep("Saving event to database", { eventType, eventId });

    const { data: savedEvent, error: saveError } = await supabase
      .from('vindi_webhook_events')
      .insert({
        event_id: eventId,
        event_type: eventType,
        event_data: webhookData,
        processed: false
      })
      .select()
      .single();

    if (saveError) {
      logStep("Error saving event (continuing anyway)", { error: saveError.message });
    } else {
      savedEventId = savedEvent.id;
      logStep("Event saved successfully", { id: savedEvent.id, event_id: eventId });
    }

    // ===== PROCESS DIFFERENT EVENT TYPES =====

    // 1. Test event - Confirm webhook is working
    if (eventType === 'test') {
      logStep("✅ Test event received - Webhook is working correctly!");

      // Mark as processed
      if (savedEventId) {
        await supabase
          .from('vindi_webhook_events')
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq('id', savedEventId);
      }

      return new Response(JSON.stringify({
        success: true,
        message: "Test event received and processed successfully",
        eventType,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 2. Charge rejected - Payment failed
    if (eventType === 'charge_rejected') {
      logStep("❌ Processing charge_rejected event", {
        chargeId: eventData?.id,
        billId: eventData?.bill?.id,
        subscriptionId: eventData?.bill?.subscription?.id,
        gatewayMessage: eventData?.last_transaction?.gateway_message
      });

      const subscriptionId = eventData?.bill?.subscription?.id;
      const chargeId = eventData?.id;

      // Try to find and update related records
      if (subscriptionId) {
        // Update subscription status
        await supabase
          .from('subscriptions')
          .update({
            status: 'payment_failed',
            updated_at: new Date().toISOString()
          })
          .eq('vindi_subscription_id', subscriptionId);

        // Update transaction status
        await supabase
          .from('transactions')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('vindi_subscription_id', subscriptionId);
      }

      // Try to find beneficiario by CPF and update
      const customer = eventData?.bill?.customer || eventData?.customer;
      if (customer?.registry_code) {
        const cleanCpf = customer.registry_code.replace(/\D/g, '');

        await supabase
          .from('beneficiarios')
          .update({
            payment_status: 'failed',
            updated_at: new Date().toISOString()
          })
          .or(`cpf.eq.${cleanCpf},cpf.eq.${customer.registry_code}`);

        logStep("Beneficiario payment_status updated to failed", { cpf: cleanCpf });
      }

      // Mark as processed
      if (savedEventId) {
        await supabase
          .from('vindi_webhook_events')
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq('id', savedEventId);
      }

      return new Response(JSON.stringify({
        success: true,
        message: "Charge rejected event processed",
        eventType,
        chargeId,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 3. Subscription created - New subscription
    if (eventType === 'subscription_created') {
      logStep("🆕 Processing subscription_created event", {
        subscriptionId: eventData?.id,
        customerId: eventData?.customer?.id,
        planId: eventData?.plan?.id
      });

      // Mark as processed
      if (savedEventId) {
        await supabase
          .from('vindi_webhook_events')
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq('id', savedEventId);
      }

      return new Response(JSON.stringify({
        success: true,
        message: "Subscription created event logged",
        eventType,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 4. Bill paid - EXISTING LOGIC
    if (eventType === 'bill_paid') {
      logStep("💰 Processing bill_paid event", { billId: eventData?.id });

      const billId = eventData?.id;
      const subscriptionId = eventData?.subscription?.id;
      const customerId = eventData?.customer?.id;

      if (!billId || !subscriptionId) {
        logStep("Warning: Missing required bill or subscription data", { billId, subscriptionId });
        return new Response(JSON.stringify({
          success: true,
          message: "Webhook received but missing required data",
          eventType,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      // Find subscription in database
      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('vindi_subscription_id', subscriptionId)
        .single();

      if (subscriptionError || !subscription) {
        logStep("Warning: Subscription not found", { subscriptionId, error: subscriptionError?.message });
        return new Response(JSON.stringify({
          success: true,
          message: "Webhook processed but subscription not found",
          eventType,
          subscriptionId,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      logStep("Subscription found", { id: subscription.id, status: subscription.status });

      // Update subscription status to active
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          payment_confirmed_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

      if (updateError) {
        logStep("Error updating subscription status", { error: updateError.message });
      } else {
        logStep("Subscription status updated to active");
      }

      // Also update related transaction status to paid
      const { error: transactionUpdateError } = await supabase
        .from('transactions')
        .update({
          status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('vindi_subscription_id', subscriptionId);

      if (transactionUpdateError) {
        logStep("Error updating transaction status", { error: transactionUpdateError.message });
      } else {
        logStep("Transaction status updated to paid");
      }

      // ✅ CRITICAL FIX: Update beneficiario payment_status to 'paid'
      // Try multiple CPF formats to ensure match
      const cleanCpf = subscription.customer_document?.replace(/\D/g, ''); // Remove formatting

      let beneficiarioUpdated = false;
      let matchedBeneficiario = null;

      // Try exact match first
      const { data: exactMatch, error: exactError } = await supabase
        .from('beneficiarios')
        .update({
          payment_status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('cpf', subscription.customer_document)
        .select('*');

      if (exactMatch && exactMatch.length > 0) {
        beneficiarioUpdated = true;
        matchedBeneficiario = exactMatch[0];
        logStep("Beneficiario payment_status updated (exact match)", {
          cpf: subscription.customer_document,
          beneficiario_id: matchedBeneficiario.id
        });
      } else {
        logStep("No exact CPF match, trying clean CPF", {
          original_cpf: subscription.customer_document,
          clean_cpf: cleanCpf
        });

        // Try with clean CPF format
        if (cleanCpf && cleanCpf.length === 11) {
          const { data: cleanMatch, error: cleanError } = await supabase
            .from('beneficiarios')
            .update({
              payment_status: 'paid',
              updated_at: new Date().toISOString()
            })
            .or(`cpf.eq.${cleanCpf},cpf.eq.${subscription.customer_document}`)
            .select('*');

          if (cleanMatch && cleanMatch.length > 0) {
            beneficiarioUpdated = true;
            matchedBeneficiario = cleanMatch[0];
            logStep("Beneficiario payment_status updated (clean CPF match)", {
              clean_cpf: cleanCpf,
              beneficiario_id: matchedBeneficiario.id
            });
          }
        }
      }

      if (!beneficiarioUpdated) {
        logStep("Error: Could not find beneficiario to update", {
          subscription_cpf: subscription.customer_document,
          clean_cpf: cleanCpf,
          customer_name: subscription.customer_name
        });
      }

      // Call adesão API only if beneficiario was found and updated
      if (beneficiarioUpdated && matchedBeneficiario) {
        logStep("Calling adesão API for beneficiario", {
          beneficiarioId: matchedBeneficiario.id,
          subscriptionId: subscription.id,
          planoId: matchedBeneficiario.plano_id,
          paymentMethod: subscription.payment_method || 'unknown'
        });

        const adesaoData = {
          id: matchedBeneficiario.id, // Use beneficiario ID instead of subscription ID
          nome: matchedBeneficiario.nome,
          cpf: matchedBeneficiario.cpf,
          data_nascimento: matchedBeneficiario.data_nascimento || '01011990',
          telefone: matchedBeneficiario.telefone || '11999999999',
          email: matchedBeneficiario.email,
          cep: matchedBeneficiario.cep || '01234567',
          numero_endereco: matchedBeneficiario.numero_endereco || '123',
          estado: matchedBeneficiario.estado || 'SP',
          plano_id: matchedBeneficiario.plano_id,
          id_beneficiario_tipo: 1,
          codigo_externo: `VINDI_${subscriptionId}`
        };

        logStep("=== DADOS PARA ADESÃO RMS ===", {
          plano_id: matchedBeneficiario.plano_id,
          nome: matchedBeneficiario.nome,
          cpf: matchedBeneficiario.cpf,
          email: matchedBeneficiario.email,
          paymentConfirmedVia: eventType,
          subscriptionId: subscription.id,
          vindiSubscriptionId: subscriptionId
        });

        try {
          const adesaoResult = await supabase.functions.invoke('notify-external-api', {
            body: {
              operation: 'adesao',
              data: adesaoData
            }
          });

          if (adesaoResult.error) {
            logStep("Error calling adesão API", { error: adesaoResult.error.message });
          } else if (adesaoResult.data?.success) {
            logStep("Adesão API called successfully", { response: adesaoResult.data.response });
          } else {
            logStep("Adesão API call completed with issues", { data: adesaoResult.data });
          }

        } catch (adesaoError) {
          logStep("Exception calling adesão API", { error: adesaoError.message });
        }
      } else {
        logStep("Skipping adesão API call - beneficiario not found or not updated");
      }

      // ✅ Mark bill_paid event as processed
      if (savedEventId) {
        await supabase
          .from('vindi_webhook_events')
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq('id', savedEventId);

        logStep("Event marked as processed", { savedEventId });
      }
    }

    // ===== UNHANDLED EVENT TYPES =====
    // Event was saved but not specifically processed
    if (!['test', 'charge_rejected', 'subscription_created', 'bill_paid'].includes(eventType)) {
      logStep("⚠️ Event type not specifically handled (logged only)", {
        eventType,
        eventId: savedEventId,
        note: "Event was saved to database but no specific processing logic exists"
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Webhook processed successfully",
      eventType,
      processed: ['test', 'charge_rejected', 'subscription_created', 'bill_paid'].includes(eventType),
      saved: !!savedEventId,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    logStep("❌ Error processing webhook", { error: error.message, stack: error.stack });

    // ✅ Mark event as failed
    if (savedEventId) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        await supabase
          .from('vindi_webhook_events')
          .update({
            processed: false,
            error_message: error.message,
            processed_at: new Date().toISOString()
          })
          .eq('id', savedEventId);

        logStep("Event marked as failed", { savedEventId, error: error.message });
      } catch (updateError) {
        logStep("Failed to update event error status", { error: updateError.message });
      }
    }

    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      saved: !!savedEventId,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});