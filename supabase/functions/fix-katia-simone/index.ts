import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FIX-KATIA-SIMONE] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting manual fix for Katia Simone");

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find Katia Simone in beneficiarios
    const { data: katiaBeneficiario, error: katiaError } = await supabase
      .from('beneficiarios')
      .select('*')
      .or('nome.ilike.%katia%simone%,nome.ilike.%budnik%')
      .single();

    if (katiaError || !katiaBeneficiario) {
      logStep("Katia Simone not found in beneficiarios", { error: katiaError?.message });
      throw new Error('Beneficiário Katia Simone não encontrado');
    }

    logStep("Found Katia Simone", {
      id: katiaBeneficiario.id,
      nome: katiaBeneficiario.nome,
      cpf: katiaBeneficiario.cpf,
      payment_status: katiaBeneficiario.payment_status
    });

    // Find related transaction
    const { data: katiaTransaction, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .or(`customer_name.ilike.%katia%simone%,customer_name.ilike.%budnik%,customer_document.eq.${katiaBeneficiario.cpf}`)
      .eq('status', 'paid')
      .single();

    if (transactionError || !katiaTransaction) {
      logStep("No paid transaction found for Katia", { error: transactionError?.message });
      throw new Error('Transação paga não encontrada para Katia Simone');
    }

    logStep("Found paid transaction", {
      id: katiaTransaction.id,
      status: katiaTransaction.status,
      customer_name: katiaTransaction.customer_name,
      customer_document: katiaTransaction.customer_document
    });

    // Update beneficiario payment_status to paid
    const { error: updateError } = await supabase
      .from('beneficiarios')
      .update({
        payment_status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('id', katiaBeneficiario.id);

    if (updateError) {
      logStep("Error updating beneficiario", { error: updateError.message });
      throw new Error('Erro ao atualizar status de pagamento do beneficiário');
    }

    logStep("Beneficiario payment_status updated to paid");

    // Call adesão API
    logStep("Calling adesão API for Katia");

    const adesaoData = {
      id: katiaBeneficiario.id,
      nome: katiaBeneficiario.nome,
      cpf: katiaBeneficiario.cpf,
      data_nascimento: katiaBeneficiario.data_nascimento || '01011990',
      telefone: katiaBeneficiario.telefone || '11999999999',
      email: katiaBeneficiario.email,
      cep: katiaBeneficiario.cep || '01234567',
      numero_endereco: katiaBeneficiario.numero_endereco || '123',
      estado: katiaBeneficiario.estado || 'SP',
      plano_id: katiaBeneficiario.plano_id,
      id_beneficiario_tipo: 1,
      codigo_externo: `MANUAL_${katiaBeneficiario.id}`
    };

    logStep("Adesão data prepared", adesaoData);

    try {
      const adesaoResult = await supabase.functions.invoke('notify-external-api', {
        body: {
          operation: 'adesao',
          data: adesaoData
        }
      });

      if (adesaoResult.error) {
        logStep("Error calling adesão API", { error: adesaoResult.error.message });
        throw new Error(`Erro ao chamar API de adesão: ${adesaoResult.error.message}`);
      } else if (adesaoResult.data?.success) {
        logStep("Adesão API called successfully", { response: adesaoResult.data.response });
      } else {
        logStep("Adesão API call completed with issues", { data: adesaoResult.data });
      }

    } catch (adesaoError) {
      logStep("Exception calling adesão API", { error: adesaoError.message });
      throw new Error(`Exceção ao chamar API de adesão: ${adesaoError.message}`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Katia Simone fixed successfully",
      beneficiario: {
        id: katiaBeneficiario.id,
        nome: katiaBeneficiario.nome,
        cpf: katiaBeneficiario.cpf,
        payment_status: 'paid'
      },
      transaction_found: true,
      adesao_called: true,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    logStep("Error in manual fix", { error: error.message });

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