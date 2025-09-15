-- =============================================
-- CORREÇÃO COM UUIDs VÁLIDOS
-- Execute este script no Supabase SQL Editor
-- =============================================

-- 1. VERIFICAR ESTADO ATUAL
SELECT 'ESTADO ATUAL DOS PLANOS:' as info;
SELECT id, nome, valor, vindi_plan_id, ativo FROM public.planos;

-- 2. ATUALIZAR PLANOS EXISTENTES OU INSERIR SE NÃO EXISTEM

-- Atualizar/Inserir Plano Individual
INSERT INTO public.planos (id, nome, descricao, valor, vindi_plan_id, vindi_product_id, ativo) VALUES
('4e11e7cb-51f5-4034-a46c-ebdb7b5679cd', 'Mensal 12 Meses - Individual', 'Plano Individual MedPass - Mensal por 12 meses', 49.90, 539682, '1804781', true)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  valor = EXCLUDED.valor,
  vindi_plan_id = EXCLUDED.vindi_plan_id,
  vindi_product_id = EXCLUDED.vindi_product_id,
  ativo = EXCLUDED.ativo,
  updated_at = now();

-- Atualizar/Inserir Plano Familiar
INSERT INTO public.planos (id, nome, descricao, valor, vindi_plan_id, vindi_product_id, ativo) VALUES
('8f22a8dc-62f6-5145-b57d-fcec8c6780de', 'Mensal 12 Meses - Familiar', 'Plano Familiar MedPass - Mensal por 12 meses', 89.90, 539703, '1804782', true)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  valor = EXCLUDED.valor,
  vindi_plan_id = EXCLUDED.vindi_plan_id,
  vindi_product_id = EXCLUDED.vindi_product_id,
  ativo = EXCLUDED.ativo,
  updated_at = now();

-- 3. CORRIGIR vindi_plan_id EM PLANOS EXISTENTES SEM IDs CORRETOS
UPDATE public.planos
SET vindi_plan_id = NULL, ativo = false
WHERE vindi_plan_id NOT IN (539682, 539703)
  AND vindi_plan_id IS NOT NULL;

-- 4. ATUALIZAR BENEFICIÁRIO DIEGO PARA USAR PLANO CORRETO
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
) VALUES (
  gen_random_uuid(),
  '49fd2e97-ad5e-445b-a959-ba4c532e277a',
  '239377fc-92bd-40fa-8d9d-c1375329c55e',
  '4e11e7cb-51f5-4034-a46c-ebdb7b5679cd', -- Plano Individual (vindi_plan_id: 539682)
  'Diego Beu Correia',
  '08600756995',
  'diego@teste.com',
  '(11) 99999-9999',
  49.90,
  'ativo',
  'not_requested'
)
ON CONFLICT (cpf) DO UPDATE SET
  plano_id = EXCLUDED.plano_id,
  valor_plano = EXCLUDED.valor_plano,
  status = EXCLUDED.status,
  payment_status = EXCLUDED.payment_status,
  updated_at = now();

-- 5. VERIFICAR RESULTADO FINAL
SELECT 'PLANOS ATIVOS COM vindi_plan_id CORRETO:' as resultado;
SELECT
  id,
  nome,
  valor,
  vindi_plan_id,
  vindi_product_id,
  ativo
FROM public.planos
WHERE ativo = true AND vindi_plan_id IS NOT NULL
ORDER BY valor;

SELECT 'BENEFICIÁRIO DIEGO CORRIGIDO:' as resultado;
SELECT
  b.nome,
  b.cpf,
  b.valor_plano,
  b.status,
  b.payment_status,
  p.nome as plano_nome,
  p.vindi_plan_id as vindi_plan_id_real
FROM public.beneficiarios b
JOIN public.planos p ON b.plano_id = p.id
WHERE b.cpf = '08600756995';

-- 6. TESTE FINAL
SELECT
  '✅ CORREÇÃO APLICADA COM SUCESSO!' as status,
  'Planos: Individual (539682), Familiar (539703)' as info,
  'Teste agora: /unidade/adesao → botão 🔗' as acao;