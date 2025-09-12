
-- Criar tabela para logs de integração da API
CREATE TABLE public.api_integrations_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  beneficiario_id UUID,
  operation TEXT NOT NULL,
  request_data JSONB,
  response_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar RLS para segurança
ALTER TABLE public.api_integrations_log ENABLE ROW LEVEL SECURITY;

-- Política para matriz ver todos os logs
CREATE POLICY "Matriz pode ver todos logs da API" 
  ON public.api_integrations_log 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'matriz'::user_type
  ));

-- Política para inserir logs (qualquer usuário autenticado pode inserir)
CREATE POLICY "Usuários podem inserir logs da API" 
  ON public.api_integrations_log 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Índices para melhor performance
CREATE INDEX idx_api_logs_beneficiario ON public.api_integrations_log(beneficiario_id);
CREATE INDEX idx_api_logs_operation ON public.api_integrations_log(operation);
CREATE INDEX idx_api_logs_status ON public.api_integrations_log(status);
CREATE INDEX idx_api_logs_created_at ON public.api_integrations_log(created_at DESC);
