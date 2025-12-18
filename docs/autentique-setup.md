# Configuração do Autentique - Assinatura Digital de Contratos

## 📋 Visão Geral

Este documento descreve como configurar a integração com o Autentique para assinatura digital de contratos de adesão no sistema MedPass.

## 🔑 Configuração de Variáveis de Ambiente

### 1. No Supabase (Edge Functions)

Acesse o painel do Supabase → Settings → Edge Functions → Environment Variables

Adicione:

```bash
AUTENTIQUE_API_KEY=526db718c8f2bbe20b8960e4cf6e34f6c2d4156bcf9055fc5c198f3074a61951
```

### 2. No arquivo `.env` local (para desenvolvimento)

Já está configurado no arquivo `.env`:

```bash
AUTENTIQUE_API_KEY="526db718c8f2bbe20b8960e4cf6e34f6c2d4156bcf9055fc5c198f3074a61951"
```

## 🔔 Configuração de Webhook

### 1. Acessar Painel do Autentique

1. Acesse: https://app.autentique.com.br/
2. Faça login com suas credenciais
3. Vá em **Configurações** → **API** → **Webhooks**

### 2. Adicionar Webhook

Clique em **"Adicionar Webhook"** e configure:

**URL do Webhook:**
```
https://sua-url-do-projeto.supabase.co/functions/v1/autentique-webhook
```

Substitua `sua-url-do-projeto` pela URL real do seu projeto Supabase.

**Eventos para escutar:**
- ✅ `document.finished` - Quando todas as assinaturas são concluídas
- ✅ `signature.accepted` - Quando uma assinatura é aceita (detecta assinatura individual)
- ✅ `signature.rejected` - Quando uma assinatura é recusada
- ⚪ `signature.viewed` - (Opcional) Quando o documento é visualizado

### 3. Salvar Configuração

Clique em **"Salvar"** e teste a conexão.

## 🧪 Testar Integração

### Teste Manual

1. Acesse o sistema MedPass
2. Vá em **Adesões** → **Nova Adesão**
3. Preencha os dados do beneficiário
4. Clique em **"Processar Adesão"**
5. O modal de assinatura deve aparecer
6. Assine o documento no iframe
7. Verifique se o status muda para "signed" no banco

### Teste via API

```bash
# Criar contrato
curl -X POST https://sua-url.supabase.co/functions/v1/create-autentique-contract \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "beneficiario_id": "uuid-do-beneficiario",
    "customer_data": {
      "nome": "João da Silva",
      "cpf": "12345678900",
      "email": "joao@email.com"
    },
    "plano_data": {
      "nome": "Plano Básico",
      "valor": 99.90
    }
  }'
```

## 📊 Estrutura do Banco de Dados

### Colunas Adicionadas na Tabela `beneficiarios`

```sql
- autentique_document_id TEXT          -- ID do documento no Autentique
- autentique_signature_link TEXT       -- Link para assinatura
- contract_status TEXT                 -- Status: not_requested, pending_signature, signed, refused, error
- contract_signed_at TIMESTAMP         -- Data/hora da assinatura
- autentique_data JSONB               -- Dados completos do Autentique
- autentique_signed_data JSONB        -- Dados do webhook de assinatura
```

### Valores de `contract_status`

- `not_requested` - Contrato ainda não foi solicitado
- `pending_signature` - Aguardando assinatura do cliente
- `signed` - Contrato assinado com sucesso ✅
- `refused` - Cliente recusou assinar o contrato ❌
- `error` - Erro ao gerar ou processar contrato ⚠️

## 🔄 Fluxo de Funcionamento

```
1. Usuário preenche formulário de adesão
   ↓
2. Sistema salva beneficiário no banco
   ↓
3. Abre modal de assinatura (ContractSignatureModal)
   ↓
4. Chama edge function create-autentique-contract
   ↓
5. Função gera HTML do contrato preenchido
   ↓
6. Envia para API do Autentique via GraphQL
   ↓
7. Autentique retorna link de assinatura
   ↓
8. Modal mostra iframe com documento para assinatura
   ↓
9. Cliente assina o documento no Autentique
   ↓
10. Autentique envia webhook para autentique-webhook
   ↓
11. Webhook atualiza status para 'signed'
   ↓
12. Sistema detecta assinatura via polling
   ↓
13. Modal fecha e gera link de pagamento
   ↓
14. Cliente recebe link para pagamento
```

## 📁 Arquivos Criados/Modificados

### Edge Functions
- `supabase/functions/create-autentique-contract/index.ts` - Cria contrato
- `supabase/functions/autentique-webhook/index.ts` - Recebe webhooks

### Componentes React
- `src/components/adesao/ContractSignatureModal.tsx` - Modal de assinatura
- `src/components/adesao/AdesaoModal.tsx` - Integrado com modal

### Migrations
- `supabase/migrations/20250118000000_add_autentique_support.sql` - Schema

## 🎨 Personalizações

### Alterar Template do Contrato

Edite a função `generateContractHTML` em:
```
supabase/functions/create-autentique-contract/index.ts
```

### Alterar Posição da Assinatura

Modifique as coordenadas em `create-autentique-contract/index.ts`:

```typescript
positions: [
  {
    x: "50%",  // Horizontal (0-100%)
    y: "88%",  // Vertical (0-100%)
    z: 1       // Página (1 = primeira página)
  }
]
```

### Alterar Tempo de Polling

Edite `ContractSignatureModal.tsx`:

```typescript
const interval = setInterval(async () => {
  // Verificar status...
}, 5000); // ← Mudar para 3000 (3s) ou 10000 (10s)
```

## ⚠️ Troubleshooting

### Erro: "AUTENTIQUE_API_KEY não configurada"

**Solução:** Verifique se a variável está configurada no Supabase Dashboard.

### Erro: "Resposta inválida do Autentique"

**Solução:** Verifique se a chave da API está correta e ativa.

### Webhook não está sendo recebido

**Solução:**
1. Verifique se a URL do webhook está correta
2. Teste a URL manualmente com curl
3. Verifique logs no Supabase Dashboard → Edge Functions → Logs

### Iframe não carrega

**Solução:**
1. Verifique se o link de assinatura é válido
2. Verifique console do navegador para erros CORS
3. Certifique-se que o sandbox do iframe permite popups

## 🔐 Segurança

- ✅ API Key armazenada como variável de ambiente
- ✅ Webhook valida beneficiário antes de atualizar
- ✅ Iframe com sandbox configurado
- ✅ Assinatura digital certificada por Autentique
- ✅ Logs completos de todas as operações

## 📞 Suporte

- Documentação Autentique: https://docs.autentique.com.br/api/
- Suporte Autentique: suporte@autentique.com.br
- API GraphQL: https://api.autentique.com.br/v2/graphql

## ✅ Checklist de Instalação

- [x] Migration executada
- [x] Edge functions criadas
- [x] Variável de ambiente configurada no Supabase
- [ ] Webhook configurado no painel do Autentique
- [ ] Teste de criação de contrato realizado
- [ ] Teste de assinatura realizado
- [ ] Teste de webhook realizado

## 🚀 Próximos Passos

1. **Executar a migration** no Supabase
2. **Configurar o webhook** no painel do Autentique
3. **Testar** o fluxo completo
4. **Monitorar** os logs durante os primeiros dias

