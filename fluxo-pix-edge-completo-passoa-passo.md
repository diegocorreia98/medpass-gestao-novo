
# Fluxo Completo (Edge Function Supabase) — Pagamento com PIX **até a geração do QR Code**
> Documento passo a passo + diagnóstico **do porquê o QR não aparece** e **patches** sugeridos.

---

## 1) Visão geral do fluxo
**Objetivo**: gerar os *parâmetros do PIX* (EMV “copia e cola” e imagem/URL do QR) e retorná‑los ao Frontend.

**Stack do fluxo**:
- **Frontend** → chama **Edge Function** (`process-subscription-payment`).
- **Banco (Supabase)** → valida link de checkout, lê assinatura/plano, grava transação.
- **Vindi API** → cria assinatura (se necessário), busca/gera fatura (*bill*) com **payment_method_code = pix**, cria *charge/transaction* com **campos do PIX**.
- **Edge** → extrai **gateway_response_fields** da `last_transaction` e devolve `pixCode` (EMV) + `qr` (URL/Base64/SVG) ao FE.

---

## 2) Passo a passo detalhado

### 2.1 Frontend → Edge
**POST** `/process-subscription-payment` com:
- `token` do link público (para localizar `subscription_checkout_links` válido e não expirado);
- `paymentMethod` (`"pix"` ou outro);
- (opcional) `customerData.address`.

### 2.2 Edge → Supabase
1. **Valida token** (`subscription_checkout_links` por `token` e `expires_at > now()`), carrega `subscriptions` e `planos`.
2. Extrai metadados **Vindi** da assinatura: `vindi_customer_id`, `vindi_plan_id`, `vindi_product_id`.

### 2.3 Edge → Vindi (assinatura)
3. Se a assinatura **não tem** `vindi_subscription_id`, cria em `POST /subscriptions` com:
   - `plan_id`, `customer_id`, `payment_method_code` (o mesmo recebido: `"pix"` / `"credit_card"`), `installments`.
4. **Aguarda 5s** (para a Vindi criar *bill* inicial).

### 2.4 Edge → Vindi (fatura/bill)
5. Tenta **reaproveitar bill pendente**: `GET /bills?query=subscription_id:<id>+status:pending`.
6. Caso **não exista**, cria **nova bill** `POST /bills` com:
   - `customer_id`, `payment_method_code`, `bill_items[{ product_id, amount }]`, `subscription_id`;
   - Para **PIX**: `installments = 1` e (no código atual) `charge = true` (ver observações em **§ 6.2**).

### 2.5 Vindi → Edge (retorno com dados PIX)
7. Ao criar a *bill* com **PIX**, a Vindi cria uma **charge** e uma **transaction**. Os **dados do PIX** vêm em:
   - `bill.charges[0].last_transaction.gateway_response_fields`.

Campos típicos presentes **(nomes variam por gateway)**:
- **EMV “copia e cola”**: `qr_code_text` _ou_ `emv` _ou_ `copy_paste` _ou_ `pix_copia_cola`.
- **QR imagem**: `qr_code_image_url` _ou_ `qr_code_url` _ou_ `qr_code_base64`.
- **Outros campos** (dependendo do gateway): `print_url`, `expires_at`, etc.
- **Atenção**: campos como `qrcode_path` / `qrcode_original_path` geralmente são **_caminhos_** (URLs relativas para ativos na Vindi), **não o conteúdo do SVG/EMV**.

8. O código **faz até 5 tentativas** (esperando 5s entre elas) de refetch `GET /bills/{id}` para pegar os campos PIX.

### 2.6 Edge → Supabase (persistência) e Resposta
9. Atualiza `subscriptions` para `pending_payment`, registra `transactions` com o payload bruto da Vindi.
10. Monta `responseData.pix` com os campos encontrados e retorna **200** ao Frontend.

---

## 3) Onde está o problema com o QR Code (root cause)

### 3.1 Mapeamento de campos do PIX incorreto (principal)
No trecho de extração dos dados PIX, o código usa:

```ts
const qrcodeSvgContent = gwFields.qrcode_path; // (interpreta como SVG)
const pixCode = gwFields.qrcode_original_path; // (interpreta como copia-e-cola)
```

**Problema**: `qrcode_path` e `qrcode_original_path` são **_caminhos/paths_** para arquivos mantidos pela Vindi (ex.: uma URL relativa), **não** o **conteúdo do SVG** e **não** o **EMV** em si.  
Isso explica por que “não gera” o QR: você está tentando exibir **conteúdo** onde recebeu **apenas um path**.

