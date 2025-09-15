-- Fix unidades.user_id to allow NULL values
-- This allows matriz users to create units without an associated user initially
-- The user will be linked when they accept the invitation

-- Make user_id column nullable in unidades table
ALTER TABLE public.unidades
ALTER COLUMN user_id DROP NOT NULL;

-- Update existing policies to handle nullable user_id
DROP POLICY IF EXISTS "Unidade pode ver própria unidade" ON public.unidades;
DROP POLICY IF EXISTS "Unidade pode atualizar própria unidade" ON public.unidades;

-- Recreate policies to handle nullable user_id
CREATE POLICY "Unidade pode ver própria unidade" ON public.unidades
FOR SELECT USING (user_id = auth.uid() AND user_id IS NOT NULL);

CREATE POLICY "Unidade pode atualizar própria unidade" ON public.unidades
FOR UPDATE USING (user_id = auth.uid() AND user_id IS NOT NULL);

-- Add policy to allow matriz users to see unidades with NULL user_id
CREATE POLICY "Matriz pode ver unidades sem usuário" ON public.unidades
FOR SELECT USING (
  user_id IS NULL AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND user_type = 'matriz'
  )
);

-- Add policy to allow matriz users to update unidades with NULL user_id
CREATE POLICY "Matriz pode atualizar unidades sem usuário" ON public.unidades
FOR UPDATE USING (
  user_id IS NULL AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND user_type = 'matriz'
  )
);