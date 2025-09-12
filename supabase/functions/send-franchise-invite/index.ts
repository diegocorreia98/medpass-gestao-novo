import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteRequest {
  unidadeId: string;
  email: string;
  nome: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== INÍCIO SEND-FRANCHISE-INVITE ===');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { unidadeId, email, nome }: InviteRequest = await req.json();
    console.log('Dados recebidos:', { unidadeId, email, nome });

    // Gerar token único
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expira em 7 dias
    
    console.log('Token gerado:', token, 'Expira em:', expiresAt.toISOString());

    // Salvar convite na tabela
    console.log('Salvando convite na tabela...');
    const { data: convite, error: conviteError } = await supabase
      .from('convites_franqueados')
      .insert({
        unidade_id: unidadeId,
        email: email,
        token: token,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (conviteError) {
      console.error('ERRO ao criar convite na tabela:', conviteError);
      throw conviteError;
    }

    console.log('Convite salvo na tabela com sucesso:', convite.id);

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
    console.log('Ambiente detectado - URL atual:', currentUrl);
    console.log('Base URL definida:', baseUrl);
    console.log('URL do convite construída:', inviteUrl);

    // Enviar email usando Resend
    console.log('Enviando email customizado via Resend...');
    
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    try {
      const emailResponse = await resend.emails.send({
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

      console.log('Email enviado com sucesso via Resend:', emailResponse);
      console.log(`=== Convite processado com sucesso para ${email} - Token: ${token} ===`);
      
    } catch (emailError: any) {
      console.error('ERRO ao enviar email via Resend:', emailError);
      
      // Retornar sucesso mesmo se o email falhar, pois o convite foi salvo
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Convite salvo no sistema. Erro no envio do email.',
          token: token,
          invite_url: inviteUrl,
          email_error: emailError.message,
          manual_action_required: true
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Convite enviado com sucesso',
        token: token,
        invite_url: inviteUrl 
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Erro na função send-franchise-invite:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno do servidor',
        success: false 
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