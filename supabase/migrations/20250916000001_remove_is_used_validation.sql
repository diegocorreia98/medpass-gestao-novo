-- Remove is_used validation from checkout links to allow multiple payment attempts
-- Links will only be invalidated by actual expiration (24 hours)

-- Update get_checkout_subscription function to remove is_used validation
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
  -- Verificar se o token é válido (removida verificação is_used = false)
  IF NOT EXISTS (
    SELECT 1 FROM subscription_checkout_links
    WHERE token = checkout_token
    AND expires_at > now()
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

  -- Retornar dados mascarados + IDs da Vindi (removida verificação is_used = false)
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
    AND scl.expires_at > now();
    -- Removed: AND scl.is_used = false
END;
$$;

-- Update cleanup function to only clean by expiration date, not is_used status
CREATE OR REPLACE FUNCTION public.cleanup_expired_checkout_links()
RETURNS void AS $$
BEGIN
  -- Delete actually expired links (over 24 hours old)
  DELETE FROM public.subscription_checkout_links
  WHERE expires_at < now();

  -- Delete very old links regardless of status (over 7 days for safety)
  DELETE FROM public.subscription_checkout_links
  WHERE created_at < now() - INTERVAL '7 days';

  -- Log cleanup operation
  INSERT INTO subscription_access_logs (
    subscription_id,
    access_type,
    ip_address
  ) VALUES (
    NULL,
    'cleanup_expired_links',
    inet_client_addr()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_checkout_subscription TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_checkout_links TO postgres, service_role;

-- Add comment explaining the change
COMMENT ON FUNCTION public.get_checkout_subscription IS 'Updated to remove is_used validation, allowing multiple payment attempts until link naturally expires (24h)';
COMMENT ON FUNCTION public.cleanup_expired_checkout_links IS 'Updated to clean only by expiration date, not is_used status';