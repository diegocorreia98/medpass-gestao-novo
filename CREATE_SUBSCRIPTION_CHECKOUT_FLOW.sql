-- =============================================
-- CRIAR FLUXO COMPLETO DO SUBSCRIPTION CHECKOUT
-- Execute este script no Supabase SQL Editor
-- =============================================

-- 1. Primeiro, garantir que temos o plano Individual e o beneficiário Diego
INSERT INTO public.planos (id, nome, descricao, valor, vindi_plan_id, vindi_product_id, ativo)
SELECT
  '4e11e7cb-51f5-4034-a46c-ebdb7b5679cd'::uuid,
  'Mensal 12 Meses - Individual',
  'Plano Individual MedPass - Mensal por 12 meses',
  49.90,
  539682,
  '1804781',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.planos WHERE id = '4e11e7cb-51f5-4034-a46c-ebdb7b5679cd'::uuid
);

INSERT INTO public.beneficiarios (
  id,
  user_id,
  unidade_id,
  plano_id,
  nome,
  cpf,
  email,
  telefone,
  valor_plano,
  status,
  payment_status,
  data_adesao
)
SELECT
  '2499bc4c-ba3b-40a0-9a46-002781cf8718'::uuid,
  '49fd2e97-ad5e-445b-a959-ba4c532e277a'::uuid,
  '239377fc-92bd-40fa-8d9d-c1375329c55e'::uuid,
  '4e11e7cb-51f5-4034-a46c-ebdb7b5679cd'::uuid,
  'Diego Beu Correia',
  '08600756995',
  'diego@teste.com',
  '(11) 99999-9999',
  49.90,
  'ativo',
  'not_requested',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.beneficiarios WHERE id = '2499bc4c-ba3b-40a0-9a46-002781cf8718'::uuid
);

-- 2. Criar uma subscription baseada no beneficiário Diego
INSERT INTO public.subscriptions (
  id,
  user_id,
  plan_id,
  vindi_plan_id,
  customer_name,
  customer_email,
  customer_document,
  payment_method,
  status,
  metadata,
  created_at
)
VALUES (
  'b8f1c234-5678-4321-abcd-ef1234567890'::uuid,
  '49fd2e97-ad5e-445b-a959-ba4c532e277a'::uuid,
  '4e11e7cb-51f5-4034-a46c-ebdb7b5679cd'::uuid,
  539682,
  'Diego Beu Correia',
  'diego@teste.com',
  '08600756995',
  'pix',
  'pending_payment',
  jsonb_build_object(
    'plan_name', 'Mensal 12 Meses - Individual',
    'plan_price', 49.90,
    'vindi_plan_id', 539682,
    'vindi_product_id', '1804781',
    'vindi_customer_id', 0,
    'beneficiario_id', '2499bc4c-ba3b-40a0-9a46-002781cf8718',
    'plano_id', '4e11e7cb-51f5-4034-a46c-ebdb7b5679cd'
  ),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  customer_name = EXCLUDED.customer_name,
  customer_email = EXCLUDED.customer_email,
  payment_method = EXCLUDED.payment_method,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- 3. Primeiro, deletar links antigos para essa subscription (se existirem)
DELETE FROM public.subscription_checkout_links
WHERE subscription_id = 'b8f1c234-5678-4321-abcd-ef1234567890'::uuid;

-- 4. Criar um checkout link válido para essa subscription
INSERT INTO public.subscription_checkout_links (
  id,
  subscription_id,
  token,
  expires_at,
  is_used,
  created_at
)
VALUES (
  gen_random_uuid(),
  'b8f1c234-5678-4321-abcd-ef1234567890'::uuid,
  'test_checkout_token_' || extract(epoch from now())::text,
  NOW() + INTERVAL '24 hours',
  false,
  NOW()
);

-- 5. TESTAR: Executar a função get_checkout_subscription
DO $$
DECLARE
    checkout_token_value text;
    test_result RECORD;
BEGIN
    -- Buscar o token criado
    SELECT token INTO checkout_token_value
    FROM subscription_checkout_links
    WHERE subscription_id = 'b8f1c234-5678-4321-abcd-ef1234567890'::uuid;

    RAISE NOTICE 'Token de teste: %', checkout_token_value;

    -- Testar a função
    SELECT * INTO test_result FROM get_checkout_subscription(checkout_token_value);

    RAISE NOTICE 'Resultado do teste:';
    RAISE NOTICE '  ID: %', test_result.id;
    RAISE NOTICE '  Nome mascarado: %', test_result.customer_name_masked;
    RAISE NOTICE '  Email mascarado: %', test_result.customer_email_masked;
    RAISE NOTICE '  Plano: %', test_result.plan_name;
    RAISE NOTICE '  Preço: %', test_result.plan_price;
    RAISE NOTICE '  Vindi Plan ID: %', test_result.vindi_plan_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro no teste: %', SQLERRM;
END $$;

-- 6. VERIFICAR RESULTADO FINAL
SELECT 'SUBSCRIPTION CRIADA:' as resultado;
SELECT
  id,
  customer_name,
  customer_email,
  payment_method,
  status,
  metadata->>'plan_name' as plan_name,
  metadata->>'plan_price' as plan_price,
  metadata->>'vindi_plan_id' as vindi_plan_id
FROM public.subscriptions
WHERE id = 'b8f1c234-5678-4321-abcd-ef1234567890'::uuid;

SELECT 'CHECKOUT LINK CRIADO:' as resultado;
SELECT
  id,
  subscription_id,
  token,
  expires_at,
  is_used
FROM public.subscription_checkout_links
WHERE subscription_id = 'b8f1c234-5678-4321-abcd-ef1234567890'::uuid;

-- 7. MOSTRAR URL DE TESTE
SELECT 'URL DE TESTE:' as resultado;
SELECT
  'http://localhost:8082/subscription-checkout/' || token as test_url
FROM public.subscription_checkout_links
WHERE subscription_id = 'b8f1c234-5678-4321-abcd-ef1234567890'::uuid;

SELECT '🎉 FLUXO SUBSCRIPTION CHECKOUT CRIADO COM SUCESSO!' as status;