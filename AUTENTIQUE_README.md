# 📝 Integração Autentique - Quick Start

## ✅ O que foi implementado?

Sistema completo de **assinatura digital de contratos** integrado ao fluxo de adesão, usando a API do Autentique.

## 🎯 Fluxo Resumido

```
Formulário → Assinar Contrato (modal) → Gerar Link de Pagamento → Cliente Paga
```

## 🚀 Deploy Rápido (3 passos)

### 1️⃣ Executar Migration

```bash
npx supabase db push
```

### 2️⃣ Deploy das Functions

```bash
npx supabase functions deploy create-autentique-contract
npx supabase functions deploy autentique-webhook
```

### 3️⃣ Configurar Webhook no Autentique

- URL: `https://SEU_PROJETO.supabase.co/functions/v1/autentique-webhook`
- Eventos: `document.finished`, `signature.accepted`, `signature.rejected`

## 📁 Arquivos Criados

```
supabase/
  ├── migrations/20250118000000_add_autentique_support.sql
  └── functions/
      ├── create-autentique-contract/index.ts
      └── autentique-webhook/index.ts

src/components/adesao/
  ├── ContractSignatureModal.tsx (NOVO)
  └── AdesaoModal.tsx (MODIFICADO)

docs/
  ├── autentique-setup.md
  └── autentique-implementation-summary.md
```

## 🔑 Variável de Ambiente

Já configurada no `.env`:

```bash
AUTENTIQUE_API_KEY="526db718c8f2bbe20b8960e4cf6e34f6c2d4156bcf9055fc5c198f3074a61951"
```

**⚠️ Configure também no Supabase Dashboard:**
- Settings → Edge Functions → Environment Variables
- Adicione: `AUTENTIQUE_API_KEY` com o valor acima

## 🎨 Como Funciona

1. **Usuário preenche adesão** → Sistema salva beneficiário
2. **Modal abre automaticamente** → Contrato é gerado com dados do cliente
3. **Cliente assina no iframe** → Autentique processa assinatura
4. **Webhook notifica sistema** → Status muda para "signed"
5. **Link de pagamento gerado** → Cliente pode pagar

## 🧪 Testar

1. Ir em **Adesões** → **Nova Adesão**
2. Preencher dados completos
3. Clicar em **"Processar Adesão"**
4. Modal deve abrir com o contrato
5. Assinar e verificar se link de pagamento é gerado

## 📊 Ver Contratos no Banco

```sql
SELECT nome, contract_status, contract_signed_at 
FROM beneficiarios 
WHERE contract_status IS NOT NULL
ORDER BY created_at DESC;
```

## 🐛 Debug

Ver logs das functions:
- Dashboard Supabase → Edge Functions → Logs
- Filtrar por: `create-autentique-contract` ou `autentique-webhook`

## 📖 Documentação Completa

- `docs/autentique-setup.md` - Guia detalhado de configuração
- `docs/autentique-implementation-summary.md` - Resumo da implementação

## ✨ Recursos

- ✅ Contrato preenchido automaticamente
- ✅ Modal inline (sem sair da página)
- ✅ Assinatura digital válida juridicamente
- ✅ Webhook para notificações em tempo real
- ✅ Geração automática de link de pagamento
- ✅ Logs completos para auditoria

## 🔒 Segurança

- API Key em variável de ambiente
- Validações em todas as etapas
- Iframe com sandbox configurado
- Assinatura certificada por Autentique

## ⚡ Status

**✅ PRONTO PARA USO** - Todos os componentes implementados e testados.

---

**Dúvidas?** Consulte a documentação completa em `docs/`

