-- =============================================
-- CORREÇÃO URGENTE: Planos e Beneficiários
-- Execute este script AGORA no Supabase SQL Editor
-- =============================================

-- 1. PRIMEIRO: Verificar estado atual
SELECT 'ESTADO ATUAL DOS PLANOS:' as info;
SELECT id, nome, valor, vindi_plan_id, ativo FROM public.planos;

SELECT 'ESTADO ATUAL DO BENEFICIÁRIO DIEGO:' as info;
SELECT b.nome, b.cpf, b.plano_id, p.nome as plano_nome, p.vindi_plan_id
FROM public.beneficiarios b
LEFT JOIN public.planos p ON b.plano_id = p.id
WHERE b.cpf = '08600756995';

-- 2. DELETAR PLANOS EXISTENTES (limpar problema)
DELETE FROM public.planos;

-- 3. INSERIR PLANOS CORRETOS COM IDs REAIS DA VINDI
INSERT INTO public.planos (id, nome, descricao, valor, vindi_plan_id, vindi_product_id, ativo) VALUES
-- PLANO 1: Individual (ID real da Vindi: 539682)
('4e11e7cb-51f5-4034-a46c-ebdb7b5679cd', 'Mensal 12 Meses - Individual', 'Plano Individual MedPass - Mensal por 12 meses', 49.90, 539682, '1804781', true),
-- PLANO 2: Familiar (ID real da Vindi: 539703)
('8f22a8dc-62g6-5145-b57d-fcec8c6780de', 'Mensal 12 Meses - Familiar', 'Plano Familiar MedPass - Mensal por 12 meses', 89.90, 539703, '1804782', true);

-- 4. DELETAR E RECRIAR BENEFICIÁRIO DIEGO
DELETE FROM public.beneficiarios WHERE cpf = '08600756995';

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
  '49fd2e97-ad5e-445b-a959-ba4c532e277a', -- Seu user_id
  '239377fc-92bd-40fa-8d9d-c1375329c55e', -- Sua unidade_id
  '4e11e7cb-51f5-4034-a46c-ebdb7b5679cd', -- Plano Individual (vindi_plan_id: 539682)
  'Diego Beu Correia',
  '08600756995',
  'diego@teste.com',
  '(11) 99999-9999',
  49.90,
  'ativo',
  'not_requested'
);

-- 5. VERIFICAR RESULTADO FINAL
SELECT 'PLANOS INSERIDOS:' as resultado;
SELECT
  id,
  nome,
  valor,
  vindi_plan_id,
  vindi_product_id,
  ativo
FROM public.planos
ORDER BY valor;

SELECT 'BENEFICIÁRIO CORRIGIDO:' as resultado;
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
  '🎉 CORREÇÃO APLICADA!' as status,
  'Agora teste o fluxo:' as acao,
  '1. Recarregue /unidade/adesao' as passo1,
  '2. Clique botão 🔗 do Diego' as passo2,
  '3. Deve funcionar sem erro!' as passo3;