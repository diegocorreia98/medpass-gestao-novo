-- Criar tabela de franquias
CREATE TABLE public.franquias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS na tabela franquias
ALTER TABLE public.franquias ENABLE ROW LEVEL SECURITY;

-- Políticas para franquias
CREATE POLICY "Matriz pode gerenciar todas franquias" 
ON public.franquias 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'matriz'
));

CREATE POLICY "Unidades podem ver franquias ativas" 
ON public.franquias 
FOR SELECT 
USING (ativo = true);

-- Adicionar franquia_id na tabela planos
ALTER TABLE public.planos ADD COLUMN franquia_id UUID REFERENCES public.franquias(id);

-- Adicionar franquia_id na tabela unidades  
ALTER TABLE public.unidades ADD COLUMN franquia_id UUID REFERENCES public.franquias(id);

-- Criar índices para performance
CREATE INDEX idx_planos_franquia_id ON public.planos(franquia_id);
CREATE INDEX idx_unidades_franquia_id ON public.unidades(franquia_id);

-- Atualizar política de planos para considerar franquia
DROP POLICY IF EXISTS "Planos ativos são públicos" ON public.planos;

CREATE POLICY "Matriz pode ver todos planos" 
ON public.planos 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'matriz'
));

CREATE POLICY "Unidades podem ver planos da sua franquia" 
ON public.planos 
FOR SELECT 
USING (
  ativo = true AND (
    franquia_id IS NULL OR 
    EXISTS (
      SELECT 1 FROM public.unidades u 
      WHERE u.user_id = auth.uid() 
        AND u.franquia_id = planos.franquia_id
    )
  )
);

-- Inserir franquias padrão
INSERT INTO public.franquias (nome, descricao) VALUES 
('CotaFácil', 'Franquia especializada em planos de saúde corporativos'),
('MedPass', 'Franquia focada em planos de saúde individuais e familiares');

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_franquias_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_franquias_updated_at
  BEFORE UPDATE ON public.franquias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_franquias_updated_at();