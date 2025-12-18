import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface AcceptInviteRequest {
  token: string;
  email: string;
  password: string;
}

const logStep = (step: string, details?: Record<string, unknown>): void => {
  console.log(`[ACCEPT-INVITE] ${step}`, details ? JSON.stringify(details) : '');
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Função iniciada');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuração Supabase não encontrada');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const requestData: AcceptInviteRequest = await req.json();
    const { token, email, password } = requestData;

    if (!token || !email || !password) {
      throw new Error('Dados obrigatórios ausentes: token, email, password');
    }

    if (password.length < 6) {
      throw new Error('Senha deve ter pelo menos 6 caracteres');
    }

    logStep('Dados recebidos', { email: email.substring(0, 5) + '***', tokenPrefix: token.substring(0, 8) });

    // 1. Verificar se o convite existe e é válido
    const { data: convite, error: conviteError } = await supabaseAdmin
      .from('convites_franqueados')
      .select('*, unidades(id, nome, user_id)')
      .eq('token', token)
      .eq('email', email)
      .single();

    if (conviteError || !convite) {
      logStep('Convite não encontrado', { error: conviteError?.message });
      throw new Error('Convite não encontrado ou inválido');
    }

    if (convite.aceito) {
      throw new Error('Este convite já foi aceito');
    }

    if (new Date(convite.expires_at) < new Date()) {
      throw new Error('Este convite expirou');
    }

    logStep('Convite válido', { unidade: convite.unidades?.nome });

    // 2. Verificar se o usuário já existe no Auth
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      logStep('Erro ao listar usuários', { error: listError.message });
      throw new Error('Erro ao verificar usuários existentes');
    }

    const existingUser = existingUsers.users.find(u => u.email === email);
    let userId: string;

    if (existingUser) {
      logStep('Usuário existente encontrado', { userId: existingUser.id });

      // 3a. Atualizar a senha do usuário existente
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { password: password }
      );

      if (updateError) {
        logStep('Erro ao atualizar senha', { error: updateError.message });
        throw new Error('Erro ao definir nova senha: ' + updateError.message);
      }

      userId = existingUser.id;
      logStep('Senha atualizada com sucesso', { userId });
    } else {
      logStep('Usuário não existe, criando novo...');

      // 3b. Criar novo usuário
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          user_type: 'unidade',
          full_name: convite.unidades?.nome || email,
        }
      });

      if (createError) {
        logStep('Erro ao criar usuário', { error: createError.message });
        throw new Error('Erro ao criar conta: ' + createError.message);
      }

      if (!newUser.user) {
        throw new Error('Falha ao criar conta do usuário');
      }

      userId = newUser.user.id;
      logStep('Novo usuário criado', { userId });
    }

    // 4. Marcar convite como aceito
    const { error: updateConviteError } = await supabaseAdmin
      .from('convites_franqueados')
      .update({
        aceito: true,
        user_id_aceito: userId,
        updated_at: new Date().toISOString()
      })
      .eq('token', token);

    if (updateConviteError) {
      logStep('Erro ao atualizar convite', { error: updateConviteError.message });
      // Continue mesmo se falhar, pois o usuário já foi configurado
    }

    // 5. Atualizar a unidade com o user_id (se ainda não tiver)
    if (convite.unidades && !convite.unidades.user_id) {
      const { error: updateUnidadeError } = await supabaseAdmin
        .from('unidades')
        .update({ user_id: userId })
        .eq('id', convite.unidade_id);

      if (updateUnidadeError) {
        logStep('Erro ao associar unidade', { error: updateUnidadeError.message });
        // Continue mesmo se falhar
      } else {
        logStep('Unidade associada ao usuário');
      }
    }

    logStep('Convite aceito com sucesso', { userId, unidade: convite.unidades?.nome });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Convite aceito com sucesso! Agora você pode fazer login.',
        user_id: userId,
        unidade_id: convite.unidade_id,
        unidade_nome: convite.unidades?.nome
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );

  } catch (error) {
    const err = error as Error;
    logStep('Erro na função', { error: err.message });

    return new Response(
      JSON.stringify({
        error: err.message || 'Erro interno do servidor',
        success: false
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
};

serve(handler);
