-- Adicionar novos status para beneficiários
ALTER TYPE status_ativo ADD VALUE IF NOT EXISTS 'pending_payment';
ALTER TYPE status_ativo ADD VALUE IF NOT EXISTS 'payment_confirmed';
ALTER TYPE status_ativo ADD VALUE IF NOT EXISTS 'rms_sent';
ALTER TYPE status_ativo ADD VALUE IF NOT EXISTS 'rms_failed';

-- Criar tabela para adesões pendentes
CREATE TABLE public.pending_adesoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  unidade_id UUID,
  plano_id UUID NOT NULL,
  empresa_id UUID,
  vindi_subscription_id INTEGER,
  vindi_customer_id INTEGER,
  checkout_link TEXT,
  status TEXT NOT NULL DEFAULT 'pending_payment',
  
  -- Dados do beneficiário (temporários)
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  data_nascimento DATE,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  valor_plano NUMERIC NOT NULL,
  observacoes TEXT,
  
  -- Dados para retry da API RMS
  rms_retry_count INTEGER DEFAULT 0,
  last_rms_error TEXT,
  last_rms_attempt_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_adesoes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Matriz pode gerenciar todas adesões pendentes" 
ON public.pending_adesoes 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.user_type = 'matriz'
));

CREATE POLICY "Unidade pode gerenciar próprias adesões pendentes" 
ON public.pending_adesoes 
FOR ALL 
USING (user_id = auth.uid());

-- Create index for better performance
CREATE INDEX idx_pending_adesoes_vindi_subscription ON public.pending_adesoes(vindi_subscription_id);
CREATE INDEX idx_pending_adesoes_status ON public.pending_adesoes(status);
CREATE INDEX idx_pending_adesoes_user_id ON public.pending_adesoes(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_pending_adesoes_updated_at
  BEFORE UPDATE ON public.pending_adesoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();