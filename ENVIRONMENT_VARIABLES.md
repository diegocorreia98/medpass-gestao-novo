# Variáveis de Ambiente - MedPass Gestão

## ⚠️ **CRÍTICO - Configure estas variáveis em produção**

Baseado na análise do checkout transparente, estas são as variáveis essenciais:

## Supabase
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Vindi API
```bash
# Ambiente (sandbox ou production)
VINDI_ENVIRONMENT=production

# Chaves privadas para API (backend)
VINDI_API_KEY=your-vindi-private-api-key
VINDI_PRIVATE_KEY=your-vindi-private-key

# Chave pública para tokenização (frontend)
VITE_VINDI_PUBLIC_KEY=your-vindi-public-key

# 🔒 CRÍTICO: Secret para validação de webhooks
VINDI_WEBHOOK_SECRET=your-vindi-webhook-secret
```

## RMS/API Externa
```bash
ID_CLIENTE_CONTRATO=your-client-contract-id
ID_CLIENTE=your-client-id
```

## Outras (Opcionais)
```bash
VITE_MAPBOX_ACCESS_TOKEN=your-mapbox-token
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASSWORD=your-password
```

## 🛡️ **Segurança Implementada:**

### 1. **Validação de Webhook** ✅
- Implementada verificação HMAC-SHA256
- Rejeita webhooks sem assinatura válida
- **OBRIGATÓRIO configurar `VINDI_WEBHOOK_SECRET`**

### 2. **Headers de Segurança** ✅  
- HSTS, CSP, X-Content-Type-Options
- X-Frame-Options para prevenir clickjacking

### 3. **Proteção de Secrets** ✅
- .env adicionado ao .gitignore
- Variáveis separadas por ambiente
- Chave pública vs privada segregadas

## 🔧 **Como Configurar:**

### Desenvolvimento:
```bash
VINDI_ENVIRONMENT=sandbox
VINDI_API_KEY=sandbox_key
VINDI_WEBHOOK_SECRET=dev_secret_123
```

### Produção:
```bash
VINDI_ENVIRONMENT=production  
VINDI_API_KEY=production_key
VINDI_WEBHOOK_SECRET=strong_production_secret
```

## ⚠️ **Ações Requeridas:**

1. **Configure `VINDI_WEBHOOK_SECRET` imediatamente**
2. **Rotacione chaves periodicamente**
3. **Use chaves diferentes para cada ambiente**
4. **Monitore logs de webhook para tentativas inválidas**
