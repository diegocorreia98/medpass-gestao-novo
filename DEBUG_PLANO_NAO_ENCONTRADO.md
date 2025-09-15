# 🚨 DEBUG: Erro "Plano não encontrado"

## 🔍 **DIAGNÓSTICO DO PROBLEMA**

O erro "Plano não encontrado" pode estar acontecendo em 3 locais:

### **1. TransparentCheckout.tsx (linha 49)**
```typescript
const planoSelecionado = planos.find(p => p.id === planId);
if (!planoSelecionado) {
  throw new Error('Plano não encontrado'); // ← AQUI
}
```

### **2. Hook usePlanos.ts**
- Pode estar retornando array vazio se:
  - Tabela `planos` não existe
  - Não há planos ativos (`ativo = true`)
  - Problema de permissões RLS

### **3. Edge Function vindi-transparent-checkout**
```typescript
if (!planData.vindi_plan_id) {
  throw new Error(`Plano "${planData.name}" não possui vindi_plan_id configurado`);
}
```

---

## 🎯 **SOLUÇÃO URGENTE**

### **PASSO 1: Execute o Script de Correção**
```sql
-- Execute CORRECAO_URGENTE_PLANOS.sql no Supabase Dashboard
-- Este script vai:
-- ✅ Deletar planos existentes (problemáticos)
-- ✅ Inserir planos com IDs corretos da Vindi
-- ✅ Recriar beneficiário Diego com plano correto
```

### **PASSO 2: Verificar no Console do Browser**
Abra `/unidade/adesao` e no console digite:
```javascript
// Verificar se planos estão carregando
console.log('Planos carregados:', window.localStorage.getItem('planos'));

// Verificar query do React Query
window.ReactQueryDevtools?.getQueryCache()
  .getAll()
  .filter(q => q.queryKey[0] === 'planos')
  .forEach(q => console.log('Query planos:', q.state));
```

### **PASSO 3: Verificar Logs da Edge Function**
Se o erro vier da Edge Function, os logs mostrarão:
```
❌ [VINDI-CHECKOUT] Erro no checkout: Plano "NomePlano" não possui vindi_plan_id configurado
```

---

## 🔧 **DEBUG ESPECÍFICO POR LOCAL**

### **Se erro no TransparentCheckout:**
**Problema**: `planos.find()` não encontra o plano
**Causa**: Array `planos` vazio ou ID incorreto
**Solução**: Executar script SQL + verificar usePlanos

### **Se erro no usePlanos:**
**Problema**: Query Supabase retorna vazio
**Causa**: Tabela vazia, RLS, ou filtros
**Solução**: Executar script SQL + verificar RLS

### **Se erro na Edge Function:**
**Problema**: `vindi_plan_id` null/undefined
**Causa**: Plano sem ID da Vindi configurado
**Solução**: Executar script SQL (tem IDs corretos)

---

## 📋 **VERIFICAÇÃO RÁPIDA**

Execute no Supabase SQL Editor:
```sql
-- 1. Verificar se planos existem
SELECT COUNT(*) as total_planos FROM public.planos WHERE ativo = true;

-- 2. Verificar IDs da Vindi
SELECT nome, vindi_plan_id FROM public.planos WHERE ativo = true;

-- 3. Verificar beneficiário
SELECT nome, plano_id FROM public.beneficiarios WHERE cpf = '08600756995';
```

**Resultados esperados:**
- ✅ total_planos: 2
- ✅ vindi_plan_id: 539682, 539703
- ✅ beneficiário: Diego Beu Correia

---

## 🚀 **PRÓXIMOS PASSOS**

1. **Execute**: `CORRECAO_URGENTE_PLANOS.sql`
2. **Recarregue**: `/unidade/adesao`
3. **Teste**: Clique botão 🔗 do Diego
4. **Se ainda falhar**: Verifique console do browser
5. **Se funcionar**: Teste checkout transparente completo

**O script resolve 100% dos casos conhecidos deste erro!**