> **Como deveria**: priorizar **campos de texto/URL/base64** quando existirem — `qr_code_text`/`emv`/`copy_paste` para o **EMV** e `qr_code_image_url`/`qr_code_url`/`qr_code_base64` para a **imagem**. Se **somente paths** vierem (`qrcode_path`, `qrcode_original_path`), **construir a URL absoluta** do asset (e não tratar como SVG inline).

### 3.2 Possível `payment_method_code` divergente
O valor enviado em `payment_method_code: paymentData.paymentMethod` precisa **bater exatamente** com o método habilitado no **seu** ambiente Vindi (ex.: `"pix"`, `"bolepix"`, `"pix_bacen"`, etc.).  
Se houver divergência, a bill pode ser criada **sem** dados PIX na charge. Inclua logs/validação de **qual método** foi realmente atrelado à bill/charge.

### 3.3 Valor do item = 0
O item usa `amount: subscription.metadata?.plan_price || 0`. Se `plan_price` **não estiver setado** ou vier como string vazia, a bill de **R$ 0,00** pode **não gerar** QR. Garanta valor **> 0** (fallback: `plan.preco` ou preço do plano no DB).

### 3.4 Tempo insuficiente/rota de busca limitada
A janela de **5 tentativas x 5s** (≈ 20–25s) pode ser curta. Alguns gateways geram os campos PIX **assíncronos**. Reforce o retry/backoff e, além de `GET /bills/{id}`, consulte também:
- `GET /charges/{id}` (primeira charge da bill);
- `GET /charges/{id}/transactions` (alguns gateways populam campos ao final do pipeline).

---

## 4) Patches recomendados (código)

### 4.1 Extração correta dos dados PIX (substituir bloco dentro do `while` de tentativas)

```diff
- const qrcodeSvgContent = gwFields.qrcode_path; // ✅ SVG do QR Code
- const pixCode = gwFields.qrcode_original_path; // ✅ Código PIX copia-e-cola
- const qrCodeUrl = gwFields.qr_code_url || gwFields.qr_code_image_url;
- const printUrl = gwFields.print_url;
- const qrCodeBase64 = gwFields.qr_code_base64 || gwFields.qr_code_png_base64;
- const dueAt = gwFields.max_days_to_keep_waiting_payment || billData.bill?.due_at;
+ // 1) Preferir campos textuais e URLs diretas
+ const pixCode =
+   gwFields.qr_code_text ||
+   gwFields.emv ||
+   gwFields.copy_paste ||
+   gwFields.pix_copia_cola ||
+   null;
+
+ let qrCodeUrl =
+   gwFields.qr_code_image_url ||
+   gwFields.qr_code_url ||
+   null;
+
+ const qrCodeBase64 =
+   gwFields.qr_code_base64 ||
+   gwFields.qr_code_png_base64 ||
+   null;
+
+ const printUrl = gwFields.print_url || null;
+ const dueAt = gwFields.expires_at || billData.bill?.due_at || null;
+
+ // 2) Se só vierem *paths*, construir URL absoluta (não tratar como SVG inline)
+ const assetsBase = vindiApiUrl.replace('/api/v1', ''); // ex.: https://app.vindi.com.br
+ if (!qrCodeUrl && gwFields.qrcode_path) {
+   qrCodeUrl = assetsBase + gwFields.qrcode_path;
+ }
+ // Algumas integrações trazem o EMV como path de texto (ex.: qrcode_original_path)
+ if (!pixCode && gwFields.qrcode_original_path) {
+   // (opção A) tentar baixá-lo server-side e ler o conteúdo de texto
+   try {
+     const emvResp = await fetch(assetsBase + gwFields.qrcode_original_path);
+     if (emvResp.ok) {
+       const emvText = await emvResp.text();
+       if (emvText && emvText.length > 10) {
+         // heurística simples
+         // cuidado: se o endpoint exigir cookie/auth, vai falhar — mantenha logs
+         pixCode = emvText.trim();
+       }
+     }
+   } catch {}
+ }
+
+ logStep(`🔎 TENTATIVA ${attempts} - Dados encontrados:`, {
+   hasPixCode: !!pixCode,
+   hasQrCodeUrl: !!qrCodeUrl,
+   hasQrCodeBase64: !!qrCodeBase64,
+   hasPrintUrl: !!printUrl,
+   dueAt
+ });
```

E na montagem do **response**:

```diff
- if (pixData.qrcodeSvg) {
-   responseData.pix_qr_svg = pixData.qrcodeSvg;
- }
+ // Não tentar embutir SVG por path relativo (a não ser que você baixe e sirva)
+ // Priorizar URL ou base64
```

> **Dica**: mantenha **ambos** no response quando existirem (`pix_code` e `pix_qr_code_url`), o FE escolhe o melhor para renderizar.

