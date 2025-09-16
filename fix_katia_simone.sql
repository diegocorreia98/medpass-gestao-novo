-- Script para corrigir manualmente o caso da Katia Simone
-- Se a webhook não processou, vamos processar manualmente

-- 1. Primeiro, buscar dados da transação para obter o CPF correto
SELECT
  t.customer_name,
  t.customer_document,
  t.status as transaction_status,
  t.vindi_subscription_id,
  b.id as beneficiario_id,
  b.nome,
  b.cpf,
  b.payment_status,
  b.status as beneficiario_status
FROM transactions t
LEFT JOIN beneficiarios b ON (
  -- Tentativa de match por CPF exato
  b.cpf = t.customer_document
  OR
  -- Tentativa de match por nome similar
  (b.nome ILIKE '%katia%' AND t.customer_name ILIKE '%katia%')
)
WHERE t.customer_name ILIKE '%katia%simone%' OR t.customer_name ILIKE '%budnik%'
ORDER BY t.created_at DESC;

-- 2. Se encontrar correspondência mas payment_status não foi atualizado, corrigir:

-- UPDATE beneficiarios
-- SET
--   payment_status = 'paid',
--   updated_at = NOW()
-- WHERE nome ILIKE '%katia%simone%' OR nome ILIKE '%budnik%'
--   AND payment_status != 'paid'
--   AND EXISTS (
--     SELECT 1 FROM transactions t
--     WHERE t.status = 'paid'
--     AND (t.customer_document = beneficiarios.cpf OR t.customer_name ILIKE '%katia%')
--   );

-- 3. Verificar se precisa disparar API RMS manualmente
-- Buscar beneficiário para dados da API RMS
SELECT
  b.id,
  b.nome,
  b.cpf,
  b.data_nascimento,
  b.telefone,
  b.email,
  b.cep,
  b.numero_endereco,
  b.estado,
  b.plano_id,
  b.payment_status,
  s.vindi_subscription_id,
  u.nome as unidade_nome
FROM beneficiarios b
LEFT JOIN subscriptions s ON s.customer_document = b.cpf
LEFT JOIN unidades u ON u.id = b.unidade_id
WHERE b.nome ILIKE '%katia%simone%' OR b.nome ILIKE '%budnik%'
ORDER BY b.created_at DESC;