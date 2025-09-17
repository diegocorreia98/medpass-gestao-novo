-- SCRIPT TO ADD DEPENDENTES COLUMN TO BENEFICIARIOS TABLE
-- Run this directly in Supabase SQL Editor when ready to add the proper column

-- Step 1: Add the dependentes column
ALTER TABLE public.beneficiarios
ADD COLUMN IF NOT EXISTS dependentes JSONB DEFAULT '[]'::jsonb;

-- Step 2: Add comment for documentation
COMMENT ON COLUMN public.beneficiarios.dependentes IS 'JSON array storing dependents information for family plans. Each dependent includes: nome, cpf, data_nascimento, telefone, email, observacoes';

-- Step 3: Migrate existing dependentes data from observacoes field
UPDATE public.beneficiarios
SET dependentes = (
  CASE
    WHEN observacoes ~ '\[DEPENDENTES: .*?\]' THEN
      (regexp_match(observacoes, '\[DEPENDENTES: (.*?)\]'))[1]::jsonb
    ELSE
      '[]'::jsonb
  END
)
WHERE observacoes IS NOT NULL AND observacoes ~ '\[DEPENDENTES: .*?\]';

-- Step 4: Clean up observacoes field by removing dependentes data
UPDATE public.beneficiarios
SET observacoes = TRIM(regexp_replace(observacoes, '\[DEPENDENTES: .*?\]', '', 'g'))
WHERE observacoes IS NOT NULL AND observacoes ~ '\[DEPENDENTES: .*?\]';

-- Step 5: Set empty observacoes to NULL for cleaner data
UPDATE public.beneficiarios
SET observacoes = NULL
WHERE observacoes = '' OR observacoes IS NULL;

-- Step 6: Verify the migration
SELECT
  id,
  nome,
  observacoes,
  dependentes,
  jsonb_array_length(dependentes) as num_dependentes
FROM public.beneficiarios
WHERE dependentes != '[]'::jsonb
LIMIT 10;