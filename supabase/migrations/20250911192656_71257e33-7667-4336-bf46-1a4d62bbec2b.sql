-- Drop the unique constraint (not just the index)
ALTER TABLE public.unidades DROP CONSTRAINT unique_user_unidade;

-- Create a partial unique constraint that only applies when user_id is NOT NULL
-- This allows multiple NULL values (for units created by matriz users)
CREATE UNIQUE INDEX unique_user_unidade_not_null 
ON public.unidades (user_id) 
WHERE user_id IS NOT NULL;