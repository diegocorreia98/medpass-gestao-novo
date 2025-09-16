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

    // ✅ ENHANCED: Get ALL transactions (both pending and paid) for comprehensive status sync
    const { data: transactions } = await supabaseService
      .from('transactions')
      .select(`
        id,
        beneficiario_id,
        vindi_charge_id,
        status,
        customer_document,
        beneficiarios (
          id,
          nome,
          cpf,
          payment_status,
          user_id
        )
      `)
      .not('vindi_charge_id', 'is', null);

    // Also get transactions that are already paid locally but beneficiario status might be outdated
    const { data: paidTransactions } = await supabaseService
      .from('transactions')
      .select(`
        id,
        beneficiario_id,
        customer_document,
        status,
        beneficiarios (
          id,
          nome,
          cpf,
          payment_status,
          user_id
        )
      `)
      .eq('status', 'paid');

    // Combine both transaction sets
    const allTransactions = [...(transactions || []), ...(paidTransactions || [])];

    // Remove duplicates by transaction id
    const uniqueTransactions = allTransactions.filter((transaction, index, self) =>
      index === self.findIndex(t => t.id === transaction.id)
    );

    if (!uniqueTransactions || uniqueTransactions.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        updates: [],
        message: 'No transactions to check'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`🔍 Found ${uniqueTransactions.length} unique transactions to process`);

    // Get Vindi API settings from environment
    const vindiApiKey = Deno.env.get('VINDI_API_KEY');
    const vindiEnvironment = Deno.env.get('VINDI_ENVIRONMENT') || 'production';

    if (!vindiApiKey) {
      throw new Error('Vindi API key not configured');
    }
    
    // ✅ SANDBOX SUPPORT: Dynamic API URLs
    const VINDI_API_URLS = {
      sandbox: 'https://sandbox-app.vindi.com.br/api/v1',
      production: 'https://app.vindi.com.br/api/v1'
    };
    
    const vindiApiUrl = VINDI_API_URLS[vindiEnvironment as keyof typeof VINDI_API_URLS] || VINDI_API_URLS.production;
    
    console.log(`🔧 Refreshing payment statuses using Vindi ${vindiEnvironment}:`, vindiApiUrl);

    const updates: any[] = [];

    // Process each unique transaction
    for (const transaction of uniqueTransactions) {
      console.log(`🔄 Processing transaction ${transaction.id} - Status: ${transaction.status}`);

      // ✅ PRIORITY FIX: Handle locally paid transactions first
      if (transaction.status === 'paid' && transaction.beneficiarios?.payment_status !== 'paid') {
        console.log(`💰 Found paid transaction with outdated beneficiario status:`, {
          transaction_id: transaction.id,
          beneficiario_id: transaction.beneficiario_id,
          current_beneficiario_status: transaction.beneficiarios?.payment_status
        });

        // Update beneficiary payment status immediately
        const { error: beneficiarioError } = await supabaseService
          .from('beneficiarios')
          .update({
            payment_status: 'paid',
            updated_at: new Date().toISOString()
          })
          .eq('id', transaction.beneficiario_id);

        if (beneficiarioError) {
          console.error('Error updating paid beneficiary:', beneficiarioError);
        } else {
          updates.push({
            beneficiario_id: transaction.beneficiario_id,
            beneficiario_nome: transaction.beneficiarios?.nome || 'Unknown',
            old_status: transaction.beneficiarios?.payment_status,
            new_status: 'paid',
            transaction_id: transaction.id,
            source: 'local_transaction_sync'
          });
          console.log(`✅ Updated beneficiario to paid status`);
        }
        continue; // Skip Vindi API check for already paid transactions
      }

      // ✅ Continue with Vindi API check for pending transactions
      if (!transaction.vindi_charge_id) {
        console.log(`⏭️  Skipping transaction ${transaction.id} - no Vindi charge ID`);
        continue;
      }
      try {
        const chargeResponse = await fetch(`${vindiApiUrl}/charges/${transaction.vindi_charge_id}`, {
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
            beneficiario_nome: transaction.beneficiarios?.nome || 'Unknown',
            old_status: transaction.beneficiarios?.payment_status,
            new_status: newPaymentStatus,
            transaction_id: transaction.id,
            source: 'vindi_api_sync'
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
      checked_transactions: uniqueTransactions.length,
      local_syncs: updates.filter(u => u.source === 'local_transaction_sync').length,
      vindi_syncs: updates.filter(u => u.source === 'vindi_api_sync').length,
      message: `Checked ${uniqueTransactions.length} transactions, made ${updates.length} updates (${updates.filter(u => u.source === 'local_transaction_sync').length} from local sync, ${updates.filter(u => u.source === 'vindi_api_sync').length} from Vindi API)`
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