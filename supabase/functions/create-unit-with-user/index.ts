import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

// Declare Deno global for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

interface CreateUnitRequest {
  unidade: {
    nome: string;
    cnpj?: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    telefone?: string;
    franquia_id?: string;
    status: string;
  };
  responsavel: {
    nome: string;
    email: string;
    telefone?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const requestData: CreateUnitRequest = await req.json();
    const { unidade, responsavel } = requestData;

    console.log('Creating unit with user:', { unidade: unidade.nome, email: responsavel.email });

    // 1. Create user in auth.users using invite flow
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      responsavel.email,
      {
        data: {
          user_type: 'unidade',
          full_name: responsavel.nome,
          telefone: responsavel.telefone
        }
      }
    );

    if (userError) {
      console.error('Error creating user:', userError);
      throw new Error(`Failed to create user: ${userError.message}`);
    }

    if (!userData.user) {
      throw new Error('User creation failed - no user data returned');
    }

    console.log('User created successfully:', userData.user.id);

    // 2. Create unit with the new user_id
    const { data: unidadeData, error: unidadeError } = await supabaseAdmin
      .from('unidades')
      .insert({
        ...unidade,
        user_id: userData.user.id,
        responsavel: responsavel.nome,
        email: responsavel.email
      })
      .select()
      .single();

    if (unidadeError) {
      console.error('Error creating unit:', unidadeError);
      // If unit creation fails, delete the created user
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
      throw new Error(`Failed to create unit: ${unidadeError.message}`);
    }

    console.log('Unit created successfully:', unidadeData.id);

    // 3. Create invitation record in convites_franqueados
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    const { error: conviteError } = await supabaseAdmin
      .from('convites_franqueados')
      .insert({
        unidade_id: unidadeData.id,
        email: responsavel.email,
        token: token,
        expires_at: expiresAt.toISOString(),
        aceito: false
      });

    if (conviteError) {
      console.error('Error creating invitation:', conviteError);
      // Don't fail the entire process if invitation creation fails
      console.log('Unit and user created, but invitation record failed');
    }

    // 4. Send invitation email using existing function
    try {
      const { error: emailError } = await supabaseAdmin.functions.invoke('send-franchise-invite', {
        body: {
          unidadeId: unidadeData.id,
          email: responsavel.email,
          nome: unidade.nome
        }
      });

      if (emailError) {
        console.error('Error sending invitation email:', emailError);
      } else {
        console.log('Invitation email sent successfully');
      }
    } catch (emailErr) {
      console.error('Failed to invoke email function:', emailErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Unit and user created successfully',
        unidade_id: unidadeData.id,
        user_id: userData.user.id,
        invitation_sent: !conviteError
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
    console.error('Error in create-unit-with-user:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
};

serve(handler);