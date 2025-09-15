-- =============================================
-- CORREÇÃO SIMPLES: UUIDs automáticos
-- Execute este script no Supabase SQL Editor
-- =============================================

-- 1. Desativar planos existentes com IDs incorretos
UPDATE public.planos
SET ativo = false
WHERE vindi_plan_id IS NULL
   OR vindi_plan_id NOT IN (539682, 539703);

-- 2. Inserir planos corretos (UUIDs automáticos)
INSERT INTO public.planos (id, nome, descricao, valor, vindi_plan_id, vindi_product_id, ativo)
SELECT
  gen_random_uuid(),
  'Mensal 12 Meses - Individual',
  'Plano Individual MedPass - Mensal por 12 meses',
  49.90,
  539682,
  '1804781',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.planos WHERE vindi_plan_id = 539682 AND ativo = true
);

INSERT INTO public.planos (id, nome, descricao, valor, vindi_plan_id, vindi_product_id, ativo)
SELECT
  gen_random_uuid(),
  'Mensal 12 Meses - Familiar',
  'Plano Familiar MedPass - Mensal por 12 meses',
  89.90,
  539703,
  '1804782',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.planos WHERE vindi_plan_id = 539703 AND ativo = true
);

-- 3. Atualizar beneficiário Diego para usar plano Individual correto
UPDATE public.beneficiarios
SET
  plano_id = (SELECT id FROM public.planos WHERE vindi_plan_id = 539682 AND ativo = true LIMIT 1),
  valor_plano = 49.90,
  status = 'ativo',
  payment_status = 'not_requested',
  updated_at = now()
WHERE cpf = '08600756995';

-- 4. Se beneficiário não existe, criar
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
  payment_status
)
SELECT
  gen_random_uuid(),
  '49fd2e97-ad5e-445b-a959-ba4c532e277a',
  '239377fc-92bd-40fa-8d9d-c1375329c55e',
  (SELECT id FROM public.planos WHERE vindi_plan_id = 539682 AND ativo = true LIMIT 1),
  'Diego Beu Correia',
  '08600756995',
  'diego@teste.com',
  '(11) 99999-9999',
  49.90,
  'ativo',
  'not_requested'
WHERE NOT EXISTS (
  SELECT 1 FROM public.beneficiarios WHERE cpf = '08600756995'
);

-- 5. VERIFICAR RESULTADO
SELECT 'PLANOS ATIVOS:' as resultado;
SELECT
  nome,
  valor,
  vindi_plan_id,
  ativo
FROM public.planos
WHERE ativo = true
ORDER BY valor;

SELECT 'BENEFICIÁRIO DIEGO:' as resultado;
SELECT
  b.nome,
  b.cpf,
  p.nome as plano_nome,
  p.vindi_plan_id
FROM public.beneficiarios b
JOIN public.planos p ON b.plano_id = p.id
WHERE b.cpf = '08600756995';

SELECT '🎉 PRONTO! Teste: /unidade/adesao' as status;