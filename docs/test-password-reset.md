# Teste Manual: Reset de Senha para orneilucio.ctf@gmail.com

## Comando de Teste

Você pode testar a função manualmente via terminal ou Postman:

### Via cURL

```bash
curl -X POST \
  'https://yhxoihyjtcgulnfipqej.supabase.co/functions/v1/send-password-reset' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4eG9paHlqdGNndWxuZmlwcWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0OTk1OTUsImV4cCI6MjA1MTA3NTU5NX0.1Kg-VWYMmsjTIpLbL2n7bYt5S87TQPV4wELp4PNaYLU' \
  -d '{
    "email": "orneilucio.ctf@gmail.com",
    "redirectOrigin": "https://www.medpassbeneficios.com.br"
  }'
```

### Via JavaScript Console (Browser)

```javascript
fetch('https://yhxoihyjtcgulnfipqej.supabase.co/functions/v1/send-password-reset', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4eG9paHlqdGNndWxuZmlwcWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0OTk1OTUsImV4cCI6MjA1MTA3NTU5NX0.1Kg-VWYMmsjTIpLbL2n7bYt5S87TQPV4wELp4PNaYLU'
  },
  body: JSON.stringify({
    email: 'orneilucio.ctf@gmail.com',
    redirectOrigin: 'https://www.medpassbeneficios.com.br'
  })
})
.then(r => r.json())
.then(console.log)
```

## Verificar Logs

Após executar o teste, verifique os logs da Edge Function:

1. Acesse: [Supabase Dashboard - Functions](https://supabase.com/dashboard/project/yhxoihyjtcgulnfipqej/functions)
2. Clique em `send-password-reset`
3. Vá para aba "Logs"
4. Procure pelo requestId mais recente

### O que esperar nos logs:

```
[abc12345] === PASSWORD RESET REQUEST START ===
[abc12345] Password reset request received for email: [HIDDEN]
[abc12345] RESEND_API_KEY is configured
[abc12345] Checking if user exists...
[abc12345] User exists: false  // <-- Isto vai aparecer devido ao bug do listUsers
[abc12345] User not found for email
[abc12345] Attempting to send password reset anyway via Supabase (user might exist but not in list)
[abc12345] Password reset email sent via Supabase built-in (user may exist)  // <-- SUCESSO!
[abc12345] === PASSWORD RESET REQUEST END (SUCCESS) ===
```

## Alternativa: Enviar via Interface

Ou simplesmente peça ao usuário para:

1. Ir em: https://www.medpassbeneficios.com.br/auth/forgot-password
2. Inserir: orneilucio.ctf@gmail.com
3. Clicar em "Enviar Link de Recuperação"

## Verificar Email no Gmail

O email deve chegar de uma dessas formas:

### Se via Resend (Template Customizado):
- **De:** MedPass Benefícios <marketing@medpassbeneficios.com.br>
- **Assunto:** Redefinir sua senha - MedPass Benefícios
- **Aparência:** Template azul com logo MedPass

### Se via Supabase Nativo (Fallback):
- **De:** noreply@mail.supabase.io (ou domínio configurado)
- **Assunto:** Reset Password (ou tradução configurada)
- **Aparência:** Template padrão Supabase

## Se ainda não chegar

1. **Verificar Spam/Lixo Eletrônico**
2. **Verificar configurações SMTP do Supabase:**
   - Dashboard → Settings → Auth
   - Verificar se SMTP está ativo
3. **Verificar domínio no Resend:**
   - Acessar [Resend Dashboard](https://resend.com/domains)
   - Verificar se `medpassbeneficios.com.br` está verificado
4. **Verificar rate limits:**
   - Supabase Auth tem rate limit de emails
   - Aguardar alguns minutos entre tentativas
