-- 🔍 DIAGNÓSTICO: Verificar status dos beneficiários
SELECT
    id,
    nome,
    status,
    payment_status,
    created_at
FROM beneficiarios
ORDER BY created_at DESC
LIMIT 10;

-- Mostrar valores únicos de status para entender quais existem
SELECT DISTINCT status, COUNT(*) as count
FROM beneficiarios
GROUP BY status;

-- 🔧 CORREÇÃO: Beneficiários com status NULL, vazio ou inválido → 'ativo'
UPDATE beneficiarios
SET status = 'ativo'::status_ativo
WHERE status IS NULL
   OR status NOT IN ('ativo', 'inativo', 'pendente', 'pending_payment', 'payment_confirmed');

-- 🔧 CORREÇÃO ESPECÍFICA: Beneficiários com status 'pendente' ou 'pending_payment' → 'ativo'
-- (para permitir geração de novos links de pagamento)
UPDATE beneficiarios
SET status = 'ativo'::status_ativo
WHERE status IN ('pendente', 'pending_payment')
  AND payment_status IN ('not_requested', 'failed')  -- Apenas se não tiver pagamento bem-sucedido
  AND created_at > NOW() - INTERVAL '30 days';  -- Apenas beneficiários criados nos últimos 30 dias

-- ✅ VERIFICAÇÃO: Status após correção
SELECT
    id,
    nome,
    status,
    payment_status,
    created_at
FROM beneficiarios
WHERE status = 'ativo'
ORDER BY created_at DESC
LIMIT 10;

-- 📊 RESUMO: Contagem por status após correção
SELECT DISTINCT status, COUNT(*) as count
FROM beneficiarios
GROUP BY status
ORDER BY count DESC;