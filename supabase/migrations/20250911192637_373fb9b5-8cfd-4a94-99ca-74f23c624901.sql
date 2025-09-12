-- Drop the existing unique constraint that prevents multiple NULL values
DROP INDEX IF EXISTS unique_user_unidade;

-- Create a partial unique constraint that only applies when user_id is NOT NULL
-- This allows multiple NULL values (for units created by matriz users)
CREATE UNIQUE INDEX unique_user_unidade_not_null 
ON public.unidades (user_id) 
WHERE user_id IS NOT NULL;