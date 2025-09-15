import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { Resend } from "npm:resend@2.0.0";

// CORS headers melhorados com segurança
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY'
};

interface InviteRequest {
  unidadeId: string;
  email: string;
  nome: string;
}

// ✅ CORREÇÃO: Interfaces para tipagem específica
interface LogDetails {
  unidadeId?: string;
  email?: string;
  nome?: string;
  token?: string;
  expiresAt?: string;
  id?: string;
  baseUrl?: string;
  inviteUrl?: string;
  error?: string;
  stack?: string;
}

interface ConviteData {
  id: string;
  unidade_id: string;
  email: string;
  token: string;
  expires_at: string;
  created_at?: string;
}

interface DatabaseResult {
  data: ConviteData | null;
  error: { message: string } | null;
}

interface EmailResult {
  id: string;
  from?: string;
  to?: string[];
  created_at?: string;
}

interface SuccessResponse {
  success: boolean;
  message: string;
  token: string;
  invite_url: string;
  email_warning?: string;
}

// ✅ CORREÇÃO: Logging estruturado com tipos específicos
const logStep = (step: string, details?: LogDetails): void => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-INVITE] ${step}${detailsStr}`);
};

// ✅ CORREÇÃO: Declaração global do Deno (para resolver erro TS local)
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    logStep("CORS preflight handled");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Função iniciada');
    
    // ✅ CORREÇÃO 1: Verificar variáveis de ambiente críticas
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendKey = Deno.env.get('RESEND_API_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Configuração Supabase não encontrada');
    }
    
    if (!resendKey) {
      logStep('WARNING: RESEND_API_KEY não configurada - prosseguindo sem email');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ✅ CORREÇÃO 2: Validação robusta de dados de entrada
    let requestData: InviteRequest;
    try {
      requestData = await req.json() as InviteRequest;
    } catch (parseError) {
      throw new Error('Dados JSON inválidos');
    }

    const { unidadeId, email, nome } = requestData;
    
    if (!unidadeId || !email || !nome) {
      throw new Error('Dados obrigatórios ausentes: unidadeId, email, nome');
    }
    
    // Validação básica de email
    if (!email.includes('@') || email.length < 5) {
      throw new Error('Email inválido');
    }
    
    logStep('Dados validados', { 
      unidadeId, 
      email: email.substring(0, 5) + '***', 
      nome: nome.substring(0, 10) + '...' 
    });

    // Gerar token único
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expira em 7 dias
    
    logStep('Token gerado', { 
      token: token.substring(0, 8) + '...', 
      expiresAt: expiresAt.toISOString() 
    });

    // ✅ CORREÇÃO 3: Database operation com timeout e tipos específicos
    logStep('Salvando convite na tabela');
    
    const insertPromise = supabase
      .from('convites_franqueados')
      .insert({
        unidade_id: unidadeId,
        email: email,
        token: token,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    // Timeout de 10 segundos para database
    const conviteResult = await Promise.race([
      insertPromise,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout - operação demorou mais que 10s')), 10000)
      )
    ]) as DatabaseResult;

    if (conviteResult.error) {
      logStep('Erro ao criar convite na tabela', { error: conviteResult.error.message });
      throw new Error(`Database error: ${conviteResult.error.message}`);
    }

    if (!conviteResult.data) {
      throw new Error('Nenhum dado retornado do database');
    }

    const convite = conviteResult.data;
    logStep('Convite salvo na tabela', { id: convite.id });

    // Construir URL correta baseada no ambiente
    const currentUrl = req.url;
    let baseUrl = '';
    
    // Detectar ambiente e usar URLs específicas
    if (currentUrl.includes('localhost')) {
      baseUrl = 'http://localhost:8080';
    } else if (currentUrl.includes('lovableproject.com')) {
      // Para preview URLs do Lovable
      const urlParts = currentUrl.split('/');
      baseUrl = `${urlParts[0]}//${urlParts[2]}`;
    } else {
      // Para produção, usar sempre o domínio de produção
      baseUrl = 'https://www.medpassbeneficios.com.br';
    }
    
    const inviteUrl = `${baseUrl}/convite/${token}`;
    logStep('URL do convite construída', { baseUrl, inviteUrl });

    // ✅ CORREÇÃO 4: Preparar resposta de sucesso com tipos específicos
    const successResponse: SuccessResponse = {
      success: true,
      message: 'Convite criado com sucesso',
      token: token,
      invite_url: inviteUrl
    };

    // ✅ CORREÇÃO 5: Email com timeout e tipagem específica
    if (resendKey) {
      try {
        logStep('Enviando email via Resend');
        
        const resend = new Resend(resendKey);
        
        // Email com timeout de 15 segundos
        const emailPromise = resend.emails.send({
          from: "MedPass Benefícios <noreply@medpassbeneficios.com.br>",
          to: [email],
          subject: "Convite para Franquia MedPass - Acesse sua conta",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Convite para Franquia MedPass</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="margin: 0; font-size: 28px;">Bem-vindo à MedPass!</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Você foi convidado para gerenciar a franquia</p>
              </div>
              
              <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                <h2 style="color: #1e40af; margin-top: 0;">Olá, ${nome}!</h2>
                
                <p>Você foi convidado para gerenciar uma franquia na plataforma MedPass Benefícios. Para começar, você precisa criar sua conta.</p>
                
                <div style="background: #f8fafc; padding: 20px; border-radius: 6px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 14px; color: #64748b;">
                    <strong>Email:</strong> ${email}<br>
                    <strong>Unidade:</strong> ${nome}
                  </p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${inviteUrl}" 
                     style="background: #1e40af; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
                    Criar Minha Conta
                  </a>
                </div>
                
                <p style="font-size: 14px; color: #64748b; border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                  Este convite expira em 7 dias. Se você não conseguir clicar no botão acima, copie e cole este link no seu navegador:<br>
                  <a href="${inviteUrl}" style="color: #1e40af; word-break: break-all;">${inviteUrl}</a>
                </p>
                
                <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
                  Se você não esperava este convite, pode ignorar este email com segurança.
                </p>
              </div>
            </body>
            </html>
          `,
        });

        const emailResult = await Promise.race([
          emailPromise,
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Email timeout - demorou mais que 15s')), 15000)
          )
        ]) as EmailResult;

        logStep('Email enviado com sucesso', { id: emailResult.id });
        successResponse.message = 'Convite enviado com sucesso';
        
      } catch (emailError) {
        const error = emailError as Error;
        logStep('Erro ao enviar email (prosseguindo)', { error: error.message });
        successResponse.message = 'Convite criado. Email será enviado posteriormente.';
        successResponse.email_warning = 'Email não enviado: ' + error.message;
      }
    } else {
      logStep('Email não enviado - RESEND_API_KEY não configurada');
      successResponse.message = 'Convite criado. Configure RESEND_API_KEY para envio automático de emails.';
    }

    logStep('Função concluída com sucesso');
    
    return new Response(
      JSON.stringify(successResponse),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    const err = error as Error;
    logStep('Erro na função', { 
      error: err.message, 
      stack: err.stack?.substring(0, 200) + '...' 
    });
    
    // ✅ CORREÇÃO 6: Error response sempre com CORS correto
    return new Response(
      JSON.stringify({ 
        error: err.message || 'Erro interno do servidor',
        success: false,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);