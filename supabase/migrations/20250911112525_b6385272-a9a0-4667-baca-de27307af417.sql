-- Corrigir política RLS para permitir que usuários unidade criem suas próprias unidades
DROP POLICY IF EXISTS "Unidade pode criar própria unidade" ON public.unidades;

CREATE POLICY "Unidade pode criar própria unidade" 
ON public.unidades 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Adicionar política para atualização de unidades pelo próprio usuário
DROP POLICY IF EXISTS "Unidade pode atualizar própria unidade" ON public.unidades;

CREATE POLICY "Unidade pode atualizar própria unidade" 
ON public.unidades 
FOR UPDATE 
USING (user_id = auth.uid());