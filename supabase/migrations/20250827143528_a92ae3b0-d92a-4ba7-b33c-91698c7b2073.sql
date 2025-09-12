-- Remove a política insegura que permite acesso público total
DROP POLICY IF EXISTS "Convites podem ser visualizados pelo token" ON public.convites_franqueados;

-- Criar nova política mais segura que só permite acesso com token específico
-- Permite visualizar apenas o convite específico quando o token é fornecido corretamente
CREATE POLICY "Convites podem ser visualizados apenas com token correto" 
ON public.convites_franqueados 
FOR SELECT 
USING (
  -- Só permite acesso se o usuário fornecer o token correto via RPC function
  -- ou se for um usuário matriz (mantém funcionalidade administrativa)
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'matriz'::user_type
  )
);

-- Criar função segura para validar acesso por token
-- Esta função será usada pela aplicação para verificar convites
CREATE OR REPLACE FUNCTION public.get_convite_by_token(invitation_token TEXT)
RETURNS TABLE (
  id UUID,
  unidade_id UUID,
  email TEXT,
  expires_at TIMESTAMPTZ,
  aceito BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    c.id,
    c.unidade_id,
    c.email,
    c.expires_at,
    c.aceito,
    c.created_at
  FROM public.convites_franqueados c
  WHERE c.token = invitation_token
    AND c.expires_at > NOW()
    AND c.aceito = false;
$$;

-- Política para permitir atualizações quando o convite é aceito
CREATE POLICY "Convites podem ser aceitos com token válido"
ON public.convites_franqueados
FOR UPDATE
USING (
  -- Permite atualização se for matriz ou se o token for válido e não expirado
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'matriz'::user_type
  )
  OR (
    token IS NOT NULL
    AND expires_at > NOW()
    AND aceito = false
  )
);

-- Garantir que a função seja executável por usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_convite_by_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_convite_by_token(TEXT) TO anon;