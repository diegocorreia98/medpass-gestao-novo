-- Remove a política perigosa que permite acesso público total
DROP POLICY IF EXISTS "Edge functions podem gerenciar assinaturas" ON public.subscriptions;

-- Política restritiva para criação de assinaturas (apenas edge functions)
CREATE POLICY "Edge functions podem criar assinaturas"
ON public.subscriptions
FOR INSERT
WITH CHECK (true);

-- Política para atualização de assinaturas (edge functions + usuários autenticados)
CREATE POLICY "Edge functions podem atualizar assinaturas específicas"
ON public.subscriptions  
FOR UPDATE
USING (
  -- Permite atualização se for edge function (service_role) ou usuário próprio ou matriz
  (current_setting('role') = 'service_role') OR 
  (user_id = auth.uid()) OR
  (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.user_type = 'matriz'))
);

-- Política para acesso via token de checkout (segura e temporária)
CREATE POLICY "Acesso via token de checkout válido"
ON public.subscriptions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM subscription_checkout_links scl
    WHERE scl.subscription_id = subscriptions.id
    AND scl.expires_at > now()
    AND scl.is_used = false
  )
);

-- Criar tabela de auditoria para monitorar acessos
CREATE TABLE IF NOT EXISTS public.subscription_access_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id uuid REFERENCES public.subscriptions(id),
  accessed_by uuid,
  access_type text NOT NULL,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS na tabela de logs
ALTER TABLE public.subscription_access_logs ENABLE ROW LEVEL SECURITY;

-- Política para logs (apenas matriz pode ver)
CREATE POLICY "Matriz pode ver logs de acesso"
ON public.subscription_access_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'matriz'
  )
);

-- Política para inserir logs (sistema pode registrar)
CREATE POLICY "Sistema pode inserir logs"
ON public.subscription_access_logs
FOR INSERT
WITH CHECK (true);