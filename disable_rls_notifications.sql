-- SOLUÇÃO EMERGENCIAL: Desabilitar RLS na tabela notificacoes
-- Execute este script no Supabase SQL Editor

-- Desabilitar RLS temporariamente na tabela notificacoes
ALTER TABLE public.notificacoes DISABLE ROW LEVEL SECURITY;

-- Verificar o status do RLS
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'notificacoes';

-- Comentário:
-- Esta é uma solução temporária para fazer o sistema funcionar.
-- Depois que confirmarmos que as notificações estão funcionando,
-- podemos reabilitar o RLS e criar políticas mais específicas.
--
-- Para reabilitar depois:
-- ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;