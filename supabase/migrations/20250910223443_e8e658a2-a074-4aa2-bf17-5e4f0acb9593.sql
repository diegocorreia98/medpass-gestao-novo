-- Atualizar política RLS para permitir visualização pública dos planos ativos
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar planos" ON public.planos;

-- Criar nova política que permite visualização pública dos planos ativos
CREATE POLICY "Planos ativos são públicos" 
ON public.planos 
FOR SELECT 
USING (ativo = true);

-- Manter política existente para gestão (matriz)
-- A política "Matriz pode gerenciar planos" já existe e continuará funcionando