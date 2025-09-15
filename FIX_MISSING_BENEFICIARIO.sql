-- =============================================
-- CORREÇÃO: Criar plano Individual e beneficiário Diego
-- =============================================

-- 1. Inserir plano Individual que está faltando
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

-- 2. Criar beneficiário Diego para testes
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
  gen_random_uuid(),
  '49fd2e97-ad5e-445b-a959-ba4c532e277a', -- user_id válido
  '239377fc-92bd-40fa-8d9d-c1375329c55e', -- unidade_id válida
  (SELECT id FROM public.planos WHERE vindi_plan_id = 539682 AND ativo = true LIMIT 1),
  'Diego Beu Correia',
  '08600756995',
  'diego@teste.com',
  '(11) 99999-9999',
  49.90,
  'ativo',
  'not_requested',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.beneficiarios WHERE cpf = '08600756995'
);

-- 3. VERIFICAR RESULTADO
SELECT 'PLANOS ATIVOS:' as resultado;
SELECT
  id,
  nome,
  valor,
  vindi_plan_id,
  ativo
FROM public.planos
WHERE ativo = true
ORDER BY valor;

SELECT 'BENEFICIÁRIO DIEGO:' as resultado;
SELECT
  b.id,
  b.nome,
  b.cpf,
  b.plano_id,
  p.nome as plano_nome,
  p.vindi_plan_id
FROM public.beneficiarios b
JOIN public.planos p ON b.plano_id = p.id
WHERE b.cpf = '08600756995';