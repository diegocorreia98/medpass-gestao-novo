-- Adicionar coluna user_id à tabela subscription_checkout_links
ALTER TABLE public.subscription_checkout_links
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_subscription_checkout_links_user_id
ON public.subscription_checkout_links(user_id);

-- Atualizar política de segurança para incluir user_id
DROP POLICY IF EXISTS "Edge functions can manage checkout links" ON public.subscription_checkout_links;

CREATE POLICY "Service role can manage checkout links"
ON public.subscription_checkout_links
FOR ALL
TO service_role
USING (true);

CREATE POLICY "Users can view their own checkout links"
ON public.subscription_checkout_links
FOR SELECT
TO authenticated
USING (user_id = auth.uid() AND expires_at > now() AND is_used = false);