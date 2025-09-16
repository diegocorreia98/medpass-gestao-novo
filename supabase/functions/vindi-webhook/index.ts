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

    logStep("Webhook data received", {
      type: webhookData.type,
      hasData: !!webhookData.data,
      dataId: webhookData.data?.id
    });

    const eventType = webhookData.type;
    const eventData = webhookData.data;

    // Process bill_paid events
    if (eventType === 'bill_paid') {
      logStep("Processing bill_paid event", { billId: eventData?.id });

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
          subscriptionId: subscription.id
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
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Webhook processed successfully",
      eventType,
      processed: eventType === 'bill_paid',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    logStep("Error processing webhook", { error: error.message });

    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});