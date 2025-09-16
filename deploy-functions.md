# Deploy das Edge Functions

## Método 1: Via Interface do Supabase (Recomendado)

1. Acesse: https://supabase.com/dashboard/project/yhxoihyjtcgulnfipqej
2. Vá em "Edge Functions" no menu lateral
3. Clique em "Create a new function"

### Função 1: create-unit-with-user

**Nome:** `create-unit-with-user`
**Código:** Copie todo o conteúdo de `supabase/functions/create-unit-with-user/index.ts`

### Função 2: update-user-password

**Nome:** `update-user-password`
**Código:** Copie todo o conteúdo de `supabase/functions/update-user-password/index.ts`

### Função 3: accept-franchise-invite (SQL)

Execute no Editor SQL do Supabase:

```sql
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

GRANT EXECUTE ON FUNCTION public.accept_franchise_invite(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_franchise_invite(TEXT, UUID) TO anon;
```

## Método 2: Via CLI (se Docker funcionar)

```bash
# Atualizar CLI primeiro
npm install -g @supabase/supabase-cli@latest

# Deploy das funções
supabase functions deploy create-unit-with-user
supabase functions deploy update-user-password
```

## Status Atual

✅ **Sistema funcionando** com solução temporária (sem Edge Functions)
⏳ **Edge Functions opcionais** - para otimização

**O que funciona agora:**
- Matriz pode criar unidades
- Convites são enviados por email
- Usuários podem aceitar convites e criar contas
- Unidades são vinculadas aos usuários corretos

**O que as Edge Functions vão melhorar:**
- Criação automática de usuário no momento da criação da unidade
- Atualização de senha mais suave
- Processo mais robusto e atomico