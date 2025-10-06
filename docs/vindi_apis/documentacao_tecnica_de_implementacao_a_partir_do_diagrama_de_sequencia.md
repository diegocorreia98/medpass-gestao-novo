# Documentação técnica de implementação

> Baseada no diagrama de sequência fornecido (link do SequenceDiagram.org). Como o texto-fonte do diagrama está comprimido na URL, esta versão descreve a **estrutura completa da implementação** e um **passo a passo de como mapear cada mensagem** do diagrama para endpoints, filas, eventos, modelos de dados, testes e observabilidade. Assim que você colar o **texto-fonte** do diagrama (ou me enviar o export em “URI Encoded”), eu preencho todos os campos marcados com `<<<preencher>>>` com os nomes reais dos participantes, mensagens e dados.

---

## 1) Visão geral

**Objetivo:** implementar os fluxos descritos no diagrama, assegurando confiabilidade (retries + idempotência), segurança (authZ/authN), rastreabilidade (correlação e logs estruturados), e testes ponta-a-ponta.

**Stack de referência (ajuste conforme seu projeto):**

- **Frontend:** Next.js/React
- **BFF/API:** Node.js (Fastify/Express) **ou** NestJS
- **Banco:** Postgres (Supabase) / Prisma
- **Mensageria/Eventos (opcional):** Redis Streams, RabbitMQ, ou Supabase Realtime
- **Observabilidade:** OpenTelemetry + Prometheus/Grafana + Sentry
- **Infra:** Docker/Swarm/K8s, Traefik/NGINX

## 2) Participantes e responsabilidades

Liste aqui os participantes exatamente como aparecem no diagrama e a responsabilidade de cada um.

| Participante            | Tipo                      | Responsabilidade principal |
| ----------------------- | ------------------------- | -------------------------- |
| `<<<Actor/Service A>>>` | (Usuário/Serviço/Externo) | `<<<descrição>>>`          |
| `<<<Frontend>>>`        | App Web/Mobile            | `<<<descrição>>>`          |
| `<<<API>>>`             | Serviço HTTP              | `<<<descrição>>>`          |
| `<<<Auth Provider>>>`   | Terceiro                  | `<<<descrição>>>`          |
| `<<<DB>>>`              | Postgres                  | `<<<descrição>>>`          |
| `<<<Queue/Event Bus>>>` | Mensageria                | `<<<descrição>>>`          |

> **Dica:** mantenha a regra “uma responsabilidade principal por serviço”. Multi-responsabilidades = alto acoplamento.

## 3) Fluxos mapeados do diagrama → backlog de implementação

Para cada **mensagem** do diagrama (linha do tempo), crie um item de backlog com contrato, validações, erros e telemetria.

### 3.1 Tabela de mapeamento (exemplo)

| # | De → Para                        | Tipo      | Nome da mensagem/ação | Artefato de implementação        | Dados de entrada    | Saída esperada        | Erros previstos             |
| - | -------------------------------- | --------- | --------------------- | -------------------------------- | ------------------- | --------------------- | --------------------------- |
| 1 | `<<<Actor>>>` → `<<<Frontend>>>` | UI        | `<<<Clique/Evento>>>` | Componente `<<<Nome>>>`          | `<<<payload>>>`     | Render `<<<estado>>>` | `<<<erros>>>`               |
| 2 | `<<<Frontend>>>` → `<<<API>>>`   | HTTP POST | `/<<<recurso>>>`      | Rota `POST /<<<recurso>>>`       | JSON `<<<campos>>>` | `201` + body          | `400/401/409/5xx`           |
| 3 | `<<<API>>>` → `<<<DB>>>`         | SQL/ORM   | `insert/update`       | Repositório `<<<Entidade>>>`     | `<<<modelo>>>`      | registro persistido   | `unique_violation`, timeout |
| 4 | `<<<API>>>` → `<<<Queue>>>`      | Evento    | `<<<EventoCriado>>>`  | Publisher `emit(“<<<evento>>>”)` | `<<<payload>>>`     | ack                   | `nack/retry`                |
| 5 | `<<<Worker>>>` → `<<<Externo>>>` | HTTP/SDK  | `<<<Chamada>>>`       | Cliente `<<<SDK>>>`              | `<<<payload>>>`     | `200`                 | `HTTP 4xx/5xx`, backoff     |

> Repita até cobrir todas as setas do diagrama.

## 4) Contratos de API (REST/BFF)

> Especifique **para cada chamada HTTP que aparece no diagrama**.

### 4.1 Exemplo — `POST /<<<recurso>>>`

- **Descrição:** `<<<o que faz>>>`
- **Auth:** `Bearer JWT` (escopo `<<<scope>>>`)
- **Idempotência:** header `Idempotency-Key`
- **Request (JSON):**

```json
{
  "<<<campo1>>>": "string",
  "<<<campo2>>>": 123,
  "<<<campo3>>>": true
}
```

- **Response 201 (JSON):**

```json
{
  "id": "uuid",
  "status": "created",
  "createdAt": "2025-09-27T12:00:00-03:00"
}
```

- **Erros:**
  - `400` validação (`code: invalid_payload`)
  - `401` não autenticado (`code: unauthorized`)
  - `403` sem permissão (`code: forbidden`)
  - `409` conflito (`code: conflict`)
  - `429` rate limit
  - `5xx` falhas internas

> Repita para `GET /...`, `PUT /...`, `PATCH /...`, `DELETE /...` conforme o diagrama.

## 5) Esquema de dados (Postgres/Prisma)

> Modele apenas entidades que aparecem no fluxo.

