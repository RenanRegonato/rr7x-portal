# Mapa Inteligente do Mercado — Arquitetura Funcional, Banco de Dados e Integração

> Documento 2 de 3. Ver: [01 — Relatório Executivo](mapa-inteligente-mercado-01-relatorio-executivo.md) · [03 — Produto e Roadmap](mapa-inteligente-mercado-03-produto-e-roadmap.md).
> Data: 12/06/2026 · Status: proposta técnica

---

## 1. Arquitetura funcional (visão de alto nível)

```
                    FONTES                          INGESTÃO                 NÚCLEO                    PRODUTO
 ┌──────────────────────────────┐      ┌──────────────────────────┐   ┌──────────────────┐   ┌─────────────────────┐
 │ DADO ABERTO (redistribuível) │      │  ETL agendado (Inngest)  │   │  Data Warehouse  │   │  API interna /api/   │
 │  • CVM Dados Abertos (ODbL)  │─────▶│  • download CSV/TXT      │──▶│  de Mercado      │──▶│  mapa-mercado        │
 │  • BCB IF.data / SGS         │      │  • parse + normalização  │   │  (Supabase/PG)   │   │                     │
 │  • B3 (emissores/listados)   │      │  • dedup por CNPJ        │   │                  │   │  Telas Next.js       │
 │  • Receita/CNPJ (BrasilAPI)  │      │  • upsert idempotente    │   │  • entities      │   │  • Busca            │
 ├──────────────────────────────┤      │  • snapshot histórico    │   │  • metrics       │   │  • Fichas           │
 │ DADO LICENCIADO (interno)    │      ├──────────────────────────┤   │  • relationships │   │  • Rankings         │
 │  • ANBIMA Feed (OAuth2)  🔒  │─────▶│  Sync diário (interno)   │──▶│  • rankings      │   │  • Mapa de conexões │
 │  • Coponto (cruzamento) 🔒   │      │  flag redistribuivel=F   │   │  • search index  │   │  • Comparador       │
 └──────────────────────────────┘      └──────────────────────────┘   └────────┬─────────┘   └──────────┬──────────┘
                                                                                 │                        │
                                                          ┌──────────────────────┴───────┐                │
                                                          │ Camada de IA (callLLM)        │                │
                                                          │ • busca semântica (pgvector)  │◀───────────────┘
                                                          │ • resumo de entidade          │
                                                          │ • score de relevância         │
                                                          │ • detecção de relacionamentos │   ▶ Invest Match (originação)
                                                          └───────────────────────────────┘
```

**Princípios de arquitetura:**

1. **Separação por licenciamento na camada de dados.** Toda linha tem `redistribuivel boolean`. A API pública do painel só serve `redistribuivel = true`. Dado ANBIMA Feed/Coponto entra com `false` e só é visível para papéis internos (admin/originação).
2. **Idempotência e snapshot.** ETLs fazem upsert por chave natural (CNPJ + competência). Métricas viram séries temporais (`entity_metrics`) para alimentar histórico e comparativos — mesmo padrão de robustez do pipeline de análise atual.
3. **Reuso do stack provado.** Supabase + RLS, Inngest cron, Next.js App Router, `callLLM` com `llm_usage_log`. Nada de infra nova obrigatória no MVP.
4. **Acoplamento com Invest Match.** O catálogo de entidades é a mesma "fonte de verdade" de investidores/fundos que o motor de matching consome. Mapa → enriquece teses; Invest Match → consome o grafo.

---

## 2. Modelo de domínio

A entidade central é o **participante de mercado** (uma instituição, identificada por CNPJ quando houver). Um mesmo CNPJ pode acumular vários **papéis** (uma instituição é, ao mesmo tempo, gestora e administradora, por exemplo). Por isso o modelo é "entidade + papéis", não uma tabela por tipo.

**Tipos de participante (`entity_type`):**
`gestora`, `administrador`, `distribuidor`, `custodiante`, `controladoria`, `banco`, `securitizadora`, `escritorio_credito_estruturado`, `boutique_investimento`, `family_office`, `asset`, `consultoria`, `plataforma`.

