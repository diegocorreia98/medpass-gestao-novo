import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

interface UpdatePasswordRequest {
  email: string;
  newPassword: string;
  inviteToken: string;
}

const handler = async (req: Request): Promise<Response> => {
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

    const { email, newPassword, inviteToken }: UpdatePasswordRequest = await req.json();

    console.log('Updating password for user:', email);

    // 1. Verify the invite token is valid
    const { data: inviteData, error: inviteError } = await supabaseAdmin
      .rpc('get_convite_by_token', {
        invitation_token: inviteToken
      });

    if (inviteError || !inviteData || inviteData.length === 0) {
      throw new Error('Invalid or expired invite token');
    }

    const invite = inviteData[0];
    if (invite.email !== email) {
      throw new Error('Email does not match invite');
    }

    // 2. Find user by email and update password
    const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers();

    if (userError) {
      throw new Error('Failed to list users');
    }

    const user = users.users.find(u => u.email === email);
    if (!user) {
      throw new Error('User not found');
    }

    // 3. Update user password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        password: newPassword,
        email_confirm: true
      }
    );

    if (updateError) {
      throw new Error(`Failed to update password: ${updateError.message}`);
    }

    console.log('Password updated successfully for user:', user.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Password updated successfully',
        userId: user.id
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
    console.error('Error updating password:', error);

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