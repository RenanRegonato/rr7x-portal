-- ============================================================
-- Invest Match — Schema base (2026-05-20)
-- ============================================================
-- Módulo de originação inteligente que cruza TESES de investimento.
--
-- Integra-se com a Mandor: cada análise consolidada (mesa_revisao +
-- fact_bank + analise_facts) pode ser convertida em uma tese estruturada
-- via /api/invest-match/teses/from-analise (endpoint posterior).
--
-- Arquitetura:
--   1) investidores            — perfil + tese declarada + preferências + embedding
--   2) teses                   — tese estruturada do projeto/empresa + embedding
--                                 (vinculada opcionalmente a analises.id)
--   3) matches                 — par (investidor × tese) com score multi-camada
--   4) match_feedback          — loop de qualidade (humano + outcome real)
--
-- Motor de matching (rodado por Inngest job ao criar/atualizar tese):
--   Camada 1 — Hard filters    (SQL, ticket range, exclusões, geografia)
--   Camada 2 — Structured score (SQL ponderado, 10 dimensões)
--   Camada 3 — Semantic score   (pgvector cosine, voyage-3-large 1024d)
--   Camada 4 — LLM judge        (Claude Sonnet, top 20, JSON estruturado)
--   Camada 5 — Score composto   (50% estruturado + 20% semântico + 30% LLM)
--
-- Convenções (consistentes com migrations existentes da Mandor):
--   - snake_case em português
--   - uuid PK, gen_random_uuid()
--   - timestamptz com criado_em / atualizado_em
--   - RLS habilitado, service_role ALL, leitura por ownership
--   - Embeddings vector(1024) voyage-3-large (mesmo modelo do RAG da Mandor)
-- ============================================================

-- Garante pgvector (idempotente; já habilitado em 20260519_documents_chunks_pgvector.sql)
CREATE EXTENSION IF NOT EXISTS vector;


