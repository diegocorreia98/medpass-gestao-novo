-- Corrigir políticas RLS da tabela profiles para permitir que usuários matriz vejam todos os perfis
-- Isso é necessário para o sistema de notificações funcionar corretamente

-- Adicionar política para permitir que usuários matriz vejam todos os perfis
CREATE POLICY "Matriz users can view all profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND user_type = 'matriz'
  )
);

-- Comentário explicativo:
-- Esta política permite que usuários do tipo 'matriz' vejam todos os perfis na tabela.
-- Isso é necessário para:
-- 1. Sistema de notificações poder encontrar usuários por tipo
-- 2. Funcionalidades administrativas da matriz
-- 3. Relatórios e dashboards administrativos
--
-- A segurança é mantida porque:
-- - Apenas usuários matriz têm essa permissão
-- - Usuários unidade continuam vendo apenas seus próprios perfis
-- - A verificação é feita através de uma subconsulta segura