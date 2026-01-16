import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const WEBHOOK_URL = 'https://webhook.cotachat.com.br/webhook/821ebccd-d249-411d-9aba-181c94eb26f6';

interface BeneficiarioRecord {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  plano_id: string;
  valor_plano: number;
  checkout_link: string;
}

interface WebhookPayload {
  nome_completo: string;
  email: string | null;
  telefone: string | null;
  tipo_plano: string;
  valor: number;
  checkout_link: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔔 [NOTIFY-NEW-ADESAO] Webhook trigger recebido');

    const { record }: { record: BeneficiarioRecord } = await req.json();

    console.log('📋 [NOTIFY-NEW-ADESAO] Beneficiario:', {
      id: record.id,
      nome: record.nome,
      checkout_link: record.checkout_link
    });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Buscar nome do plano
    const { data: plano, error: planoError } = await supabaseClient
      .from('planos')
      .select('nome')
      .eq('id', record.plano_id)
      .single();

    if (planoError) {
      console.warn('⚠️ [NOTIFY-NEW-ADESAO] Erro ao buscar plano:', planoError);
    }

    // Preparar payload para webhook externo
    const webhookPayload: WebhookPayload = {
      nome_completo: record.nome,
      email: record.email,
      telefone: record.telefone,
      tipo_plano: plano?.nome || 'Nao informado',
      valor: record.valor_plano,
      checkout_link: record.checkout_link
    };

    console.log('📤 [NOTIFY-NEW-ADESAO] Enviando para webhook:', webhookPayload);

    // Enviar para webhook externo
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload)
    });

    const responseText = await response.text();

    console.log('✅ [NOTIFY-NEW-ADESAO] Webhook response:', {
      status: response.status,
      body: responseText
    });

    if (!response.ok) {
      console.error('❌ [NOTIFY-NEW-ADESAO] Webhook retornou erro:', response.status, responseText);
    }

    return new Response(
      JSON.stringify({
        success: true,
        webhook_status: response.status,
        beneficiario_id: record.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ [NOTIFY-NEW-ADESAO] Erro:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erro interno',
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