-- ============================================================
-- 1) investidores — Cadastro de investidores e suas teses
-- ============================================================
-- Substitui a coleção 'investors' do Firebase da v1 (CRM standalone).
-- Cada linha é um investidor único; pode ou não ter login (user_id NULL =
-- cadastrado pelo escritório sem auth ainda).
--
-- A "tese declarada" é o que o investidor (ou o assessor) preencheu como
-- preferências. O motor de matching cruza isso com teses.* via:
--   - hard filters (ticket, geografia, exclusões)
--   - structured score (10 dimensões ponderadas)
--   - semantic similarity (tese_embedding × tese_embedding da empresa)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.investidores (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  escritorio_id               uuid        REFERENCES public.escritorios(id) ON DELETE CASCADE NOT NULL,

  -- === Identidade ===
  nome                        text        NOT NULL,
  tipo                        text        NOT NULL,
    -- Valores convencionais (sem CHECK pra permitir evolução):
    -- pessoa_fisica | holding_familiar | family_office | fundo | financeira |
    -- pj | estrategico_corporativo | gestora | clube_investimento
  email                       text,
  telefone                    text,
  cidade                      text,
  estado                      text,        -- UF (SP, RJ, MG, ...)

  -- === Tese declarada — Setorial ===
  setores_alvo                text[]      NOT NULL DEFAULT '{}',
    -- Setores primários de interesse (ex: ['Saúde','Agronegócio'])
  sub_setores                 text[]      NOT NULL DEFAULT '{}',
    -- Granularidade ('Pecuária','AgriTech','Healthtech B2B')
  modelos_negocio             text[]      NOT NULL DEFAULT '{}',
    -- SaaS B2B | marketplace | infra | franquia | indústria | etc
  vertical_tags               text[]      NOT NULL DEFAULT '{}',
    -- Tags livres pra captura de nuance ('ESG','IoT','GenAI','reg-tech')

  -- === Tese declarada — Estágio/Maturidade ===
  estagios_aceitos            text[]      NOT NULL DEFAULT '{}',
    -- ideia | mvp | early_revenue | growth | mature | turnaround
  maturity_min_score          smallint,    -- 0-100 (Mandor maturity_score mínimo aceito)
  governance_min_score        smallint,    -- 0-100
  documentacao_min_score      smallint,    -- 0-100 (institucionais exigem ≥80, anjos ~40)
  risk_max_score              smallint,    -- 0-100 (Mandor risk; quanto menor, menor risco aceito)

  -- === Tese declarada — Financeiro ===
  ticket_min_brl              bigint,      -- valor mínimo que tipicamente entra
  ticket_max_brl              bigint,      -- valor máximo
  receita_min_brl             bigint,      -- exigência de receita anual mínima do alvo
  receita_max_brl             bigint,
  ebitda_min_brl              bigint,
  ebitda_max_brl              bigint,
  margem_ebitda_min_pct       numeric(5,2),

  -- === Tese declarada — Deal ===
  tipos_deal_aceitos          text[]      NOT NULL DEFAULT '{}',
    -- equity | debt | convertible | m_and_a_sale | m_and_a_acquisition |
    -- earn_out | growth_equity | special_situations
  controle_aceito             text[]      NOT NULL DEFAULT '{}',
    -- minority | majority | full
  horizonte_saida_min_anos    smallint,
  horizonte_saida_max_anos    smallint,

  -- === Tese declarada — Geografia ===
  geografias_aceitas          text[]      NOT NULL DEFAULT '{}',
    -- ['SP','RJ','MG'] ou ['SUDESTE','SUL'] ou ['NACIONAL']
  geografias_excluidas        text[]      NOT NULL DEFAULT '{}',

  -- === Exclusões / qualificações ===
  setores_excluidos           text[]      NOT NULL DEFAULT '{}',
  requer_esg                  boolean     NOT NULL DEFAULT false,
  requer_audited_financials   boolean     NOT NULL DEFAULT false,
  requer_pronto_para_dd       boolean     NOT NULL DEFAULT false,

  -- === Tese narrativa (entra no embedding) ===
  tese_resumo                 text,        -- 1-2 parágrafos da estratégia
  tese_completa               text,        -- versão longa: visão, drivers, evite, prefira
  exemplos_deals_passados     text,        -- "investimos em X, Y, Z" — alimenta semântica

  -- === Embedding (voyage-3-large, 1024d — mesmo modelo do RAG da Mandor) ===
  tese_embedding              vector(1024),
  tese_embedding_model        text,        -- 'voyage-3-large' (rastreabilidade)
  tese_embedding_at           timestamptz,

  -- === Sinais comportamentais (alimentados pelo loop) ===
  matches_recebidos           integer     NOT NULL DEFAULT 0,
  matches_aprovados           integer     NOT NULL DEFAULT 0,
  matches_rejeitados          integer     NOT NULL DEFAULT 0,
  ndas_assinados              integer     NOT NULL DEFAULT 0,
  deals_fechados              integer     NOT NULL DEFAULT 0,
  response_avg_hours          numeric(8,2),
  ultima_atividade_em         timestamptz,

  -- === Estado ===
  status                      text        NOT NULL DEFAULT 'ativo',
    -- ativo | pausado | arquivado
  observacoes                 text,

  -- === Auditoria ===
  criado_por                  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em                   timestamptz NOT NULL DEFAULT now(),
  atualizado_em               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_investidores_escritorio
  ON public.investidores (escritorio_id);

CREATE INDEX IF NOT EXISTS idx_investidores_user
  ON public.investidores (user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_investidores_status
  ON public.investidores (escritorio_id, status);

CREATE INDEX IF NOT EXISTS idx_investidores_setores
  ON public.investidores USING gin (setores_alvo);

CREATE INDEX IF NOT EXISTS idx_investidores_estagios
  ON public.investidores USING gin (estagios_aceitos);

CREATE INDEX IF NOT EXISTS idx_investidores_geografias
  ON public.investidores USING gin (geografias_aceitas);

-- HNSW index só faz sentido quando há embeddings; criar mesmo vazio
-- (consistência com idx_document_chunks_embedding_hnsw da Mandor)
CREATE INDEX IF NOT EXISTS idx_investidores_tese_embedding_hnsw
  ON public.investidores USING hnsw (tese_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Trigger de atualizado_em definido mais abaixo (seção "Função auxiliar"),
-- após a função set_atualizado_em() — que usa a coluna 'atualizado_em' (PT),
-- diferente da set_updated_at() existente que espera 'updated_at' (inglês).


-- ============================================================
-- 2) teses — Tese estruturada do projeto/empresa
-- ============================================================
-- Origem 'mandor': criada automaticamente a partir de uma análise consolidada
-- (lê analises.mesa_revisao + analises.fact_bank + analise_facts), via:
--   POST /api/invest-match/teses/from-analise { analise_id }
-- O agente "Thesis Builder" (Claude Sonnet) extrai os campos estruturados
-- a partir da Mandor, gera narrativa, e calcula embedding via voyage-3-large.
--
-- Origem 'manual': criada direto na UI (CRM modo legado, sem Mandor).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teses (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id               uuid        REFERENCES public.escritorios(id) ON DELETE CASCADE NOT NULL,
  analise_id                  uuid        REFERENCES public.analises(id) ON DELETE SET NULL,
    -- NULL = tese manual; preenchido = espelha uma análise Mandor
  origem                      text        NOT NULL DEFAULT 'manual',
    -- mandor | manual | importada
  origem_model_id             text,        -- modelo Claude que gerou (rastreabilidade)
  origem_payload              jsonb,       -- snapshot do que Mandor entregou (debug + reprocessamento)

  -- === Identidade do projeto ===
  empresa_nome                text        NOT NULL,
  empresa_codinome            text,        -- nome blind ("Projeto Alpha")
  is_blind                    boolean     NOT NULL DEFAULT true,
    -- false = nome revelado pós-NDA. UI usa codinome quando is_blind=true.
  empresa_descricao_curta     text,

  -- === Setorial ===
  setor_primario              text        NOT NULL,
  sub_setores                 text[]      NOT NULL DEFAULT '{}',
  modelos_negocio             text[]      NOT NULL DEFAULT '{}',
  vertical_tags               text[]      NOT NULL DEFAULT '{}',

  -- === Estágio e escala ===
  estagio                     text        NOT NULL,
    -- ideia | mvp | early_revenue | growth | mature | turnaround
  maturity_score              smallint,    -- 0-100 (vem da Mandor / mesa_revisao)
  anos_operacao               smallint,

  -- === Financeiro ===
  receita_anual_brl           bigint,
  ebitda_brl                  bigint,
  margem_ebitda_pct           numeric(5,2),
  crescimento_yoy_pct         numeric(5,2),
  capital_buscado_brl         bigint      NOT NULL,
  capital_minimo_ticket_brl   bigint,      -- "aceito 500k+" — diferente do total buscado
  uso_capital                 jsonb,       -- {capex:0.4, working_capital:0.3, m_and_a:0.2, time:0.1}
  valuation_pre_money_brl     bigint,
  equity_oferecido_pct        numeric(5,2),

  -- === Governança (Mandor) ===
  governance_score            smallint,    -- 0-100
  tem_conselho                boolean,
  tem_auditoria               boolean,
  nivel_compliance            text,        -- basico | intermediario | avancado

  -- === Risco (Mandor) ===
  risk_overall_score          smallint,    -- 0-100 (menor=menos risco)
  risk_factors                text[]      NOT NULL DEFAULT '{}',
    -- ['concentracao_clientes','regulatorio','dependencia_fundador']

  -- === Operacional (Mandor) ===
  operational_score           smallint,
  team_size                   smallint,
  key_dependencies            text[]      NOT NULL DEFAULT '{}',

  -- === Geografia ===
  hq_estado                   text,        -- UF
  hq_cidade                   text,
  regioes_operacao            text[]      NOT NULL DEFAULT '{}',

  -- === Deal ===
  tipo_deal                   text,
    -- equity | debt | convertible | m_and_a_sale | m_and_a_acquisition |
    -- earn_out | growth_equity | special_situations
  controle_oferecido          text,        -- minority | majority | full
  horizonte_saida_anos        smallint,
  urgencia                    text        NOT NULL DEFAULT 'media',
    -- baixa | media | alta (tempo até precisar fechar)

  -- === Documentação (Mandor) ===
  documentacao_score          smallint,    -- 0-100
  pronto_para_dd              boolean     NOT NULL DEFAULT false,

  -- === Exclusões / sinalizações ===
  tipos_investidor_excluidos  text[]      NOT NULL DEFAULT '{}',
  esg_compliant               boolean     NOT NULL DEFAULT false,

  -- === Narrativa (vai no embedding) ===
  tese_investimento           text,        -- resumo da tese (gerado pelo Builder)
  value_proposition           text,
  competitive_moat            text,
  risk_narrative              text,
  exit_story                  text,

  -- === Embedding ===
  tese_embedding              vector(1024),
  tese_embedding_model        text,
  tese_embedding_at           timestamptz,

  -- === Pipeline Kanban ===
  status                      text        NOT NULL DEFAULT 'lead',
    -- lead | atendimento | matches | negociacao | realizado | suspenso | arquivado

  -- === Auditoria ===
  criado_por                  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em                   timestamptz NOT NULL DEFAULT now(),
  atualizado_em               timestamptz NOT NULL DEFAULT now(),

  -- === Constraints ===
  -- Uma análise Mandor só pode gerar UMA tese (regenerar atualiza).
  CONSTRAINT teses_unique_analise UNIQUE (analise_id)
);

CREATE INDEX IF NOT EXISTS idx_teses_escritorio
  ON public.teses (escritorio_id);

CREATE INDEX IF NOT EXISTS idx_teses_analise
  ON public.teses (analise_id) WHERE analise_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_teses_status
  ON public.teses (escritorio_id, status);

CREATE INDEX IF NOT EXISTS idx_teses_setor
  ON public.teses (setor_primario);

CREATE INDEX IF NOT EXISTS idx_teses_sub_setores
  ON public.teses USING gin (sub_setores);

CREATE INDEX IF NOT EXISTS idx_teses_origem
  ON public.teses (origem);

CREATE INDEX IF NOT EXISTS idx_teses_tese_embedding_hnsw
  ON public.teses USING hnsw (tese_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);


-- ============================================================
-- 3) matches — Par (investidor × tese) com score multi-camada
-- ============================================================
-- Gerado pelo motor de matching (Inngest job) ao criar/atualizar tese
-- OU ao criar/atualizar tese de investidor.
--
-- Convenção de score:
--   - score_final < 70    → não persiste (descartado pelo motor)
--   - score_final 70-84   → status='sugerido' (aguarda curadoria admin)
--   - score_final >= 85   → status='aprovado_auto' (notifica direto)
--
-- Recálculos atualizam a linha existente (UNIQUE constraint).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.matches (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  investidor_id               uuid        NOT NULL REFERENCES public.investidores(id) ON DELETE CASCADE,
  tese_id                     uuid        NOT NULL REFERENCES public.teses(id) ON DELETE CASCADE,
  analise_id                  uuid        REFERENCES public.analises(id) ON DELETE SET NULL,
    -- Denormalizado pra otimizar JOIN com Mandor (FK opcional, copia de teses.analise_id)
  escritorio_id               uuid        NOT NULL REFERENCES public.escritorios(id) ON DELETE CASCADE,

  -- === Scores ===
  score_final                 numeric(5,2) NOT NULL,
    -- 0-100, composto: 50% estruturado + 20% semântico + 30% LLM
  score_estruturado           numeric(5,2),
    -- 0-100, média ponderada das 10 dimensões (setorial, ticket, stage, etc)
  score_semantico             numeric(5,2),
    -- 0-100 (cosine similarity * 100; 100 = idêntico)
  score_llm                   numeric(5,2),
    -- 0-100, synergy_score do LLM Judge

  score_breakdown             jsonb       NOT NULL DEFAULT '{}'::jsonb,
    -- Detalhamento por dimensão (auditabilidade obrigatória):
    -- {
    --   "setorial":         { "score": 90, "peso": 0.20, "motivo": "match direto Saúde" },
    --   "ticket":           { "score": 75, "peso": 0.15, "motivo": "ticket buscado dentro do range" },
    --   "stage":            { "score": 100, "peso": 0.10, "motivo": "exato: growth" },
    --   "maturity":         { "score": 80, "peso": 0.10, "motivo": "score 75 vs mínimo 60" },
    --   "governance":       { "score": 70, "peso": 0.10, ... },
    --   "risk":             { "score": 65, "peso": 0.10, ... },
    --   "geography":        { "score": 100, "peso": 0.05, ... },
    --   "documentation":    { "score": 85, "peso": 0.10, ... },
    --   "exit_horizon":     { "score": 80, "peso": 0.05, ... },
    --   "urgency":          { "score": 60, "peso": 0.05, ... }
    -- }

  -- === Hard filter (Camada 1) ===
  passou_hard_filter          boolean     NOT NULL DEFAULT true,
  motivos_bloqueio            text[]      NOT NULL DEFAULT '{}',
    -- Quando false: ['ticket_fora_range','setor_excluido','geografia_incompativel']

  -- === LLM Judge (Camada 4) ===
  llm_recommendation          text,        -- strong_match | review | skip
  llm_strengths               text[]      NOT NULL DEFAULT '{}',
  llm_concerns                text[]      NOT NULL DEFAULT '{}',
  llm_talking_points          text[]      NOT NULL DEFAULT '{}',
  llm_close_probability       smallint,    -- 0-100
  llm_resumo                  text,        -- 1-2 frases pro card de match
  llm_model_id                text,        -- claude-sonnet-4-6 esperado
  llm_payload                 jsonb,       -- raw output pra debug

  -- === Pipeline do match (separado de teses.status) ===
  status                      text        NOT NULL DEFAULT 'sugerido',
    -- sugerido | aprovado_auto | aprovado_admin | notificado |
    -- em_negociacao | nda | proposta | dd | fechado |
    -- rejeitado_admin | rejeitado_investidor | rejeitado_projeto | descartado
  rejeicao_motivo             text,

  tags                        text[]      NOT NULL DEFAULT '{}',
    -- ['nda_assinado','reuniao_realizada','proposta_enviada','em_diligencia']
    -- Equivalente ao NEGOTIATION_TAGS do CRM v1 (mas em snake_case)

  -- === Marcos temporais ===
  calculado_em                timestamptz NOT NULL DEFAULT now(),
  motor_versao                text        NOT NULL DEFAULT 'v2.0',
    -- versionamento do motor pra A/B testing futuro
  aprovado_em                 timestamptz,
  aprovado_por                uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  notificado_em               timestamptz,
  primeiro_contato_em         timestamptz,
  fechado_em                  timestamptz,

  criado_em                   timestamptz NOT NULL DEFAULT now(),
  atualizado_em               timestamptz NOT NULL DEFAULT now(),

  -- Um par (investidor, tese) tem APENAS UM match. Recálculos UPDATE-am.
  CONSTRAINT matches_unique_par UNIQUE (investidor_id, tese_id),
  CONSTRAINT matches_score_range CHECK (score_final >= 0 AND score_final <= 100)
);

CREATE INDEX IF NOT EXISTS idx_matches_investidor
  ON public.matches (investidor_id, score_final DESC);

CREATE INDEX IF NOT EXISTS idx_matches_tese
  ON public.matches (tese_id, score_final DESC);

CREATE INDEX IF NOT EXISTS idx_matches_escritorio_status
  ON public.matches (escritorio_id, status);

CREATE INDEX IF NOT EXISTS idx_matches_analise
  ON public.matches (analise_id) WHERE analise_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_matches_pendentes
  ON public.matches (escritorio_id, calculado_em DESC)
  WHERE status IN ('sugerido','aprovado_auto');


-- ============================================================
-- 4) match_feedback — Loop de qualidade
-- ============================================================
-- Sempre que um humano (admin, investidor, projeto) avalia um match
-- ou quando o match avança para milestone real, persistir aqui.
-- O motor consome esses dados periodicamente pra recalibrar pesos
-- e gerar a "tese revelada" de cada investidor (vs a declarada).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.match_feedback (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id                    uuid        NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  escritorio_id               uuid        NOT NULL REFERENCES public.escritorios(id) ON DELETE CASCADE,
  user_id                     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- === Quem avaliou ===
  rated_by                    text        NOT NULL,
    -- admin | investidor | projeto | sistema_outcome
    -- 'sistema_outcome' = evento automático (ex: deal fechou → feedback positivo)

  -- === Avaliação qualitativa (escala Likert 5) ===
  avaliacao                   text,
    -- muito_bom | bom | neutro | ruim | muito_ruim | null=so_outcome
  motivo                      text,        -- texto livre

  -- === Avaliação por dimensão (opcional) ===
  -- Permite feedback granular: "o match foi bom em setor mas ruim em ticket"
  dimensoes_feedback          jsonb       NOT NULL DEFAULT '{}'::jsonb,
    -- { setorial: 'bom', ticket: 'ruim', stage: 'neutro', ... }

  -- === Outcome real ===
  avancou_para                text,
    -- nda | reuniao | proposta | dd | fechado | abandonado
  outcome_valor_brl           bigint,      -- valor real do deal (quando fechado)
  outcome_tempo_dias          integer,     -- dias entre notificação e milestone

  payload                     jsonb,       -- dados extras / contexto
  criado_em                   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_feedback_match
  ON public.match_feedback (match_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_match_feedback_escritorio
  ON public.match_feedback (escritorio_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_match_feedback_outcome
  ON public.match_feedback (escritorio_id, avancou_para)
  WHERE avancou_para IS NOT NULL;


-- ============================================================
-- Função auxiliar: trigger de atualizado_em (timestamps em PT)
-- ============================================================
-- A função set_updated_at existente (de 20260513_blog_posts) atualiza
-- 'updated_at' (inglês). Como o restante do schema em PT usa 'atualizado_em',
-- criamos a variante.
CREATE OR REPLACE FUNCTION public.set_atualizado_em()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS investidores_atualizado_em ON public.investidores;
CREATE TRIGGER investidores_atualizado_em
  BEFORE UPDATE ON public.investidores
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

CREATE TRIGGER teses_atualizado_em
  BEFORE UPDATE ON public.teses
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

CREATE TRIGGER matches_atualizado_em
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();


-- ============================================================
-- 5) Função SQL: invest_match_buscar_candidatos
-- ============================================================
-- Camada 1 (hard filter) + Camada 2 (structured score parcial em SQL)
-- para uma tese dada. Retorna investidores ordenados por score estruturado.
-- O motor TS chama esta função, depois aplica embeddings (Camada 3) e LLM
-- (Camada 4) sobre o top-K, e finalmente persiste em matches.
--
-- Pesos da camada estruturada (somam 1.0):
--   setorial:         0.20
--   ticket:           0.15
--   stage:            0.10
--   maturity:         0.10
--   governance:       0.10
--   risk:             0.10
--   geography:        0.05
--   documentation:    0.10
--   exit_horizon:     0.05
--   urgency:          0.05
-- ============================================================
CREATE OR REPLACE FUNCTION public.invest_match_buscar_candidatos(
  p_tese_id        uuid,
  p_limit          integer DEFAULT 50,
  p_min_score      numeric DEFAULT 50.0
)
RETURNS TABLE (
  investidor_id          uuid,
  nome                   text,
  score_estruturado      numeric,
  passou_hard_filter     boolean,
  motivos_bloqueio       text[],
  breakdown              jsonb
)
LANGUAGE plpgsql STABLE PARALLEL SAFE AS $$
DECLARE
  v_tese  public.teses%ROWTYPE;
BEGIN
  SELECT * INTO v_tese FROM public.teses WHERE id = p_tese_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tese % não encontrada', p_tese_id;
  END IF;

  RETURN QUERY
  WITH calc AS (
    SELECT
      i.id                            AS investidor_id,
      i.nome                          AS nome,

      -- === Hard filter ===
      -- Bloqueia se ticket fora do range, setor excluído, geografia excluída
      -- ou exigência ESG/audit/DD não cumprida
      (
        (i.ticket_min_brl IS NULL OR v_tese.capital_buscado_brl >= i.ticket_min_brl) AND
        (i.ticket_max_brl IS NULL OR v_tese.capital_buscado_brl <= i.ticket_max_brl) AND
        NOT (v_tese.setor_primario = ANY(i.setores_excluidos)) AND
        NOT (i.requer_esg AND NOT v_tese.esg_compliant) AND
        NOT (i.requer_pronto_para_dd AND NOT v_tese.pronto_para_dd) AND
        (
          cardinality(i.geografias_aceitas) = 0
          OR v_tese.hq_estado = ANY(i.geografias_aceitas)
          OR 'NACIONAL' = ANY(i.geografias_aceitas)
        ) AND
        NOT (v_tese.hq_estado IS NOT NULL AND v_tese.hq_estado = ANY(i.geografias_excluidas))
      ) AS passou_hard_filter,

      -- === Motivos de bloqueio (array text) ===
      ARRAY_REMOVE(ARRAY[
        CASE WHEN i.ticket_min_brl IS NOT NULL AND v_tese.capital_buscado_brl < i.ticket_min_brl
             THEN 'ticket_abaixo_minimo' END,
        CASE WHEN i.ticket_max_brl IS NOT NULL AND v_tese.capital_buscado_brl > i.ticket_max_brl
             THEN 'ticket_acima_maximo' END,
        CASE WHEN v_tese.setor_primario = ANY(i.setores_excluidos)
             THEN 'setor_excluido' END,
        CASE WHEN i.requer_esg AND NOT v_tese.esg_compliant
             THEN 'esg_nao_compliant' END,
        CASE WHEN i.requer_pronto_para_dd AND NOT v_tese.pronto_para_dd
             THEN 'projeto_nao_pronto_para_dd' END,
        CASE WHEN cardinality(i.geografias_aceitas) > 0
             AND NOT (v_tese.hq_estado = ANY(i.geografias_aceitas))
             AND NOT ('NACIONAL' = ANY(i.geografias_aceitas))
             THEN 'geografia_incompativel' END,
        CASE WHEN v_tese.hq_estado IS NOT NULL AND v_tese.hq_estado = ANY(i.geografias_excluidas)
             THEN 'geografia_excluida' END
      ], NULL) AS motivos_bloqueio,

      -- ===========================================
      -- Camada 2 — Structured scoring por dimensão
      -- ===========================================
      -- setorial: match direto = 100; sub-setor compartilhado = 70; tag = 40
      (CASE
        WHEN v_tese.setor_primario = ANY(i.setores_alvo)                       THEN 100
        WHEN v_tese.sub_setores && i.sub_setores                               THEN 70
        WHEN v_tese.vertical_tags && i.vertical_tags                           THEN 50
        WHEN cardinality(i.setores_alvo) = 0                                   THEN 60
        ELSE 0
      END)::numeric AS s_setorial,

      -- ticket: gaussiana ao redor do centro do range. Já passou hard filter.
      (CASE
        WHEN i.ticket_min_brl IS NULL OR i.ticket_max_brl IS NULL              THEN 70
        WHEN v_tese.capital_buscado_brl BETWEEN i.ticket_min_brl AND i.ticket_max_brl THEN
          -- Score=100 no centro, 70 nos extremos
          GREATEST(70,
            100 - 30 * ABS(
              (v_tese.capital_buscado_brl::numeric - (i.ticket_min_brl + i.ticket_max_brl)::numeric / 2)
              / NULLIF((i.ticket_max_brl - i.ticket_min_brl)::numeric / 2, 0)
            ))
        ELSE 0
      END)::numeric AS s_ticket,

      -- stage: match exato=100, vizinho=60, demais=20
      (CASE
        WHEN v_tese.estagio = ANY(i.estagios_aceitos)                          THEN 100
        WHEN cardinality(i.estagios_aceitos) = 0                               THEN 50
        ELSE 20
      END)::numeric AS s_stage,

      -- maturity: ≥ min do investidor=100, em 80% disso=70, abaixo=30
      (CASE
        WHEN i.maturity_min_score IS NULL                                      THEN 70
        WHEN v_tese.maturity_score IS NULL                                     THEN 40
        WHEN v_tese.maturity_score >= i.maturity_min_score                     THEN 100
        WHEN v_tese.maturity_score >= i.maturity_min_score * 0.8               THEN 70
        ELSE 30
      END)::numeric AS s_maturity,

      -- governance: igual maturity
      (CASE
        WHEN i.governance_min_score IS NULL                                    THEN 70
        WHEN v_tese.governance_score IS NULL                                   THEN 40
        WHEN v_tese.governance_score >= i.governance_min_score                 THEN 100
        WHEN v_tese.governance_score >= i.governance_min_score * 0.8           THEN 70
        ELSE 30
      END)::numeric AS s_governance,

      -- risk: tese.risk <= investidor.risk_max
      (CASE
        WHEN i.risk_max_score IS NULL                                          THEN 70
        WHEN v_tese.risk_overall_score IS NULL                                 THEN 40
        WHEN v_tese.risk_overall_score <= i.risk_max_score                     THEN 100
        WHEN v_tese.risk_overall_score <= i.risk_max_score * 1.2               THEN 60
        ELSE 20
      END)::numeric AS s_risk,

      -- geography: match estado=100, mesma região (heurística)=70, nacional=80
      (CASE
        WHEN v_tese.hq_estado IS NULL OR cardinality(i.geografias_aceitas) = 0 THEN 70
        WHEN v_tese.hq_estado = ANY(i.geografias_aceitas)                      THEN 100
        WHEN 'NACIONAL' = ANY(i.geografias_aceitas)                            THEN 80
        ELSE 30
      END)::numeric AS s_geography,

      -- documentation: igual maturity
      (CASE
        WHEN i.documentacao_min_score IS NULL                                  THEN 70
        WHEN v_tese.documentacao_score IS NULL                                 THEN 40
        WHEN v_tese.documentacao_score >= i.documentacao_min_score             THEN 100
        WHEN v_tese.documentacao_score >= i.documentacao_min_score * 0.8       THEN 65
        ELSE 25
      END)::numeric AS s_documentation,

      -- exit_horizon: tese.horizonte_saida_anos dentro do range do investidor
      (CASE
        WHEN i.horizonte_saida_min_anos IS NULL OR i.horizonte_saida_max_anos IS NULL THEN 70
        WHEN v_tese.horizonte_saida_anos IS NULL                               THEN 50
        WHEN v_tese.horizonte_saida_anos BETWEEN i.horizonte_saida_min_anos AND i.horizonte_saida_max_anos THEN 100
        ELSE 40
      END)::numeric AS s_exit_horizon,

      -- urgency: alta=100 (todo investidor aceita rápido), media=80, baixa=60
      (CASE v_tese.urgencia
        WHEN 'alta'  THEN 100
        WHEN 'media' THEN 80
        WHEN 'baixa' THEN 60
        ELSE 70
      END)::numeric AS s_urgency

    FROM public.investidores i
    WHERE i.escritorio_id = v_tese.escritorio_id
      AND i.status = 'ativo'
  )
  SELECT
    c.investidor_id,
    c.nome,
    -- Score estruturado final (média ponderada)
    ROUND((
      c.s_setorial      * 0.20 +
      c.s_ticket        * 0.15 +
      c.s_stage         * 0.10 +
      c.s_maturity      * 0.10 +
      c.s_governance    * 0.10 +
      c.s_risk          * 0.10 +
      c.s_geography     * 0.05 +
      c.s_documentation * 0.10 +
      c.s_exit_horizon  * 0.05 +
      c.s_urgency       * 0.05
    )::numeric, 2) AS score_estruturado,
    c.passou_hard_filter,
    c.motivos_bloqueio,
    jsonb_build_object(
      'setorial',       jsonb_build_object('score', c.s_setorial,      'peso', 0.20),
      'ticket',         jsonb_build_object('score', c.s_ticket,        'peso', 0.15),
      'stage',          jsonb_build_object('score', c.s_stage,         'peso', 0.10),
      'maturity',       jsonb_build_object('score', c.s_maturity,      'peso', 0.10),
      'governance',     jsonb_build_object('score', c.s_governance,    'peso', 0.10),
      'risk',           jsonb_build_object('score', c.s_risk,          'peso', 0.10),
      'geography',      jsonb_build_object('score', c.s_geography,     'peso', 0.05),
      'documentation',  jsonb_build_object('score', c.s_documentation, 'peso', 0.10),
      'exit_horizon',   jsonb_build_object('score', c.s_exit_horizon,  'peso', 0.05),
      'urgency',        jsonb_build_object('score', c.s_urgency,       'peso', 0.05)
    ) AS breakdown
  FROM calc c
  WHERE c.passou_hard_filter = true
    AND (
      c.s_setorial * 0.20 + c.s_ticket * 0.15 + c.s_stage * 0.10 + c.s_maturity * 0.10 +
      c.s_governance * 0.10 + c.s_risk * 0.10 + c.s_geography * 0.05 + c.s_documentation * 0.10 +
      c.s_exit_horizon * 0.05 + c.s_urgency * 0.05
    ) >= p_min_score
  ORDER BY score_estruturado DESC
  LIMIT p_limit;
END;
$$;


-- ============================================================
-- 6) Função SQL: invest_match_busca_semantica
-- ============================================================
-- Camada 3 (semantic). Dado o embedding de uma tese, retorna os top-K
-- investidores por similaridade cosine. Combina com hard filter (escritório
-- + status ativo + tem embedding).
-- ============================================================
CREATE OR REPLACE FUNCTION public.invest_match_busca_semantica(
  p_tese_id           uuid,
  p_match_count       integer DEFAULT 20,
  p_similarity_min    double precision DEFAULT 0.5
)
RETURNS TABLE (
  investidor_id  uuid,
  nome           text,
  similarity     double precision
)
LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT
    i.id   AS investidor_id,
    i.nome AS nome,
    1 - (i.tese_embedding <=> t.tese_embedding) AS similarity
  FROM public.investidores i
  JOIN public.teses t ON t.id = p_tese_id
  WHERE i.escritorio_id = t.escritorio_id
    AND i.status = 'ativo'
    AND i.tese_embedding IS NOT NULL
    AND t.tese_embedding IS NOT NULL
    AND 1 - (i.tese_embedding <=> t.tese_embedding) >= p_similarity_min
  ORDER BY i.tese_embedding <=> t.tese_embedding
  LIMIT p_match_count;
$$;


-- ============================================================
-- 7) Row Level Security
-- ============================================================
ALTER TABLE public.investidores   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_feedback ENABLE ROW LEVEL SECURITY;

