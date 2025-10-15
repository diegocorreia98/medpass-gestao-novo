import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REPROCESS-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting reprocessing of webhook events");

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar eventos bill_paid com event_type incorreto (JSON completo ao invés de só "bill_paid")
    const { data: events, error: fetchError } = await supabase
      .from('vindi_webhook_events')
      .select('*')
      .like('event_type', '%bill_paid%')
      .eq('processed', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (fetchError) {
      throw new Error(`Error fetching events: ${fetchError.message}`);
    }

    if (!events || events.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: "No events to reprocess",
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    logStep(`Found ${events.length} events to reprocess`);

    let reprocessedCount = 0;
    const results: Array<{ event_id: string; status: string; message?: string }> = [];

    for (const event of events) {
      try {
        // Extrair os dados reais do evento
        let eventData: any;
        let actualEventType: string;

        // Se event_type é um JSON string, parsear
        if (event.event_type.startsWith('{')) {
          const parsedType = JSON.parse(event.event_type);
          actualEventType = parsedType.type || 'unknown';
          eventData = parsedType.data;
        } else {
          actualEventType = event.event_type;
          eventData = event.event_data?.data || event.event_data;
        }

        logStep(`Processing event ${event.event_id}`, { actualEventType });

        // Apenas processar se for bill_paid
        if (actualEventType !== 'bill_paid') {
          results.push({
            event_id: event.event_id,
            status: 'skipped',
            message: `Not a bill_paid event: ${actualEventType}`
          });
          continue;
        }

        const billId = eventData?.bill?.id || eventData?.id;
        const subscriptionId = eventData?.bill?.subscription?.id || eventData?.subscription?.id;
        const customerData = eventData?.bill?.customer || eventData?.customer;

        if (!subscriptionId) {
          results.push({
            event_id: event.event_id,
            status: 'error',
            message: 'Missing subscription ID'
          });
          continue;
        }

        // Buscar subscription no banco
        const { data: subscription, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('vindi_subscription_id', subscriptionId)
          .single();

        if (subscriptionError || !subscription) {
          results.push({
            event_id: event.event_id,
            status: 'error',
            message: `Subscription not found: ${subscriptionId}`
          });
          continue;
        }

        logStep(`Found subscription ${subscription.id}`, {
          customer_document: subscription.customer_document,
          status: subscription.status
        });

        // Buscar beneficiário pelo CPF
        const cleanCpf = subscription.customer_document?.replace(/\D/g, '');

        const { data: beneficiarios, error: benError } = await supabase
          .from('beneficiarios')
          .select('*')
          .or(`cpf.eq.${subscription.customer_document},cpf.eq.${cleanCpf}`)
          .limit(1);

        if (benError || !beneficiarios || beneficiarios.length === 0) {
          results.push({
            event_id: event.event_id,
            status: 'error',
            message: `Beneficiário not found for CPF: ${subscription.customer_document}`
          });
          continue;
        }

        const beneficiario = beneficiarios[0];
        logStep(`Found beneficiário ${beneficiario.id}`, {
          nome: beneficiario.nome,
          cpf: beneficiario.cpf
        });

        // Chamar API de adesão
        const adesaoData = {
          id: beneficiario.id,
          nome: beneficiario.nome,
          cpf: beneficiario.cpf,
          data_nascimento: beneficiario.data_nascimento || '01011990',
          telefone: beneficiario.telefone || '11999999999',
          email: beneficiario.email,
          cep: beneficiario.cep || '01234567',
          numero_endereco: beneficiario.numero_endereco || '123',
          estado: beneficiario.estado || 'SP',
          plano_id: beneficiario.plano_id,
          id_beneficiario_tipo: 1,
          codigo_externo: `VINDI_${subscriptionId}`
        };

        logStep(`Calling adesão API for beneficiário ${beneficiario.id}`);

        const adesaoResult = await supabase.functions.invoke('notify-external-api', {
          body: {
            operation: 'adesao',
            data: adesaoData
          }
        });

        if (adesaoResult.error) {
          results.push({
            event_id: event.event_id,
            status: 'error',
            message: `Adesão API error: ${adesaoResult.error.message}`
          });
        } else if (adesaoResult.data?.success) {
          results.push({
            event_id: event.event_id,
            status: 'success',
            message: 'Adesão enviada com sucesso'
          });
          reprocessedCount++;
        } else {
          results.push({
            event_id: event.event_id,
            status: 'warning',
            message: 'Adesão completada com warnings'
          });
        }

      } catch (eventError: any) {
        logStep(`Error processing event ${event.event_id}`, { error: eventError.message });
        results.push({
          event_id: event.event_id,
          status: 'error',
          message: eventError.message
        });
      }
    }

    logStep(`Reprocessing complete. Success: ${reprocessedCount}/${events.length}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Reprocessed ${reprocessedCount} events successfully`,
      total_events: events.length,
      reprocessed: reprocessedCount,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    logStep("❌ Error in reprocessing", { error: error.message, stack: error.stack });

    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
