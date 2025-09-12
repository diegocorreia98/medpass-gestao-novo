-- Remover a view problemática apontada pelo security linter
DROP VIEW IF EXISTS public.subscriptions_checkout_safe;

-- A função get_checkout_subscription já está criada e é segura
-- Vamos apenas garantir que ela tem as permissões corretas

-- Conceder permissões para uso da função
GRANT EXECUTE ON FUNCTION public.get_checkout_subscription TO anon, authenticated;