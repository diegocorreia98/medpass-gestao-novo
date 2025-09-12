import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RETRY-RMS-ADESAO] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { pendingAdesaoId } = await req.json();

    if (!pendingAdesaoId) {
      return new Response(
        JSON.stringify({ error: 'pendingAdesaoId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep("Processing retry for pending adesao", { pendingAdesaoId });

    // Get pending adesao
    const { data: pendingAdesao, error: pendingError } = await supabaseClient
      .from('pending_adesoes')
      .select('*')
      .eq('id', pendingAdesaoId)
      .eq('status', 'rms_failed')
      .single();

    if (pendingError) {
      logStep("Error finding pending adesao", { error: pendingError });
      return new Response(
        JSON.stringify({ error: 'Pending adesao not found or not in failed state' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep("Found pending adesao, retrying RMS API call", { 
      retryCount: pendingAdesao.rms_retry_count,
      lastError: pendingAdesao.last_rms_error 
    });

    // Update retry count and attempt timestamp
    await supabaseClient
      .from('pending_adesoes')
      .update({ 
        rms_retry_count: (pendingAdesao.rms_retry_count || 0) + 1,
        last_rms_attempt_at: new Date().toISOString(),
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
        logStep("RMS API call failed again", { error: rmsResponse.error });
        
        // Update failed status with new error
        await supabaseClient
          .from('pending_adesoes')
          .update({ 
            status: 'rms_failed',
            last_rms_error: rmsResponse.error.message || 'Unknown RMS API error',
            updated_at: new Date().toISOString()
          })
          .eq('id', pendingAdesao.id);

        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'RMS API call failed again',
            details: rmsResponse.error
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      logStep("RMS API call successful, creating final beneficiario");

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
        logStep("Error creating beneficiario", { error: beneficiarioError });
        
        // Mark as failed
        await supabaseClient
          .from('pending_adesoes')
          .update({ 
            status: 'rms_failed',
            last_rms_error: `Error creating beneficiario: ${beneficiarioError.message}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', pendingAdesao.id);

        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Error creating beneficiario',
            details: beneficiarioError
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      logStep("Beneficiario created successfully, cleaning up pending adesao");

      // Mark as completed
      await supabaseClient
        .from('pending_adesoes')
        .update({ 
          status: 'rms_sent',
          updated_at: new Date().toISOString()
        })
        .eq('id', pendingAdesao.id);

      // Update subscription status if exists
      if (pendingAdesao.vindi_subscription_id) {
        await supabaseClient
          .from('subscriptions')
          .update({ status: 'active' })
          .eq('vindi_subscription_id', pendingAdesao.vindi_subscription_id);
      }

      logStep("Retry completed successfully", { beneficiarioId: beneficiario.id });

      return new Response(
        JSON.stringify({ 
          success: true, 
          beneficiario_id: beneficiario.id,
          message: 'Adesão processada com sucesso após retry'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (rmsError) {
      logStep("Error in RMS retry processing", { error: rmsError });
      
      await supabaseClient
        .from('pending_adesoes')
        .update({ 
          status: 'rms_failed',
          last_rms_error: rmsError.message || 'Unknown error in RMS retry processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', pendingAdesao.id);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Error in retry processing',
          details: rmsError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    logStep("Unexpected error", { error: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});