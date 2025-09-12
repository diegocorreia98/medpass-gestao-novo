-- Criar tabela para gerenciar assinaturas
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.vindi_customers(id),
  plan_id UUID REFERENCES public.planos(id),
  vindi_subscription_id INTEGER UNIQUE,
  vindi_plan_id INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_billing_at TIMESTAMPTZ,
  billing_cycles INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  
  -- Campos do customer para facilitar consultas
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_document TEXT NOT NULL,
  
  -- Campos de pagamento
  payment_method TEXT NOT NULL,
  installments INTEGER DEFAULT 1
);

-- Enable Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies para subscriptions
CREATE POLICY "Matriz pode gerenciar todas assinaturas" 
ON public.subscriptions 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.user_type = 'matriz'
));

CREATE POLICY "Unidade pode ver próprias assinaturas" 
ON public.subscriptions 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Usuários podem inserir assinaturas" 
ON public.subscriptions 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Edge functions podem gerenciar assinaturas" 
ON public.subscriptions 
FOR ALL 
USING (true);

-- Adicionar campo vindi_plan_id na tabela planos se não existir
ALTER TABLE public.planos 
ADD COLUMN IF NOT EXISTS vindi_plan_id INTEGER;

-- Atualizar tabela transactions para indicar se veio de subscription
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES public.subscriptions(id),
ADD COLUMN IF NOT EXISTS vindi_subscription_id INTEGER,
ADD COLUMN IF NOT EXISTS transaction_type TEXT DEFAULT 'charge';

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscriptions_updated_at();