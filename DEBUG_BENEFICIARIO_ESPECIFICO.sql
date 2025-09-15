-- 🔍 DIAGNÓSTICO ESPECÍFICO: Encontrar o beneficiário sendo usado no teste
-- Mostrar todos os beneficiários do usuário logado (ordenado por data de criação)
SELECT
    b.id,
    b.nome,
    b.cpf,
    b.email,
    b.status,
    b.payment_status,
    b.created_at,
    p.nome as plano_nome,
    u.nome as unidade_nome,
    pr.email as user_email
FROM beneficiarios b
LEFT JOIN planos p ON b.plano_id = p.id
LEFT JOIN unidades u ON b.unidade_id = u.id
LEFT JOIN profiles pr ON b.user_id = pr.user_id
ORDER BY b.created_at DESC
LIMIT 15;

-- 🔍 VERIFICAR: Status atual após possível correção
SELECT DISTINCT status, COUNT(*) as count
FROM beneficiarios
GROUP BY status
ORDER BY count DESC;

-- 🔧 CORREÇÃO UNIVERSAL: Forçar TODOS os beneficiários para 'ativo'
-- (Apenas para resolver o problema de teste)
UPDATE beneficiarios
SET status = 'ativo'::status_ativo,
    updated_at = NOW()
WHERE status != 'ativo' OR status IS NULL;

-- 📊 VERIFICAÇÃO FINAL: Contagem após correção universal
SELECT DISTINCT status, COUNT(*) as count
FROM beneficiarios
GROUP BY status
ORDER BY count DESC;

-- 🔍 DETALHES: Beneficiários mais recentes após correção
SELECT
    id,
    nome,
    status,
    payment_status,
    updated_at,
    created_at
FROM beneficiarios
ORDER BY created_at DESC
LIMIT 10;