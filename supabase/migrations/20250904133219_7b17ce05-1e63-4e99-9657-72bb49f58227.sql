-- Create empresas table
CREATE TABLE public.empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT NOT NULL,
  inscricao_estadual TEXT,
  inscricao_municipal TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  telefone TEXT,
  email TEXT,
  website TEXT,
  observacoes TEXT,
  status status_ativo NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create responsaveis_empresa table
CREATE TABLE public.responsaveis_empresa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cargo TEXT,
  tipo_responsabilidade TEXT NOT NULL CHECK (tipo_responsabilidade IN ('financeiro', 'juridico', 'geral', 'outros')),
  telefone TEXT,
  email TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create colaboradores_empresa table
CREATE TABLE public.colaboradores_empresa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cargo TEXT,
  cpf TEXT,
  telefone TEXT,
  email TEXT,
  data_admissao DATE,
  status status_ativo NOT NULL DEFAULT 'ativo',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add empresa_id and tipo_cliente to orcamentos table
ALTER TABLE public.orcamentos 
ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
ADD COLUMN tipo_cliente TEXT NOT NULL DEFAULT 'pf' CHECK (tipo_cliente IN ('pf', 'pj'));

-- Enable RLS
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsaveis_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaboradores_empresa ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for empresas
CREATE POLICY "Matriz pode gerenciar todas empresas" 
ON public.empresas 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() AND profiles.user_type = 'matriz'::user_type
));

CREATE POLICY "Unidade pode gerenciar próprias empresas" 
ON public.empresas 
FOR ALL 
USING (user_id = auth.uid());

-- Create RLS policies for responsaveis_empresa
CREATE POLICY "Matriz pode gerenciar todos responsáveis" 
ON public.responsaveis_empresa 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() AND profiles.user_type = 'matriz'::user_type
));

CREATE POLICY "Unidade pode gerenciar responsáveis de suas empresas" 
ON public.responsaveis_empresa 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.empresas 
  WHERE empresas.id = responsaveis_empresa.empresa_id AND empresas.user_id = auth.uid()
));

-- Create RLS policies for colaboradores_empresa
CREATE POLICY "Matriz pode gerenciar todos colaboradores" 
ON public.colaboradores_empresa 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() AND profiles.user_type = 'matriz'::user_type
));

CREATE POLICY "Unidade pode gerenciar colaboradores de suas empresas" 
ON public.colaboradores_empresa 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.empresas 
  WHERE empresas.id = colaboradores_empresa.empresa_id AND empresas.user_id = auth.uid()
));

-- Create triggers for updated_at
CREATE TRIGGER update_empresas_updated_at
BEFORE UPDATE ON public.empresas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_responsaveis_empresa_updated_at
BEFORE UPDATE ON public.responsaveis_empresa
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_colaboradores_empresa_updated_at
BEFORE UPDATE ON public.colaboradores_empresa
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();