**Tipos de veículo/produto (`vehicle_type`):**
`FIDC`, `FII`, `FIP`, `FIF`, `ETF`, `FIAGRO`, `OFFSHORE`, `CRI`, `CRA`, `debenture`, `CCB`, `fundo_geral`.

**Papéis em um veículo (`provider_role`):** `administrador`, `gestor`, `co_gestor`, `distribuidor`, `custodiante`, `controladoria` (alinhado aos 6 papéis da API ANBIMA).

---

## 3. Estrutura de banco de dados sugerida (Postgres / Supabase)

> Schema dedicado `mercado` para isolar do schema da aplicação. SQL conceitual — a migration real fica para a fase de implementação.

```sql
create schema if not exists mercado;

-- =========================================================================
-- 3.1 ENTIDADES (participantes do mercado) — fonte de verdade
-- =========================================================================
create table mercado.entities (
  id              uuid primary key default gen_random_uuid(),
  cnpj            text unique,                 -- null para entidades sem CNPJ (ex.: estrangeiras)
  legal_name      text not null,               -- razão social (Receita/CVM)
  trade_name      text,                        -- nome fantasia / comercial
  entity_types    text[] not null default '{}',-- papéis acumulados: {gestora, administrador, ...}
  status          text,                        -- situação cadastral (ativo, cancelado, etc.)
  cnae            text,
  uf              text,
  municipio       text,
  founded_at      date,
  website         text,
  logo_url        text,                        -- logo da instituição (curada de fonte oficial)
  description     text,                        -- resumo gerado por IA (callLLM)
  relevance_score numeric,                     -- score proprietário (0-100), ver 3.6
  source          text not null,               -- 'cvm' | 'bcb' | 'b3' | 'receita' | 'anbima_feed' | ...
  redistribuivel  boolean not null default true,
  search_tsv      tsvector,                    -- full-text (pg_trgm + to_tsvector)
  embedding       vector(1536),                -- busca semântica (V2, pgvector)
  raw             jsonb,                       -- payload bruto da fonte (auditoria)
  first_seen_at   timestamptz default now(),
  updated_at      timestamptz default now()
);
create index on mercado.entities using gin (search_tsv);
create index on mercado.entities using gin (entity_types);
create index on mercado.entities (cnpj);

-- =========================================================================
-- 3.2 VEÍCULOS (fundos, FIDCs, securitizações, emissões)
-- =========================================================================
create table mercado.vehicles (
  id              uuid primary key default gen_random_uuid(),
  cnpj            text,
  anbima_code     text,                        -- código ANBIMA (se via Feed) — redistribuivel=false
  cvm_code        text,
  name            text not null,
  vehicle_type    text not null,               -- FIDC, FII, CRI, debenture, ...
  cvm_category    text,
  anbima_class    text,                        -- nível 1/2/3 ANBIMA
  status          text,
  esg             boolean,
  source          text not null,
  redistribuivel  boolean not null default true,
  raw             jsonb,
  updated_at      timestamptz default now(),
  unique (cnpj, vehicle_type)
);

-- =========================================================================
-- 3.3 RELACIONAMENTO entidade ⇄ veículo (quem faz o quê em cada veículo)
--     É a base do grafo e do "mapa de conexões".
-- =========================================================================
create table mercado.vehicle_providers (
  id            uuid primary key default gen_random_uuid(),
  vehicle_id    uuid not null references mercado.vehicles(id) on delete cascade,
  entity_id     uuid not null references mercado.entities(id) on delete cascade,
  role          text not null,                 -- administrador|gestor|co_gestor|distribuidor|custodiante|controladoria
  source        text not null,
  active        boolean default true,
  valid_from    date,
  valid_to      date,                          -- histórico de troca de prestador
  unique (vehicle_id, entity_id, role)
);
create index on mercado.vehicle_providers (entity_id, role);
create index on mercado.vehicle_providers (vehicle_id);

-- =========================================================================
-- 3.4 MÉTRICAS / SÉRIES HISTÓRICAS (PL, captação, cotistas, carteira)
--     Tudo é série temporal por competência → alimenta histórico/comparativos.
-- =========================================================================
create table mercado.entity_metrics (
  id            uuid primary key default gen_random_uuid(),
  entity_id     uuid references mercado.entities(id) on delete cascade,
  vehicle_id    uuid references mercado.vehicles(id) on delete cascade,
  metric        text not null,                 -- 'pl' | 'captacao' | 'cotistas' | 'carteira_pj' | 'aum' ...
  competencia   date not null,                 -- data de referência
  value         numeric,
  unit          text,                          -- 'BRL' | 'qtd' | '%'
  source        text not null,
  redistribuivel boolean not null default true,
  unique (coalesce(entity_id::text,'') , coalesce(vehicle_id::text,''), metric, competencia, source)
);
create index on mercado.entity_metrics (entity_id, metric, competencia desc);
create index on mercado.entity_metrics (vehicle_id, metric, competencia desc);

-- =========================================================================
-- 3.5 GRAFO DE CONEXÕES (relacionamentos derivados entre entidades)
--     Ex.: "gestora X e administrador Y co-ocorrem em 42 fundos".
--     Materializado por job a partir de vehicle_providers + co-investimentos.
-- =========================================================================
create table mercado.entity_edges (
  id            uuid primary key default gen_random_uuid(),
  source_id     uuid not null references mercado.entities(id) on delete cascade,
  target_id     uuid not null references mercado.entities(id) on delete cascade,
  edge_type     text not null,                 -- 'co_servico' | 'co_investimento' | 'distribui_para' | 'mesmo_grupo'
  weight        numeric not null default 1,    -- nº de veículos em comum / força do vínculo
  evidence      jsonb,                         -- ids dos veículos que sustentam a aresta
  updated_at    timestamptz default now(),
  unique (source_id, target_id, edge_type)
);
create index on mercado.entity_edges (source_id, edge_type, weight desc);

-- =========================================================================
-- 3.6 RANKINGS proprietários (snapshots periódicos)
-- =========================================================================
create table mercado.rankings (
  id            uuid primary key default gen_random_uuid(),
  ranking_key   text not null,                 -- 'gestoras_por_aum' | 'admin_por_num_fidc' | ...
  competencia   date not null,
  entity_id     uuid references mercado.entities(id),
  position      int not null,
  value         numeric,
  metadata      jsonb,
  unique (ranking_key, competencia, entity_id)
);
create index on mercado.rankings (ranking_key, competencia, position);

-- =========================================================================
-- 3.7 CONTROLE DE INGESTÃO (auditoria de ETL)
-- =========================================================================
create table mercado.ingestion_runs (
  id            uuid primary key default gen_random_uuid(),
  source        text not null,
  dataset       text not null,                 -- 'fi_cad' | 'inf_mensal_fidc' | 'if_data' ...
  status        text not null,                 -- running|completed|failed
  rows_in       int, rows_upserted int, rows_failed int,
  competencia   date,
  error_message text,
  started_at    timestamptz default now(),
  finished_at   timestamptz
);
```

