-- Atualizar função get_checkout_subscription para incluir dados necessários para assinatura de contrato
CREATE OR REPLACE FUNCTION public.get_checkout_subscription(checkout_token text)
RETURNS TABLE(
  id uuid,
  customer_name_masked text,
  customer_email_masked text, 
  plan_name text,
  plan_price numeric,
  payment_method text,
  status text,
  -- ✅ Novos campos para suporte a assinatura de contrato
  contract_status text,
  telefone text,
  endereco text,
  cidade text,
  estado text,
  cep text,
  data_nascimento text,
  -- IDs da Vindi necessários para checkout
  vindi_customer_id text,
  vindi_plan_id text,
  vindi_product_id text
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

  -- Retornar dados mascarados + informações necessárias para contrato
  RETURN QUERY
  SELECT 
    b.id,
    CASE 
      WHEN LENGTH(b.nome) > 2 THEN 
        LEFT(b.nome, 2) || '***' || RIGHT(b.nome, 2)
      ELSE '***'
    END as customer_name_masked,
    CASE 
      WHEN b.email LIKE '%@%' THEN 
        LEFT(b.email, 2) || '***@' || SPLIT_PART(b.email, '@', 2)
      ELSE '***@***.com'
    END as customer_email_masked,
    COALESCE(p.nome, 'Plano de Saúde') as plan_name,
    COALESCE(b.valor_plano, p.valor, 0) as plan_price,
    b.payment_method,
    b.payment_status as status,
    -- ✅ Campos para assinatura de contrato
    COALESCE(b.contract_status, 'not_requested') as contract_status,
    b.telefone,
    b.endereco,
    b.cidade,
    b.estado,
    b.cep,
    b.data_nascimento::text,
    -- IDs da Vindi
    b.vindi_customer_id::text,
    b.vindi_plan_id::text,
    b.vindi_product_id::text
  FROM beneficiarios b
  LEFT JOIN planos p ON p.id = b.plano_id
  JOIN subscription_checkout_links scl ON scl.subscription_id = b.id
  WHERE scl.token = checkout_token
    AND scl.expires_at > now()
    AND scl.is_used = false;
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION public.get_checkout_subscription(text) IS 
'Valida token de checkout e retorna dados mascarados do beneficiário incluindo status de contrato e informações necessárias para assinatura';

