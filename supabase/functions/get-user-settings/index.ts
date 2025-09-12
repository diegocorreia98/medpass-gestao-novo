import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get user from JWT token first
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header missing' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Use the user's JWT token instead of service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    )

    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Getting settings for user:', user.id)

    // Try to get existing settings first
    let { data: settings, error: settingsError } = await supabaseClient
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // If no settings found, create default settings
    if (settingsError && settingsError.code === 'PGRST116') {
      console.log('No settings found, creating default settings for user:', user.id)
      
      const { data: newSettings, error: insertError } = await supabaseClient
        .from('user_settings')
        .insert({
          user_id: user.id,
          email_notifications: true,
          push_notifications: true,
          sms_notifications: false,
          marketing_emails: false,
          two_factor_enabled: false,
          session_timeout: 30,
          theme: 'system',
          language: 'pt-BR',
          timezone: 'America/Sao_Paulo'
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error creating user settings:', insertError)
        return new Response(
          JSON.stringify({ error: 'Failed to create user settings', details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      settings = newSettings
    } else if (settingsError) {
      console.error('Settings error:', settingsError)
      return new Response(
        JSON.stringify({ error: 'Failed to get user settings', details: settingsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User settings retrieved successfully')

    return new Response(
      JSON.stringify(settings),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})