**Notas de modelagem:**

- O **score de relevância** (`entities.relevance_score`) é proprietário e calculado por job (ver §3.6 no doc de produto): combina AUM/PL, nº de veículos, recência de atividade, diversidade de papéis e (fase 2) sinais de deal flow do Invest Match. Esse é um dos **indicadores proprietários** pedidos — não vem de nenhuma fonte, é cálculo Mandor.
- `entity_edges` é **materializada**, não calculada em request — o grafo precisa ser pré-computado por um job Inngest para o mapa de conexões responder rápido.
- `redistribuivel` aparece em todas as tabelas de conteúdo: é o cumpridor técnico da regra jurídica do §4 do relatório executivo.

---

## 4. Modelo de integração (ETL)

### 4.1 Pipeline de dado aberto (MVP)

Padrão idêntico ao que o projeto já roda em produção (Inngest cron + Supabase + idempotência), reaproveitando aprendizados do watchdog de ingestão e do monitoramento de CNPJ.

```
Inngest cron (diário/mensal por dataset)
  → função mercado/etl.<dataset>.run_requested
    1. resolve URL do dataset no portal (CVM/BCB/B3)
    2. baixa CSV/TXT (stream)
    3. parse + normalização para o schema mercado.*
    4. dedup/resolução de entidade por CNPJ (mesma instituição = 1 entity)
    5. upsert idempotente (entities, vehicles, vehicle_providers, entity_metrics)
    6. grava mercado.ingestion_runs (auditoria)
  → ao concluir cargas do dia: dispara mercado/graph.rebuild + mercado/rankings.recompute
  → onFailure: marca run como failed + alerta admin (mesmo padrão do pipeline de análise)
```

