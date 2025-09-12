import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error('User not authenticated');
    }

    // Service role client for database operations
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get all transactions with payment_requested status
    const { data: transactions } = await supabaseService
      .from('transactions')
      .select(`
        id,
        beneficiario_id,
        vindi_charge_id,
        status,
        beneficiarios (
          id,
          payment_status,
          user_id
        )
      `)
      .eq('status', 'pending')
      .not('vindi_charge_id', 'is', null);

    if (!transactions || transactions.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        updates: [],
        message: 'No pending transactions to check'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Get Vindi API settings from environment
    const vindiApiKey = Deno.env.get('VINDI_API_KEY');

    if (!vindiApiKey) {
      throw new Error('Vindi API key not configured');
    }

    const updates: any[] = [];

    // Check each transaction status with Vindi
    for (const transaction of transactions) {
      try {
        const chargeResponse = await fetch(`https://app.vindi.com.br/api/v1/charges/${transaction.vindi_charge_id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${btoa(vindiApiKey + ':')}`,
            'Content-Type': 'application/json',
          },
        });

        if (!chargeResponse.ok) {
          console.error(`Error fetching charge ${transaction.vindi_charge_id}:`, chargeResponse.status);
          continue;
        }

        const chargeData = await chargeResponse.json();
        const charge = chargeData.charge;

        let newTransactionStatus = transaction.status;
        let newPaymentStatus = transaction.beneficiarios?.payment_status || 'not_requested';

        // Map Vindi charge status to our status
        switch (charge.status) {
          case 'paid':
            newTransactionStatus = 'paid';
            newPaymentStatus = 'paid';
            break;
          case 'canceled':
          case 'rejected':
            newTransactionStatus = 'failed';
            newPaymentStatus = 'failed';
            break;
          case 'pending':
            newTransactionStatus = 'pending';
            newPaymentStatus = 'payment_requested';
            break;
          case 'processing':
            newTransactionStatus = 'processing';
            newPaymentStatus = 'processing';
            break;
        }

        // Update transaction status if changed
        if (newTransactionStatus !== transaction.status) {
          const { error: transactionError } = await supabaseService
            .from('transactions')
            .update({ 
              status: newTransactionStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', transaction.id);

          if (transactionError) {
            console.error('Error updating transaction:', transactionError);
          }
        }

        // Update beneficiary payment status if changed
        if (newPaymentStatus !== transaction.beneficiarios?.payment_status) {
          const { error: beneficiarioError } = await supabaseService
            .from('beneficiarios')
            .update({ 
              payment_status: newPaymentStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', transaction.beneficiario_id);

          if (beneficiarioError) {
            console.error('Error updating beneficiary:', beneficiarioError);
          }

          updates.push({
            beneficiario_id: transaction.beneficiario_id,
            old_status: transaction.beneficiarios?.payment_status,
            new_status: newPaymentStatus,
            transaction_id: transaction.id
          });
        }

      } catch (error) {
        console.error(`Error checking charge ${transaction.vindi_charge_id}:`, error);
        continue;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      updates,
      checked_transactions: transactions.length,
      message: `Checked ${transactions.length} transactions, ${updates.length} updates made`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in refresh-payment-statuses:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});