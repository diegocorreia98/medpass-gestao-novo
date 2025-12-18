-- =====================================================
-- FIX: Função get_checkout_subscription
-- Execute este SQL no dashboard do Supabase (projeto yhxoihyjtcgulnfipqej)
-- Vá em: Database > SQL Editor
-- =====================================================

-- Remover função existente
DROP FUNCTION IF EXISTS public.get_checkout_subscription(text);

-- Criar função corrigida com JOINs para subscriptions, beneficiarios e planos
CREATE OR REPLACE FUNCTION public.get_checkout_subscription(checkout_token text)
RETURNS TABLE (
  id uuid,
  subscription_id uuid,
  beneficiario_id uuid,
  customer_name_masked text,
  customer_email_masked text,
  customer_cpf text,
  plan_price numeric,
  status text,
  plan_name text,
  contract_status text,
  telefone text,
  endereco text,
  cidade text,
  estado text,
  cep text,
  data_nascimento date,
  vindi_plan_id text,
  vindi_product_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    scl.id,
    scl.subscription_id,
    b.id as beneficiario_id,
    -- Mascarar nome (mostrar apenas primeiro e último nome)
    CASE 
      WHEN s.customer_name IS NOT NULL AND s.customer_name != '' THEN
        CASE 
          WHEN position(' ' in s.customer_name) > 0 THEN
            split_part(s.customer_name, ' ', 1) || ' *** ' || 
            split_part(s.customer_name, ' ', array_length(string_to_array(s.customer_name, ' '), 1))
          ELSE s.customer_name
        END
      ELSE 'Cliente'
    END as customer_name_masked,
    -- Mascarar email
    CASE 
      WHEN s.customer_email IS NOT NULL AND position('@' in s.customer_email) > 0 THEN
        substring(s.customer_email, 1, 2) || repeat('*', greatest(position('@' in s.customer_email) - 3, 3)) || 
        substring(s.customer_email, position('@' in s.customer_email))
      ELSE '***@***.com'
    END as customer_email_masked,
    -- CPF completo do beneficiário (necessário para o contrato)
    COALESCE(b.cpf, s.customer_document) as customer_cpf,
    -- Preço do plano
    p.valor as plan_price,
    -- Status da subscription
    s.status,
    -- Nome do plano
    p.nome as plan_name,
    -- Status do contrato (da tabela beneficiarios)
    COALESCE(b.contract_status, 'not_requested') as contract_status,
    -- Dados adicionais para o contrato (da tabela beneficiarios)
    b.telefone,
    b.endereco,
    b.cidade,
    b.estado,
    b.cep,
    b.data_nascimento,
    -- Dados Vindi
    COALESCE(p.vindi_plan_id::text, '') as vindi_plan_id,
    COALESCE(p.vindi_product_id, '') as vindi_product_id
  FROM subscription_checkout_links scl
  JOIN subscriptions s ON s.id = scl.subscription_id
  LEFT JOIN planos p ON p.id = s.plan_id
  -- JOIN com beneficiarios usando CPF ou email
  LEFT JOIN beneficiarios b ON (b.cpf = s.customer_document OR b.email = s.customer_email)
  WHERE scl.token = checkout_token
    AND scl.expires_at > NOW()
    AND scl.is_used = false
  LIMIT 1;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_checkout_subscription(text) TO anon, authenticated, service_role;

-- =====================================================
-- EXPLICAÇÃO DOS CAMPOS:
-- =====================================================
-- id: ID do subscription_checkout_links
-- subscription_id: ID da subscription (não é o beneficiário)
-- beneficiario_id: ✅ ID do beneficiário na tabela beneficiarios (usar para contrato Autentique)
-- customer_name_masked: Nome mascarado (ex: "Diego *** Correia")
-- customer_email_masked: Email mascarado (ex: "di******@gmail.com")
-- customer_cpf: CPF completo (necessário para o contrato)
-- plan_price: Valor do plano
-- status: Status da subscription
-- plan_name: Nome do plano
-- contract_status: Status do contrato (not_requested, pending_signature, signed, refused)
-- telefone, endereco, cidade, estado, cep, data_nascimento: Dados do beneficiário para o contrato
-- vindi_plan_id, vindi_product_id: IDs da Vindi para processamento de pagamento