Datasets-alvo do MVP:

| Dataset | Fonte | Tabela destino | Frequência cron |
|---|---|---|---|
| `fi_cad` (cadastro de fundos) | CVM | vehicles + vehicle_providers + entities | diário (Ter–Sáb) |
| `inf_mensal_fidc` | CVM | vehicles (FIDC) + entity_metrics | mensal |
| Securitizadoras (CRI/CRA) | CVM | entities + vehicles | mensal |
| `if_data` (carteiras PJ) | BCB | entities (bancos) + entity_metrics | trimestral |
| Emissores/listados | B3 | entities + vehicles | diário |
| CNPJ enrich | Receita/BrasilAPI | entities (logo, QSA, CNAE, status) | sob demanda + refresh |

### 4.2 Sync ANBIMA Feed (fase 2, interno)

```
Inngest cron diário
  → OAuth2 client_credentials (token cacheado)
  → GET /feed/fundos/v2/fundos (paginado) + serie-historica + instituicoes
  → upsert em vehicles/entity_metrics COM redistribuivel=false, source='anbima_feed'
  → usado para: validação cruzada, enriquecimento interno, score; NÃO servido na API pública sem licença
```

### 4.3 Resolução de entidade (entity resolution)

Ponto crítico de qualidade: a mesma gestora aparece em CVM, BCB, B3 e ANBIMA com nomes ligeiramente diferentes. Estratégia:

1. **Chave forte:** CNPJ (raiz de 8 dígitos para agrupar mesmo grupo econômico, opcional).
2. **Fallback:** normalização de nome (uppercase, remoção de "LTDA/S.A./GESTORA DE RECURSOS") + similaridade `pg_trgm`.
3. **Merge auditável:** toda fusão de entidade gera registro; admin pode revisar candidatos duvidosos (tela interna de curadoria).

---

## 5. API interna do módulo (`/api/mapa-mercado`)

Endpoints servem **somente `redistribuivel = true`** para papéis não-internos (gate na camada de dados, igual ao padrão COGS admin-only já existente).

| Método | Rota | Função |
|---|---|---|
| GET | `/api/mapa-mercado/search?q=&types=&filtros=` | Busca unificada (full-text + filtros) |
| GET | `/api/mapa-mercado/entities/{id}` | Ficha completa da entidade |
| GET | `/api/mapa-mercado/entities/{id}/graph` | Vizinhança no grafo (mapa de conexões) |
| GET | `/api/mapa-mercado/entities/{id}/metrics?metric=&from=&to=` | Séries históricas |
| GET | `/api/mapa-mercado/vehicles/{id}` | Ficha do veículo (fundo/FIDC) |
| GET | `/api/mapa-mercado/rankings/{key}?competencia=` | Ranking proprietário |
| POST | `/api/mapa-mercado/compare` | Comparador (N entidades/veículos) |
| GET | `/api/mapa-mercado/semantic?q=` | Busca semântica (V2, pgvector + callLLM) |

---

## 6. Segurança e governança de dados

- **RLS no schema `mercado`:** leitura pública só de linhas `redistribuivel = true`; linhas internas exigem papel admin/originação (reuso do padrão de gate já aplicado em COGS/uso de LLM).
- **LGPD:** dados de QSA são pessoais — minimizar exposição, criptografar PII sensível (mesma `decryptSensitiveFields` usada no intake), política de remoção sob pedido.
- **Atribuição de fonte** persistida por linha (`source`) e exibida na UI (área de logos das fontes).
- **Auditoria de ETL** em `ingestion_runs`; alertas em falha (mesmo padrão operacional do pipeline atual).
- **Custo de IA** (resumos, score, busca semântica) logado em `llm_usage_log` e visível no painel admin de uso de LLM.
