import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CANCEL-VINDI-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting subscription cancellation");

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { beneficiarioId, vindiSubscriptionId } = await req.json();

    logStep("Request data", { beneficiarioId, vindiSubscriptionId });

    if (!beneficiarioId) {
      throw new Error('beneficiarioId is required');
    }

    // Get beneficiary data for validation
    const { data: beneficiario, error: beneficiarioError } = await supabase
      .from('beneficiarios')
      .select('*')
      .eq('id', beneficiarioId)
      .single();

    if (beneficiarioError || !beneficiario) {
      logStep("Beneficiary not found", { error: beneficiarioError });
      throw new Error('Beneficiário não encontrado');
    }

    logStep("Found beneficiary", { name: beneficiario.nome });

    // Cancel subscription in Vindi if we have a subscription ID
    if (vindiSubscriptionId) {
      logStep("Canceling Vindi subscription", { vindiSubscriptionId });

      const vindiApiKey = Deno.env.get('VINDI_API_KEY');
      if (!vindiApiKey) {
        logStep("Warning: Vindi API key not found, skipping Vindi cancellation");
      } else {
        try {
          const vindiResponse = await fetch(`https://app.vindi.com.br/api/v1/subscriptions/${vindiSubscriptionId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Basic ${btoa(vindiApiKey + ':')}`,
              'Content-Type': 'application/json',
              'User-Agent': 'MedPass/1.0'
            }
          });

          const vindiResult = await vindiResponse.json();

          if (!vindiResponse.ok) {
            logStep("Vindi cancellation failed", { status: vindiResponse.status, result: vindiResult });

            // Don't throw error - continue with local deletion even if Vindi fails
            logStep("Continuing with local deletion despite Vindi error");
          } else {
            logStep("Vindi subscription canceled successfully", { result: vindiResult });
          }
        } catch (vindiError) {
          logStep("Vindi API error", { error: vindiError.message });
          // Don't throw - continue with local deletion
        }
      }
    } else {
      logStep("No Vindi subscription ID found, skipping Vindi cancellation");
    }

    // Delete related records and the beneficiary
    logStep("Starting local data cleanup");

    // Delete from transactions first (foreign key constraint)
    const { error: transactionError } = await supabase
      .from('transactions')
      .delete()
      .eq('customer_document', beneficiario.cpf);

    if (transactionError) {
      logStep("Error deleting transactions", { error: transactionError });
      // Continue - not critical
    } else {
      logStep("Transactions deleted successfully");
    }

    // Delete from subscriptions table
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .delete()
      .eq('customer_document', beneficiario.cpf);

    if (subscriptionError) {
      logStep("Error deleting subscriptions", { error: subscriptionError });
      // Continue - not critical
    } else {
      logStep("Subscriptions deleted successfully");
    }

    // Finally, delete the beneficiary
    const { error: deleteError } = await supabase
      .from('beneficiarios')
      .delete()
      .eq('id', beneficiarioId);

    if (deleteError) {
      logStep("Error deleting beneficiary", { error: deleteError });
      throw new Error('Erro ao excluir beneficiário do banco de dados');
    }

    logStep("Beneficiary deleted successfully");

    return new Response(JSON.stringify({
      success: true,
      message: "Adesão cancelada com sucesso",
      vindiCanceled: !!vindiSubscriptionId,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    logStep("Error in subscription cancellation", { error: error.message });

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