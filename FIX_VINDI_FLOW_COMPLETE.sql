-- ====================================================
-- SCRIPT COMPLETO: CORRIGIR FLUXO VINDI + PLANOS REAIS
-- ====================================================

-- Execute este script no Supabase Dashboard > SQL Editor

-- 1. Criar enum para status (se não existir)
DO $$ BEGIN
    CREATE TYPE status_ativo AS ENUM ('ativo', 'inativo', 'pendente', 'pending_payment', 'payment_confirmed', 'rms_sent', 'rms_failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Criar tabela planos (se não existir)
CREATE TABLE IF NOT EXISTS public.planos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  valor DECIMAL(10,2) NOT NULL,
  custo DECIMAL(10,2) DEFAULT 0,
  vindi_plan_id INTEGER UNIQUE,
  vindi_product_id TEXT,
  comissao_adesao_percentual DECIMAL(5,2) DEFAULT 0,
  comissao_percentual DECIMAL(5,2) DEFAULT 5.0,
  comissao_recorrente_percentual DECIMAL(5,2) DEFAULT 0,
  franquia_id UUID,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Criar tabela beneficiarios (se não existir)
CREATE TABLE IF NOT EXISTS public.beneficiarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unidade_id UUID REFERENCES public.unidades(id) ON DELETE SET NULL,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  plano_id UUID NOT NULL REFERENCES public.planos(id) ON DELETE RESTRICT,
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  email TEXT,
  telefone TEXT,
  data_nascimento DATE,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  valor_plano DECIMAL(10,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  status status_ativo NOT NULL DEFAULT 'pendente',
  payment_status TEXT DEFAULT 'not_requested' 
    CHECK (payment_status IN ('not_requested', 'payment_requested', 'paid', 'failed', 'processing', 'awaiting_payment', 'link_generated')),
  data_adesao DATE NOT NULL DEFAULT CURRENT_DATE,
  checkout_link TEXT,
  vindi_customer_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.beneficiarios ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies para beneficiarios
DROP POLICY IF EXISTS "Matriz pode ver todos beneficiários" ON public.beneficiarios;
CREATE POLICY "Matriz pode ver todos beneficiários" ON public.beneficiarios
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND user_type = 'matriz'
  )
);

DROP POLICY IF EXISTS "Unidade pode ver beneficiários de sua unidade" ON public.beneficiarios;
CREATE POLICY "Unidade pode ver beneficiários de sua unidade" ON public.beneficiarios
FOR SELECT USING (
  user_id = auth.uid() OR
  unidade_id IN (
    SELECT id FROM public.unidades 
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Usuários podem inserir beneficiários" ON public.beneficiarios;
CREATE POLICY "Usuários podem inserir beneficiários" ON public.beneficiarios
FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Matriz pode gerenciar todos beneficiários" ON public.beneficiarios;
CREATE POLICY "Matriz pode gerenciar todos beneficiários" ON public.beneficiarios
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND user_type = 'matriz'
  )
);

DROP POLICY IF EXISTS "Unidade pode gerenciar beneficiários" ON public.beneficiarios;
CREATE POLICY "Unidade pode gerenciar beneficiários" ON public.beneficiarios
FOR UPDATE USING (
  user_id = auth.uid() OR
  unidade_id IN (
    SELECT id FROM public.unidades 
    WHERE user_id = auth.uid()
  )
);

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS idx_beneficiarios_user_id ON public.beneficiarios(user_id);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_unidade_id ON public.beneficiarios(unidade_id);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_cpf ON public.beneficiarios(cpf);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_status ON public.beneficiarios(status);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_payment_status ON public.beneficiarios(payment_status);

-- 7. DELETAR E RECRIAR PLANOS COM IDs CORRETOS DA VINDI
DELETE FROM public.planos WHERE vindi_plan_id IN (123456, 0) OR vindi_plan_id IS NULL;

-- ⚠️ ATENÇÃO: SUBSTITUA PELOS IDs REAIS DOS SEUS PLANOS DA VINDI
-- Para descobrir os IDs, acesse: GET https://app.vindi.com.br/api/v1/plans
-- Ou consulte o painel da Vindi > Planos

INSERT INTO public.planos (id, nome, descricao, valor, vindi_plan_id, vindi_product_id, ativo) VALUES 
-- SUBSTITUA PELOS SEUS PLANOS REAIS:
('4e11e7cb-51f5-4034-a46c-ebdb7b5679cd', 'Plano Individual Mensal - CotaFácil', 'Plano para beneficiário individual mensal', 99.90, 539682, '482736', true),
('8f22a8dc-62g6-5145-b57d-fcec8c6780de', 'Plano Familiar Mensal - CotaFácil', 'Plano para família mensal', 199.90, 539683, '482737', true),
('1a33b9ed-73h7-6256-c68e-0dfd9d7891ef', 'Plano Premium Mensal - CotaFácil', 'Plano premium mensal', 299.90, 539684, '482738', true)
ON CONFLICT (id) DO UPDATE SET
  vindi_plan_id = EXCLUDED.vindi_plan_id,
  vindi_product_id = EXCLUDED.vindi_product_id,
  valor = EXCLUDED.valor,
  updated_at = now();

-- 8. DELETAR E RECRIAR BENEFICIÁRIO DE TESTE COM PLANO VÁLIDO
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
  '4e11e7cb-51f5-4034-a46c-ebdb7b5679cd', -- Plano Individual com vindi_plan_id 539682
  'Diego Beu Correia',
  '08600756995',
  'diego@teste.com',
  '(11) 99999-9999',
  99.90,
  'ativo',
  'not_requested'
);

-- 9. Verificar dados inseridos
SELECT 
  'PLANOS CRIADOS:' as tipo,
  p.nome, 
  p.valor, 
  p.vindi_plan_id,
  p.vindi_product_id,
  p.ativo
FROM public.planos p 
WHERE p.ativo = true
ORDER BY p.valor;

SELECT 
  'BENEFICIÁRIO CRIADO:' as tipo,
  b.nome,
  b.cpf,
  b.status,
  b.payment_status,
  p.nome as plano_nome,
  p.vindi_plan_id
FROM public.beneficiarios b
JOIN public.planos p ON b.plano_id = p.id
WHERE b.cpf = '08600756995';

-- 10. RESULTADO FINAL
SELECT '✅ BANCO CORRIGIDO! Agora teste o fluxo:' as status,
       '1. Acesse /unidade/adesao' as passo1,
       '2. Clique no botão 🔗 do Diego Beu Correia' as passo2,
       '3. Deve gerar link de pagamento com sucesso!' as passo3;
