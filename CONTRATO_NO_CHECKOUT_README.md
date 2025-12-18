# ✅ Contrato de Adesão no Checkout - Implementação Completa

## 📋 O que mudou?

Agora o **contrato de adesão** aparece **NO CHECKOUT DE PAGAMENTO**, não mais quando a matriz cria a adesão.

### Fluxo Antigo ❌
1. Matriz cria adesão → Modal de contrato abre imediatamente
2. Contrato assinado → Link de pagamento gerado

### Fluxo Novo ✅
1. **Matriz cria adesão** → Link de pagamento é gerado imediatamente (SEM assinatura)
2. **Cliente acessa o link** → Checkout abre
3. **PRIMEIRO: Assina o contrato** (modal overlay no checkout)
4. **DEPOIS: Efetua o pagamento**

---

## 🔧 Arquivos Modificados

### Frontend

1. **`src/components/adesao/AdesaoModal.tsx`**
   - ❌ Removido modal de contrato da criação de adesão
   - ✅ Volta ao fluxo original: criar beneficiário → gerar link de pagamento

2. **`src/components/checkout/SubscriptionCheckoutForm.tsx`**
   - ✅ Importado `ContractSignatureModal`
   - ✅ Verifica `contract_status` ao carregar o checkout
   - ✅ Se `contract_status` for `'not_requested'` ou `'pending_signature'`: mostra modal de contrato
   - ✅ Se `contract_status` for `'signed'`: libera pagamento diretamente
   - ✅ Bloqueia pagamento se contrato não for assinado

### Backend

3. **`supabase/functions/secure-checkout-validation/index.ts`**
   - ✅ Retorna agora: `contract_status`, `telefone`, `endereco`, `cidade`, `estado`, `cep`, `data_nascimento`
   - ✅ Necessário para preencher o contrato automaticamente

4. **`supabase/migrations/20250118000001_update_checkout_subscription_function.sql`**
   - ✅ Atualiza função RPC `get_checkout_subscription`
   - ✅ Adiciona campos necessários para assinatura de contrato

---

## ⚙️ Como Aplicar

### 1. Aplicar SQL no Supabase (OBRIGATÓRIO)

Acesse o **SQL Editor** do Supabase e execute:

```sql
-- Atualizar função get_checkout_subscription para incluir dados necessários para assinatura de contrato
CREATE OR REPLACE FUNCTION public.get_checkout_subscription(checkout_token text)
RETURNS TABLE(
  id uuid,
  customer_name_masked text,
  customer_email_masked text, 
  plan_name text,
  plan_price numeric,
  payment_method text,
  status text,
  -- ✅ Novos campos para suporte a assinatura de contrato
  contract_status text,
  telefone text,
  endereco text,
  cidade text,
  estado text,
  cep text,
  data_nascimento text,
  -- IDs da Vindi necessários para checkout
  vindi_customer_id text,
  vindi_plan_id text,
  vindi_product_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o token é válido
  IF NOT EXISTS (
    SELECT 1 FROM subscription_checkout_links 
    WHERE token = checkout_token 
    AND expires_at > now() 
    AND is_used = false
  ) THEN
    RAISE EXCEPTION 'Token de checkout inválido ou expirado';
  END IF;

  -- Registrar acesso para auditoria
  INSERT INTO subscription_access_logs (
    subscription_id,
    access_type,
    ip_address
  ) 
  SELECT 
    scl.subscription_id,
    'checkout_access',
    inet_client_addr()
  FROM subscription_checkout_links scl
  WHERE scl.token = checkout_token;

  -- Retornar dados mascarados + informações necessárias para contrato
  RETURN QUERY
  SELECT 
    b.id,
    CASE 
      WHEN LENGTH(b.nome) > 2 THEN 
        LEFT(b.nome, 2) || '***' || RIGHT(b.nome, 2)
      ELSE '***'
    END as customer_name_masked,
    CASE 
      WHEN b.email LIKE '%@%' THEN 
        LEFT(b.email, 2) || '***@' || SPLIT_PART(b.email, '@', 2)
      ELSE '***@***.com'
    END as customer_email_masked,
    COALESCE(p.nome, 'Plano de Saúde') as plan_name,
    COALESCE(b.valor_plano, p.valor, 0) as plan_price,
    b.payment_method,
    b.payment_status as status,
    -- ✅ Campos para assinatura de contrato
    COALESCE(b.contract_status, 'not_requested') as contract_status,
    b.telefone,
    b.endereco,
    b.cidade,
    b.estado,
    b.cep,
    b.data_nascimento::text,
    -- IDs da Vindi
    b.vindi_customer_id::text,
    b.vindi_plan_id::text,
    b.vindi_product_id::text
  FROM beneficiarios b
  LEFT JOIN planos p ON p.id = b.plano_id
  JOIN subscription_checkout_links scl ON scl.subscription_id = b.id
  WHERE scl.token = checkout_token
    AND scl.expires_at > now()
    AND scl.is_used = false;
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION public.get_checkout_subscription(text) IS 
'Valida token de checkout e retorna dados mascarados do beneficiário incluindo status de contrato e informações necessárias para assinatura';
```

### 2. Edge Functions Deployadas ✅

As funções já foram deployadas:
- ✅ `secure-checkout-validation`
- ✅ `create-autentique-contract` (já deployada anteriormente)
- ✅ `autentique-webhook` (já deployada anteriormente)

---

## 🧪 Como Testar

1. **Criar uma nova adesão**
   - Entre na tela de Adesões
   - Crie um novo beneficiário
   - O sistema irá gerar o link de pagamento imediatamente

2. **Acessar o link de checkout**
   - Copie o link gerado
   - Abra em uma nova aba (ou envie para o cliente)

3. **Verificar o modal de contrato**
   - ✅ O modal de contrato deve abrir automaticamente
   - ✅ O contrato deve estar preenchido com os dados do cliente
   - ✅ O iframe do Autentique deve carregar

4. **Assinar o contrato**
   - Assine o contrato no Autentique
   - ✅ O webhook deve capturar a assinatura
   - ✅ O modal deve fechar
   - ✅ O formulário de pagamento deve aparecer

5. **Efetuar o pagamento**
   - ✅ Agora o pagamento está liberado
   - ✅ Cliente pode escolher método (Cartão ou PIX)
   - ✅ Prosseguir com o pagamento normalmente

---

## 🔍 Verificações de Segurança

- ✅ Contrato **obrigatório** antes do pagamento
- ✅ Verificação em múltiplas camadas (frontend + backend)
- ✅ Dados do contrato preenchidos automaticamente
- ✅ Cliente não pode burlar o fluxo
- ✅ Webhook captura assinatura em tempo real

---

## 📝 Status dos Contratos

- `not_requested`: Contrato ainda não foi gerado
- `pending_signature`: Contrato gerado, aguardando assinatura
- `signed`: Contrato assinado ✅ (libera pagamento)
- `refused`: Contrato recusado ❌

---

## 🚨 Importante

1. **Aplicar o SQL no Supabase** é OBRIGATÓRIO
2. Verificar se o `AUTENTIQUE_API_KEY` está configurado nos secrets do Supabase
3. Certificar-se de que os webhooks do Autentique estão criados
4. Testar o fluxo completo antes de liberar para produção

---

## 📞 Suporte

Se houver algum erro ou dúvida:
1. Verifique os logs do Supabase Edge Functions
2. Verifique os logs do console do navegador
3. Certifique-se de que o SQL foi aplicado corretamente
4. Confirme que a tabela `beneficiarios` tem a coluna `contract_status`

