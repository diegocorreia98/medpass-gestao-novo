import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PasswordResetRequest {
  email: string;
  redirectOrigin?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Generate unique request ID for tracking
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[${requestId}] === PASSWORD RESET REQUEST START ===`);

  if (req.method === "OPTIONS") {
    console.log(`[${requestId}] Handling CORS preflight request`);
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, redirectOrigin }: PasswordResetRequest = await req.json();
    console.log(`[${requestId}] Password reset request received for email:`, email ? '[HIDDEN]' : 'undefined');
    console.log(`[${requestId}] Redirect origin provided:`, redirectOrigin || 'not provided');

    if (!email) {
      console.error(`[${requestId}] Email is required but not provided`);
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if Resend API key is available
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error(`[${requestId}] RESEND_API_KEY not configured`);
      return new Response(
        JSON.stringify({ error: "Configuração de email não encontrada" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    console.log(`[${requestId}] RESEND_API_KEY is configured`);

    // Skip connectivity test for now to avoid potential issues
    console.log(`[${requestId}] Proceeding with password reset flow...`);

    // Initialize Supabase client with service role key
    console.log(`[${requestId}] Initializing Supabase client...`);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if user exists first
    console.log(`[${requestId}] Checking if user exists...`);
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
      console.error(`[${requestId}] Error checking user existence:`, userError);
      return new Response(
        JSON.stringify({ error: "Erro interno do servidor" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userExists = users.users.some(user => user.email === email);
    console.log(`[${requestId}] User exists:`, userExists);
    console.log(`[${requestId}] Total users in system:`, users.users.length);

    if (!userExists) {
      console.log(`[${requestId}] User not found for email`);
      console.log(`[${requestId}] Attempting to send password reset anyway via Supabase (user might exist but not in list)`);

      // Try to send password reset anyway - Supabase will handle if user exists
      // This fixes cases where user exists but isn't returned in listUsers
      try {
        const baseUrl = redirectOrigin || 'https://www.medpassbeneficios.com.br';
        const redirectUrl = `${baseUrl}/auth/reset-password`;

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl
        });

        if (resetError) {
          console.error(`[${requestId}] Supabase resetPasswordForEmail failed:`, resetError);
        } else {
          console.log(`[${requestId}] Password reset email sent via Supabase built-in (user may exist)`);
        }
      } catch (fallbackError) {
        console.error(`[${requestId}] Failed to send via Supabase fallback:`, fallbackError);
      }

      // Always return success for security (don't leak user existence)
      return new Response(
        JSON.stringify({
          success: true,
          message: "Email de recuperação enviado com sucesso"
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate password reset token with custom redirect
    const baseUrl = redirectOrigin || 'https://www.medpassbeneficios.com.br';
    const redirectUrl = `${baseUrl}/auth/reset-password`;
    console.log(`[${requestId}] Generating reset link with redirect URL:`, redirectUrl);

    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: redirectUrl
      }
    });

    if (error) {
      console.error(`[${requestId}] Error generating reset link:`, error);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar link de recuperação" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[${requestId}] Reset link generated successfully, attempting to send email...`);

    // Try to send email using Resend
    console.log(`[${requestId}] Attempting to send password reset email via Resend...`);
    console.log(`[${requestId}] Email details: from=marketing@medpassbeneficios.com.br, to=${email ? '[HIDDEN]' : 'undefined'}`);
    try {
      const emailPayload = {
        from: "MedPass Benefícios <marketing@medpassbeneficios.com.br>",
        to: [email],
        subject: "Redefinir sua senha - MedPass Benefícios",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2c3e50; margin: 0; font-size: 24px;">Redefinir Senha</h1>
                <p style="color: #7f8c8d; margin: 10px 0 0 0;">MedPass Benefícios</p>
              </div>
              
              <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                Você solicitou a redefinição de sua senha. Clique no botão abaixo para criar uma nova senha:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.properties?.action_link}" 
                   style="background-color: #3498db; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
                  Redefinir Minha Senha
                </a>
              </div>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <p style="color: #6c757d; font-size: 14px; margin: 0;">
                  <strong>Importante:</strong> Se você não solicitou esta redefinição, pode ignorar este email com segurança. Sua senha permanecerá inalterada.
                </p>
              </div>
              
              <p style="color: #6c757d; font-size: 14px; margin-bottom: 20px;">
                ⏰ Este link expira em 1 hora por motivos de segurança.
              </p>
              
              <hr style="border: none; border-top: 1px solid #dee2e6; margin: 25px 0;">
              <div style="text-align: center;">
                <p style="color: #adb5bd; font-size: 12px; margin-bottom: 10px;">
                  Se o botão não funcionar, copie e cole este link no seu navegador:
                </p>
                <p style="word-break: break-all; font-size: 12px;">
                  <a href="${data.properties?.action_link}" style="color: #3498db;">${data.properties?.action_link}</a>
                </p>
              </div>
            </div>
          </div>
        `,
      };

      console.log(`[${requestId}] Calling resend.emails.send...`);
      const emailResponse = await resend.emails.send(emailPayload);
      console.log(`[${requestId}] Resend response received:`, emailResponse ? 'response object exists' : 'null response');

      if (emailResponse.error) {
        console.error(`[${requestId}] Resend API error, falling back to Supabase built-in reset:`, emailResponse.error);

        // Fallback to Supabase's built-in password reset
        console.log(`[${requestId}] Attempting fallback via Supabase built-in system...`);
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl
        });

        if (resetError) {
          console.error(`[${requestId}] Supabase password reset also failed:`, resetError);
          // Still return success for security reasons
        } else {
          console.log(`[${requestId}] Password reset sent via Supabase built-in system`);
        }
      } else {
        console.log(`[${requestId}] Password reset email sent successfully via Resend:`, JSON.stringify(emailResponse.data));
      }
    } catch (error) {
      console.error(`[${requestId}] Error with Resend, using Supabase fallback:`, error);

      // Fallback to Supabase's built-in password reset
      console.log(`[${requestId}] Attempting fallback via Supabase built-in system...`);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });

      if (resetError) {
        console.error(`[${requestId}] Supabase password reset also failed:`, resetError);
        // Still return success for security reasons
      } else {
        console.log(`[${requestId}] Password reset sent via Supabase built-in system`);
      }
    }

    console.log(`[${requestId}] === PASSWORD RESET REQUEST END (SUCCESS) ===`);
    return new Response(
      JSON.stringify({
        success: true,
        message: "Email de recuperação enviado com sucesso"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error(`[${requestId}] Error in send-password-reset function:`, error);
    console.log(`[${requestId}] === PASSWORD RESET REQUEST END (ERROR) ===`);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);