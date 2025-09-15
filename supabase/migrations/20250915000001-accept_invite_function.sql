-- Create function to accept invites safely
-- This bypasses RLS since it uses SECURITY DEFINER

CREATE OR REPLACE FUNCTION public.accept_franchise_invite(
  invitation_token TEXT,
  accepting_user_id UUID
)
RETURNS JSON
LANGUAGE SQL
SECURITY DEFINER
AS $$
  WITH updated_invite AS (
    UPDATE public.convites_franqueados
    SET
      aceito = true,
      user_id_aceito = accepting_user_id,
      updated_at = NOW()
    WHERE token = invitation_token
      AND expires_at > NOW()
      AND aceito = false
    RETURNING id, unidade_id, email
  ),
  updated_unit AS (
    UPDATE public.unidades
    SET user_id = accepting_user_id
    FROM updated_invite
    WHERE unidades.id = updated_invite.unidade_id
    RETURNING unidades.id as unit_id, unidades.nome as unit_name
  )
  SELECT json_build_object(
    'success', CASE WHEN EXISTS(SELECT 1 FROM updated_invite) THEN true ELSE false END,
    'invite_id', (SELECT id FROM updated_invite),
    'unidade_id', (SELECT unidade_id FROM updated_invite),
    'unit_name', (SELECT unit_name FROM updated_unit),
    'email', (SELECT email FROM updated_invite)
  ) as result;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.accept_franchise_invite(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_franchise_invite(TEXT, UUID) TO anon;