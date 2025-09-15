-- =============================================
-- DIAGNÓSTICO: Verificar planos e beneficiários
-- =============================================

-- 1. VERIFICAR PLANOS EXISTENTES
SELECT
  '🔍 PLANOS NO DATABASE:' as status,
  id,
  nome,
  valor,
  vindi_plan_id,
  vindi_product_id,
  ativo,
  created_at
FROM public.planos
ORDER BY valor;

-- 2. VERIFICAR BENEFICIÁRIO DIEGO
SELECT
  '👤 BENEFICIÁRIO DIEGO:' as status,
  b.id,
  b.nome,
  b.cpf,
  b.plano_id,
  b.valor_plano,
  b.status,
  b.payment_status,
  p.nome as plano_nome,
  p.vindi_plan_id as plano_vindi_id,
  p.ativo as plano_ativo
FROM public.beneficiarios b
LEFT JOIN public.planos p ON b.plano_id = p.id
WHERE b.cpf = '08600756995';

-- 3. VERIFICAR SE EXISTEM PLANOS COM vindi_plan_id NULL
SELECT
  '⚠️ PLANOS SEM VINDI_PLAN_ID:' as status,
  COUNT(*) as total_planos_sem_vindi_id
FROM public.planos
WHERE vindi_plan_id IS NULL;

-- 4. VERIFICAR PLANOS ATIVOS
SELECT
  '✅ PLANOS ATIVOS:' as status,
  COUNT(*) as total_planos_ativos
FROM public.planos
WHERE ativo = true AND vindi_plan_id IS NOT NULL;

-- 5. VERIFICAR SE TABELAS EXISTEM
SELECT
  '📋 VERIFICAR TABELAS:' as status,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('planos', 'beneficiarios')
ORDER BY table_name;