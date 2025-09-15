import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VINDI-WEBHOOK-DEBUG] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received - DEBUG VERSION");
    
    // Simple JSON parsing
    const webhookData = await req.json();
    
    logStep("Webhook data received", { 
      type: webhookData.type,
      hasData: !!webhookData.data,
      keys: Object.keys(webhookData)
    });
    
    const eventType = webhookData.type || 'unknown';
    const eventId = webhookData.id || Date.now();
    
    logStep("Processing completed", { eventType, eventId });

    return new Response(JSON.stringify({ 
      success: true,
      message: "Webhook processed successfully in debug mode",
      eventType,
      eventId,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    logStep("Error processing webhook", { error: error.message });
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});