-- Debug script para investigar caso da Katia Simone Blum Budnik
-- Verificar estado atual dos dados

-- 1. Buscar beneficiário
SELECT
  id,
  nome,
  cpf,
  email,
  payment_status,
  status,
  created_at,
  updated_at
FROM beneficiarios
WHERE nome ILIKE '%katia%simone%' OR nome ILIKE '%budnik%'
ORDER BY created_at DESC;

-- 2. Buscar transações relacionadas
SELECT
  t.id,
  t.customer_name,
  t.customer_document,
  t.status as transaction_status,
  t.vindi_subscription_id,
  t.created_at,
  t.updated_at
FROM transactions t
WHERE t.customer_name ILIKE '%katia%simone%' OR t.customer_name ILIKE '%budnik%'
ORDER BY t.created_at DESC;

-- 3. Buscar assinaturas relacionadas
SELECT
  s.id,
  s.customer_name,
  s.customer_document,
  s.status as subscription_status,
  s.vindi_subscription_id,
  s.payment_confirmed_at,
  s.created_at
FROM subscriptions s
WHERE s.customer_name ILIKE '%katia%simone%' OR s.customer_name ILIKE '%budnik%'
ORDER BY s.created_at DESC;

-- 4. Cross-reference: Verificar se CPFs batem
SELECT
  'beneficiarios' as table_name,
  nome as customer_name,
  cpf as document,
  payment_status,
  status,
  updated_at
FROM beneficiarios
WHERE nome ILIKE '%katia%simone%' OR nome ILIKE '%budnik%'

UNION ALL

SELECT
  'transactions' as table_name,
  customer_name,
  customer_document as document,
  status as payment_status,
  'transaction' as status,
  updated_at
FROM transactions
WHERE customer_name ILIKE '%katia%simone%' OR customer_name ILIKE '%budnik%'

UNION ALL

SELECT
  'subscriptions' as table_name,
  customer_name,
  customer_document as document,
  status as payment_status,
  'subscription' as status,
  created_at as updated_at
FROM subscriptions
WHERE customer_name ILIKE '%katia%simone%' OR customer_name ILIKE '%budnik%'

ORDER BY updated_at DESC;