### 5.1 Exemplo — tabela `<<<entidade>>>`

```sql
create table if not exists public.<<<entidade>>> (
  id uuid primary key default gen_random_uuid(),
  campo1 text not null,
  campo2 integer not null,
  status text not null check (status in ('created','processing','done','error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_<<<entidade>>>_status on public.<<<entidade>>>(status);
```

### 5.2 RLS (se usar Supabase)

- Política **insert**: apenas o dono/empresa pode criar
- Política **select**: escopo por `empresa_id/unidade_id`
- Política **update**: somente serviço/role `system` ou dono

## 6) Mensageria / eventos (se houver setas assíncronas)

- **Canal/Exchange/Stream:** `<<<nome>>>`
- **Evento:** `<<<EventoCriado>>>`
- **Chave de roteamento:** `<<<routingKey>>>`
- **Formato do evento (CloudEvents sugerido):**

```json
{
  "specversion": "1.0",
  "id": "uuid",
  "source": "<<<servico>>>",
  "type": "<<<evento.tipo>>>",
  "time": "2025-09-27T12:00:00-03:00",
  "datacontenttype": "application/json",
  "data": { "<<<campos>>>": "..." }
}
```

- **Retries & DLQ:** retry exponencial (max 5) → DLQ `<<<fila_dlq>>>`
- **Idempotência do consumidor:** tabela `event_offset` ou hash dedup em Redis

## 7) Autenticação & Autorização

- **AuthN:** JWT (issuer `<<<issuer>>>`), validade `<<<ttl>>>`
- **AuthZ:** RBAC (roles `admin`, `gestor`, `colaborador`, `servico`), escopos por `empresa_id/unidade_id`
- **Segurança de endpoints:**
  - TLS obrigatório
  - Rate limit por IP/usuário (ex.: `100 req/min`)
  - CORS restrito (`<<<origins>>>`)

## 8) Observabilidade & rastreabilidade

- **Correlação:** header `X-Request-Id` propagado `Frontend → API → Worker`
- **Logs estruturados:** JSON (`level`, `service`, `traceId`, `spanId`, `msg`, `payload_size`)
- **Métricas:**
  - `http_server_requests_seconds{route,code,method}`
  - `queue_publish_count{topic}`
  - `queue_consume_errors_total{topic}`
  - `db_latency_seconds{query}`
- **Tracing:** spans por cada chamada do diagrama (name = `De→Para:Mensagem`)

## 9) Resiliência

- **Timeouts padrão:** HTTP `<<<ms>>>` ms; DB `<<<ms>>>` ms; Externo `<<<ms>>>` ms
- **Circuit breaker:** half‑open após `<<<s>>>` s
- **Bulkheads:** pool/concurrency por recurso `<<<n>>>`
- **Idempotência:** `Idempotency-Key` + chave única na tabela `idempotency_keys` (API) e dedup no consumidor de eventos

## 10) Testes

- **Unitários:** validação de schemas (Zod/Joi), regras de negócio
- **Integração:** API ↔ DB; API ↔ Externos (com mock)
- **Contrato:** Pact (consumidor/provedor) quando houver serviços internos distintos
- **E2E:** cenários por fluxo do diagrama (happy & sad paths)

### 10.1 Matriz de casos (preencher pelos passos do diagrama)

| Caso       | Pré-condições | Passos | Resultado esperado | Observações |
| ---------- | ------------- | ------ | ------------------ | ----------- |
| `<<<F1>>>` | `<<<...>>>`   | `1…n`  | `<<<...>>>`        | `<<<...>>>` |

## 11) Postman/Insomnia (coleção)

> Dica: manter variáveis de ambiente: `baseUrl`, `token`, `empresaId`, `unidadeId` e `requestId`.

- Folders por **fluxo do diagrama**
- Exemplos de sucesso e erro por endpoint
- Scripts de pre‑request (gera `X-Request-Id`, pega `token`)

## 12) Deploy & migração

- **Migrations:** gerar com Prisma/Knex; rodar em CI antes do deploy
- **Feature flags:** `<<<flag>>>` para ativar novo fluxo gradualmente
- **Rollback:** script de reversão + DLQ drenável +/ou chaves de versão nos eventos

## 13) Checklist de DoD (Definition of Done)

-

## 14) Riscos & decisões

- **Dependências externas críticas:** `<<<nome>>>` (SLA, limites)
- **Dados sensíveis:** `<<<quais>>>` (mascaramento, retenção)
- **Decisões arquiteturais (ADR):** `<<<link>>>`

---

### Como preencher rapidamente com base no texto do diagrama

1. Cole o **texto-fonte** do diagrama abaixo (SequenceDiagram.org syntax):

```
# Exemplo de sintaxe do site
participant Frontend
participant API
participant DB

Frontend->API: POST /recurso
API->DB: insert entidade
DB-->API: ok (id)
API-->Frontend: 201 {id}
```

2. Para **cada seta**, preencha uma linha na **Tabela de Mapeamento** (Seção 3.1).
3. Para cada chamada **HTTP**, crie/atualize um item em **Contratos de API** (Seção 4).
4. Para cada chamada **DB**, defina/ajuste o **Esquema** (Seção 5) e índices.
5. Se houver setas assíncronas, complete a **Seção 6** com eventos e DLQ.
6. Complete **Auth, Observabilidade, Resiliência, Testes e Deploy**.

> Assim que você enviar o **texto-fonte real** do diagrama, eu substituo `<<<preencher>>>` pelos nomes/mensagens corretos e entrego a versão final.

