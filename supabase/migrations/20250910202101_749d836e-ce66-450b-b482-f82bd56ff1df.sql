-- Update get_checkout_subscription function to return Vindi IDs
CREATE OR REPLACE FUNCTION public.get_checkout_subscription(checkout_token text)
RETURNS TABLE(
  id uuid, 
  customer_name_masked text, 
  customer_email_masked text, 
  plan_name text, 
  plan_price numeric, 
  payment_method text, 
  status text,
  vindi_customer_id integer,
  vindi_plan_id integer,
  vindi_product_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

  -- Retornar dados mascarados + IDs da Vindi
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
    s.status,
    COALESCE((s.metadata->>'vindi_customer_id')::integer, 0) as vindi_customer_id,
    COALESCE((s.metadata->>'vindi_plan_id')::integer, 0) as vindi_plan_id,
    COALESCE(s.metadata->>'vindi_product_id', '') as vindi_product_id
  FROM subscriptions s
  JOIN subscription_checkout_links scl ON scl.subscription_id = s.id
  WHERE scl.token = checkout_token
    AND scl.expires_at > now()
    AND scl.is_used = false;
END;
$$;