-- Corrigir vulnerabilidade crítica: planos table exposta publicamente
-- PROBLEMA: A política atual permite acesso público a dados sensíveis do negócio

-- Remover a política insegura que permite acesso público
DROP POLICY IF EXISTS "Unidade pode visualizar planos" ON public.planos;

-- Criar nova política segura que só permite acesso a usuários autenticados com perfil adequado
CREATE POLICY "Usuários autenticados podem visualizar planos" 
ON public.planos 
FOR SELECT 
USING (
  -- Apenas usuários autenticados podem ver os planos
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type IN ('matriz'::user_type, 'unidade'::user_type)
  )
);

-- Garantir que a política de gerenciamento da matriz continue funcionando
-- (esta já estava segura, mas vamos garantir que continue)
-- A política "Matriz pode gerenciar planos" já existe e está correta