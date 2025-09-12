-- LIMPEZA COMPLETA DO SISTEMA
-- ATENÇÃO: Este script vai remover TODOS os dados do sistema

-- 1. Remover todos os convites pendentes
DELETE FROM public.convites_franqueados;

-- 2. Remover todas as comissões
DELETE FROM public.comissoes;

-- 3. Remover todos os cancelamentos
DELETE FROM public.cancelamentos;

-- 4. Remover todos os beneficiários
DELETE FROM public.beneficiarios;

-- 5. Remover todas as unidades
DELETE FROM public.unidades;

-- 6. Remover todos os logs de atividades
DELETE FROM public.logs_atividades;

-- 7. Remover todos os logs de API
DELETE FROM public.api_integrations_log;

-- 8. Remover todas as notificações
DELETE FROM public.notificacoes;

-- 9. Remover todos os perfis (isso vai ser feito automaticamente quando removermos os usuários)
-- DELETE FROM public.profiles; -- Não precisa, vai ser removido por cascade

-- 10. IMPORTANTE: Remover todos os usuários do auth (isso também remove os profiles)
-- NOTA: Esta operação só pode ser feita por um usuário com privilégios de admin
DO $$ 
DECLARE 
    user_record RECORD;
BEGIN
    -- Listar e deletar todos os usuários do auth.users
    FOR user_record IN SELECT id FROM auth.users LOOP
        DELETE FROM auth.users WHERE id = user_record.id;
    END LOOP;
    
    RAISE NOTICE 'Sistema completamente resetado. Todos os usuários e dados foram removidos.';
END $$;