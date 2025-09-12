-- Create transactions table to store payment data
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  vindi_charge_id TEXT UNIQUE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_document TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  plan_price DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('credit_card', 'pix', 'boleto')),
  installments INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  vindi_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create vindi_customers table to map local customers with Vindi IDs
CREATE TABLE public.vindi_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  vindi_customer_id INTEGER UNIQUE NOT NULL,
  customer_email TEXT NOT NULL,
  customer_document TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vindi_customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transactions
CREATE POLICY "Matriz can view all transactions" 
ON public.transactions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.user_type = 'matriz'::user_type
));

CREATE POLICY "Users can view their own transactions" 
ON public.transactions 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Anyone can insert transactions" 
ON public.transactions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Matriz can update all transactions" 
ON public.transactions 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.user_type = 'matriz'::user_type
));

-- RLS Policies for vindi_customers
CREATE POLICY "Matriz can view all vindi customers" 
ON public.vindi_customers 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.user_type = 'matriz'::user_type
));

CREATE POLICY "Users can view their own vindi customer data" 
ON public.vindi_customers 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Anyone can insert vindi customers" 
ON public.vindi_customers 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update vindi customers" 
ON public.vindi_customers 
FOR UPDATE 
USING (true);

-- Indexes for performance
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_vindi_charge_id ON public.transactions(vindi_charge_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_vindi_customers_user_id ON public.vindi_customers(user_id);
CREATE INDEX idx_vindi_customers_email ON public.vindi_customers(customer_email);

-- Update triggers
CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vindi_customers_updated_at
BEFORE UPDATE ON public.vindi_customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();