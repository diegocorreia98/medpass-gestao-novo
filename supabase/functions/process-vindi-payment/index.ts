import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  customerData: {
    name: string;
    email: string;
    document: string;
    phone?: string;
    address?: {
      street: string;
      number: string;
      neighborhood: string;
      city: string;
      state: string;
      zipcode: string;
    };
  };
  paymentData: {
    method: 'credit_card' | 'pix' | 'boleto';
    cardData?: {
      holder_name: string;
      number: string;
      cvv: string;
      expiry_month: string;
      expiry_year: string;
    };
    installments?: number;
  };
  planData: {
    id: string;
    name: string;
    price: number;
  };
  userId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { customerData, paymentData, planData, userId }: PaymentRequest = await req.json();

    // Validate required fields
    if (!customerData?.name || !customerData?.email || !customerData?.document) {
      throw new Error('Missing required customer data');
    }

    if (!planData?.id || !planData?.name || !planData?.price) {
      throw new Error('Missing required plan data');
    }

    console.log('Processing payment for:', customerData.email, 'Plan:', planData.name);

    const vindiApiKey = Deno.env.get('VINDI_API_KEY');
    if (!vindiApiKey) {
      throw new Error('Vindi API key not configured');
    }

    const vindiBaseUrl = 'https://app.vindi.com.br/api/v1';
    const authHeader = `Basic ${btoa(vindiApiKey + ':')}`;

    // 1. Check if customer already exists in Vindi
    let vindiCustomer;
    const existingCustomerResponse = await fetch(
      `${vindiBaseUrl}/customers?query=${encodeURIComponent(customerData.email)}`,
      {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      }
    );

    const existingCustomerData = await existingCustomerResponse.json();
    
    if (existingCustomerData.customers?.length > 0) {
      vindiCustomer = existingCustomerData.customers[0];
      console.log('Found existing customer:', vindiCustomer.id);
    } else {
      // 2. Create customer in Vindi
      const createCustomerResponse = await fetch(`${vindiBaseUrl}/customers`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: customerData.name,
          email: customerData.email,
          registry_code: customerData.document,
          phone: customerData.phone,
          address: customerData.address ? {
            street: customerData.address.street,
            number: customerData.address.number,
            neighborhood: customerData.address.neighborhood,
            city: customerData.address.city,
            state: customerData.address.state,
            zipcode: customerData.address.zipcode,
            country: 'BR',
          } : undefined,
        }),
      });

      const customerResult = await createCustomerResponse.json();
      
      if (!createCustomerResponse.ok) {
        console.error('Error creating customer:', customerResult);
        throw new Error(customerResult.errors?.[0]?.detail || 'Failed to create customer');
      }

      vindiCustomer = customerResult.customer;
      console.log('Created new customer:', vindiCustomer.id);
    }

    // 3. Save customer mapping in our database
    try {
      await supabase.from('vindi_customers').upsert({
        user_id: userId || null,
        vindi_customer_id: vindiCustomer.id,
        customer_email: customerData.email,
        customer_document: customerData.document,
      }, {
        onConflict: 'vindi_customer_id'
      });
    } catch (error) {
      console.warn('Failed to save customer mapping:', error);
    }

    // 4. Create payment profile for credit card
    let paymentProfileId;
    if (paymentData.method === 'credit_card' && paymentData.cardData) {
      const createPaymentProfileResponse = await fetch(`${vindiBaseUrl}/payment_profiles`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          holder_name: paymentData.cardData.holder_name,
          card_expiration: `${paymentData.cardData.expiry_month}/${paymentData.cardData.expiry_year}`,
          card_number: paymentData.cardData.number,
          card_cvv: paymentData.cardData.cvv,
          customer_id: vindiCustomer.id,
          payment_method_code: 'credit_card',
        }),
      });

      const paymentProfileResult = await createPaymentProfileResponse.json();
      
      if (!createPaymentProfileResponse.ok) {
        console.error('Error creating payment profile:', paymentProfileResult);
        throw new Error(paymentProfileResult.errors?.[0]?.detail || 'Failed to create payment profile');
      }

      paymentProfileId = paymentProfileResult.payment_profile.id;
      console.log('Created payment profile:', paymentProfileId);
    }

    // 5. Create charge
    const chargeData: any = {
      customer_id: vindiCustomer.id,
      payment_method_code: paymentData.method,
      bill_items: [
        {
          amount: planData.price,
          description: planData.name,
        },
      ],
    };

    // Add payment profile for credit card
    if (paymentProfileId) {
      chargeData.payment_profile = { id: paymentProfileId };
      if (paymentData.installments && paymentData.installments > 1) {
        chargeData.installments = paymentData.installments;
      }
    }

    const createChargeResponse = await fetch(`${vindiBaseUrl}/charges`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chargeData),
    });

    const chargeResult = await createChargeResponse.json();
    
    if (!createChargeResponse.ok) {
      console.error('Error creating charge:', chargeResult);
      throw new Error(chargeResult.errors?.[0]?.detail || 'Failed to create charge');
    }

    const charge = chargeResult.charge;
    console.log('Created charge:', charge.id, 'Status:', charge.status);

    // 6. Save transaction in our database
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId || null,
        vindi_charge_id: charge.id.toString(),
        customer_name: customerData.name,
        customer_email: customerData.email,
        customer_document: customerData.document,
        plan_id: planData.id,
        plan_name: planData.name,
        plan_price: planData.price,
        payment_method: paymentData.method,
        installments: paymentData.installments || 1,
        status: charge.status === 'paid' ? 'paid' : 'pending',
        vindi_response: charge,
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Error saving transaction:', transactionError);
    }

    // 7. Prepare response based on payment method
    let responseData: any = {
      success: true,
      transaction_id: transaction?.id,
      charge_id: charge.id,
      status: charge.status,
      customer_id: vindiCustomer.id,
    };

    if (paymentData.method === 'pix' && charge.last_transaction) {
      responseData.pix = {
        qr_code: charge.last_transaction.gateway_response_fields?.qr_code,
        qr_code_url: charge.last_transaction.gateway_response_fields?.qr_code_url,
        expires_at: charge.last_transaction.gateway_response_fields?.expires_at,
      };
    }

    if (paymentData.method === 'boleto' && charge.last_transaction) {
      responseData.boleto = {
        url: charge.last_transaction.gateway_response_fields?.boleto_url,
        barcode: charge.last_transaction.gateway_response_fields?.barcode,
        due_date: charge.last_transaction.gateway_response_fields?.due_date,
      };
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error',
        details: error.stack,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});