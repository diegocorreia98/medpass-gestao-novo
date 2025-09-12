-- Remover a política atual que expõe dados completos via checkout token
DROP POLICY IF EXISTS "Acesso via token de checkout válido" ON public.subscriptions;

-- Criar view segura para checkout que mascara dados sensíveis
CREATE OR REPLACE VIEW public.subscriptions_checkout_safe AS
SELECT 
  s.id,
  s.vindi_subscription_id,
  s.status,
  -- Mascarar dados sensíveis para checkout
  CASE 
    WHEN LENGTH(s.customer_name) > 0 THEN 
      LEFT(s.customer_name, 2) || '***' || RIGHT(s.customer_name, 2)
    ELSE s.customer_name 
  END as customer_name,
  -- Mascarar email
  CASE 
    WHEN s.customer_email LIKE '%@%' THEN 
      LEFT(s.customer_email, 2) || '***@' || SPLIT_PART(s.customer_email, '@', 2)
    ELSE '***@***.com'
  END as customer_email,
  -- Mascarar documento completamente para checkout público
  '***.***.***-**' as customer_document,
  s.payment_method,
  s.plan_id,
  -- Manter apenas dados essenciais para checkout
  s.installments,
  s.created_at,
  -- Extrair apenas preço do metadata, sem expor dados sensíveis
  COALESCE((s.metadata->>'plan_price')::numeric, 0) as plan_price,
  COALESCE(s.metadata->>'plan_name', 'Plano de Saúde') as plan_name
FROM public.subscriptions s;

-- Habilitar RLS na view
ALTER VIEW public.subscriptions_checkout_safe SET (security_barrier = true);

-- Política segura para checkout - acesso apenas com token válido e dados mascarados
CREATE POLICY "Acesso seguro via checkout token"
ON public.subscriptions
FOR SELECT
USING (
  -- Permitir acesso apenas através de subscription_checkout_links válidos
  EXISTS (
    SELECT 1 FROM subscription_checkout_links scl
    WHERE scl.subscription_id = subscriptions.id
    AND scl.expires_at > now()
    AND scl.is_used = false
  )
  -- E apenas para edge functions ou processos autorizados
  AND current_setting('role') = 'service_role'
);

-- Criar política específica para usuários autenticados verem suas próprias subscriptions
CREATE POLICY "Usuários podem ver próprias subscriptions"
ON public.subscriptions
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (
    user_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.user_type = 'matriz'
    )
  )
);

-- Função segura para buscar dados de checkout (com dados mascarados)
CREATE OR REPLACE FUNCTION public.get_checkout_subscription(checkout_token text)
RETURNS TABLE(
  id uuid,
  customer_name_masked text,
  customer_email_masked text, 
  plan_name text,
  plan_price numeric,
  payment_method text,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o token é válido
  IF NOT EXISTS (
    SELECT 1 FROM subscription_checkout_links 
    WHERE token = checkout_token 
    AND expires_at > now() 
    AND is_used = false
  ) THEN
    RAISE EXCEPTION 'Token de checkout inválido ou expirado';
  END IF;

  -- Registrar acesso para auditoria
  INSERT INTO subscription_access_logs (
    subscription_id,
    access_type,
    ip_address
  ) 
  SELECT 
    scl.subscription_id,
    'checkout_access',
    inet_client_addr()
  FROM subscription_checkout_links scl
  WHERE scl.token = checkout_token;

  -- Retornar dados mascarados
  RETURN QUERY
  SELECT 
    s.id,
    CASE 
      WHEN LENGTH(s.customer_name) > 2 THEN 
        LEFT(s.customer_name, 2) || '***' || RIGHT(s.customer_name, 2)
      ELSE '***'
    END as customer_name_masked,
    CASE 
      WHEN s.customer_email LIKE '%@%' THEN 
        LEFT(s.customer_email, 2) || '***@' || SPLIT_PART(s.customer_email, '@', 2)
      ELSE '***@***.com'
    END as customer_email_masked,
    COALESCE(s.metadata->>'plan_name', 'Plano de Saúde') as plan_name,
    COALESCE((s.metadata->>'plan_price')::numeric, 0) as plan_price,
    s.payment_method,
    s.status
  FROM subscriptions s
  JOIN subscription_checkout_links scl ON scl.subscription_id = s.id
  WHERE scl.token = checkout_token
    AND scl.expires_at > now()
    AND scl.is_used = false;
END;
$$;