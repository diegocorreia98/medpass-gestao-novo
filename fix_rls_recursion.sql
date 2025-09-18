-- Script para corrigir a recursão infinita na política RLS
-- Execute este script no Supabase SQL Editor

-- Primeiro, remover a política problemática
DROP POLICY IF EXISTS "Matriz users can view all profiles" ON public.profiles;

-- Verificar as políticas existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';

-- Método alternativo 1: Usar uma função auxiliar para evitar recursão
CREATE OR REPLACE FUNCTION public.is_matriz_user(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Usa uma consulta direta à tabela evitando RLS
  PERFORM 1 FROM public.profiles
  WHERE user_id = user_uuid AND user_type = 'matriz';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar nova política usando a função auxiliar
CREATE POLICY "Matriz users can view all profiles v2"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id OR public.is_matriz_user(auth.uid())
);

-- Verificar se as políticas foram criadas corretamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';