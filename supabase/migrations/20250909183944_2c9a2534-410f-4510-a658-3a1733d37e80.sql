-- Adicionar coluna payment_status na tabela beneficiarios
ALTER TABLE public.beneficiarios 
ADD COLUMN payment_status text DEFAULT 'not_requested' 
CHECK (payment_status IN ('not_requested', 'payment_requested', 'paid', 'failed', 'processing'));

-- Adicionar coluna beneficiario_id na tabela transactions
ALTER TABLE public.transactions 
ADD COLUMN beneficiario_id uuid REFERENCES public.beneficiarios(id);

-- Criar índices para otimizar consultas
CREATE INDEX idx_beneficiarios_payment_status ON public.beneficiarios(payment_status);
CREATE INDEX idx_transactions_beneficiario_id ON public.transactions(beneficiario_id);

-- Comentários para documentação
COMMENT ON COLUMN public.beneficiarios.payment_status IS 'Status do pagamento: not_requested, payment_requested, paid, failed, processing';
COMMENT ON COLUMN public.transactions.beneficiario_id IS 'Referência ao beneficiário da transação';