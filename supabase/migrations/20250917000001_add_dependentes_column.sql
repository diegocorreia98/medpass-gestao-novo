-- Add dependentes column to beneficiarios table
-- This column will store dependents data as JSON for family plans

ALTER TABLE public.beneficiarios
ADD COLUMN dependentes JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.beneficiarios.dependentes IS 'JSON array storing dependents information for family plans. Each dependent includes: nome, cpf, data_nascimento, telefone, email, observacoes';

-- Update the updated_at timestamp when dependentes column is modified
CREATE OR REPLACE FUNCTION update_beneficiarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_beneficiarios_updated_at_trigger ON public.beneficiarios;
CREATE TRIGGER update_beneficiarios_updated_at_trigger
    BEFORE UPDATE ON public.beneficiarios
    FOR EACH ROW
    EXECUTE FUNCTION update_beneficiarios_updated_at();