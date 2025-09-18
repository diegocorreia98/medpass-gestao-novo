-- Script FINAL para corrigir as políticas RLS da tabela notificacoes
-- Execute este script no Supabase SQL Editor

-- 1. Verificar políticas existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'notificacoes';

-- 2. Remover TODAS as políticas de INSERT existentes
DROP POLICY IF EXISTS "System can insert notifications" ON public.notificacoes;
DROP POLICY IF EXISTS "Matriz users can insert system notifications" ON public.notificacoes;

-- 3. Criar política SIMPLES que permite inserção para qualquer usuário autenticado
-- (temporariamente para teste, pode ser refinada depois)
CREATE POLICY "Allow authenticated users to insert notifications" ON public.notificacoes
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Verificar se funcionou
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'notificacoes' AND cmd = 'INSERT';

-- 5. Se ainda não funcionar, desabilitar RLS temporariamente na tabela (último recurso)
-- Descomente as linhas abaixo APENAS se a política acima não funcionar:
-- ALTER TABLE public.notificacoes DISABLE ROW LEVEL SECURITY;