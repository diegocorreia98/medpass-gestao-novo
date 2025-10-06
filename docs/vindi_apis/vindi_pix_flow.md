# Documento Técnico – Fluxo Correto de Pagamentos PIX com Vindi e Edge Functions

## 📌 Objetivo

Garantir que, quando o cliente escolher **PIX** como método de pagamento, o sistema gere corretamente:

- O **QR Code** (imagem/SVG/base64);
- O **PIX Copia e Cola** (código EMV).

Tudo isso integrado ao Supabase + Edge Functions, respeitando as boas práticas da API da Vindi.

---

## 🔄 Fluxo de UI (Checkout)

### 1. Escolha do plano

- O usuário escolhe um **plano** listado no front.
- Cada plano já deve estar sincronizado com a Vindi (`vindi_plan_id`, `vindi_product_id`).

### 2. Dados do cliente

- Nome completo
- E-mail
- Documento (CPF/CNPJ, só números)
- Telefone (opcional)
- Endereço (opcional, mas importante para PIX)

### 3. Escolha do método de pagamento

- Opções: **PIX, Boleto, Cartão de Crédito**.
- Se **PIX**, não precisa preencher dados adicionais.

### 4. Confirmação e criação da assinatura

- Front envia para Edge Function responsável (dependendo do fluxo):
  - **checkout transparente** (`transparent-checkout-payment`);
  - **checkout hospedado** (`vindi-hosted-subscription`).

### 5. Exibição dos dados PIX no front

- A Edge Function responde com:
  - `pix_copia_cola` (código EMV completo);
  - `pix_qr_svg` (SVG com QR Code);
  - `pix_qr_code_url` (URL alternativa de fallback);
  - `expires_at` (data/hora de expiração do QR Code).
- UI exibe:
  - QR Code na tela
  - Botão **“Copiar código PIX”**
  - Timer de expiração

---

## 🏗️ Edge Functions corretas a serem usadas

### 1. **create-vindi-customer** ✅

- Cria o cliente na Vindi (com endereço e dados básicos);
- Cria registro local em `subscriptions` com status `pending`;
- Gera token de checkout.

### 2. **discover-vindi-plans** ✅

- Consulta planos reais na Vindi;
- Sincroniza no banco `planos`.

### 3. **process-subscription-payment** ✅ (principal para PIX)

- Valida token de checkout;
- Cria assinatura na Vindi (`POST /subscriptions`);
- Não cria bill manualmente — apenas consulta a bill **já criada automaticamente** pela Vindi;
- Busca nos campos **corretos**:
  - `last_transaction.gateway_response_fields.qrcode_original_path` → **PIX copia e cola**
  - `last_transaction.gateway_response_fields.qrcode_path` → **QR Code (SVG)**
- Responde ao front com dados padronizados PIX.

### 4. **transparent-checkout-payment** ⚠️

- Útil em cenários onde não há fluxo de tokenização/checkout hospedado;
- Necessita ajustes: **não criar bill manualmente** em fluxo PIX, apenas buscar a gerada pela Vindi.

### 5. **vindi-hosted-customer & vindi-hosted-subscription** ⚠️

- Implementam o mesmo fluxo de forma mais próxima da documentação oficial;
- Devem alinhar-se às mesmas correções: evitar criação redundante de bills.

---

## ✅ Correções necessárias

1. **Formato do body de criação de assinatura** Sempre enviar envelopado:

```json
{
  "subscription": {
    "plan_id": 539682,
    "customer_id": 106340136,
    "payment_method_code": "pix",
    "start_at": "2025-09-15"
  }
}
```

2. **Remover **``** e **``** em **``

- Isso é usado apenas em criação de `bills`, não em `subscriptions`.
- O plano já define o produto e preço.

3. **Não usar **``** se cobrança for imediata**

- Se quiser cobrança imediata, omitir completamente.

4. **Busca correta dos dados PIX**

- `qrcode_original_path` → copia e cola
- `qrcode_path` → QR Code (SVG)
- `qr_code_base64` ou `qr_code_url` → fallback

5. **Retry automático**

- O QR Code pode demorar alguns segundos para ser gerado.
- Implementar 2–3 tentativas, com 2–3 segundos de intervalo.

---

## 📐 Estrutura de Resposta (para o front)

```json
{
  "success": true,
  "subscription_id": 12345,
  "bill_id": 67890,
  "status": "pending",
  "pix": {
    "pix_copia_cola": "0002012641...",
    "pix_qr_svg": "<svg>...</svg>",
    "pix_qr_code_url": "https://...",
    "expires_at": "2025-09-15T12:00:00Z"
  }
}
```

---

## 🚀 Passo a passo resumido

1. **Front** envia dados → Edge Function.
2. **Edge Function** cria/recupera cliente.
3. Cria assinatura (`/subscriptions`) na Vindi.
4. Aguarda geração da fatura automática.
5. Consulta fatura → busca nos `gateway_response_fields`.
6. Retorna ao front: QR Code + copia e cola.
7. **Front** exibe QR Code, botão copiar, timer.

---

## 🔑 Conclusão

- As Edge Functions corretas são: **create-vindi-customer**, **discover-vindi-plans**, **process-subscription-payment**.
- As demais (**transparent-checkout** e **hosted**) podem ser usadas em cenários específicos, desde que ajustadas.
- Correção principal: não criar bill manualmente em fluxo PIX; usar a gerada pela assinatura.
- Garantir extração correta dos campos: `qrcode_original_path` e `qrcode_path`.
- Fluxo de UI precisa dar feedback claro: **QR Code na tela + copia e cola + timer**.