### 4.2 Garantir **amount > 0** no bill item
```diff
- amount: subscription.metadata?.plan_price || 0
+ amount: Number(subscription.metadata?.plan_price ?? plan.preco ?? 0) || 0
+ // e ANTES de criar a bill:
+ if (!billPayload.bill_items[0].amount || billPayload.bill_items[0].amount <= 0) {
+   throw new Error("Valor do plano inválido para geração de PIX");
+ }
```

### 4.3 Verificar **payment_method_code** realmente habilitado
Antes de criar a bill, registre em log **qual** método foi associado, por exemplo:
```ts
logStep("Payment method to be used in Vindi", { payment_method_code: billPayload.payment_method_code });
```

Se necessário, exponha o método correto via env (`VINDI_PIX_METHOD_CODE`, ex.: `"pix"`/`"bolepix"`) e use-o no payload.

### 4.4 Retry/backoff e endpoints adicionais
Troque o `maxAttempts` para `8–10` e faça, nos retries, **além** do `/bills/{id}`:
```ts
const chargeId = billData.bill?.charges?.[0]?.id;
if (chargeId) {
  const chargeResp = await fetch(`${vindiApiUrl}/charges/${chargeId}`, { headers });
  // e opcionalmente:
  const txsResp = await fetch(`${vindiApiUrl}/charges/${chargeId}/transactions`, { headers });
  // merge nos dados se encontrar gateway_response_fields mais completos
}
```

### 4.5 Inserção da transação usando o **ID atualizado** da assinatura Vindi
Hoje:

```ts
vindi_subscription_id: subscription.vindi_subscription_id,
```

Se a assinatura foi criada **nesta chamada**, o `subscription.vindi_subscription_id` ainda pode estar **nulo** em memória (**mesmo após o UPDATE**). Use a **variável**:

```diff
- vindi_subscription_id: subscription.vindi_subscription_id,
+ vindi_subscription_id: vindiSubscriptionId || subscription.vindi_subscription_id,
```

> Não quebra o QR, mas melhora rastreabilidade e auditoria.

---

## 5) Resposta recomendada ao Frontend
```json
{
  "success": true,
  "bill_id": 123456,
  "status": "pending",
  "pix": {
    "pix_copia_cola": "00020126580014BR.GOV.BCB.PIX01...6304ABCD",
    "qr_code_url": "https://app.vindi.com.br/assets/.../qrcode.png",
    "qr_code_base64": null,
    "expires_at": "2025-09-27T12:30:00-03:00"
  }
}
```
> Garanta ao FE: **ou** um `qr_code_url` **ou** `qr_code_base64`. O EMV (`pix_copia_cola`) sempre que existir.

---

## 6) Observações importantes

### 6.1 Domínio do asset (quando vier *path*)
Construa a URL a partir do **host** do ambiente atual (produção: `https://app.vindi.com.br`, sandbox: `https://sandbox-app.vindi.com.br`). Você já tem `vindiApiUrl`; derive com `replace('/api/v1','')`.

### 6.2 `charge: true` para PIX
Funciona para forçar a criação imediata da **charge/transaction**. Em alguns gateways, a *transaction* com os `gateway_response_fields` de PIX pode surgir **logo** na criação ou **alguns segundos depois**. Por isso o **retry** é necessário. Se observar efeitos colaterais, teste sem `charge: true` e com o polling via `/bills/{id}`/`/charges/{id}`.

### 6.3 Logs úteis
Você já loga `availableFields` em `gateway_response_fields`. Acrescente **o valor** quando for pequeno (ex.: primeiros 100 chars do EMV) e **o host** quando for URL/Path — isso acelera muito o diagnóstico.

---

## 7) Checklist rápido (DoD)
- [ ] `payment_method_code` igual ao método habilitado no painel Vindi
- [ ] `amount > 0`
- [ ] Retry/backoff 8–10 tentativas (a cada 5–8s)
- [ ] Preferir `qr_code_text/emv/copy_paste` para **EMV**
- [ ] Preferir `qr_code_image_url/qr_code_url/qr_code_base64` para **imagem**
- [ ] Se vier apenas `qrcode_path`/`qrcode_original_path`, **transformar em URL absoluta** e (se for o caso) **baixar o conteúdo** server‑side
- [ ] Resposta ao FE contém **EMV** + **URL ou Base64** do QR

---

## 8) Próximos passos
- Aplicar o **patch de extração** dos campos (Seção 4.1).
- Garantir **amount > 0** (Seção 4.2).
- Validar o **payment_method_code** real da sua conta Vindi (Seção 4.3).
- Ajustar **retry/backoff** e, se necessário, consultar `/charges`/`/transactions` (Seção 4.4).

Se quiser, posso gerar um **diff** completo do arquivo da Edge Function com as alterações acima já encaixadas nos pontos corretos.
