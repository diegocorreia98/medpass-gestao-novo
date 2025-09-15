-- Script para criar tabelas essenciais que estão faltando
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
  vindi_plan_id INTEGER UNIQUE,
  vindi_product_id INTEGER,
  comissao_adesao_percentual DECIMAL(5,2) DEFAULT 0,
  comissao_recorrente_percentual DECIMAL(5,2) DEFAULT 0,
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

-- 4. Enable RLS para beneficiarios
ALTER TABLE public.beneficiarios ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies para beneficiarios
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

-- 6. Create indexes para performance
CREATE INDEX IF NOT EXISTS idx_beneficiarios_user_id ON public.beneficiarios(user_id);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_unidade_id ON public.beneficiarios(unidade_id);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_cpf ON public.beneficiarios(cpf);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_status ON public.beneficiarios(status);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_payment_status ON public.beneficiarios(payment_status);

-- 7. Inserir plano de teste se não existir
INSERT INTO public.planos (id, nome, descricao, valor, vindi_plan_id, ativo)
VALUES (
  '4e11e7cb-51f5-4034-a46c-ebdb7b5679cd',
  'Plano Individual Mensal - CotaFácil',
  'Plano para beneficiário individual mensal',
  99.90,
  123456, -- Substitua pelo vindi_plan_id real
  true
) ON CONFLICT (id) DO NOTHING;

-- 8. Inserir beneficiário de teste Diego Beu Correia
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
  '4e11e7cb-51f5-4034-a46c-ebdb7b5679cd', -- Plano teste
  'Diego Beu Correia',
  '08600756995',
  'diego@teste.com',
  '(11) 99999-9999',
  99.90,
  'ativo',
  'not_requested'
) ON CONFLICT (cpf) DO UPDATE SET
  nome = EXCLUDED.nome,
  email = EXCLUDED.email,
  status = EXCLUDED.status,
  updated_at = now();

-- 9. Verificar se dados foram inseridos
SELECT 'Tabelas criadas e dados inseridos com sucesso!' as status;
