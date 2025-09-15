-- =============================================
-- DEBUG: Verificar estado do beneficiário Diego
-- Execute no Supabase SQL Editor
-- =============================================

-- 1. Verificar beneficiário Diego com JOIN detalhado
SELECT
  'BENEFICIÁRIO DIEGO DETALHADO:' as info,
  b.id as beneficiario_id,
  b.nome as beneficiario_nome,
  b.cpf,
  b.plano_id,
  b.valor_plano,
  b.status as beneficiario_status,
  b.payment_status,
  p.id as plano_db_id,
  p.nome as plano_nome,
  p.valor as plano_valor,
  p.vindi_plan_id,
  p.vindi_product_id,
  p.ativo as plano_ativo
FROM public.beneficiarios b
LEFT JOIN public.planos p ON b.plano_id = p.id
WHERE b.cpf = '08600756995';

-- 2. Verificar se há múltiplos planos com mesmo vindi_plan_id
SELECT
  'PLANOS COM vindi_plan_id 539682:' as info,
  id,
  nome,
  valor,
  vindi_plan_id,
  ativo
FROM public.planos
WHERE vindi_plan_id = 539682;

-- 3. Verificar todos os planos ativos
SELECT
  'TODOS OS PLANOS ATIVOS:' as info,
  id,
  nome,
  valor,
  vindi_plan_id,
  vindi_product_id,
  ativo
FROM public.planos
WHERE ativo = true
ORDER BY valor;

-- 4. Verificar se beneficiário existe sem plano vinculado
SELECT
  'BENEFICIÁRIOS SEM PLANO VÁLIDO:' as info,
  b.nome,
  b.cpf,
  b.plano_id,
  CASE
    WHEN p.id IS NULL THEN 'PLANO NÃO EXISTE'
    WHEN p.ativo = false THEN 'PLANO INATIVO'
    WHEN p.vindi_plan_id IS NULL THEN 'SEM vindi_plan_id'
    ELSE 'OK'
  END as problema
FROM public.beneficiarios b
LEFT JOIN public.planos p ON b.plano_id = p.id
WHERE p.id IS NULL
   OR p.ativo = false
   OR p.vindi_plan_id IS NULL;

-- 5. Verificar quantidade de registros
SELECT
  'RESUMO GERAL:' as info,
  (SELECT COUNT(*) FROM public.planos WHERE ativo = true) as planos_ativos,
  (SELECT COUNT(*) FROM public.planos WHERE ativo = true AND vindi_plan_id IS NOT NULL) as planos_com_vindi_id,
  (SELECT COUNT(*) FROM public.beneficiarios) as total_beneficiarios,
  (SELECT COUNT(*) FROM public.beneficiarios WHERE cpf = '08600756995') as diego_existe;