-- === investidores ===
-- Membros do escritório (perfis.escritorio_id) leem investidores do próprio escritório.
CREATE POLICY "investidores_read_escritorio_members" ON public.investidores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.perfis
      WHERE perfis.user_id = auth.uid()
        AND perfis.escritorio_id = investidores.escritorio_id
    )
    OR EXISTS (
      SELECT 1 FROM public.escritorios
      WHERE escritorios.id = investidores.escritorio_id
        AND escritorios.user_id = auth.uid()
    )
  );

CREATE POLICY "investidores_write_escritorio_members" ON public.investidores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.perfis
      WHERE perfis.user_id = auth.uid()
        AND perfis.escritorio_id = investidores.escritorio_id
    )
    OR EXISTS (
      SELECT 1 FROM public.escritorios
      WHERE escritorios.id = investidores.escritorio_id
        AND escritorios.user_id = auth.uid()
    )
  );

CREATE POLICY "investidores_service" ON public.investidores
  FOR ALL TO service_role USING (true);

-- === teses ===
CREATE POLICY "teses_read_escritorio_members" ON public.teses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.perfis
      WHERE perfis.user_id = auth.uid()
        AND perfis.escritorio_id = teses.escritorio_id
    )
    OR EXISTS (
      SELECT 1 FROM public.escritorios
      WHERE escritorios.id = teses.escritorio_id
        AND escritorios.user_id = auth.uid()
    )
    OR (
      teses.analise_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.deal_members
        WHERE deal_members.analise_id = teses.analise_id
          AND deal_members.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "teses_write_escritorio_members" ON public.teses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.perfis
      WHERE perfis.user_id = auth.uid()
        AND perfis.escritorio_id = teses.escritorio_id
    )
    OR EXISTS (
      SELECT 1 FROM public.escritorios
      WHERE escritorios.id = teses.escritorio_id
        AND escritorios.user_id = auth.uid()
    )
  );

