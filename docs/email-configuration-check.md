# Checklist: Configuração de Email no Supabase

## Problema Atual

O usuário `orneilucio.ctf@gmail.com` não está recebendo emails porque:

1. ✅ Usuário existe no sistema
2. ❌ `listUsers()` não retorna esse usuário
3. ⚠️ Fallback usa Supabase nativo que pode não estar configurado

## Verificações Necessárias

### 1. Configuração de SMTP do Supabase

**Dashboard → Settings → Auth → SMTP Settings**

Verificar se está usando:
- [ ] **Supabase Built-in** (padrão, mas com limitações)
- [ ] **SMTP Customizado** (Resend, SendGrid, etc.)

**Se usando Built-in:**
- ⚠️ Tem rate limits agressivos
- ⚠️ Pode cair em spam facilmente
- ⚠️ Não recomendado para produção

**Se usando Custom SMTP:**
- [ ] Host configurado
- [ ] Porta configurada (587, 465, 25)
- [ ] Usuário configurado
- [ ] Senha configurada
- [ ] Email remetente configurado

### 2. Template de Email

**Dashboard → Authentication → Email Templates → Reset Password**

Verificar:
- [ ] Template está ativo
- [ ] Texto está em português
- [ ] Link `{{ .ConfirmationURL }}` está presente

### 3. Rate Limits

**Dashboard → Authentication → Rate Limits**

Verificar:
- [ ] Rate limit de emails não foi atingido
- [ ] Não há bloqueio para o email específico

### 4. Email Logs

**Dashboard → Authentication → Logs**

Procurar por:
- Tentativas de envio de email para `orneilucio.ctf@gmail.com`
- Erros de SMTP
- Bounces ou rejeições

## Solução Recomendada: Usar APENAS Resend

Para garantir que TODOS os emails (incluindo casos onde `listUsers()` falha) usem o Resend customizado, precisamos modificar a lógica.

### Opção 1: Forçar uso de Resend mesmo no fallback

Modificar o código para que, mesmo quando usuário não é encontrado em `listUsers()`, ainda tente usar Resend.

### Opção 2: Corrigir o problema do listUsers()

Investigar por que `listUsers()` não retorna esse usuário específico.

## Próximos Passos Imediatos

1. **Verificar configuração SMTP do Supabase**
   - Acessar Dashboard → Settings → Auth
   - Capturar screenshot da configuração

2. **Verificar logs de email**
   - Dashboard → Authentication → Logs
   - Filtrar por "email" ou "recovery"
   - Procurar tentativas para `orneilucio.ctf@gmail.com`

3. **Testar envio manual**
   - Fazer teste via interface
   - Monitorar logs em tempo real

4. **Se Supabase SMTP não estiver configurado:**
   - Configurar usando Resend como provedor SMTP
   - OU modificar código para sempre usar Resend
