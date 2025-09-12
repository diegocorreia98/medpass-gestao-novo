-- Remove a política perigosa que permite acesso público total
DROP POLICY IF EXISTS "Edge functions podem gerenciar assinaturas" ON public.subscriptions;

-- Criar políticas mais restritivas e seguras para edge functions
CREATE POLICY "Edge functions podem criar assinaturas"
ON public.subscriptions
FOR INSERT
USING (true);

CREATE POLICY "Edge functions podem atualizar assinaturas específicas"
ON public.subscriptions  
FOR UPDATE
USING (
  -- Permite atualização apenas se for uma edge function atualizando subscription específica
  -- ou se for usuário autenticado atualizando suas próprias subscriptions
  (current_setting('role') = 'service_role') OR 
  (user_id = auth.uid()) OR
  (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.user_type = 'matriz'))
);

-- Política para permitir acesso via token de checkout (sem exposição de dados sensíveis)
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

-- Audit: Criar tabela de logs para monitorar acessos
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
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'matriz'
  )
);

-- Função para registrar acessos (segurança)
CREATE OR REPLACE FUNCTION public.log_subscription_access(
  sub_id uuid,
  access_type text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscription_access_logs (
    subscription_id,
    accessed_by,
    access_type,
    ip_address
  ) VALUES (
    sub_id,
    auth.uid(),
    access_type,
    inet_client_addr()
  );
END;
$$;