import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteRequest {
  email: string;
  nome: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { email, nome }: InviteRequest = await req.json();

    if (!email || !nome) {
      return new Response(
        JSON.stringify({ error: 'Email e nome são obrigatórios' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Get current user to set as creator
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autorização necessário' }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Check if user already exists (before creating any invite)
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers.users.some(u => u.email === email);
    
    if (userExists) {
      // User exists, send password reset instead
      try {
        const origin = req.headers.get('origin') || 'http://localhost:5173';
        const resetUrl = `${origin}/auth/reset-password`;
        
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: resetUrl,
        });

        if (resetError) {
          console.error('Error sending password reset:', resetError);
          return new Response(
            JSON.stringify({ 
              error: 'Erro ao enviar reset de senha',
              details: resetError.message 
            }),
            { 
              status: 500, 
              headers: { 'Content-Type': 'application/json', ...corsHeaders } 
            }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Usuário já existe. Email de reset de senha enviado com sucesso.',
            isExistingUser: true,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      } catch (error: any) {
        console.error('Exception sending password reset:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Erro ao enviar reset de senha',
            details: error.message 
          }),
          { 
            status: 500, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
      }
    }

    // Generate unique token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    // Find existing pending invite for this email
    const { data: existingInvite, error: selectInviteError } = await supabase
      .from('convites_matriz')
      .select('id')
      .eq('email', email)
      .eq('aceito', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (selectInviteError) {
      console.error('Error selecting existing invite:', selectInviteError);
    }

    let conviteId: string | null = null;

    if (existingInvite?.id) {
      // Update existing pending invite instead of creating duplicates
      const { error: updateError } = await supabase
        .from('convites_matriz')
        .update({
          token,
          expires_at: expiresAt.toISOString(),
          created_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingInvite.id);

      if (updateError) {
        console.error('Error updating invitation:', updateError);
        return new Response(
          JSON.stringify({ error: 'Erro ao atualizar convite' }),
          { 
            status: 500, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
      }

      conviteId = existingInvite.id;

      // Cleanup older pending invites for the same email (best-effort)
      await supabase
        .from('convites_matriz')
        .delete()
        .eq('email', email)
        .eq('aceito', false)
        .neq('id', conviteId);
    } else {
      // Insert a brand new invite
      const { data: insertData, error: insertError } = await supabase
        .from('convites_matriz')
        .insert({
          email,
          token,
          expires_at: expiresAt.toISOString(),
          created_by: user.id,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error inserting invitation:', insertError);
        return new Response(
          JSON.stringify({ error: 'Erro ao salvar convite' }),
          { 
            status: 500, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
      }
      conviteId = insertData.id;
    }

    // Build invitation URL based on request origin
    const origin = req.headers.get('origin') || 'http://localhost:5173';

    // Build custom invitation URL for password creation
    const resetUrl = `${origin}/auth/reset-password?convite=${token}&tipo=matriz`;

    // Send invitation email using Supabase Admin API to generate reset link
    try {
      const { error: emailError } = await supabase.auth.admin.generateLink({
        type: 'invite',
        email: email,
        options: {
          redirectTo: resetUrl,
          data: {
            nome,
            user_type: 'matriz',
            invited_by: user.email,
            convite_id: conviteId,
          },
        }
      });

      if (emailError) {
        console.error('Email error:', emailError);
        return new Response(
          JSON.stringify({ 
            error: 'Erro ao enviar email de convite',
            details: emailError.message 
          }),
          { 
            status: 500, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Convite enviado com sucesso',
          token,
          inviteUrl: resetUrl,
          expiresAt: expiresAt.toISOString(),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    } catch (emailError: any) {
      console.error('Exception sending email:', emailError);
      return new Response(
        JSON.stringify({ 
          error: 'Erro inesperado ao enviar email',
          details: emailError.message 
        }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

  } catch (error: any) {
    console.error('Error in send-admin-invite function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);