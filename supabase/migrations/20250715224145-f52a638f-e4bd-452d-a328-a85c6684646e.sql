-- Criar enum para status
CREATE TYPE public.status_ativo AS ENUM ('ativo', 'inativo', 'pendente');

-- Tabela de planos
CREATE TABLE public.planos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  valor DECIMAL(10,2) NOT NULL,
  comissao_percentual DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de unidades/franquias
CREATE TABLE public.unidades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  telefone TEXT,
  email TEXT,
  responsavel TEXT,
  status status_ativo NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de beneficiários
CREATE TABLE public.beneficiarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unidade_id UUID REFERENCES public.unidades(id) ON DELETE SET NULL,
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
  status status_ativo NOT NULL DEFAULT 'ativo',
  data_adesao DATE NOT NULL DEFAULT CURRENT_DATE,
  valor_plano DECIMAL(10,2) NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de cancelamentos
CREATE TABLE public.cancelamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  beneficiario_id UUID NOT NULL REFERENCES public.beneficiarios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  motivo TEXT NOT NULL,
  data_cancelamento DATE NOT NULL DEFAULT CURRENT_DATE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de comissões
CREATE TABLE public.comissoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  beneficiario_id UUID NOT NULL REFERENCES public.beneficiarios(id) ON DELETE CASCADE,
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  valor_comissao DECIMAL(10,2) NOT NULL,
  percentual DECIMAL(5,2) NOT NULL,
  mes_referencia DATE NOT NULL,
  pago BOOLEAN NOT NULL DEFAULT false,
  data_pagamento DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de logs de atividades
CREATE TABLE public.logs_atividades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  acao TEXT NOT NULL,
  tabela TEXT,
  registro_id UUID,
  dados_anteriores JSONB,
  dados_novos JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancelamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_atividades ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para planos (matriz pode gerenciar, unidade pode visualizar)
CREATE POLICY "Matriz pode gerenciar planos" ON public.planos
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND user_type = 'matriz'
  )
);

CREATE POLICY "Unidade pode visualizar planos" ON public.planos
FOR SELECT USING (true);

-- Políticas RLS para unidades
CREATE POLICY "Matriz pode ver todas unidades" ON public.unidades
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND user_type = 'matriz'
  )
);

CREATE POLICY "Unidade pode ver própria unidade" ON public.unidades
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Matriz pode gerenciar unidades" ON public.unidades
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND user_type = 'matriz'
  )
);

CREATE POLICY "Unidade pode atualizar própria unidade" ON public.unidades
FOR UPDATE USING (user_id = auth.uid());

-- Políticas RLS para beneficiários
CREATE POLICY "Matriz pode ver todos beneficiários" ON public.beneficiarios
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND user_type = 'matriz'
  )
);

CREATE POLICY "Unidade pode ver próprios beneficiários" ON public.beneficiarios
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Usuários podem inserir beneficiários" ON public.beneficiarios
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Matriz pode gerenciar todos beneficiários" ON public.beneficiarios
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND user_type = 'matriz'
  )
);

CREATE POLICY "Unidade pode gerenciar próprios beneficiários" ON public.beneficiarios
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Unidade pode deletar próprios beneficiários" ON public.beneficiarios
FOR DELETE USING (user_id = auth.uid());

-- Políticas RLS para cancelamentos
CREATE POLICY "Matriz pode ver todos cancelamentos" ON public.cancelamentos
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND user_type = 'matriz'
  )
);

CREATE POLICY "Unidade pode ver próprios cancelamentos" ON public.cancelamentos
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Usuários podem inserir cancelamentos" ON public.cancelamentos
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Políticas RLS para comissões
CREATE POLICY "Matriz pode ver todas comissões" ON public.comissoes
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND user_type = 'matriz'
  )
);

CREATE POLICY "Unidade pode ver próprias comissões" ON public.comissoes
FOR SELECT USING (user_id = auth.uid());

-- Políticas RLS para logs
CREATE POLICY "Matriz pode ver todos logs" ON public.logs_atividades
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND user_type = 'matriz'
  )
);

CREATE POLICY "Usuários podem inserir próprios logs" ON public.logs_atividades
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuários podem ver próprios logs" ON public.logs_atividades
FOR SELECT USING (user_id = auth.uid());

-- Triggers para updated_at
CREATE TRIGGER update_planos_updated_at
BEFORE UPDATE ON public.planos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_unidades_updated_at
BEFORE UPDATE ON public.unidades
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_beneficiarios_updated_at
BEFORE UPDATE ON public.beneficiarios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comissoes_updated_at
BEFORE UPDATE ON public.comissoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir planos básicos
INSERT INTO public.planos (nome, descricao, valor, comissao_percentual) VALUES
('Plano Básico', 'Cobertura básica de saúde', 150.00, 10.00),
('Plano Completo', 'Cobertura completa com exames', 250.00, 12.00),
('Plano Premium', 'Cobertura premium com especialistas', 400.00, 15.00);

-- Função para calcular comissões automaticamente
CREATE OR REPLACE FUNCTION public.calcular_comissao()
RETURNS TRIGGER AS $$
DECLARE
  v_unidade_id UUID;
  v_percentual DECIMAL(5,2);
BEGIN
  -- Buscar a unidade do beneficiário
  SELECT u.id INTO v_unidade_id
  FROM public.unidades u
  WHERE u.user_id = NEW.user_id;
  
  -- Buscar o percentual de comissão do plano
  SELECT p.comissao_percentual INTO v_percentual
  FROM public.planos p
  WHERE p.id = NEW.plano_id;
  
  -- Inserir comissão se unidade existir
  IF v_unidade_id IS NOT NULL AND v_percentual IS NOT NULL THEN
    INSERT INTO public.comissoes (
      beneficiario_id,
      unidade_id,
      user_id,
      valor_comissao,
      percentual,
      mes_referencia
    ) VALUES (
      NEW.id,
      v_unidade_id,
      NEW.user_id,
      NEW.valor_plano * (v_percentual / 100),
      v_percentual,
      DATE_TRUNC('month', NEW.data_adesao)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular comissão quando beneficiário é inserido
CREATE TRIGGER trigger_calcular_comissao
AFTER INSERT ON public.beneficiarios
FOR EACH ROW
EXECUTE FUNCTION public.calcular_comissao();

-- Índices para performance
CREATE INDEX idx_beneficiarios_user_id ON public.beneficiarios(user_id);
CREATE INDEX idx_beneficiarios_plano_id ON public.beneficiarios(plano_id);
CREATE INDEX idx_beneficiarios_cpf ON public.beneficiarios(cpf);
CREATE INDEX idx_unidades_user_id ON public.unidades(user_id);
CREATE INDEX idx_comissoes_user_id ON public.comissoes(user_id);
CREATE INDEX idx_comissoes_mes_referencia ON public.comissoes(mes_referencia);
CREATE INDEX idx_logs_user_id ON public.logs_atividades(user_id);
CREATE INDEX idx_logs_created_at ON public.logs_atividades(created_at);