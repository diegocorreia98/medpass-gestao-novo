# 🔧 CORREÇÃO: Inconsistência de Chaves Vindi

## 🚨 **PROBLEMA IDENTIFICADO**

Há **inconsistência** entre as variáveis de ambiente:

- **`.env`** tem: `VINDI_PRIVATE_KEY="0A444k1cB0mUzJiTgze5DC_M8tyCx376P4tfl5uzuNM"`
- **Edge Functions** procuram: `VINDI_API_KEY`

## ✅ **SOLUÇÃO RÁPIDA**

### **OPÇÃO 1: Atualizar .env (Recomendada)**

Adicione no `.env`:
```env
# Corrigir inconsistência de chaves Vindi
VINDI_API_KEY="0A444k1cB0mUzJiTgze5DC_M8tyCx376P4tfl5uzuNM"
```

### **OPÇÃO 2: Configurar no Supabase Dashboard**

1. **Acesse**: Supabase Dashboard > Settings > Environment Variables
2. **Adicione**:
   - **Nome**: `VINDI_API_KEY`
   - **Valor**: `0A444k1cB0mUzJiTgze5DC_M8tyCx376P4tfl5uzuNM`
3. **Salve** e faça redeploy das functions

## 🔍 **FUNÇÕES AFETADAS**

Estas Edge Functions estão falhando por falta da `VINDI_API_KEY`:

- ✅ **generate-payment-link** (já corrigida)
- ❌ **discover-vindi-plans**
- ❌ **process-vindi-subscription**
- ❌ **process-subscription-payment**
- ❌ **transparent-checkout-payment**
- ❌ **test-vindi-connection**
- ❌ **process-vindi-payment**
- ❌ **refresh-payment-statuses**
- ❌ **notify-external-api**

## 🚀 **TESTE APÓS CORREÇÃO**

1. **Adicione** `VINDI_API_KEY` no `.env`
2. **Recarregue** a página `/unidade/adesao`
3. **Clique** no botão 🔗 do Diego Beu Correia
4. **Deve funcionar** agora! ✅

## 📋 **PARA CONFIRMAR**

Execute no Supabase SQL Editor:
```sql
SELECT 'DADOS CORRETOS:' as status;
SELECT
  b.nome,
  b.cpf,
  p.nome as plano_nome,
  p.vindi_plan_id
FROM public.beneficiarios b
JOIN public.planos p ON b.plano_id = p.id
WHERE b.cpf = '08600756995';
```

**Resultado esperado**: Diego com vindi_plan_id = 539682

---

**🎯 Adicione `VINDI_API_KEY` no `.env` e teste novamente!**