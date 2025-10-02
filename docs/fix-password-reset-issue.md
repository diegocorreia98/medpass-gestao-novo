# Fix: Email de Reset de Senha não Chega

## Problema Reportado

**Usuário:** orneilucio.ctf@gmail.com
**Issue:** Email de redefinição de senha não chega na caixa de entrada

## Diagnóstico

### Log da Edge Function
```
User exists: false
```

### Análise

A Edge Function [`send-password-reset`](../supabase/functions/send-password-reset/index.ts) estava verificando se o usuário existe através de `supabase.auth.admin.listUsers()` e, quando o usuário não era encontrado nessa lista, retornava sucesso **sem enviar o email** (por questões de segurança - para não vazar informação sobre quais emails existem no sistema).

### Causa Raiz

Existem dois cenários possíveis:

1. **Usuário realmente não existe no sistema de autenticação**
   - Email pode ter sido adicionado apenas em tabelas de convites ou unidades
   - Usuário nunca completou processo de cadastro

2. **Limitação da API `listUsers()`**
   - A API pode não retornar todos os usuários em sistemas grandes
   - Pode haver problemas de paginação ou filtros
   - O usuário existe mas não aparece na lista retornada

## Solução Implementada

### Mudança no Código

**Arquivo:** [`supabase/functions/send-password-reset/index.ts`](../supabase/functions/send-password-reset/index.ts)

**Antes:**
```typescript
if (!userExists) {
  console.log(`User not found for email, but returning success for security`);
  // Return success even if user doesn't exist for security reasons
  return new Response(
    JSON.stringify({
      success: true,
      message: "Email de recuperação enviado com sucesso"
    }),
    { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}
```

**Depois:**
```typescript
if (!userExists) {
  console.log(`User not found for email`);
  console.log(`Attempting to send password reset anyway via Supabase`);

  // Try to send password reset anyway - Supabase will handle if user exists
  try {
    const baseUrl = redirectOrigin || 'https://www.medpassbeneficios.com.br';
    const redirectUrl = `${baseUrl}/auth/reset-password`;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });

    if (resetError) {
      console.error(`Supabase resetPasswordForEmail failed:`, resetError);
    } else {
      console.log(`Password reset email sent via Supabase built-in`);
    }
  } catch (fallbackError) {
    console.error(`Failed to send via Supabase fallback:`, fallbackError);
  }

  // Always return success for security
  return new Response(
    JSON.stringify({
      success: true,
      message: "Email de recuperação enviado com sucesso"
    }),
    { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}
```

### Benefícios da Solução

1. **Tenta enviar email mesmo quando `listUsers()` não encontra o usuário**
   - O método `resetPasswordForEmail()` do Supabase faz sua própria verificação
   - Se o usuário existir, o email é enviado
   - Se não existir, Supabase simplesmente não envia (sem erro)

2. **Mantém segurança**
   - Sempre retorna sucesso para não vazar informação sobre usuários existentes
   - Atacantes não conseguem enumerar emails válidos

3. **Logs aprimorados**
   - Agora logamos o total de usuários no sistema
   - Logs mais detalhados para debug

4. **Fallback robusto**
   - Mesmo que a verificação `listUsers()` falhe, tentamos enviar
   - Dupla camada de proteção

## Deploy

A função foi atualizada e feito deploy:

```bash
npx supabase functions deploy send-password-reset
```

**Status:** ✅ Deployed

## Testes Necessários

Para validar a correção:

1. **Teste com usuário existente:**
   - Ir para `/auth/forgot-password`
   - Inserir email de usuário existente
   - Verificar se email chega

2. **Teste com usuário não existente:**
   - Usar email que não existe
   - Verificar que não dá erro
   - Confirmar que nenhum email é enviado (comportamento esperado)

3. **Verificar logs:**
   - Acessar Supabase Dashboard → Functions → send-password-reset → Logs
   - Procurar por mensagens de sucesso/erro

## Próximos Passos para o Usuário orneilucio.ctf@gmail.com

1. **Verificar se usuário existe:**
   - Acessar Supabase Dashboard → Authentication → Users
   - Buscar por `orneilucio.ctf@gmail.com`

2. **Se usuário NÃO existe:**
   - Usuário precisa primeiro criar conta ou aceitar convite
   - Se tem convite pendente, reenviar convite
   - Se não tem convite, criar novo

3. **Se usuário EXISTE:**
   - Agora com a correção, tentar novamente "Esqueci minha senha"
   - Email deve chegar via sistema nativo do Supabase

## Configurações de Email do Supabase

O sistema usa duas formas de enviar email:

### 1. Via Resend (Preferencial)
- Usado quando `RESEND_API_KEY` está configurada
- Emails customizados com template MedPass
- De: `marketing@medpassbeneficios.com.br`

### 2. Via Supabase Nativo (Fallback)
- Usado quando Resend falha ou usuário não existe em listUsers
- Templates padrão do Supabase
- Configurável em: Dashboard → Authentication → Email Templates

### Checklist de Configuração

- [x] RESEND_API_KEY configurada
- [ ] Domínio verificado no Resend (`medpassbeneficios.com.br`)
- [ ] Templates de email configurados no Supabase
- [ ] SMTP settings corretos no Supabase

## Referências

- [Supabase Auth - Reset Password](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail)
- [Resend Documentation](https://resend.com/docs)
- [Sistema de Emails - Docs](./sistema-emails-convite.md)
