# 🔍 COMO DESCOBRIR OS IDs REAIS DOS PLANOS DA VINDI

## ⚡ **PASSO 1: Descobrir IDs dos Planos**

### **Opção A: Via API Vindi (Recomendado)**
```bash
# Execute no terminal ou Postman:
curl -X GET "https://app.vindi.com.br/api/v1/plans" \
  -H "Authorization: Basic SUA_API_KEY_AQUI" \
  -H "Content-Type: application/json"
```

### **Opção B: Painel Vindi**
1. **Acesse:** https://app.vindi.com.br
2. **Login** na sua conta
3. **Vá para:** Planos/Produtos > Planos
4. **Clique** em cada plano para ver o **ID** na URL

### **Opção C: Via Supabase Edge Function (Mais Fácil)**
Crie uma função temporária para listar os planos:

```typescript
// Execute no Supabase SQL Editor:
SELECT 'Teste de conexão Vindi - Execute esta query primeiro' as info;

-- Depois, vou criar uma Edge Function para descobrir os planos
```

---

## ⚙️ **PASSO 2: Atualizar Script com IDs Reais**

Após descobrir os IDs, **substitua** no arquivo `FIX_VINDI_FLOW_COMPLETE.sql`:

```sql
-- LINHA 87-89: SUBSTITUA pelos seus IDs reais:
('4e11e7cb-51f5-4034-a46c-ebdb7b5679cd', 'SEU_PLANO_1', 'Descrição', 99.90, SEU_ID_REAL_1, 'SEU_PRODUCT_ID_1', true),
('8f22a8dc-62g6-5145-b57d-fcec8c6780de', 'SEU_PLANO_2', 'Descrição', 199.90, SEU_ID_REAL_2, 'SEU_PRODUCT_ID_2', true),
('1a33b9ed-73h7-6256-c68e-0dfd9d7891ef', 'SEU_PLANO_3', 'Descrição', 299.90, SEU_ID_REAL_3, 'SEU_PRODUCT_ID_3', true)
```

---

## 📋 **EXEMPLO DA RESPOSTA DA API:**

```json
{
  "plans": [
    {
      "id": 539682,
      "name": "Plano Individual Mensal",
      "product": {
        "id": 482736,
        "name": "CotaFácil Individual"
      },
      "price": 99.90,
      "status": "active"
    }
  ]
}
```

**No exemplo acima:**
- ✅ `vindi_plan_id`: **539682** 
- ✅ `vindi_product_id`: **"482736"**

---

## 🚀 **PASSO 3: Executar Script Corrigido**

1. **Substitua** os IDs no `FIX_VINDI_FLOW_COMPLETE.sql`
2. **Execute** no Supabase Dashboard > SQL Editor
3. **Teste** o fluxo de adesão

---

## 🧪 **PASSO 4: Testar Fluxo Completo**

### **4.1 No Painel Unidade:**
1. Acesse `/unidade/adesao`
2. Deve aparecer "Diego Beu Correia" na tabela
3. Clique no botão 🔗 "Gerar Link Vindi"
4. **Deve funcionar** sem erro "plano não encontrado"

### **4.2 Verificar Logs:**
```
✅ [QUICK-LINK] Beneficiário encontrado: Diego Beu Correia
✅ [QUICK-LINK] Plan details: {planId: "xxx", planName: "Plano Individual", vindi_plan_id: 539682}
✅ [QUICK-LINK] Link gerado com sucesso!
```

---

## 🔧 **PRÓXIMO: Fluxo Vindi Correto**

Depois de corrigir os IDs, implementarei o fluxo exato da documentação que você forneceu:

1. **Consultar/Criar Cliente** (GET/POST `/customers`)
2. **Criar Assinatura** (POST `/subscriptions`) 
3. **Processar Pagamento** (PIX/Cartão/Boleto)
4. **Webhooks** (`subscription_created`, `bill_created`, `bill_paid`)

---

**🎯 PRÓXIMA AÇÃO:** Descubra os IDs reais dos seus planos na Vindi e me informe para eu atualizar o script!