CREATE POLICY "teses_service" ON public.teses
  FOR ALL TO service_role USING (true);

-- === matches ===
CREATE POLICY "matches_read_escritorio_members" ON public.matches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.perfis
      WHERE perfis.user_id = auth.uid()
        AND perfis.escritorio_id = matches.escritorio_id
    )
    OR EXISTS (
      SELECT 1 FROM public.escritorios
      WHERE escritorios.id = matches.escritorio_id
        AND escritorios.user_id = auth.uid()
    )
  );

CREATE POLICY "matches_write_escritorio_members" ON public.matches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.perfis
      WHERE perfis.user_id = auth.uid()
        AND perfis.escritorio_id = matches.escritorio_id
    )
    OR EXISTS (
      SELECT 1 FROM public.escritorios
      WHERE escritorios.id = matches.escritorio_id
        AND escritorios.user_id = auth.uid()
    )
  );

CREATE POLICY "matches_service" ON public.matches
  FOR ALL TO service_role USING (true);

-- === match_feedback ===
CREATE POLICY "match_feedback_read_escritorio" ON public.match_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.perfis
      WHERE perfis.user_id = auth.uid()
        AND perfis.escritorio_id = match_feedback.escritorio_id
    )
    OR EXISTS (
      SELECT 1 FROM public.escritorios
      WHERE escritorios.id = match_feedback.escritorio_id
        AND escritorios.user_id = auth.uid()
    )
  );

