import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateSettingsRequest {
  apiKey?: string;
  adesaoUrl?: string;
  cancelamentoUrl?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Authenticate the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    // Verify user authentication and check if user is 'matriz'
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    // Check if user has 'matriz' permissions
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('user_id', user.id)
      .single();
      
    if (profileError || profile?.user_type !== 'matriz') {
      throw new Error('Insufficient permissions. Only matriz users can update API settings.');
    }

    const { apiKey, adesaoUrl, cancelamentoUrl }: UpdateSettingsRequest = await req.json();
    
    // Validate input
    if (!apiKey && !adesaoUrl && !cancelamentoUrl) {
      throw new Error('At least one setting must be provided');
    }

    if (adesaoUrl && !isValidUrl(adesaoUrl)) {
      throw new Error('Invalid adesão URL format');
    }

    if (cancelamentoUrl && !isValidUrl(cancelamentoUrl)) {
      throw new Error('Invalid cancelamento URL format');
    }

    // Store secrets in a secure way using database
    const settingsToUpdate = [];
    
    if (apiKey) {
      settingsToUpdate.push({ name: 'EXTERNAL_API_KEY', value: apiKey, masked_value: `${apiKey.substring(0, 8)}...` });
    }
    
    if (adesaoUrl) {
      settingsToUpdate.push({ name: 'EXTERNAL_API_ADESAO_URL', value: adesaoUrl, masked_value: adesaoUrl });
    }
    
    if (cancelamentoUrl) {
      settingsToUpdate.push({ name: 'EXTERNAL_API_CANCELAMENTO_URL', value: cancelamentoUrl, masked_value: cancelamentoUrl });
    }

    // Store in a secure table for API settings
    for (const setting of settingsToUpdate) {
      const { error: insertError } = await supabase
        .from('api_settings')
        .upsert({
          setting_name: setting.name,
          setting_value: setting.value,
          masked_value: setting.masked_value,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'setting_name'
        });

      if (insertError) {
        console.error('Error storing setting:', setting.name, insertError);
        throw new Error(`Failed to update setting: ${setting.name}`);
      }
    }

    // Log the configuration change
    await supabase
      .from('logs_atividades')
      .insert({
        user_id: user.id,
        acao: 'UPDATE_API_SETTINGS',
        tabela: 'api_settings',
        dados_novos: {
          apiKey: apiKey ? '[UPDATED]' : '[UNCHANGED]',
          adesaoUrl: adesaoUrl || '[UNCHANGED]',
          cancelamentoUrl: cancelamentoUrl || '[UNCHANGED]',
          timestamp: new Date().toISOString()
        }
      });

    return new Response(JSON.stringify({ 
      success: true,
      message: 'API settings updated successfully',
      updated: {
        apiKey: !!apiKey,
        adesaoUrl: !!adesaoUrl,
        cancelamentoUrl: !!cancelamentoUrl
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
    
  } catch (error) {
    console.error('Error updating API settings:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to update API settings',
      details: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});


function isValidUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}