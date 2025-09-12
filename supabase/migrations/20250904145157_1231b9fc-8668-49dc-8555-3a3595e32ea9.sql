-- Add empresa_id column to beneficiarios table
ALTER TABLE public.beneficiarios 
ADD COLUMN empresa_id UUID REFERENCES public.empresas(id);

-- Add index for better performance when querying by empresa_id
CREATE INDEX idx_beneficiarios_empresa_id ON public.beneficiarios(empresa_id);