# 🚀 FORÇAR REDEPLOY DAS EDGE FUNCTIONS

## 🚨 **PROBLEMA IDENTIFICADO**

As **correções foram aplicadas** no código, mas o **Supabase não atualizou** o deployment!

O erro ainda menciona **linha 200**, mas nossas mudanças alteraram essa linha. Isso confirma que está rodando **versão antiga**.

## ✅ **SOLUÇÕES PARA FORÇAR REDEPLOY**

### **OPÇÃO 1: Via Dashboard Supabase (Mais Fácil)**

1. **Acesse**: [Supabase Dashboard](https://app.supabase.com/project/yhxoihyjtcgulnfipqej)
2. **Vá para**: Functions (menu lateral)
3. **Encontre**: `generate-payment-link`
4. **Clique**: "Redeploy" ou "Deploy"
5. **Aguarde**: Deploy concluir

### **OPÇÃO 2: Via CLI Supabase**

```bash
# Se tiver Supabase CLI instalado:
npx supabase functions deploy generate-payment-link

# Ou redeploy todas:
npx supabase functions deploy
```

### **OPÇÃO 3: Modificação Forçada (Já Aplicada)**

✅ **Adicionei log de versão** na função para forçar mudança:
```typescript
console.log('🔄 [GENERATE-PAYMENT-LINK] Function updated - Version 2.0');
```

Quando redeploy acontecer, você verá este log.

## 🔍 **COMO CONFIRMAR QUE ATUALIZOU**

Após redeploy, teste novamente e verifique no **Supabase Logs**:

**Log Esperado**:
```
🔄 [GENERATE-PAYMENT-LINK] Function updated - Version 2.0
🔍 [DEBUG] Values before subscription creation:
  - vindiPlanId: 539682 (type: number)
  - vindiCustomerId: 12345 (type: number)
  - payment_method: bank_slip (type: string)
```

## 🚨 **SE LOGS NÃO APARECEM**

Significa que ainda está na **versão antiga**. Neste caso:

1. **Force refresh** do dashboard
2. **Tente OPÇÃO 2** (CLI)
3. **Ou me informe** para criar solução alternativa

## 📋 **CORREÇÕES APLICADAS QUE SERÃO ATIVADAS**

1. ✅ **API Key**: `VINDI_PRIVATE_KEY` + `VINDI_API_KEY`
2. ✅ **Payload Format**: Removido `{ subscription: data }`
3. ✅ **Customer Format**: Removido `{ customer: data }`
4. ✅ **Debug Logs**: Valores detalhados
5. ✅ **User Agent**: Adicionado para Vindi

---

**🎯 Force o redeploy via Dashboard e teste novamente!**