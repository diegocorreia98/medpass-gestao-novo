-- ========================================
-- SCRIPT COM IDs REAIS DOS PLANOS DA VINDI
-- Descobertos automaticamente da API Vindi
-- ========================================

-- PLANOS REAIS ENCONTRADOS:
-- 1. ID: 539682 - "Mensal 12 Meses - Individual" - R$ 49,90 - Product ID: 1804781
-- 2. ID: 539703 - "Mensal 12 Meses - Familiar" - R$ 89,90 - Product ID: 1804782

-- 1. Deletar planos com IDs incorretos
DELETE FROM public.planos WHERE vindi_plan_id IN (123456, 539683, 539684) OR vindi_plan_id IS NULL;

-- 2. Inserir planos REAIS da Vindi
INSERT INTO public.planos (id, nome, descricao, valor, vindi_plan_id, vindi_product_id, ativo) VALUES
('4e11e7cb-51f5-4034-a46c-ebdb7b5679cd', 'Mensal 12 Meses - Individual', 'Plano Individual MedPass - Mensal por 12 meses', 49.90, 539682, '1804781', true),
('8f22a8dc-62g6-5145-b57d-fcec8c6780de', 'Mensal 12 Meses - Familiar', 'Plano Familiar MedPass - Mensal por 12 meses', 89.90, 539703, '1804782', true)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  valor = EXCLUDED.valor,
  vindi_plan_id = EXCLUDED.vindi_plan_id,
  vindi_product_id = EXCLUDED.vindi_product_id,
  updated_at = now();

-- 3. Atualizar o beneficiário Diego para usar o plano Individual (mais barato)
UPDATE public.beneficiarios
SET
  plano_id = '4e11e7cb-51f5-4034-a46c-ebdb7b5679cd',
  valor_plano = 49.90,
  updated_at = now()
WHERE cpf = '08600756995';

-- 4. Verificar planos inseridos
SELECT
  '✅ PLANOS REAIS DA VINDI:' as status,
  nome,
  valor,
  vindi_plan_id,
  vindi_product_id,
  ativo
FROM public.planos
WHERE vindi_plan_id IS NOT NULL
ORDER BY valor;

-- 5. Verificar beneficiário atualizado
SELECT
  '✅ BENEFICIÁRIO ATUALIZADO:' as status,
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

-- 6. RESULTADO FINAL
SELECT
  '🎉 SCRIPT EXECUTADO!' as resultado,
  'Agora teste:' as acao,
  '1. /unidade/adesao' as passo1,
  '2. Clique botão 🔗 do Diego' as passo2,
  '3. Deve funcionar com vindi_plan_id 539682!' as passo3;