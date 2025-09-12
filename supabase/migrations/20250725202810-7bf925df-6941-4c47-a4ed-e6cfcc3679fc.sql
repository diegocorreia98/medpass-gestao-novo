-- Criar enum para status do orçamento
CREATE TYPE status_orcamento AS ENUM ('pendente', 'aprovado', 'rejeitado', 'convertido');

-- Criar tabela orcamentos
CREATE TABLE public.orcamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  unidade_id UUID,
  cliente_nome TEXT NOT NULL,
  cliente_documento TEXT NOT NULL,
  cliente_endereco TEXT,
  cliente_email TEXT,
  cliente_telefone TEXT,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  comissao_percentual NUMERIC(5,2) NOT NULL DEFAULT 0,
  comissao_valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status status_orcamento NOT NULL DEFAULT 'pendente',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela orcamentos_itens
CREATE TABLE public.orcamentos_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id UUID NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  plano_id UUID NOT NULL REFERENCES public.planos(id),
  plano_nome TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  valor_unitario NUMERIC(10,2) NOT NULL,
  valor_total NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamentos_itens ENABLE ROW LEVEL SECURITY;

-- Policies para orcamentos
CREATE POLICY "Matriz pode gerenciar todos orçamentos" 
ON public.orcamentos 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.user_type = 'matriz'
));

CREATE POLICY "Unidade pode ver próprios orçamentos" 
ON public.orcamentos 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Usuários podem inserir orçamentos" 
ON public.orcamentos 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Unidade pode atualizar próprios orçamentos" 
ON public.orcamentos 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Unidade pode deletar próprios orçamentos" 
ON public.orcamentos 
FOR DELETE 
USING (user_id = auth.uid());

-- Policies para orcamentos_itens
CREATE POLICY "Matriz pode gerenciar todos itens de orçamentos" 
ON public.orcamentos_itens 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.user_type = 'matriz'
));

CREATE POLICY "Usuários podem ver itens de seus orçamentos" 
ON public.orcamentos_itens 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.orcamentos 
  WHERE orcamentos.id = orcamentos_itens.orcamento_id 
  AND orcamentos.user_id = auth.uid()
));

CREATE POLICY "Usuários podem inserir itens em seus orçamentos" 
ON public.orcamentos_itens 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.orcamentos 
  WHERE orcamentos.id = orcamentos_itens.orcamento_id 
  AND orcamentos.user_id = auth.uid()
));

CREATE POLICY "Usuários podem atualizar itens de seus orçamentos" 
ON public.orcamentos_itens 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.orcamentos 
  WHERE orcamentos.id = orcamentos_itens.orcamento_id 
  AND orcamentos.user_id = auth.uid()
));

CREATE POLICY "Usuários podem deletar itens de seus orçamentos" 
ON public.orcamentos_itens 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.orcamentos 
  WHERE orcamentos.id = orcamentos_itens.orcamento_id 
  AND orcamentos.user_id = auth.uid()
));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_orcamentos_updated_at
  BEFORE UPDATE ON public.orcamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();