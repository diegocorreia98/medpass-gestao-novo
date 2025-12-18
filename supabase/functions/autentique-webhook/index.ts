import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Formato real do payload do Autentique
interface AutentiqueWebhookPayload {
  id: string;
  url: string;
  name: string;
  event: {
    id: string;
    type: string;
    data: {
      id: string;
      name: string;
      files?: {
        signed?: string;
        original?: string;
      };
      signatures?: Array<{
        user?: {
          name: string;
          email: string;
          cpf?: string;
        };
        action?: string;
        signed?: string;
        rejected?: string;
        public_id: string;
      }>;
    };
    object: string;
    created_at: string;
  };
  format: string;
  object: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔔 [AUTENTIQUE-WEBHOOK] Webhook recebido');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const webhook: AutentiqueWebhookPayload = await req.json();
    
    console.log('📨 [AUTENTIQUE-WEBHOOK] Payload completo:', JSON.stringify(webhook, null, 2));

    // Extrair dados no formato correto do Autentique
    const eventType = webhook.event?.type;
    const eventData = webhook.event?.data;
    
    // Para eventos de document.*, o ID está em event.data.id
    // Para eventos de signature.*, o ID do documento está em event.data.document
    let documentId: string | undefined;
    
    if (eventType?.startsWith('signature.')) {
      // Evento de assinatura - document ID está em event.data.document
      documentId = eventData?.document;
      console.log('📋 [AUTENTIQUE-WEBHOOK] Evento de signature, document ID:', documentId);
    } else {
      // Evento de documento - ID está em event.data.id
      documentId = eventData?.id;
      console.log('📋 [AUTENTIQUE-WEBHOOK] Evento de document, ID:', documentId);
    }
    
    const documentData = eventData;

    console.log('📄 [AUTENTIQUE-WEBHOOK] Evento:', eventType, '| Documento:', documentId);

    if (!eventType || !documentId) {
      console.error('❌ [AUTENTIQUE-WEBHOOK] Payload inválido - evento ou documento ausente');
      return new Response(JSON.stringify({ 
        error: 'Payload inválido',
        received: webhook
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // Buscar beneficiário pelo document_id
    const { data: beneficiario, error: findError } = await supabaseClient
      .from('beneficiarios')
      .select('id, nome, email, cpf, plano_id, contract_status')
      .eq('autentique_document_id', documentId)
      .maybeSingle();

    if (findError) {
      console.error('❌ [AUTENTIQUE-WEBHOOK] Erro ao buscar beneficiário:', findError);
      return new Response(JSON.stringify({ 
        error: 'Erro ao buscar beneficiário',
        details: findError.message 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    if (!beneficiario) {
      console.warn('⚠️ [AUTENTIQUE-WEBHOOK] Beneficiário não encontrado para documento:', documentId);
      return new Response(JSON.stringify({ 
        error: 'Beneficiário não encontrado',
        document_id: documentId 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      });
    }

    console.log('👤 [AUTENTIQUE-WEBHOOK] Beneficiário encontrado:', {
      id: beneficiario.id,
      nome: beneficiario.nome,
      current_status: beneficiario.contract_status
    });

    // Processar diferentes eventos
    switch (eventType) {
      case 'document.finished':
        console.log('✅ [AUTENTIQUE-WEBHOOK] Documento finalizado (todas assinaturas concluídas)...');
        
        // Atualizar status do contrato
        const { error: updateError } = await supabaseClient
          .from('beneficiarios')
          .update({
            contract_status: 'signed',
            contract_signed_at: new Date().toISOString(),
            autentique_signed_data: documentData
          })
          .eq('id', beneficiario.id);

        if (updateError) {
          console.error('❌ [AUTENTIQUE-WEBHOOK] Erro ao atualizar beneficiário:', updateError);
          throw updateError;
        }

        console.log('✅ [AUTENTIQUE-WEBHOOK] Contrato marcado como assinado');

        // Gerar link de pagamento automaticamente após assinatura
        console.log('💳 [AUTENTIQUE-WEBHOOK] Gerando link de pagamento...');
        
        try {
          const { data: paymentLink, error: paymentError } = await supabaseClient.functions.invoke(
            'generate-payment-link',
            {
              body: { beneficiario_id: beneficiario.id }
            }
          );

          if (paymentError) {
            console.error('❌ [AUTENTIQUE-WEBHOOK] Erro ao gerar link de pagamento:', paymentError);
          } else {
            console.log('✅ [AUTENTIQUE-WEBHOOK] Link de pagamento gerado:', {
              checkout_url: paymentLink?.checkout_url,
              payment_url: paymentLink?.payment_url
            });

            // Opcional: Enviar email com o link de pagamento
            // await enviarEmailComLinkPagamento(beneficiario, paymentLink);
          }
        } catch (paymentErr) {
          console.error('❌ [AUTENTIQUE-WEBHOOK] Erro ao processar pagamento:', paymentErr);
          // Não falhar o webhook por causa do pagamento
        }

        return new Response(JSON.stringify({ 
          success: true,
          message: 'Contrato assinado e link de pagamento gerado',
          beneficiario_id: beneficiario.id,
          contract_status: 'signed'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });

      case 'signature.rejected':
        console.log('❌ [AUTENTIQUE-WEBHOOK] Assinatura recusada');
        
        const { error: refuseError } = await supabaseClient
          .from('beneficiarios')
          .update({
            contract_status: 'refused',
            autentique_signed_data: documentData
          })
          .eq('id', beneficiario.id);

        if (refuseError) {
          console.error('❌ [AUTENTIQUE-WEBHOOK] Erro ao marcar como recusado:', refuseError);
          throw refuseError;
        }

        console.log('✅ [AUTENTIQUE-WEBHOOK] Contrato marcado como recusado');

        return new Response(JSON.stringify({ 
          success: true,
          message: 'Contrato recusado registrado',
          beneficiario_id: beneficiario.id,
          contract_status: 'refused'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });

      case 'signature.viewed':
        console.log('👀 [AUTENTIQUE-WEBHOOK] Assinatura visualizada');
        
        // Apenas logar - não precisa atualizar banco
        return new Response(JSON.stringify({ 
          success: true,
          message: 'Visualização registrada'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      
      case 'signature.accepted':
        console.log('✅ [AUTENTIQUE-WEBHOOK] Assinatura aceita');
        
        // Marcar como signed quando assinatura for aceita
        const { error: acceptError } = await supabaseClient
          .from('beneficiarios')
          .update({
            contract_status: 'signed',
            contract_signed_at: new Date().toISOString(),
            autentique_signed_data: documentData
          })
          .eq('id', beneficiario.id);

        if (acceptError) {
          console.error('❌ [AUTENTIQUE-WEBHOOK] Erro ao atualizar:', acceptError);
          throw acceptError;
        }

        console.log('✅ [AUTENTIQUE-WEBHOOK] Status atualizado para signed');
        
        return new Response(JSON.stringify({ 
          success: true,
          message: 'Assinatura aceita registrada',
          beneficiario_id: beneficiario.id,
          contract_status: 'signed'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });

      default:
        console.log('ℹ️ [AUTENTIQUE-WEBHOOK] Evento não tratado:', eventType);
        
        return new Response(JSON.stringify({ 
          received: true,
          event: eventType,
          message: 'Evento recebido mas não processado'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
    }

  } catch (error) {
    console.error('❌ [AUTENTIQUE-WEBHOOK] Erro no webhook:', error);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro interno do servidor',
      details: error instanceof Error ? error.stack : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

