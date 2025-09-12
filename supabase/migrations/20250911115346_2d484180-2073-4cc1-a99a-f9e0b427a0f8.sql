-- Atualizar política RLS para permitir que usuários unidade vejam beneficiários de sua unidade
DROP POLICY IF EXISTS "Unidade pode ver próprios beneficiários" ON public.beneficiarios;

CREATE POLICY "Unidade pode ver beneficiários de sua unidade" 
ON public.beneficiarios 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  (EXISTS (
    SELECT 1 FROM public.unidades u 
    WHERE u.id = beneficiarios.unidade_id 
    AND u.user_id = auth.uid()
  ))
);

-- Também atualizar outras políticas da unidade para incluir beneficiários da unidade
DROP POLICY IF EXISTS "Unidade pode gerenciar próprios beneficiários" ON public.beneficiarios;

CREATE POLICY "Unidade pode gerenciar beneficiários de sua unidade" 
ON public.beneficiarios 
FOR UPDATE 
USING (
  user_id = auth.uid() OR 
  (EXISTS (
    SELECT 1 FROM public.unidades u 
    WHERE u.id = beneficiarios.unidade_id 
    AND u.user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Unidade pode deletar próprios beneficiários" ON public.beneficiarios;

CREATE POLICY "Unidade pode deletar beneficiários de sua unidade" 
ON public.beneficiarios 
FOR DELETE 
USING (
  user_id = auth.uid() OR 
  (EXISTS (
    SELECT 1 FROM public.unidades u 
    WHERE u.id = beneficiarios.unidade_id 
    AND u.user_id = auth.uid()
  ))
);