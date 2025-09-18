-- Script para corrigir as políticas RLS da tabela notificacoes
-- Execute este script no Supabase SQL Editor

-- Verificar políticas existentes na tabela notificacoes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'notificacoes';

-- Remover política problemática se existir
DROP POLICY IF EXISTS "System can insert notifications" ON public.notificacoes;

-- Criar política mais específica para permitir que usuários matriz insiram notificações
-- Usa a função auxiliar já criada para evitar recursão
CREATE POLICY "Matriz users can insert system notifications" ON public.notificacoes
  FOR INSERT
  WITH CHECK (
    public.is_matriz_user(auth.uid())
  );

-- Alternativa: Política mais permissiva para inserção (se a acima não funcionar)
-- Descomente as linhas abaixo se necessário:
-- CREATE POLICY "Allow system notification creation" ON public.notificacoes
--   FOR INSERT
--   WITH CHECK (true);

-- Verificar se as políticas foram criadas corretamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'notificacoes';