CREATE POLICY "match_feedback_insert_escritorio" ON public.match_feedback
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfis
      WHERE perfis.user_id = auth.uid()
        AND perfis.escritorio_id = match_feedback.escritorio_id
    )
    OR EXISTS (
      SELECT 1 FROM public.escritorios
      WHERE escritorios.id = match_feedback.escritorio_id
        AND escritorios.user_id = auth.uid()
    )
  );

CREATE POLICY "match_feedback_service" ON public.match_feedback
  FOR ALL TO service_role USING (true);


-- ============================================================
-- NOTAS
-- ============================================================
-- 1) Embedding dim: voyage-3-large = 1024 (consistente com document_chunks).
--    Se trocar pro futuro modelo, criar nova coluna ou tabela.
--
-- 2) score_breakdown é JSONB pra permitir evolução de pesos sem ALTER TABLE.
--    Toda mudança de peso é versionada em matches.motor_versao.
--
-- 3) tags em matches usa snake_case ('nda_assinado') para canonização.
--    Apresentação na UI converte para 'NDA Assinado' via lib/labels.ts.
--
-- 4) Performance: HNSW criado mesmo com tabela vazia (consistente com Mandor).
--    Quando a base crescer >100k linhas, considerar REINDEX CONCURRENTLY.
--
-- 5) Próximas migrations esperadas:
--    20260521_invest_match_taxonomia.sql   — vocabulário controlado de setores
--    20260522_invest_match_score_history.sql — histórico de recálculos (audit)
--    20260523_invest_match_marketplace.sql — extensão pra deal flow API pública
