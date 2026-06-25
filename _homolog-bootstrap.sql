-- =============================================================
-- BOOTSTRAP DO BANCO DE HOMOLOGAÇÃO (mandor-homolog) — v3
-- Cole INTEIRO no SQL Editor do projeto NOVO e rode UMA vez.
-- Reset do schema public + base (lib/database.sql) + 33 migrations
-- em ordem de DEPENDÊNCIA (não alfabética).
-- =============================================================

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

INSERT INTO storage.buckets (id, name, public) VALUES ('analises','analises',false) ON CONFLICT (id) DO NOTHING;

-- ===== BASE: lib/database.sql =====
-- ============================================
-- RR7x Deal Intelligence Portal — Schema
-- Execute este SQL no Supabase: SQL Editor → New Query → Cole e rode
-- ============================================

-- Tabela de assinaturas
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plano TEXT CHECK (plano IN ('avulso', 'recorrente', 'enterprise')) NOT NULL,
  analises_restantes INTEGER, -- NULL = ilimitado
  status TEXT CHECK (status IN ('ativo', 'cancelado', 'pendente')) DEFAULT 'pendente',
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de análises
CREATE TABLE IF NOT EXISTS public.analises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome_ativo TEXT NOT NULL,
  deal_intake JSONB NOT NULL,
  status TEXT CHECK (status IN ('processando', 'concluido', 'erro')) DEFAULT 'processando',
  outputs JSONB DEFAULT '{}',
  pdf_url TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analises ENABLE ROW LEVEL SECURITY;

-- Policies: usuário vê apenas seus próprios dados
CREATE POLICY "users_own_subscriptions" ON public.subscriptions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_analises" ON public.analises
  FOR ALL USING (auth.uid() = user_id);

-- Service role bypassa RLS (usado pelo webhook do Stripe e pela API de análise)
CREATE POLICY "service_role_subscriptions" ON public.subscriptions
  FOR ALL TO service_role USING (true);

CREATE POLICY "service_role_analises" ON public.analises
  FOR ALL TO service_role USING (true);

-- Index para performance
CREATE INDEX IF NOT EXISTS idx_analises_user_id ON public.analises(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);

-- Tabela de aprendizados do administrador
-- Lida automaticamente por todos os agentes no início de cada análise
CREATE TABLE IF NOT EXISTS public.admin_feedbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  texto TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_feedbacks ENABLE ROW LEVEL SECURITY;

-- Apenas service_role acessa (somente admin via API)
CREATE POLICY "service_role_feedbacks" ON public.admin_feedbacks
  FOR ALL TO service_role USING (true);

-- Tabela de perfil do escritório (por usuário)
CREATE TABLE IF NOT EXISTS public.escritorios (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome              TEXT,
  cnpj              TEXT,
  endereco          TEXT,
  cidade_uf         TEXT,
  telefone          TEXT,
  email_contato     TEXT,
  site              TEXT,
  tagline           TEXT,
  logo_url          TEXT,
  criado_em         TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.escritorios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_escritorio" ON public.escritorios
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "service_role_escritorios" ON public.escritorios
  FOR ALL TO service_role USING (true);

-- Bucket público para logos dos escritórios
-- Execute no Supabase Dashboard > Storage > New bucket:
--   Nome: logos | Public: true
-- Ou via SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true) ON CONFLICT DO NOTHING;

-- ============================================
-- PIPELINE DE DEAL — Workflow Multi-Usuário
-- Execute este bloco separadamente após o schema base
-- ============================================

-- Estágio do pipeline na tabela de análises
ALTER TABLE public.analises
  ADD COLUMN IF NOT EXISTS pipeline_stage TEXT
    CHECK (pipeline_stage IN ('originacao','analise','compliance','comite','aprovado','rejeitado'))
    DEFAULT 'originacao';

-- Membros do deal: quem pode ver e participar além do owner
CREATE TABLE IF NOT EXISTS public.deal_members (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  analise_id  UUID REFERENCES public.analises(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role        TEXT CHECK (role IN ('originador','analista','compliance','parceiro','gestor')) NOT NULL,
  adicionado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(analise_id, user_id)
);

ALTER TABLE public.deal_members ENABLE ROW LEVEL SECURITY;

-- Membro pode ver os próprios registros
CREATE POLICY "deal_members_self" ON public.deal_members
  FOR SELECT USING (auth.uid() = user_id);

-- Owner da análise pode gerenciar membros
CREATE POLICY "deal_members_owner_manage" ON public.deal_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.analises
      WHERE id = analise_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "service_role_deal_members" ON public.deal_members
  FOR ALL TO service_role USING (true);

-- Histórico de eventos do pipeline: avanços de estágio e comentários
CREATE TABLE IF NOT EXISTS public.deal_pipeline_events (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  analise_id   UUID REFERENCES public.analises(id) ON DELETE CASCADE NOT NULL,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email   TEXT,
  tipo         TEXT CHECK (tipo IN ('stage_change','comment','aprovacao','rejeicao')) NOT NULL,
  stage_de     TEXT,
  stage_para   TEXT,
  comentario   TEXT,
  criado_em    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.deal_pipeline_events ENABLE ROW LEVEL SECURITY;

-- Owner e membros podem ver eventos
CREATE POLICY "pipeline_events_owner" ON public.deal_pipeline_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.analises WHERE id = analise_id AND user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.deal_members WHERE analise_id = deal_pipeline_events.analise_id AND user_id = auth.uid()
    )
  );

-- Owner e membros podem inserir eventos
CREATE POLICY "pipeline_events_insert" ON public.deal_pipeline_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analises WHERE id = analise_id AND user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.deal_members WHERE analise_id = deal_pipeline_events.analise_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "service_role_pipeline_events" ON public.deal_pipeline_events
  FOR ALL TO service_role USING (true);

-- Perfis públicos (read-only, para exibir nome/email dos membros)
CREATE TABLE IF NOT EXISTS public.perfis (
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome         TEXT,
  escritorio_id UUID REFERENCES public.escritorios(id) ON DELETE SET NULL,
  criado_em    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perfis_owner"        ON public.perfis FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "perfis_read"         ON public.perfis FOR SELECT USING (true);
CREATE POLICY "service_role_perfis" ON public.perfis FOR ALL TO service_role USING (true);

-- Indexes de performance
CREATE INDEX IF NOT EXISTS idx_deal_members_analise    ON public.deal_members(analise_id);
CREATE INDEX IF NOT EXISTS idx_deal_members_user       ON public.deal_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_analise ON public.deal_pipeline_events(analise_id);
CREATE INDEX IF NOT EXISTS idx_analises_pipeline_stage ON public.analises(pipeline_stage);

-- ============================================
-- Histórico de versões de output por agente
-- ============================================

CREATE TABLE IF NOT EXISTS public.deal_output_versions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  analise_id  UUID REFERENCES public.analises(id) ON DELETE CASCADE NOT NULL,
  step_key    TEXT NOT NULL,
  version_num INTEGER NOT NULL,
  content     TEXT NOT NULL,
  criado_em   TIMESTAMPTZ DEFAULT NOW()
);

-- Constraint: (analise_id, step_key, version_num) deve ser único
CREATE UNIQUE INDEX IF NOT EXISTS idx_output_versions_unique
  ON public.deal_output_versions(analise_id, step_key, version_num);

-- Index para busca por análise + step
CREATE INDEX IF NOT EXISTS idx_output_versions_analise_step
  ON public.deal_output_versions(analise_id, step_key, version_num DESC);

ALTER TABLE public.deal_output_versions ENABLE ROW LEVEL SECURITY;

-- Owner e membros podem ver versões
CREATE POLICY "output_versions_owner" ON public.deal_output_versions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.analises WHERE id = analise_id AND user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.deal_members WHERE analise_id = deal_output_versions.analise_id AND user_id = auth.uid())
  );

CREATE POLICY "service_role_output_versions" ON public.deal_output_versions
  FOR ALL TO service_role USING (true);

-- ============================================
-- Audit log estruturado por step de IA (#4)
-- Rastreabilidade regulatória: ICVM 598/2018
-- ============================================

CREATE TABLE IF NOT EXISTS public.deal_step_audit_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  analise_id      UUID REFERENCES public.analises(id) ON DELETE CASCADE NOT NULL,
  step_key        TEXT NOT NULL,
  model_id        TEXT NOT NULL,
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  -- snapshot do intake no momento da execução (o que a IA recebeu)
  intake_snapshot JSONB,
  -- quais steps anteriores estavam no contexto
  context_steps   TEXT[],
  -- se dados do BCB/CVM foram injetados
  external_data   JSONB DEFAULT '{}',
  ran_at          TIMESTAMPTZ DEFAULT NOW(),
  duration_ms     INTEGER
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_analise ON public.deal_step_audit_logs(analise_id, step_key, ran_at DESC);

ALTER TABLE public.deal_step_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_owner" ON public.deal_step_audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.analises WHERE id = analise_id AND user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.deal_members WHERE analise_id = deal_step_audit_logs.analise_id AND user_id = auth.uid())
  );

CREATE POLICY "service_role_audit_logs" ON public.deal_step_audit_logs
  FOR ALL TO service_role USING (true);

-- ============================================
-- Atestados de revisão pelo assessor (#4)
-- Prova de supervisão humana — ICVM 598/2018
-- ============================================

CREATE TABLE IF NOT EXISTS public.deal_attestations (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  analise_id    UUID REFERENCES public.analises(id) ON DELETE CASCADE NOT NULL,
  step_key      TEXT NOT NULL,
  version_num   INTEGER NOT NULL,
  attested_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  attested_email TEXT NOT NULL,
  -- texto exato que o assessor atestou ter revisado
  statement     TEXT NOT NULL DEFAULT 'Declaro que li, revisei e assumo responsabilidade pelo conteúdo deste relatório gerado com auxílio de IA, conforme ICVM 598/2018.',
  ip_address    TEXT,
  attested_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_attestations_unique
  ON public.deal_attestations(analise_id, step_key, version_num);

CREATE INDEX IF NOT EXISTS idx_attestations_analise
  ON public.deal_attestations(analise_id, step_key);

ALTER TABLE public.deal_attestations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attestations_owner" ON public.deal_attestations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.analises WHERE id = analise_id AND user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.deal_members WHERE analise_id = deal_attestations.analise_id AND user_id = auth.uid())
  );

CREATE POLICY "attestations_insert" ON public.deal_attestations
  FOR INSERT WITH CHECK (auth.uid() = attested_by);

CREATE POLICY "service_role_attestations" ON public.deal_attestations
  FOR ALL TO service_role USING (true);


-- ===== 20260513_blog_posts.sql =====
-- Blog posts table for Otto by RR7x content strategy
CREATE TABLE IF NOT EXISTS blog_posts (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  text        UNIQUE NOT NULL,
  title                 text        NOT NULL,
  excerpt               text,
  content               text        NOT NULL DEFAULT '',
  cover_image_url       text,
  author_name           text        NOT NULL DEFAULT 'Equipe Otto by RR7x',
  author_avatar_url     text,
  category              text,
  tags                  text[]      NOT NULL DEFAULT '{}',
  published             boolean     NOT NULL DEFAULT false,
  published_at          timestamptz,
  reading_time_minutes  integer     NOT NULL DEFAULT 5,
  -- SEO fields
  seo_title             text,
  seo_description       text,
  seo_keywords          text,
  -- Timestamps
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Index for fast slug lookup (used on every blog post page load)
CREATE INDEX IF NOT EXISTS blog_posts_slug_idx      ON blog_posts (slug);
-- Index for listing published posts ordered by date
CREATE INDEX IF NOT EXISTS blog_posts_published_idx ON blog_posts (published, published_at DESC);
-- Index for category filtering
CREATE INDEX IF NOT EXISTS blog_posts_category_idx  ON blog_posts (category) WHERE published = true;

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Row Level Security
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read published posts (public blog)
CREATE POLICY "public_read_published_posts"
  ON blog_posts FOR SELECT
  USING (published = true);

-- Service role bypasses RLS — admin API uses service role key
-- No additional policies needed for admin writes


-- ===== 20260515_agent_claims.sql =====
-- ============================================
-- Agent Claims (Mandor) — Fase 8 — 2026-05-15
-- Cada agente passa a emitir, ao final do seu output, um bloco
-- <!--CLAIMS-START-->{"claims":[...]}<!--CLAIMS-END--> com afirmações
-- estruturadas (assertion + fact_ids + benchmark_ids + confidence).
-- Essas claims viram a fonte da Consistency Engine (Fase 9) e da auditoria
-- granular de conclusões.
-- ============================================

CREATE TABLE IF NOT EXISTS public.agent_claims (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  analise_id      uuid        REFERENCES public.analises(id) ON DELETE CASCADE NOT NULL,

  -- Qual agente produziu (matching com chaves do DETAIL_TABS)
  step_key        text        NOT NULL,

  -- Tipo da afirmação (convenção textual):
  --   'numero'        — fato numérico (receita, EBITDA, ticket)
  --   'fato'          — afirmação binária ou de estado (doc disponível, sócio identificado)
  --   'recomendacao'  — ação proposta (recomendar FIDC, sugerir LOI)
  --   'risco'         — risco identificado
  --   'avaliacao'     — julgamento qualitativo (DRS, viabilidade, prioridade)
  claim_type      text        NOT NULL,

  -- A afirmação em si, em 1 frase
  assertion       text        NOT NULL,

  -- Referências a fatos no truth layer: ['F:tipo:chave', ...]
  fact_ids        text[]      NOT NULL DEFAULT '{}',

  -- Referências a benchmarks: ['B:INSTRUMENT:parameter', ...]
  benchmark_ids   text[]      NOT NULL DEFAULT '{}',

  -- Citação literal opcional (do documento de origem)
  source_quote    text,

  -- 0.00 — 1.00
  confidence      numeric(3,2) NOT NULL DEFAULT 0.50 CHECK (confidence >= 0 AND confidence <= 1),

  -- Metadata livre (linkagem com outras claims, contexto extra)
  metadata        jsonb,

  -- Versionamento: cada execução de step gera um set de claims; ao re-rodar,
  -- as claims antigas deste (analise_id, step_key) são deletadas e novas inseridas.
  -- run_at marca a execução que gerou.
  run_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_claims_analise
  ON public.agent_claims (analise_id);

CREATE INDEX IF NOT EXISTS idx_agent_claims_analise_step
  ON public.agent_claims (analise_id, step_key);

CREATE INDEX IF NOT EXISTS idx_agent_claims_analise_type
  ON public.agent_claims (analise_id, claim_type);

ALTER TABLE public.agent_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_claims_read_owner" ON public.agent_claims
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.analises WHERE id = analise_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.deal_members WHERE analise_id = agent_claims.analise_id AND user_id = auth.uid())
  );

CREATE POLICY "agent_claims_service" ON public.agent_claims
  FOR ALL TO service_role USING (true);


-- ===== 20260515_benchmarks.sql =====
-- ============================================
-- Benchmark Registry (Mandor) — Fase 7 — 2026-05-15
-- Regras de mercado versionadas para validação quantitativa de elegibilidade.
-- Substitui hardcode/alucinação por base auditável e editável pelo gestor.
-- ============================================

CREATE TABLE IF NOT EXISTS public.market_benchmarks (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tipo de instrumento financeiro / operação
  -- Convenção (texto livre, mas usar estes valores quando possível):
  -- 'FIDC' | 'CRI' | 'CRA' | 'CCB' | 'DEBENTURE' | 'DEBENTURE_INCENTIVADA'
  -- 'M_A_PME' | 'M_A_MEDIO' | 'M_A_TECH' | 'CREDITO_BANCARIO'
  instrument    text        NOT NULL,

  -- Parâmetro avaliado
  -- 'ticket_minimo' | 'ticket_maximo' | 'patrimonio_minimo_cedente'
  -- 'prazo_minimo_meses' | 'prazo_maximo_meses' | 'prazo_tipico_meses'
  -- 'spread_senior_pct_cdi' | 'spread_subordinado_pct_cdi'
  -- 'num_devedores_minimo' | 'concentracao_maxima_pct'
  -- 'multiplo_ebitda_min' | 'multiplo_ebitda_max'
  -- 'loan_to_value_maximo_pct' | 'custo_estruturacao_pct'
  parameter     text        NOT NULL,

  -- Range esperado (mínimo/máximo). Se for valor único, preencher os dois iguais.
  value_min     numeric     NOT NULL,
  value_max     numeric     NOT NULL CHECK (value_max >= value_min),

  -- Unidade: 'BRL' | 'pct' | 'multiplo' | 'meses' | 'qtd' | 'pct_cdi'
  unit          text        NOT NULL,

  -- Descrição em PT pra UI e prompts
  descricao     text,
  notes         text,
  source        text,        -- referência regulatória, paper, prática de mercado

  -- Versionamento temporal
  valid_from    date        NOT NULL DEFAULT current_date,
  valid_to      date,        -- NULL = ainda vigente

  -- Soft delete
  ativo         boolean     NOT NULL DEFAULT true,

  criado_por    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_benchmarks_instrument
  ON public.market_benchmarks (instrument)
  WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_benchmarks_instrument_parameter
  ON public.market_benchmarks (instrument, parameter)
  WHERE ativo = true;

ALTER TABLE public.market_benchmarks ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode LER benchmarks ativos
-- (agentes precisam consultar; assessores podem ver o porquê de um veredicto)
CREATE POLICY "benchmarks_read_authenticated" ON public.market_benchmarks
  FOR SELECT USING (auth.role() = 'authenticated' AND ativo = true);

-- Service role tem acesso total (escritas via API admin)
CREATE POLICY "benchmarks_service" ON public.market_benchmarks
  FOR ALL TO service_role USING (true);

-- ============================================
-- SEED: benchmarks iniciais
-- Baseado em práticas de mercado brasileiras (2024-2026).
-- Gestor pode editar via /dashboard/admin/benchmarks.
-- ============================================

INSERT INTO public.market_benchmarks (instrument, parameter, value_min, value_max, unit, descricao, source) VALUES
-- FIDC
('FIDC', 'ticket_minimo',              5000000,   10000000,  'BRL',    'Ticket mínimo típico para FIDC institucional',                     'Prática de mercado'),
('FIDC', 'patrimonio_minimo_cedente',  2000000,   2000000,   'BRL',    'Patrimônio líquido mínimo do cedente para originação relevante',   'CVM 175/22'),
('FIDC', 'prazo_tipico_meses',         36,        60,        'meses',  'Prazo típico de FIDC',                                             'Prática de mercado'),
('FIDC', 'num_devedores_minimo',       10,        10,        'qtd',    'Número mínimo de devedores para evitar concentração crítica',     'Prática de mercado'),
('FIDC', 'concentracao_maxima_pct',    20,        25,        'pct',    'Concentração máxima por devedor (% do PL)',                       'CVM 175/22'),
('FIDC', 'spread_senior_pct_cdi',      1.5,       3.5,       'pct_cdi','Spread típico da cota sênior sobre CDI',                          'Prática de mercado'),
('FIDC', 'spread_subordinado_pct_cdi', 5,         12,        'pct_cdi','Spread típico da cota subordinada sobre CDI',                     'Prática de mercado'),
('FIDC', 'custo_estruturacao_pct',     0.5,       2.0,       'pct',    'Custo de estruturação como % do ticket',                          'Prática de mercado'),

-- CRI (Crédito imobiliário)
('CRI', 'ticket_minimo',               10000000,  20000000,  'BRL',    'Ticket mínimo para CRI viável',                                    'Prática de mercado'),
('CRI', 'prazo_tipico_meses',          60,        180,       'meses',  'Prazo típico de CRI',                                              'Prática de mercado'),
('CRI', 'loan_to_value_maximo_pct',    70,        80,        'pct',    'LTV máximo aceito por instituições',                              'Prática de mercado'),

-- CRA (Crédito agronegócio)
('CRA', 'ticket_minimo',               10000000,  20000000,  'BRL',    'Ticket mínimo para CRA viável',                                    'Prática de mercado'),
('CRA', 'prazo_tipico_meses',          36,        120,       'meses',  'Prazo típico de CRA',                                              'Prática de mercado'),

-- CCB (Cédula de crédito bancário)
('CCB', 'ticket_minimo',               500000,    1000000,   'BRL',    'Ticket mínimo prático para CCB estruturada',                       'Prática de mercado'),
('CCB', 'prazo_minimo_meses',          6,         6,         'meses',  'Prazo mínimo prático',                                             'Prática de mercado'),
('CCB', 'prazo_maximo_meses',          60,        84,        'meses',  'Prazo máximo típico',                                              'Prática de mercado'),

-- Debênture (não incentivada)
('DEBENTURE', 'ticket_minimo',         50000000,  100000000, 'BRL',    'Ticket mínimo para emissão pública via ICVM 476',                  'CVM 476/09'),
('DEBENTURE', 'spread_tipico_pct_cdi', 1,         3,         'pct_cdi','Spread típico sobre CDI',                                          'Prática de mercado'),

-- Debênture incentivada (Lei 12.431)
('DEBENTURE_INCENTIVADA', 'ticket_minimo',       100000000, 200000000, 'BRL',   'Ticket mínimo prático',                                    'Lei 12.431/11'),
('DEBENTURE_INCENTIVADA', 'prazo_minimo_meses',  48,        48,        'meses', 'Prazo mínimo regulatório',                                  'Lei 12.431/11'),

-- M&A PME (small cap)
('M_A_PME', 'multiplo_ebitda_min',     3,         3,         'multiplo','Múltiplo EBITDA mínimo típico em PMEs',                            'Prática de mercado'),
('M_A_PME', 'multiplo_ebitda_max',     7,         8,         'multiplo','Múltiplo EBITDA máximo típico em PMEs',                            'Prática de mercado'),

-- M&A médio porte
('M_A_MEDIO', 'multiplo_ebitda_min',   5,         5,         'multiplo','Múltiplo EBITDA mínimo em médias empresas',                        'Prática de mercado'),
('M_A_MEDIO', 'multiplo_ebitda_max',   10,        12,        'multiplo','Múltiplo EBITDA máximo em médias empresas',                        'Prática de mercado'),

-- M&A tech / SaaS
('M_A_TECH', 'multiplo_ebitda_min',    8,         10,        'multiplo','Múltiplo EBITDA mínimo em tech/SaaS com tração',                   'Prática de mercado'),
('M_A_TECH', 'multiplo_ebitda_max',    20,        30,        'multiplo','Múltiplo EBITDA máximo em tech com alta tração',                   'Prática de mercado'),
('M_A_TECH', 'multiplo_receita_arr',   5,         15,        'multiplo','Múltiplo de receita (ARR) para SaaS',                              'Prática de mercado'),

-- Crédito bancário garantido
('CREDITO_BANCARIO', 'spread_pct_cdi',    1,      5,         'pct_cdi','Spread típico de crédito bancário garantido',                      'Prática de mercado'),
('CREDITO_BANCARIO', 'prazo_maximo_meses',60,     84,        'meses',  'Prazo máximo típico',                                              'Prática de mercado');


-- ===== 20260515_regeneracoes.sql =====
-- ============================================
-- Regenerações de Steps (Mandor) — 2026-05-15
-- Cada regeneração captura: briefing do assessor, decisão da IA Revisora,
-- e (após confirmação do assessor) marca executada + snapshot do output.
-- ============================================

CREATE TABLE IF NOT EXISTS public.regeneracoes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  analise_id      uuid        REFERENCES public.analises(id) ON DELETE CASCADE NOT NULL,
  step_key        text        NOT NULL,
  briefing_o_que  text        NOT NULL,
  briefing_motivo text        NOT NULL,
  ia_decisao      text        NOT NULL CHECK (ia_decisao IN ('aprovou', 'contra_argumentou')),
  ia_argumento    text        NOT NULL,
  ia_riscos       jsonb,
  output_anterior text,
  executada       boolean     NOT NULL DEFAULT false,
  executada_em    timestamptz,
  solicitada_por  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_regeneracoes_analise
  ON public.regeneracoes (analise_id, criado_em DESC);

-- Counter desnormalizado para checagem rápida do limite de 3 (Fase 4)
-- Incrementado quando uma regeneração é efetivamente executada.
ALTER TABLE public.analises
  ADD COLUMN IF NOT EXISTS regeneracoes_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.regeneracoes ENABLE ROW LEVEL SECURITY;

-- Owner da análise e membros do deal podem ler
CREATE POLICY "regeneracoes_read_owner" ON public.regeneracoes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.analises WHERE id = analise_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.deal_members WHERE analise_id = regeneracoes.analise_id AND user_id = auth.uid())
  );

-- Service role tem acesso total (escritas via API server-side)
CREATE POLICY "regeneracoes_service" ON public.regeneracoes
  FOR ALL TO service_role USING (true);


-- ===== 20260515_cascade.sql =====
-- ============================================
-- Cascade de Regeneração (Mandor) — 2026-05-15
-- Após uma regeneração executada, o agente "Detetive Dependência"
-- avalia quais outros agentes podem ter ficado inconsistentes e
-- registra a recomendação em cascade_steps (JSONB array).
-- ============================================

ALTER TABLE public.regeneracoes
  ADD COLUMN IF NOT EXISTS cascade_avaliada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cascade_avaliada_em timestamptz,
  ADD COLUMN IF NOT EXISTS cascade_steps jsonb;

-- Estrutura esperada em cascade_steps:
-- [
--   { "step_key": "analise_ma", "severidade": "alta", "justificativa": "..." },
--   { "step_key": "originacao", "severidade": "media", "justificativa": "..." }
-- ]

CREATE INDEX IF NOT EXISTS idx_regeneracoes_cascade_pendente
  ON public.regeneracoes (analise_id)
  WHERE executada = true AND cascade_avaliada = false;


-- ===== 20260515_consistency.sql =====
-- ============================================
-- Consistency Engine (Mandor) — Fase 9 — 2026-05-15
-- ============================================
-- Após todos os agentes rodarem, executa um conjunto de validações
-- determinísticas e armazena as inconsistências encontradas.
-- Issues bloqueantes mostram badge "REVISÃO PENDENTE" no relatório;
-- alertas exibem banner amarelo.

CREATE TABLE IF NOT EXISTS public.consistency_issues (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  analise_id         uuid        REFERENCES public.analises(id) ON DELETE CASCADE NOT NULL,

  -- Severidade
  --   'bloqueante' — número financeiro contraditório, eligibilidade violada
  --   'alerta'     — número fora de range esperado, fato divergente entre agentes
  --   'info'       — observação informativa, lacuna citada
  severidade         text        NOT NULL CHECK (severidade IN ('bloqueante', 'alerta', 'info')),

  -- Tipo de inconsistência
  --   'numero_divergente'        — claim numérico não bate com truth_layer
  --   'numero_inter_agente'      — dois agentes citam mesmo fact_id com valores diferentes
  --   'benchmark_violado'        — claim de recomendação viola benchmark (isEligible)
  --   'fato_contradito'          — claim contradiz fato registrado
  --   'lacuna_critica'           — agente fez claim que depende de lacuna registrada
  --   'recomendacao_sem_fonte'   — recomendação não cita fact_ids nem benchmark_ids
  tipo               text        NOT NULL,

  -- Resumo legível em PT
  resumo             text        NOT NULL,
  detalhes           jsonb,

  -- Rastreabilidade
  steps_envolvidos   text[]      NOT NULL DEFAULT '{}',
  fact_ids           text[]      NOT NULL DEFAULT '{}',
  benchmark_ids      text[]      NOT NULL DEFAULT '{}',
  claim_ids          uuid[]      NOT NULL DEFAULT '{}',

  -- Resolução manual (assessor revisou e marcou como ok)
  resolvido          boolean     NOT NULL DEFAULT false,
  resolvido_por      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  resolvido_em       timestamptz,
  resolucao_nota     text,

  criado_em          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consistency_analise
  ON public.consistency_issues (analise_id);

CREATE INDEX IF NOT EXISTS idx_consistency_analise_severidade
  ON public.consistency_issues (analise_id, severidade)
  WHERE resolvido = false;

ALTER TABLE public.consistency_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consistency_issues_read_owner" ON public.consistency_issues
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.analises WHERE id = analise_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.deal_members WHERE analise_id = consistency_issues.analise_id AND user_id = auth.uid())
  );

CREATE POLICY "consistency_issues_service" ON public.consistency_issues
  FOR ALL TO service_role USING (true);

-- Marca timestamp da última checagem na análise
ALTER TABLE public.analises
  ADD COLUMN IF NOT EXISTS consistency_checked_at timestamptz;


-- ===== 20260515_coverage.sql =====
-- ============================================
-- Coverage Validator (Mandor) — Fase 11 — 2026-05-15
-- ============================================
-- Após Mesa Consolidadora, valida se a análise cobriu todos os pontos
-- obrigatórios para o tipo de operação (FIDC, M&A venda, captação, etc).
-- Itens não cobertos são listados e podem disparar regeneração do agente
-- responsável.

ALTER TABLE public.analises
  ADD COLUMN IF NOT EXISTS coverage_check        jsonb,
  ADD COLUMN IF NOT EXISTS coverage_checked_at   timestamptz;

-- Shape esperado de coverage_check:
-- {
--   "tipo_operacao": "FIDC" | "M_A_VENDA" | "M_A_CAPTACAO" | "GERAL",
--   "items": [
--     {
--       "key": "ebitda_normalizado",
--       "label": "EBITDA ajustado/normalizado calculado",
--       "status": "coberto" | "parcial" | "nao_coberto",
--       "evidencia": "citação onde foi coberto",
--       "justificativa": "explica o status",
--       "agentes_responsaveis": ["diagnostico"]
--     }
--   ],
--   "resumo": { "coberto": 8, "parcial": 2, "nao_coberto": 1 },
--   "model_id": "claude-sonnet-4-6"
-- }


-- ===== 20260515_mesa_risk.sql =====
-- ============================================
-- Mesa Consolidadora + Risk Correlation (Mandor) — Fase 10 — 2026-05-15
-- ============================================
-- Sentinela: detecta SÍNDROMES cross-dimensionais (combinações de riscos)
-- via IA. Persiste como consistency_issues com tipo 'sindrome_sistemica'.
--
-- Mesa Consolidadora: revisor final institucional. Persiste seu veredito
-- estruturado em analises.mesa_revisao. Adiciona contradicao_semantica
-- como issue quando detecta.

-- Veredito da Mesa Consolidadora
ALTER TABLE public.analises
  ADD COLUMN IF NOT EXISTS mesa_revisao         jsonb,
  ADD COLUMN IF NOT EXISTS risk_correlation_at  timestamptz,
  ADD COLUMN IF NOT EXISTS mesa_revisao_at      timestamptz;

-- Shape esperado de mesa_revisao:
-- {
--   "aprovacao": "aprovado" | "aprovado_com_ressalvas" | "revisao_necessaria",
--   "diagnostico_final": "1-3 parágrafos resumindo análise geral",
--   "pontos_fortes": ["..."],
--   "pontos_fracos": ["..."],
--   "contradicoes_detectadas": [
--     { "descricao": "...", "agentes": ["x","y"], "criticidade": "alta" | "media" | "baixa" }
--   ],
--   "recomendacao_assessor": "ação prática para o assessor",
--   "model_id": "claude-sonnet-4-6"
-- }

-- Não precisa de tabela nova: usa consistency_issues com novos tipos:
-- 'sindrome_sistemica'      — emitida pela Sentinela
-- 'contradicao_semantica'   — emitida pela Mesa
-- (já que CHECK não restringe tipo, basta convenção)


-- ===== 20260515_pacotes.sql =====
-- ============================================
-- Pacotes de Análises (Mandor)
-- Cada escritório pode ter múltiplos pacotes; o gestor (role=admin) gerencia.
-- Consumo: cada análise criada decrementa do pacote ativo mais antigo (FIFO).
-- ============================================

CREATE TABLE IF NOT EXISTS public.pacotes (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id        uuid        REFERENCES public.escritorios(id) ON DELETE CASCADE NOT NULL,
  tipo                 text        NOT NULL CHECK (tipo IN ('pontual', 'institucional', 'corporativo')),
  analises_total       integer     NOT NULL CHECK (analises_total > 0),
  analises_consumidas  integer     NOT NULL DEFAULT 0 CHECK (analises_consumidas >= 0),
  status               text        NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'pausado', 'encerrado')),
  observacoes          text,
  criado_por           uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em            timestamptz NOT NULL DEFAULT now(),
  atualizado_em        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pacote_consumido_lte_total CHECK (analises_consumidas <= analises_total),
  CONSTRAINT institucional_max_20       CHECK (tipo <> 'institucional' OR analises_total <= 20)
);

CREATE INDEX IF NOT EXISTS idx_pacotes_escritorio
  ON public.pacotes (escritorio_id);

CREATE INDEX IF NOT EXISTS idx_pacotes_escritorio_ativo
  ON public.pacotes (escritorio_id, criado_em)
  WHERE status = 'ativo';

ALTER TABLE public.pacotes ENABLE ROW LEVEL SECURITY;

-- Membros do escritório (perfis.escritorio_id) podem ler pacotes do próprio escritório
CREATE POLICY "pacotes_read_escritorio_members" ON public.pacotes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.perfis
      WHERE perfis.user_id = auth.uid()
      AND perfis.escritorio_id = pacotes.escritorio_id
    )
  );

-- Dono do escritório (escritorios.user_id) também pode ler
CREATE POLICY "pacotes_read_escritorio_owner" ON public.pacotes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.escritorios
      WHERE escritorios.id = pacotes.escritorio_id
      AND escritorios.user_id = auth.uid()
    )
  );

-- Service role tem acesso total (admin via API + consumo automático)
CREATE POLICY "pacotes_service_role" ON public.pacotes
  FOR ALL TO service_role USING (true);

-- Nota: atualizado_em é atualizado manualmente nas rotas API (padrão das outras
-- tabelas em português neste projeto). Não usamos trigger aqui.

-- ============================================
-- Vínculo análise → pacote consumido
-- ============================================

ALTER TABLE public.analises
  ADD COLUMN IF NOT EXISTS pacote_id uuid REFERENCES public.pacotes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_analises_pacote
  ON public.analises (pacote_id);


-- ===== 20260515_truth_layer.sql =====
-- ============================================
-- Truth Layer / Memória Factual Consolidada (Mandor) — 2026-05-15
-- Fase 6 da reformulação multiagente.
--
-- Cada fato extraído da ingestão documental vira uma linha estruturada.
-- Agentes downstream consultam esta camada ANTES de afirmar disponibilidade
-- documental ou citar números financeiros, eliminando contradições entre
-- "DRE ausente" e "EBITDA calculado a partir da DRE".
-- ============================================

CREATE TABLE IF NOT EXISTS public.analise_facts (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  analise_id    uuid        REFERENCES public.analises(id) ON DELETE CASCADE NOT NULL,

  -- Taxonomia dos fatos. Mantém aberta (text + check de valores conhecidos
  -- por convenção, sem CHECK constraint pra permitir evolução).
  fact_type     text        NOT NULL,
  -- Exemplos esperados:
  --   'documento_disponivel'  → presença/ausência de docs
  --   'numero_financeiro'     → receita, ebitda, fluxo, dívida
  --   'estrutura_societaria'  → sócios e participações
  --   'contrato'              → contratos identificados
  --   'garantia'              → colaterais
  --   'passivo'               → passivos descobertos
  --   'evento_relevante'      → M&A history, processos
  --   'lacuna'                → o que NÃO foi encontrado (registrar é importante)

  -- Chave canônica do fato dentro do tipo (ex: 'dre_2024', 'ebitda_2024',
  -- 'socio_majoritario'). Permite getFact(analise, 'numero_financeiro', 'ebitda_2024').
  key           text        NOT NULL,

  -- Valor estruturado. Pode ser:
  --   numero: { "amount": 12500000, "unit": "BRL", "periodo": "2024" }
  --   booleano: { "value": true }
  --   string: { "value": "balanço_2024.pdf" }
  --   objeto complexo: { "nome": "João Silva", "participacao": 0.6 }
  value         jsonb       NOT NULL,

  -- Rastreabilidade
  source_doc    text,                       -- nome do arquivo de origem
  source_page   integer,                    -- página dentro do PDF (1-indexed)
  source_quote  text,                       -- trecho literal opcional do documento
  asserted_by   text        NOT NULL,       -- 'fact_extractor' | 'davi' | 'clara' | etc

  -- Confiança 0.00–1.00, calculada pelo extractor
  confidence    numeric(3,2) NOT NULL DEFAULT 0.50 CHECK (confidence >= 0 AND confidence <= 1),

  -- Notas livres (justificativa de baixa confiança, observações do extractor)
  notes         text,

  criado_em     timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint: para um mesmo type+key na mesma análise, só 1 fato
  -- (atualiza ao invés de duplicar). Quando precisar versionar, usar nova key.
  CONSTRAINT analise_facts_unique UNIQUE (analise_id, fact_type, key)
);

CREATE INDEX IF NOT EXISTS idx_analise_facts_analise
  ON public.analise_facts (analise_id);

CREATE INDEX IF NOT EXISTS idx_analise_facts_analise_type
  ON public.analise_facts (analise_id, fact_type);

ALTER TABLE public.analise_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analise_facts_read_owner" ON public.analise_facts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.analises WHERE id = analise_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.deal_members WHERE analise_id = analise_facts.analise_id AND user_id = auth.uid())
  );

CREATE POLICY "analise_facts_service" ON public.analise_facts
  FOR ALL TO service_role USING (true);

-- Flag denormalizado: indica se a extração de fatos já rodou pra essa análise.
-- Usado pelo /step para decidir se já pode injetar truth layer.
ALTER TABLE public.analises
  ADD COLUMN IF NOT EXISTS facts_extracted_at timestamptz;


-- ===== 20260516_benchmarks_escritorio.sql =====
-- ============================================
-- Benchmarks por escritório (Mandor) — Fase 12 — 2026-05-16
-- ============================================
-- Permite que cada escritório sobrescreva parâmetros específicos da
-- prática Mandor (global) sem perder a herança nos demais. Pipeline
-- faz merge: override do escritório ganha sobre o global.

-- 1. Adiciona escritorio_id (nullable = global; UUID = override do escritório)
ALTER TABLE public.market_benchmarks
  ADD COLUMN IF NOT EXISTS escritorio_id  uuid REFERENCES public.escritorios(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS version        integer NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_benchmarks_escritorio
  ON public.market_benchmarks (escritorio_id)
  WHERE escritorio_id IS NOT NULL;

-- 2. Constraints únicos parciais:
--   - 1 global ativo por (instrument, parameter)
--   - 1 override ativo por (instrument, parameter, escritorio_id)
-- Permite que o mesmo (instrument, parameter) tenha 1 global + N overrides.
DROP INDEX IF EXISTS market_benchmarks_global_unique;
CREATE UNIQUE INDEX market_benchmarks_global_unique
  ON public.market_benchmarks (instrument, parameter)
  WHERE escritorio_id IS NULL AND ativo = true;

DROP INDEX IF EXISTS market_benchmarks_escritorio_unique;
CREATE UNIQUE INDEX market_benchmarks_escritorio_unique
  ON public.market_benchmarks (instrument, parameter, escritorio_id)
  WHERE escritorio_id IS NOT NULL AND ativo = true;

-- 3. Atualiza policy de leitura para incluir overrides do próprio escritório
DROP POLICY IF EXISTS "benchmarks_read_authenticated" ON public.market_benchmarks;

CREATE POLICY "benchmarks_read_global" ON public.market_benchmarks
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND ativo = true
    AND escritorio_id IS NULL
  );

CREATE POLICY "benchmarks_read_own_escritorio" ON public.market_benchmarks
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND ativo = true
    AND escritorio_id IS NOT NULL
    AND (
      -- Membro do escritório (perfis.escritorio_id)
      EXISTS (
        SELECT 1 FROM public.perfis
        WHERE perfis.user_id = auth.uid()
        AND perfis.escritorio_id = market_benchmarks.escritorio_id
      )
      -- ou dono do escritório (escritorios.user_id)
      OR EXISTS (
        SELECT 1 FROM public.escritorios
        WHERE escritorios.id = market_benchmarks.escritorio_id
        AND escritorios.user_id = auth.uid()
      )
    )
  );


-- ===== 20260519_documents_chunks_pgvector.sql =====
-- ============================================
-- Documents + Chunks + Facts + pgvector (Mandor) — 2026-05-19
-- ============================================
-- Habilita ingestão assíncrona que LÊ 100% dos documentos:
--   1. Cada arquivo vira 1 linha em analise_documents (status trackeado)
--   2. Texto extraído (com OCR quando preciso) é quebrado em CHUNKS
--   3. Cada chunk recebe embedding (voyage-3-large, 1024 dim)
--   4. Fact extractor (Haiku) processa cada chunk → document_facts
--   5. Consolidator (Sonnet) gera fact_bank consolidado em analises
--
-- Pipeline downstream lê fact_bank compacto + RAG sob demanda.

-- Extensão pgvector (Supabase tem nativamente, idempotente)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- 1) analise_documents — 1 linha por arquivo enviado
-- ============================================
CREATE TABLE IF NOT EXISTS public.analise_documents (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  analise_id          uuid        NOT NULL REFERENCES public.analises(id) ON DELETE CASCADE,
  file_path           text        NOT NULL,            -- path no Storage
  file_name           text        NOT NULL,
  file_size_bytes     bigint      NOT NULL DEFAULT 0,
  mime_type           text,
  file_category       text        NOT NULL,            -- pdf | image | docx | excel | text | unsupported
  status              text        NOT NULL DEFAULT 'pending',
                                  -- pending | downloading | ocr | parsing | chunking | embedding | fact_extracting | completed | failed
  ocr_provider        text,                            -- mistral | tesseract | native | null
  pages_count         integer,
  total_chars         integer,
  total_chunks        integer     NOT NULL DEFAULT 0,
  chunks_completed    integer     NOT NULL DEFAULT 0,
  error_message       text,
  retry_count         integer     NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  completed_at        timestamptz,
  UNIQUE (analise_id, file_path)
);

CREATE INDEX IF NOT EXISTS idx_analise_documents_analise   ON public.analise_documents (analise_id);
CREATE INDEX IF NOT EXISTS idx_analise_documents_status    ON public.analise_documents (status) WHERE status NOT IN ('completed', 'failed');
CREATE INDEX IF NOT EXISTS idx_analise_documents_pending   ON public.analise_documents (analise_id, status) WHERE status != 'completed';

-- Trigger updated_at (reutiliza set_updated_at criada em 20260513_blog_posts.sql)
CREATE TRIGGER analise_documents_updated_at
  BEFORE UPDATE ON public.analise_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- 2) document_chunks — chunks com embedding pgvector
-- ============================================
-- voyage-3-large = 1024 dimensões.
-- Se trocar de modelo, criar nova coluna ou nova tabela (não dá pra ALTER vector dim).
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id         uuid        NOT NULL REFERENCES public.analise_documents(id) ON DELETE CASCADE,
  analise_id          uuid        NOT NULL REFERENCES public.analises(id) ON DELETE CASCADE,
  chunk_index         integer     NOT NULL,            -- ordem dentro do documento (0-based)
  chunk_text          text        NOT NULL,            -- conteúdo bruto do chunk
  char_start          integer     NOT NULL,
  char_end            integer     NOT NULL,
  page_start          integer,
  page_end            integer,
  token_count         integer     NOT NULL,
  embedding           vector(1024),                    -- voyage-3-large
  embedding_model     text        NOT NULL DEFAULT 'voyage-3-large',
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document  ON public.document_chunks (document_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_document_chunks_analise   ON public.document_chunks (analise_id);

-- Índice de similaridade (HNSW > IVFFlat em qualidade, mesmo custo de escrita maior).
-- Criar SEM CONCURRENTLY na primeira vez (tabela vazia).
-- Operador <=> = cosine distance. Match com voyage embeddings já normalizados.
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw
  ON public.document_chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ============================================
-- 3) document_facts — fatos extraídos POR chunk
-- ============================================
-- Espelha o schema de analise_facts (Fase 6 — truth layer), mas em granularidade de chunk.
-- Consolidator monta a tabela analise_facts (já existente) a partir dessa aqui.
CREATE TABLE IF NOT EXISTS public.document_facts (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  analise_id          uuid        NOT NULL REFERENCES public.analises(id) ON DELETE CASCADE,
  document_id         uuid        NOT NULL REFERENCES public.analise_documents(id) ON DELETE CASCADE,
  chunk_id            uuid        NOT NULL REFERENCES public.document_chunks(id) ON DELETE CASCADE,
  fact_type           text        NOT NULL,            -- documento_disponivel | numero_financeiro | estrutura_societaria | contrato | garantia | passivo | evento_relevante | lacuna
  fact_key            text        NOT NULL,
  fact_value          text        NOT NULL,
  source_quote        text,
  source_page         integer,
  confidence          numeric(3,2) NOT NULL DEFAULT 0.7 CHECK (confidence >= 0 AND confidence <= 1),
  model_id            text        NOT NULL,            -- claude-haiku-4-5-20251001 (esperado)
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_facts_analise   ON public.document_facts (analise_id);
CREATE INDEX IF NOT EXISTS idx_document_facts_document  ON public.document_facts (document_id);
CREATE INDEX IF NOT EXISTS idx_document_facts_type      ON public.document_facts (analise_id, fact_type);

-- ============================================
-- 4) Colunas novas em analises pra trackear o pipeline async
-- ============================================
ALTER TABLE public.analises
  ADD COLUMN IF NOT EXISTS documents_ingestion_started_at  timestamptz,
  ADD COLUMN IF NOT EXISTS documents_ingested_at           timestamptz,
  ADD COLUMN IF NOT EXISTS documents_total                 integer,
  ADD COLUMN IF NOT EXISTS documents_completed             integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS documents_failed                integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS documents_total_chars           bigint,
  ADD COLUMN IF NOT EXISTS documents_total_tokens          bigint,
  ADD COLUMN IF NOT EXISTS fact_bank                       jsonb,
  ADD COLUMN IF NOT EXISTS fact_bank_consolidated_at       timestamptz,
  ADD COLUMN IF NOT EXISTS fact_bank_model_id              text;

-- ============================================
-- 5) Função pra RAG retrieval (top-K chunks por similaridade)
-- ============================================
-- Uso: SELECT * FROM match_document_chunks('analise-uuid', '[0.1, 0.2, ...]'::vector, 10, 0.5);
-- Retorna chunks ordenados por similaridade decrescente, com metadata pra citação.
CREATE OR REPLACE FUNCTION public.match_document_chunks(
  p_analise_id        uuid,
  p_query_embedding   vector(1024),
  p_match_count       integer DEFAULT 10,
  p_similarity_min    double precision DEFAULT 0.0
)
RETURNS TABLE (
  chunk_id        uuid,
  document_id     uuid,
  document_name   text,
  chunk_index     integer,
  chunk_text      text,
  page_start      integer,
  page_end        integer,
  similarity      double precision
)
LANGUAGE sql STABLE PARALLEL SAFE
AS $$
  SELECT
    c.id              AS chunk_id,
    c.document_id     AS document_id,
    d.file_name       AS document_name,
    c.chunk_index     AS chunk_index,
    c.chunk_text      AS chunk_text,
    c.page_start      AS page_start,
    c.page_end        AS page_end,
    1 - (c.embedding <=> p_query_embedding) AS similarity
  FROM public.document_chunks c
  JOIN public.analise_documents d ON d.id = c.document_id
  WHERE c.analise_id = p_analise_id
    AND c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> p_query_embedding) >= p_similarity_min
  ORDER BY c.embedding <=> p_query_embedding
  LIMIT p_match_count;
$$;

-- ============================================
-- 6) Row Level Security
-- ============================================
ALTER TABLE public.analise_documents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_facts     ENABLE ROW LEVEL SECURITY;

-- Owners e membros do deal podem ler. Service role bypassa RLS pro worker.
CREATE POLICY "documents_read_owner_or_member" ON public.analise_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.analises a
      WHERE a.id = analise_documents.analise_id
        AND (a.user_id = auth.uid()
             OR EXISTS (SELECT 1 FROM public.deal_members m WHERE m.analise_id = a.id AND m.user_id = auth.uid()))
    )
  );

CREATE POLICY "chunks_read_owner_or_member" ON public.document_chunks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.analises a
      WHERE a.id = document_chunks.analise_id
        AND (a.user_id = auth.uid()
             OR EXISTS (SELECT 1 FROM public.deal_members m WHERE m.analise_id = a.id AND m.user_id = auth.uid()))
    )
  );

CREATE POLICY "facts_read_owner_or_member" ON public.document_facts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.analises a
      WHERE a.id = document_facts.analise_id
        AND (a.user_id = auth.uid()
             OR EXISTS (SELECT 1 FROM public.deal_members m WHERE m.analise_id = a.id AND m.user_id = auth.uid()))
    )
  );

-- ============================================
-- NOTAS
-- ============================================
-- 1) Embedding dim: voyage-3-large = 1024. Se mudar pra OpenAI text-embedding-3-large (3072) ou
--    text-embedding-3-small (1536), criar NOVA tabela ou nova coluna; ALTER de vector dim
--    não é suportado.
-- 2) HNSW vs IVFFlat: HNSW tem melhor recall e não precisa de "training" — escolhido.
-- 3) Operador <=> = cosine distance. voyage embeddings vêm normalizados (norma 1), então
--    cosine = produto interno. Match com operator class vector_cosine_ops.
-- 4) chunk_text fica como text (não tsvector) — busca semântica via embedding cobre o caso.
--    Se quiser BM25 híbrido depois, adiciona coluna tsvector + GIN index.
-- 5) document_facts.fact_type é o mesmo vocabulário de analise_facts (não tem CHECK pra
--    permitir evolução; documentação canônica em lib/truth-layer.ts).


-- ===== 20260520_invest_match_schema.sql =====
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


-- ===== 20260521_invest_match_reverse.sql =====
-- ============================================================
-- Invest Match — Originação reversa (2026-05-21)
-- ============================================================
-- Funções espelho de invest_match_buscar_candidatos / busca_semantica, mas
-- partindo do INVESTIDOR para encontrar TESES compatíveis (originação proativa).
--
-- A matemática do score do par (investidor × tese) é idêntica à do sentido
-- direto — apenas trocamos quem é fixo (v_inv) e quem varia (t). Pesos e
-- fórmulas espelham 20260520. Se mudar lá, mude aqui.
--
-- Diferença no universo de busca: aqui varremos TESES ativas (status não
-- terminal) do mesmo escritório, em vez de investidores ativos.
-- ============================================================

CREATE OR REPLACE FUNCTION public.invest_match_buscar_teses_para_investidor(
  p_investidor_id  uuid,
  p_limit          integer DEFAULT 50,
  p_min_score      numeric DEFAULT 50.0
)
RETURNS TABLE (
  tese_id            uuid,
  empresa_codinome   text,
  score_estruturado  numeric,
  passou_hard_filter boolean,
  motivos_bloqueio   text[],
  breakdown          jsonb
)
LANGUAGE plpgsql STABLE PARALLEL SAFE AS $$
DECLARE
  v_inv  public.investidores%ROWTYPE;
BEGIN
  SELECT * INTO v_inv FROM public.investidores WHERE id = p_investidor_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Investidor % não encontrado', p_investidor_id;
  END IF;

  RETURN QUERY
  WITH calc AS (
    SELECT
      t.id                            AS tese_id,
      t.empresa_codinome              AS empresa_codinome,

      -- === Hard filter (idêntico ao direto, papéis trocados) ===
      (
        (v_inv.ticket_min_brl IS NULL OR t.capital_buscado_brl >= v_inv.ticket_min_brl) AND
        (v_inv.ticket_max_brl IS NULL OR t.capital_buscado_brl <= v_inv.ticket_max_brl) AND
        NOT (t.setor_primario = ANY(v_inv.setores_excluidos)) AND
        NOT (v_inv.requer_esg AND NOT t.esg_compliant) AND
        NOT (v_inv.requer_pronto_para_dd AND NOT t.pronto_para_dd) AND
        (
          cardinality(v_inv.geografias_aceitas) = 0
          OR t.hq_estado = ANY(v_inv.geografias_aceitas)
          OR 'NACIONAL' = ANY(v_inv.geografias_aceitas)
        ) AND
        NOT (t.hq_estado IS NOT NULL AND t.hq_estado = ANY(v_inv.geografias_excluidas))
      ) AS passou_hard_filter,

      ARRAY_REMOVE(ARRAY[
        CASE WHEN v_inv.ticket_min_brl IS NOT NULL AND t.capital_buscado_brl < v_inv.ticket_min_brl
             THEN 'ticket_abaixo_minimo' END,
        CASE WHEN v_inv.ticket_max_brl IS NOT NULL AND t.capital_buscado_brl > v_inv.ticket_max_brl
             THEN 'ticket_acima_maximo' END,
        CASE WHEN t.setor_primario = ANY(v_inv.setores_excluidos)
             THEN 'setor_excluido' END,
        CASE WHEN v_inv.requer_esg AND NOT t.esg_compliant
             THEN 'esg_nao_compliant' END,
        CASE WHEN v_inv.requer_pronto_para_dd AND NOT t.pronto_para_dd
             THEN 'projeto_nao_pronto_para_dd' END,
        CASE WHEN cardinality(v_inv.geografias_aceitas) > 0
             AND NOT (t.hq_estado = ANY(v_inv.geografias_aceitas))
             AND NOT ('NACIONAL' = ANY(v_inv.geografias_aceitas))
             THEN 'geografia_incompativel' END,
        CASE WHEN t.hq_estado IS NOT NULL AND t.hq_estado = ANY(v_inv.geografias_excluidas)
             THEN 'geografia_excluida' END
      ], NULL) AS motivos_bloqueio,

      -- === Camada 2 — Structured scoring (fórmulas idênticas) ===
      (CASE
        WHEN t.setor_primario = ANY(v_inv.setores_alvo)                        THEN 100
        WHEN t.sub_setores && v_inv.sub_setores                                THEN 70
        WHEN t.vertical_tags && v_inv.vertical_tags                            THEN 50
        WHEN cardinality(v_inv.setores_alvo) = 0                               THEN 60
        ELSE 0
      END)::numeric AS s_setorial,

      (CASE
        WHEN v_inv.ticket_min_brl IS NULL OR v_inv.ticket_max_brl IS NULL      THEN 70
        WHEN t.capital_buscado_brl BETWEEN v_inv.ticket_min_brl AND v_inv.ticket_max_brl THEN
          GREATEST(70,
            100 - 30 * ABS(
              (t.capital_buscado_brl::numeric - (v_inv.ticket_min_brl + v_inv.ticket_max_brl)::numeric / 2)
              / NULLIF((v_inv.ticket_max_brl - v_inv.ticket_min_brl)::numeric / 2, 0)
            ))
        ELSE 0
      END)::numeric AS s_ticket,

      (CASE
        WHEN t.estagio = ANY(v_inv.estagios_aceitos)                           THEN 100
        WHEN cardinality(v_inv.estagios_aceitos) = 0                           THEN 50
        ELSE 20
      END)::numeric AS s_stage,

      (CASE
        WHEN v_inv.maturity_min_score IS NULL                                  THEN 70
        WHEN t.maturity_score IS NULL                                          THEN 40
        WHEN t.maturity_score >= v_inv.maturity_min_score                      THEN 100
        WHEN t.maturity_score >= v_inv.maturity_min_score * 0.8                THEN 70
        ELSE 30
      END)::numeric AS s_maturity,

      (CASE
        WHEN v_inv.governance_min_score IS NULL                                THEN 70
        WHEN t.governance_score IS NULL                                        THEN 40
        WHEN t.governance_score >= v_inv.governance_min_score                  THEN 100
        WHEN t.governance_score >= v_inv.governance_min_score * 0.8            THEN 70
        ELSE 30
      END)::numeric AS s_governance,

      (CASE
        WHEN v_inv.risk_max_score IS NULL                                      THEN 70
        WHEN t.risk_overall_score IS NULL                                      THEN 40
        WHEN t.risk_overall_score <= v_inv.risk_max_score                      THEN 100
        WHEN t.risk_overall_score <= v_inv.risk_max_score * 1.2                THEN 60
        ELSE 20
      END)::numeric AS s_risk,

      (CASE
        WHEN t.hq_estado IS NULL OR cardinality(v_inv.geografias_aceitas) = 0  THEN 70
        WHEN t.hq_estado = ANY(v_inv.geografias_aceitas)                       THEN 100
        WHEN 'NACIONAL' = ANY(v_inv.geografias_aceitas)                        THEN 80
        ELSE 30
      END)::numeric AS s_geography,

      (CASE
        WHEN v_inv.documentacao_min_score IS NULL                              THEN 70
        WHEN t.documentacao_score IS NULL                                      THEN 40
        WHEN t.documentacao_score >= v_inv.documentacao_min_score              THEN 100
        WHEN t.documentacao_score >= v_inv.documentacao_min_score * 0.8        THEN 65
        ELSE 25
      END)::numeric AS s_documentation,

      (CASE
        WHEN v_inv.horizonte_saida_min_anos IS NULL OR v_inv.horizonte_saida_max_anos IS NULL THEN 70
        WHEN t.horizonte_saida_anos IS NULL                                    THEN 50
        WHEN t.horizonte_saida_anos BETWEEN v_inv.horizonte_saida_min_anos AND v_inv.horizonte_saida_max_anos THEN 100
        ELSE 40
      END)::numeric AS s_exit_horizon,

      (CASE t.urgencia
        WHEN 'alta'  THEN 100
        WHEN 'media' THEN 80
        WHEN 'baixa' THEN 60
        ELSE 70
      END)::numeric AS s_urgency

    FROM public.teses t
    WHERE t.escritorio_id = v_inv.escritorio_id
      AND t.status NOT IN ('arquivado', 'suspenso', 'realizado')
  )
  SELECT
    c.tese_id,
    c.empresa_codinome,
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
-- Busca semântica reversa: investidor → teses por similaridade
-- ============================================================
CREATE OR REPLACE FUNCTION public.invest_match_busca_semantica_teses(
  p_investidor_id     uuid,
  p_match_count       integer DEFAULT 20,
  p_similarity_min    double precision DEFAULT 0.5
)
RETURNS TABLE (
  tese_id          uuid,
  empresa_codinome text,
  similarity       double precision
)
LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT
    t.id               AS tese_id,
    t.empresa_codinome AS empresa_codinome,
    1 - (t.tese_embedding <=> i.tese_embedding) AS similarity
  FROM public.teses t
  JOIN public.investidores i ON i.id = p_investidor_id
  WHERE t.escritorio_id = i.escritorio_id
    AND t.status NOT IN ('arquivado', 'suspenso', 'realizado')
    AND t.tese_embedding IS NOT NULL
    AND i.tese_embedding IS NOT NULL
    AND 1 - (t.tese_embedding <=> i.tese_embedding) >= p_similarity_min
  ORDER BY t.tese_embedding <=> i.tese_embedding
  LIMIT p_match_count;
$$;


-- ===== 20260522_invest_match_drop_codinome.sql =====
-- ============================================================
-- Invest Match — Remoção do codinome/blind (2026-05-22)
-- ============================================================
-- A apresentação ao investidor é sempre feita manualmente fora da plataforma,
-- então o nome-código blind (empresa_codinome) e o flag is_blind não têm uso.
-- As telas internas mostram sempre o nome real (empresa_nome).
--
-- Esta migration:
--   1) Reescreve as 2 funções reversas para retornar empresa_nome (não codinome)
--   2) Remove as colunas empresa_codinome e is_blind de teses
--
-- Ordem importa: recriar as funções ANTES do DROP COLUMN (senão as versões
-- antigas, que fazem SELECT t.empresa_codinome, quebrariam ao perder a coluna).
--
-- DROP antes do CREATE: o tipo de retorno (RETURNS TABLE) mudou
-- (empresa_codinome → empresa_nome), e o Postgres não permite alterar o tipo
-- de retorno via CREATE OR REPLACE.
-- ============================================================

DROP FUNCTION IF EXISTS public.invest_match_buscar_teses_para_investidor(uuid, integer, numeric);
DROP FUNCTION IF EXISTS public.invest_match_busca_semantica_teses(uuid, integer, double precision);

CREATE OR REPLACE FUNCTION public.invest_match_buscar_teses_para_investidor(
  p_investidor_id  uuid,
  p_limit          integer DEFAULT 50,
  p_min_score      numeric DEFAULT 50.0
)
RETURNS TABLE (
  tese_id            uuid,
  empresa_nome       text,
  score_estruturado  numeric,
  passou_hard_filter boolean,
  motivos_bloqueio   text[],
  breakdown          jsonb
)
LANGUAGE plpgsql STABLE PARALLEL SAFE AS $$
DECLARE
  v_inv  public.investidores%ROWTYPE;
BEGIN
  SELECT * INTO v_inv FROM public.investidores WHERE id = p_investidor_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Investidor % não encontrado', p_investidor_id;
  END IF;

  RETURN QUERY
  WITH calc AS (
    SELECT
      t.id                            AS tese_id,
      t.empresa_nome                  AS empresa_nome,
      (
        (v_inv.ticket_min_brl IS NULL OR t.capital_buscado_brl >= v_inv.ticket_min_brl) AND
        (v_inv.ticket_max_brl IS NULL OR t.capital_buscado_brl <= v_inv.ticket_max_brl) AND
        NOT (t.setor_primario = ANY(v_inv.setores_excluidos)) AND
        NOT (v_inv.requer_esg AND NOT t.esg_compliant) AND
        NOT (v_inv.requer_pronto_para_dd AND NOT t.pronto_para_dd) AND
        (
          cardinality(v_inv.geografias_aceitas) = 0
          OR t.hq_estado = ANY(v_inv.geografias_aceitas)
          OR 'NACIONAL' = ANY(v_inv.geografias_aceitas)
        ) AND
        NOT (t.hq_estado IS NOT NULL AND t.hq_estado = ANY(v_inv.geografias_excluidas))
      ) AS passou_hard_filter,
      ARRAY_REMOVE(ARRAY[
        CASE WHEN v_inv.ticket_min_brl IS NOT NULL AND t.capital_buscado_brl < v_inv.ticket_min_brl
             THEN 'ticket_abaixo_minimo' END,
        CASE WHEN v_inv.ticket_max_brl IS NOT NULL AND t.capital_buscado_brl > v_inv.ticket_max_brl
             THEN 'ticket_acima_maximo' END,
        CASE WHEN t.setor_primario = ANY(v_inv.setores_excluidos)
             THEN 'setor_excluido' END,
        CASE WHEN v_inv.requer_esg AND NOT t.esg_compliant
             THEN 'esg_nao_compliant' END,
        CASE WHEN v_inv.requer_pronto_para_dd AND NOT t.pronto_para_dd
             THEN 'projeto_nao_pronto_para_dd' END,
        CASE WHEN cardinality(v_inv.geografias_aceitas) > 0
             AND NOT (t.hq_estado = ANY(v_inv.geografias_aceitas))
             AND NOT ('NACIONAL' = ANY(v_inv.geografias_aceitas))
             THEN 'geografia_incompativel' END,
        CASE WHEN t.hq_estado IS NOT NULL AND t.hq_estado = ANY(v_inv.geografias_excluidas)
             THEN 'geografia_excluida' END
      ], NULL) AS motivos_bloqueio,
      (CASE
        WHEN t.setor_primario = ANY(v_inv.setores_alvo)                        THEN 100
        WHEN t.sub_setores && v_inv.sub_setores                                THEN 70
        WHEN t.vertical_tags && v_inv.vertical_tags                            THEN 50
        WHEN cardinality(v_inv.setores_alvo) = 0                               THEN 60
        ELSE 0
      END)::numeric AS s_setorial,
      (CASE
        WHEN v_inv.ticket_min_brl IS NULL OR v_inv.ticket_max_brl IS NULL      THEN 70
        WHEN t.capital_buscado_brl BETWEEN v_inv.ticket_min_brl AND v_inv.ticket_max_brl THEN
          GREATEST(70,
            100 - 30 * ABS(
              (t.capital_buscado_brl::numeric - (v_inv.ticket_min_brl + v_inv.ticket_max_brl)::numeric / 2)
              / NULLIF((v_inv.ticket_max_brl - v_inv.ticket_min_brl)::numeric / 2, 0)
            ))
        ELSE 0
      END)::numeric AS s_ticket,
      (CASE
        WHEN t.estagio = ANY(v_inv.estagios_aceitos)                           THEN 100
        WHEN cardinality(v_inv.estagios_aceitos) = 0                           THEN 50
        ELSE 20
      END)::numeric AS s_stage,
      (CASE
        WHEN v_inv.maturity_min_score IS NULL                                  THEN 70
        WHEN t.maturity_score IS NULL                                          THEN 40
        WHEN t.maturity_score >= v_inv.maturity_min_score                      THEN 100
        WHEN t.maturity_score >= v_inv.maturity_min_score * 0.8                THEN 70
        ELSE 30
      END)::numeric AS s_maturity,
      (CASE
        WHEN v_inv.governance_min_score IS NULL                                THEN 70
        WHEN t.governance_score IS NULL                                        THEN 40
        WHEN t.governance_score >= v_inv.governance_min_score                  THEN 100
        WHEN t.governance_score >= v_inv.governance_min_score * 0.8            THEN 70
        ELSE 30
      END)::numeric AS s_governance,
      (CASE
        WHEN v_inv.risk_max_score IS NULL                                      THEN 70
        WHEN t.risk_overall_score IS NULL                                      THEN 40
        WHEN t.risk_overall_score <= v_inv.risk_max_score                      THEN 100
        WHEN t.risk_overall_score <= v_inv.risk_max_score * 1.2                THEN 60
        ELSE 20
      END)::numeric AS s_risk,
      (CASE
        WHEN t.hq_estado IS NULL OR cardinality(v_inv.geografias_aceitas) = 0  THEN 70
        WHEN t.hq_estado = ANY(v_inv.geografias_aceitas)                       THEN 100
        WHEN 'NACIONAL' = ANY(v_inv.geografias_aceitas)                        THEN 80
        ELSE 30
      END)::numeric AS s_geography,
      (CASE
        WHEN v_inv.documentacao_min_score IS NULL                              THEN 70
        WHEN t.documentacao_score IS NULL                                      THEN 40
        WHEN t.documentacao_score >= v_inv.documentacao_min_score              THEN 100
        WHEN t.documentacao_score >= v_inv.documentacao_min_score * 0.8        THEN 65
        ELSE 25
      END)::numeric AS s_documentation,
      (CASE
        WHEN v_inv.horizonte_saida_min_anos IS NULL OR v_inv.horizonte_saida_max_anos IS NULL THEN 70
        WHEN t.horizonte_saida_anos IS NULL                                    THEN 50
        WHEN t.horizonte_saida_anos BETWEEN v_inv.horizonte_saida_min_anos AND v_inv.horizonte_saida_max_anos THEN 100
        ELSE 40
      END)::numeric AS s_exit_horizon,
      (CASE t.urgencia
        WHEN 'alta'  THEN 100
        WHEN 'media' THEN 80
        WHEN 'baixa' THEN 60
        ELSE 70
      END)::numeric AS s_urgency
    FROM public.teses t
    WHERE t.escritorio_id = v_inv.escritorio_id
      AND t.status NOT IN ('arquivado', 'suspenso', 'realizado')
  )
  SELECT
    c.tese_id,
    c.empresa_nome,
    ROUND((
      c.s_setorial * 0.20 + c.s_ticket * 0.15 + c.s_stage * 0.10 + c.s_maturity * 0.10 +
      c.s_governance * 0.10 + c.s_risk * 0.10 + c.s_geography * 0.05 + c.s_documentation * 0.10 +
      c.s_exit_horizon * 0.05 + c.s_urgency * 0.05
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

CREATE OR REPLACE FUNCTION public.invest_match_busca_semantica_teses(
  p_investidor_id     uuid,
  p_match_count       integer DEFAULT 20,
  p_similarity_min    double precision DEFAULT 0.5
)
RETURNS TABLE (
  tese_id          uuid,
  empresa_nome     text,
  similarity       double precision
)
LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT
    t.id           AS tese_id,
    t.empresa_nome AS empresa_nome,
    1 - (t.tese_embedding <=> i.tese_embedding) AS similarity
  FROM public.teses t
  JOIN public.investidores i ON i.id = p_investidor_id
  WHERE t.escritorio_id = i.escritorio_id
    AND t.status NOT IN ('arquivado', 'suspenso', 'realizado')
    AND t.tese_embedding IS NOT NULL
    AND i.tese_embedding IS NOT NULL
    AND 1 - (t.tese_embedding <=> i.tese_embedding) >= p_similarity_min
  ORDER BY t.tese_embedding <=> i.tese_embedding
  LIMIT p_match_count;
$$;

-- Remove as colunas agora não-usadas
ALTER TABLE public.teses DROP COLUMN IF EXISTS empresa_codinome;
ALTER TABLE public.teses DROP COLUMN IF EXISTS is_blind;


-- ===== 20260523_invest_match_plus_toggle.sql =====
-- ============================================
-- Invest Match Plus — entitlement por escritório
-- Módulo Plus opcional: liberado apenas para escritórios que contratarem o upgrade.
-- Controle centralizado no gestor master da Mandor (role=admin) via painel admin.
-- Default false: nenhum escritório recebe o módulo sem ativação comercial explícita.
-- ============================================

ALTER TABLE public.escritorios
  ADD COLUMN IF NOT EXISTS invest_match_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.escritorios.invest_match_enabled IS
  'Habilita o módulo Invest Match (Plus) para o escritório. Apenas o gestor master da Mandor (admin) altera.';


-- ===== 20260524_storage_bucket_analises_limits.sql =====
-- Garante que o bucket de documentos de análise ("analises") aceita os
-- arquivos reais que o cliente vai subir, sem bloqueios inesperados:
--   - file_size_limit = 25 MB  (acima da promessa de 20 MB/arquivo da UI)
--   - allowed_mime_types = NULL (sem restrição de tipo — a UI já filtra por extensão
--                                e o servidor sanitiza o nome do arquivo)
--
-- O bucket é criado pelo painel do Supabase (não por migration), então aqui apenas
-- ATUALIZAMOS a config existente. Não alteramos `public` (o bucket é privado e usa
-- signed URLs para upload/download).

update storage.buckets
set
  file_size_limit    = 26214400,   -- 25 MB em bytes
  allowed_mime_types = null
where id = 'analises';


-- ===== 20260525_escritorios_user_id_nullable.sql =====
-- Permite criar escritório pelo painel admin ANTES de existir um usuário-dono.
--
-- Contexto: o modelo original (self-signup) criava escritório + dono juntos, então
-- escritorios.user_id era NOT NULL. No provisionamento via admin (criar o escritório
-- e depois convidar o gestor), não há dono no momento da criação — o admin insere
-- apenas { nome }. Por isso user_id precisa ser opcional.
--
-- A constraint UNIQUE é mantida: o Postgres permite múltiplos NULL (NULLs são
-- distintos), e quando um dono real for atribuído a unicidade continua valendo.

alter table public.escritorios alter column user_id drop not null;


-- ===== 20260526_llm_usage_log.sql =====
-- ============================================
-- LLM Usage Log / Observabilidade de Custo (Mandor) — 2026-05-26
-- Fase 0 da iniciativa de custo x qualidade (ver docs/arquitetura/revisao-2026-05-26-custo-qualidade.md).
--
-- Registra UMA linha por chamada de LLM em todo o sistema (pipeline de análise,
-- ingestão, validadores, invest-match), com tokens, tokens de cache, custo em USD
-- (snapshot do preço no momento da chamada) e latência.
--
-- Propósito: descobrir ONDE o custo realmente está antes de otimizar, e medir
-- cache-hit por step (fator decisivo para decidir troca de provider).
--
-- NÃO substitui deal_step_audit_logs (que é auditoria de reprodutibilidade do
-- pipeline: que contexto cada step viu). Esta tabela é puramente custo/uso.
-- ============================================

CREATE TABLE IF NOT EXISTS public.llm_usage_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  criado_em     timestamptz NOT NULL DEFAULT now(),

  -- Vínculo opcional com a análise (null para invest-match e chamadas avulsas).
  analise_id    uuid        REFERENCES public.analises(id) ON DELETE SET NULL,

  -- Onde a chamada acontece, para agregação por subsistema.
  -- Ex: 'analise_pipeline' | 'ingestion' | 'validators' | 'invest_match'
  context       text        NOT NULL,

  -- Nome do step/agente (ex: 'diagnostico', 'chunk_fact_extract', 'coverage_check').
  step          text        NOT NULL,

  provider      text        NOT NULL DEFAULT 'anthropic',
  model         text        NOT NULL,

  -- Tokens (input_tokens já exclui os tokens de cache; cache é cobrado à parte).
  input_tokens        integer NOT NULL DEFAULT 0,
  output_tokens       integer NOT NULL DEFAULT 0,
  cache_write_tokens  integer NOT NULL DEFAULT 0,   -- cache_creation_input_tokens
  cache_read_tokens   integer NOT NULL DEFAULT 0,   -- cache_read_input_tokens

  -- Custo em USD calculado no app com o preço vigente no momento (snapshot).
  -- Null quando o modelo não está na tabela de preços (lib/llm/pricing.ts).
  cost_usd      numeric(12,6),

  latency_ms    integer,
  thinking      boolean     NOT NULL DEFAULT false,

  -- Campo livre para diagnóstico (ex: tamanho de prompt, flags, doc_id).
  meta          jsonb
);

CREATE INDEX IF NOT EXISTS idx_llm_usage_log_analise
  ON public.llm_usage_log (analise_id);

CREATE INDEX IF NOT EXISTS idx_llm_usage_log_criado
  ON public.llm_usage_log (criado_em);

CREATE INDEX IF NOT EXISTS idx_llm_usage_log_model_step
  ON public.llm_usage_log (model, step);

ALTER TABLE public.llm_usage_log ENABLE ROW LEVEL SECURITY;

-- Owner/membros do deal podem ler o custo da própria análise (futuro dashboard).
CREATE POLICY "llm_usage_log_read_owner" ON public.llm_usage_log
  FOR SELECT USING (
    analise_id IS NOT NULL AND (
      EXISTS (SELECT 1 FROM public.analises WHERE id = analise_id AND user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.deal_members WHERE analise_id = llm_usage_log.analise_id AND user_id = auth.uid())
    )
  );

CREATE POLICY "llm_usage_log_service" ON public.llm_usage_log
  FOR ALL TO service_role USING (true);


-- ===== 20260527_reforma_tributaria_toggle.sql =====
-- ============================================
-- Adequação à Reforma Tributária (Ferrante) — entitlement por escritório
-- Módulo premium opcional, no mesmo modelo do Invest Match: liberado apenas
-- para escritórios que contratarem o upgrade. Controle centralizado no gestor
-- master da Mandor (role=admin) via painel admin.
-- Default false: nenhum escritório recebe o módulo sem ativação comercial explícita.
-- ============================================

ALTER TABLE public.escritorios
  ADD COLUMN IF NOT EXISTS reforma_tributaria_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.escritorios.reforma_tributaria_enabled IS
  'Habilita o módulo Adequação à Reforma Tributária (Ferrante) para o escritório. Apenas o gestor master da Mandor (admin) altera.';


-- ===== 20260528_share_revocations_rls.sql =====
-- ============================================
-- share_revocations — defesa em profundidade (RLS) — 2026-05-28
--
-- A tabela é usada por:
--   - app/api/analise/share/route.ts (upsert revogação por owner via admin client)
--   - app/view/[token]/page.tsx (lê revogação via admin client antes de servir)
--
-- Hoje TODO acesso é via service-role (admin client) então RLS desabilitada
-- "funcionaria". MAS defesa em profundidade: qualquer leitura/escrita acidental
-- pelo anon client (bug futuro) precisa ser barrada.
--
-- Esta migration é IDEMPOTENTE (IF NOT EXISTS / DROP POLICY IF EXISTS) — pode
-- ser aplicada mesmo se a tabela já tiver sido criada manualmente no SQL editor.
-- ============================================

CREATE TABLE IF NOT EXISTS public.share_revocations (
  analise_id  uuid        PRIMARY KEY REFERENCES public.analises(id) ON DELETE CASCADE,
  revoked_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.share_revocations ENABLE ROW LEVEL SECURITY;

-- service_role: passe livre (todos os call-sites legítimos usam admin client).
DROP POLICY IF EXISTS "share_revocations_service" ON public.share_revocations;
CREATE POLICY "share_revocations_service" ON public.share_revocations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Usuário autenticado: pode ler/escrever revogações APENAS das suas análises.
-- Hoje o código não usa anon client pra essa tabela, mas se um dia usar (bug
-- ou refactor), o RLS limita ao owner da análise vinculada.
DROP POLICY IF EXISTS "share_revocations_owner_select" ON public.share_revocations;
CREATE POLICY "share_revocations_owner_select" ON public.share_revocations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.analises a
      WHERE a.id = share_revocations.analise_id AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "share_revocations_owner_write" ON public.share_revocations;
CREATE POLICY "share_revocations_owner_write" ON public.share_revocations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.analises a
      WHERE a.id = share_revocations.analise_id AND a.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analises a
      WHERE a.id = share_revocations.analise_id AND a.user_id = auth.uid()
    )
  );


-- ===== 20260608_deal_monitoramento.sql =====
-- ============================================
-- Monitoramento contínuo de deals (MVP)
-- Transforma a análise (evento único) em vigilância recorrente: um cron
-- re-checa periodicamente sinais do deal e grava alertas. Primeiro sinal:
-- situação cadastral do CNPJ do detentor (reusa lib/auto-pull/cnpj.ts).
-- ============================================

-- Snapshot do último monitoramento por análise (para detectar mudança) +
-- carimbo de quando rodou (usado pelo cron para priorizar os mais antigos).
ALTER TABLE public.analises
  ADD COLUMN IF NOT EXISTS monitor       jsonb,
  ADD COLUMN IF NOT EXISTS monitorado_em timestamptz;

-- Feed de alertas por deal.
CREATE TABLE IF NOT EXISTS public.deal_alertas (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  analise_id    uuid        NOT NULL REFERENCES public.analises(id) ON DELETE CASCADE,
  tipo          text        NOT NULL,                 -- ex: 'cnpj_situacao'
  severidade    text        NOT NULL DEFAULT 'warn'
                            CHECK (severidade IN ('info', 'warn', 'critico')),
  titulo        text        NOT NULL,
  detalhe       text,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  resolvido_em  timestamptz                            -- null = alerta aberto
);

CREATE INDEX IF NOT EXISTS idx_deal_alertas_analise
  ON public.deal_alertas (analise_id);

-- Acelera a busca de alertas abertos de um deal.
CREATE INDEX IF NOT EXISTS idx_deal_alertas_aberto
  ON public.deal_alertas (analise_id)
  WHERE resolvido_em IS NULL;

ALTER TABLE public.deal_alertas ENABLE ROW LEVEL SECURITY;

-- Escrita (cron) e leitura server-side usam service role. A leitura pelo
-- cliente passa pela API com canAccessAnalise (admin client bypassa RLS),
-- então não há política para usuários autenticados de propósito.
CREATE POLICY "deal_alertas_service_role" ON public.deal_alertas
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ===== 20260612_consumir_pacote_atomico.sql =====
-- ============================================================
-- Consumo atômico do pacote de créditos (2026-06-12)
-- ============================================================
-- Evita furar o saldo sob concorrência (duas análises simultâneas liam o mesmo
-- analises_consumidas e ambas passavam). Seleciona o pacote ativo mais antigo
-- com saldo (FIFO) com lock e incrementa num único statement.
--
-- FOR UPDATE (bloqueante, SEM SKIP LOCKED): consumos concorrentes do MESMO
-- pacote serializam no lock e cada um lê o saldo já atualizado, consumindo em
-- série até esgotar de verdade. SKIP LOCKED faria chamadas concorrentes
-- desistirem (retornar vazio) e rejeitaria consumos válidos como "esgotado".
-- ============================================================

CREATE OR REPLACE FUNCTION public.consumir_pacote_fifo(p_escritorio_id uuid)
RETURNS TABLE (pacote_id uuid, novo_consumido int)
LANGUAGE plpgsql AS $$
DECLARE
  v_id   uuid;
  v_novo int;
BEGIN
  SELECT id INTO v_id
  FROM public.pacotes
  WHERE escritorio_id = p_escritorio_id
    AND status = 'ativo'
    AND analises_consumidas < analises_total
  ORDER BY criado_em ASC
  LIMIT 1
  FOR UPDATE;

  IF v_id IS NULL THEN
    RETURN;  -- nenhum pacote ativo com saldo
  END IF;

  UPDATE public.pacotes
     SET analises_consumidas = analises_consumidas + 1,
         atualizado_em = now()
   WHERE id = v_id
  RETURNING analises_consumidas INTO v_novo;

  pacote_id := v_id;
  novo_consumido := v_novo;
  RETURN NEXT;
END;
$$;

-- Devolve 1 unidade (revert quando a criação da análise falha após consumir).
CREATE OR REPLACE FUNCTION public.devolver_pacote(p_pacote_id uuid)
RETURNS void
LANGUAGE sql AS $$
  UPDATE public.pacotes
     SET analises_consumidas = GREATEST(0, analises_consumidas - 1),
         atualizado_em = now()
   WHERE id = p_pacote_id;
$$;


-- ===== 20260612_escritorio_entitlements.sql =====
-- ============================================================
-- Entitlements por escritório (2026-06-12)
-- ============================================================
-- Camada flexível de planos: o "plano" é um preset; o que o escritório
-- realmente tem fica em `entitlements` (jsonb), que o Gestor Geral (admin)
-- pode sobrescrever por escritório. Mantém compatibilidade com as flags
-- antigas (invest_match_enabled / reforma_tributaria_enabled), que continuam
-- sendo espelhadas pela API admin.
--
-- Formato de entitlements:
-- {
--   "modulos": { "reforma_tributaria": bool, "invest_match": bool,
--                "invest_match_rede": bool, "mapa_completo": bool,
--                "aprendizados": bool, "monitoramento": bool, "api": bool, "sso": bool },
--   "limites": { "analises_mes": int|null, "usuarios_max": int|null,
--                "regeneracoes_por_analise": int|null, "mapa_buscas_ia_mes": int|null },
--   "suporte": "padrao" | "prioritario" | "dedicado"
-- }
-- (campos ausentes herdam o preset do plano — ver lib/entitlements-presets.ts)
-- ============================================================
ALTER TABLE public.escritorios
  ADD COLUMN IF NOT EXISTS plano            text,
  ADD COLUMN IF NOT EXISTS plano_status     text,
  ADD COLUMN IF NOT EXISTS preco_mensal_brl numeric,
  ADD COLUMN IF NOT EXISTS entitlements     jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Backfill leve: escritórios sem plano definido começam em 'essential'.
UPDATE public.escritorios SET plano = 'essential' WHERE plano IS NULL OR plano = '';


-- ===== 20260612_mapa_buscas_log.sql =====
-- ============================================================
-- Mapa Inteligente do Mercado — Log de buscas IA (2026-06-12)
-- ============================================================
-- Registra cada busca semântica (IA) para aplicar o limite mensal
-- mapa_buscas_ia_mes por escritório. Uma linha por busca IA executada.
-- A contagem do "mês" usa o fuso America/Sao_Paulo (reset no dia 1 local).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mapa_buscas_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id uuid REFERENCES public.escritorios(id) ON DELETE CASCADE,
  user_id       uuid,
  q             text,
  resultados    int,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

-- Índice para a contagem mensal por escritório (janela por criado_em).
CREATE INDEX IF NOT EXISTS idx_mapa_buscas_log_esc_data
  ON public.mapa_buscas_log (escritorio_id, criado_em DESC);

-- ============================================================
-- RPC: mercado_buscas_ia_mes_count — buscas IA do escritório no mês corrente
-- (fronteira do mês no fuso America/Sao_Paulo).
-- ============================================================
CREATE OR REPLACE FUNCTION public.mercado_buscas_ia_mes_count(p_escritorio_id uuid)
RETURNS int
LANGUAGE sql STABLE AS $$
  SELECT count(*)::int
  FROM public.mapa_buscas_log
  WHERE escritorio_id = p_escritorio_id
    AND criado_em >= (date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo')
                      AT TIME ZONE 'America/Sao_Paulo');
$$;


-- ===== 20260612_mapa_mercado_schema.sql =====
-- ============================================================
-- Mapa Inteligente do Mercado — Schema base (2026-06-12)
-- ============================================================
-- Painel proprietário de inteligência do mercado de capitais.
-- Catálogo de participantes (gestoras, administradores, distribuidores,
-- custodiantes, bancos, securitizadoras, escritórios de crédito estruturado,
-- boutiques, family offices) + veículos (FIDC, FII, CRI/CRA, debêntures) +
-- a malha de relacionamentos entre eles.
--
-- DIFERENÇA-CHAVE vs. invest_match: estes dados são REFERÊNCIA PÚBLICA
-- compartilhada entre todos os escritórios (não são multi-tenant por
-- escritorio_id). Por isso a leitura é liberada a qualquer usuário
-- autenticado, restrita às linhas com redistribuivel = true.
--
-- GOVERNANÇA DE LICENCIAMENTO (ver docs/estrategia/mapa-inteligente-mercado-*):
--   - Dado aberto (CVM Dados Abertos/ODbL, BCB, B3, Receita): redistribuivel = true
--     → exibível ao usuário final.
--   - Dado licenciado (ANBIMA Feed, Coponto): redistribuivel = false
--     → enriquecimento interno apenas; NUNCA servido na API pública do painel.
--   A coluna `redistribuivel` é o cumpridor técnico dessa regra. Toda query
--   pública filtra redistribuivel = true (ver lib/mapa-mercado/queries.ts).
--
-- Convenções (consistentes com migrations existentes da Mandor):
--   - snake_case em português
--   - uuid PK, gen_random_uuid()
--   - timestamptz criado_em / atualizado_em
--   - RLS habilitado; service_role ALL; leitura autenticada filtrada
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ============================================================
-- 1) mercado_entidades — Participantes do mercado (fonte de verdade)
-- ============================================================
-- Uma linha = uma instituição (idealmente identificada por CNPJ).
-- Uma mesma instituição pode acumular vários papéis (é gestora E
-- administradora), por isso usamos um array `tipos`, não tabela por tipo.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mercado_entidades (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj            text        UNIQUE,          -- null = entidade sem CNPJ (ex.: estrangeira)
  razao_social    text        NOT NULL,        -- Receita/CVM
  nome_fantasia   text,                         -- nome comercial / como é conhecida
  tipos           text[]      NOT NULL DEFAULT '{}',
    -- gestora | administrador | distribuidor | custodiante | controladoria |
    -- banco | securitizadora | escritorio_credito_estruturado |
    -- boutique_investimento | family_office | asset | consultoria | plataforma
  situacao        text,                         -- ativa | cancelada | suspensa | ...
  cnae            text,
  uf              text,
  municipio       text,
  fundada_em      date,
  website         text,
  logo_url        text,                         -- logo curada de fonte oficial
  descricao       text,                         -- resumo (pode ser gerado por IA)
  score_relevancia numeric(5,2),                -- indicador proprietário 0-100 (calculado)
  fonte           text        NOT NULL DEFAULT 'cvm',
    -- cvm | bcb | b3 | receita | anbima_feed | coponto | seed | manual
  redistribuivel  boolean     NOT NULL DEFAULT true,
  busca_tsv       tsvector,                     -- full-text (preenchido por trigger)
  raw             jsonb,                        -- payload bruto da fonte (auditoria)
  visto_em        timestamptz NOT NULL DEFAULT now(),
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mercado_entidades_cnpj      ON public.mercado_entidades (cnpj);
CREATE INDEX IF NOT EXISTS idx_mercado_entidades_tipos     ON public.mercado_entidades USING gin (tipos);
CREATE INDEX IF NOT EXISTS idx_mercado_entidades_tsv       ON public.mercado_entidades USING gin (busca_tsv);
CREATE INDEX IF NOT EXISTS idx_mercado_entidades_nome_trgm ON public.mercado_entidades USING gin (razao_social gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_mercado_entidades_score     ON public.mercado_entidades (score_relevancia DESC NULLS LAST)
  WHERE redistribuivel = true;


-- ============================================================
-- 2) mercado_veiculos — Fundos, FIDCs, securitizações, emissões
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mercado_veiculos (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj            text,
  codigo_anbima   text,                         -- só via ANBIMA Feed → redistribuivel=false
  codigo_cvm      text,
  nome            text        NOT NULL,
  tipo            text        NOT NULL,
    -- FIDC | FII | FIP | FIF | ETF | FIAGRO | OFFSHORE | CRI | CRA |
    -- debenture | CCB | fundo_geral
  categoria_cvm   text,
  classe_anbima   text,
  situacao        text,
  esg             boolean,
  fonte           text        NOT NULL DEFAULT 'cvm',
  redistribuivel  boolean     NOT NULL DEFAULT true,
  raw             jsonb,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mercado_veiculos_cnpj_tipo_uk UNIQUE (cnpj, tipo)
);

CREATE INDEX IF NOT EXISTS idx_mercado_veiculos_tipo      ON public.mercado_veiculos (tipo);
CREATE INDEX IF NOT EXISTS idx_mercado_veiculos_cnpj      ON public.mercado_veiculos (cnpj);
CREATE INDEX IF NOT EXISTS idx_mercado_veiculos_nome_trgm ON public.mercado_veiculos USING gin (nome gin_trgm_ops);


-- ============================================================
-- 3) mercado_veiculo_prestadores — quem faz o quê em cada veículo
-- ============================================================
-- É a base do grafo de conexões. Vem dos prestadores de serviço
-- declarados na CVM (administrador, gestor, custodiante) — dado aberto.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mercado_veiculo_prestadores (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id    uuid        NOT NULL REFERENCES public.mercado_veiculos(id) ON DELETE CASCADE,
  entidade_id   uuid        NOT NULL REFERENCES public.mercado_entidades(id) ON DELETE CASCADE,
  papel         text        NOT NULL,
    -- administrador | gestor | co_gestor | distribuidor | custodiante | controladoria
  fonte         text        NOT NULL DEFAULT 'cvm',
  ativo         boolean     NOT NULL DEFAULT true,
  vigente_de    date,
  vigente_ate   date,                           -- histórico de troca de prestador
  criado_em     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mercado_prestador_uk UNIQUE (veiculo_id, entidade_id, papel)
);

CREATE INDEX IF NOT EXISTS idx_mercado_prestadores_entidade ON public.mercado_veiculo_prestadores (entidade_id, papel);
CREATE INDEX IF NOT EXISTS idx_mercado_prestadores_veiculo  ON public.mercado_veiculo_prestadores (veiculo_id);


-- ============================================================
-- 4) mercado_metricas — séries temporais (PL, captação, cotistas, carteira)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mercado_metricas (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade_id     uuid        REFERENCES public.mercado_entidades(id) ON DELETE CASCADE,
  veiculo_id      uuid        REFERENCES public.mercado_veiculos(id) ON DELETE CASCADE,
  metrica         text        NOT NULL,
    -- pl | captacao | resgate | cotistas | carteira_pj | aum | num_veiculos
  competencia     date        NOT NULL,
  valor           numeric,
  unidade         text,                         -- BRL | qtd | pct
  fonte           text        NOT NULL DEFAULT 'cvm',
  redistribuivel  boolean     NOT NULL DEFAULT true,
  criado_em       timestamptz NOT NULL DEFAULT now()
);

-- Unicidade com COALESCE precisa ser índice único (constraint de tabela não
-- aceita expressões). Trata entidade_id/veiculo_id nulos como sentinela.
CREATE UNIQUE INDEX IF NOT EXISTS mercado_metrica_uk ON public.mercado_metricas (
  COALESCE(entidade_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(veiculo_id,  '00000000-0000-0000-0000-000000000000'::uuid),
  metrica, competencia, fonte
);

CREATE INDEX IF NOT EXISTS idx_mercado_metricas_entidade ON public.mercado_metricas (entidade_id, metrica, competencia DESC);
CREATE INDEX IF NOT EXISTS idx_mercado_metricas_veiculo  ON public.mercado_metricas (veiculo_id, metrica, competencia DESC);


-- ============================================================
-- 5) mercado_conexoes — grafo de relacionamentos (materializado)
-- ============================================================
-- Aresta derivada entre duas entidades. Pré-computada por job a partir
-- de mercado_veiculo_prestadores (co-serviço) e co-investimentos.
-- Materializada para o "mapa de conexões" responder rápido.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mercado_conexoes (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  origem_id     uuid        NOT NULL REFERENCES public.mercado_entidades(id) ON DELETE CASCADE,
  destino_id    uuid        NOT NULL REFERENCES public.mercado_entidades(id) ON DELETE CASCADE,
  tipo          text        NOT NULL,
    -- co_servico | co_investimento | distribui_para | mesmo_grupo
  peso          numeric     NOT NULL DEFAULT 1,  -- nº de veículos em comum / força
  evidencia     jsonb,                            -- ids dos veículos que sustentam a aresta
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mercado_conexao_uk UNIQUE (origem_id, destino_id, tipo)
);

CREATE INDEX IF NOT EXISTS idx_mercado_conexoes_origem ON public.mercado_conexoes (origem_id, tipo, peso DESC);


-- ============================================================
-- 6) mercado_rankings — rankings proprietários (snapshots)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mercado_rankings (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chave         text        NOT NULL,            -- gestoras_por_num_veiculos | admin_por_num_fidc | ...
  competencia   date        NOT NULL,
  entidade_id   uuid        REFERENCES public.mercado_entidades(id) ON DELETE CASCADE,
  posicao       int         NOT NULL,
  valor         numeric,
  metadados     jsonb,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mercado_ranking_uk UNIQUE (chave, competencia, entidade_id)
);

CREATE INDEX IF NOT EXISTS idx_mercado_rankings_chave ON public.mercado_rankings (chave, competencia, posicao);


-- ============================================================
-- 7) mercado_ingestao_runs — auditoria de ETL
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mercado_ingestao_runs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fonte           text        NOT NULL,           -- cvm | bcb | b3 | receita
  dataset         text        NOT NULL,           -- fi_cad | inf_mensal_fidc | if_data | ...
  status          text        NOT NULL DEFAULT 'running', -- running | completed | failed
  linhas_lidas    int,
  linhas_gravadas int,
  linhas_falhas   int,
  competencia     date,
  error_message   text,
  iniciado_em     timestamptz NOT NULL DEFAULT now(),
  finalizado_em   timestamptz
);

CREATE INDEX IF NOT EXISTS idx_mercado_ingestao_runs ON public.mercado_ingestao_runs (fonte, dataset, iniciado_em DESC);


-- ============================================================
-- Trigger: busca_tsv (full-text) + atualizado_em
-- ============================================================
CREATE OR REPLACE FUNCTION public.mercado_entidades_tsv()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.busca_tsv :=
    setweight(to_tsvector('portuguese', unaccent_safe(coalesce(NEW.nome_fantasia, ''))), 'A') ||
    setweight(to_tsvector('portuguese', unaccent_safe(coalesce(NEW.razao_social, ''))), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(array_to_string(NEW.tipos, ' '), '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.municipio, '') || ' ' || coalesce(NEW.uf, '')), 'C');
  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;

-- unaccent pode não estar habilitado em todos os ambientes; wrapper seguro.
CREATE OR REPLACE FUNCTION public.unaccent_safe(t text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN public.unaccent(t);
EXCEPTION WHEN undefined_function THEN
  RETURN t;
END;
$$;

DROP TRIGGER IF EXISTS mercado_entidades_tsv_trg ON public.mercado_entidades;
CREATE TRIGGER mercado_entidades_tsv_trg
  BEFORE INSERT OR UPDATE ON public.mercado_entidades
  FOR EACH ROW EXECUTE FUNCTION public.mercado_entidades_tsv();


-- ============================================================
-- RPC: mercado_buscar — busca unificada (full-text + trigram + filtros)
-- ============================================================
-- Só retorna linhas redistribuíveis. Combina match full-text e similaridade
-- de nome (trigram) para tolerar erros de digitação.
-- ============================================================
CREATE OR REPLACE FUNCTION public.mercado_buscar(
  p_q       text DEFAULT NULL,
  p_tipos   text[] DEFAULT NULL,
  p_uf      text DEFAULT NULL,
  p_limit   int DEFAULT 30,
  p_offset  int DEFAULT 0
)
RETURNS TABLE (
  id               uuid,
  razao_social     text,
  nome_fantasia    text,
  tipos            text[],
  uf               text,
  municipio        text,
  logo_url         text,
  score_relevancia numeric,
  fonte            text,
  num_veiculos     bigint,
  rank             real
)
LANGUAGE sql STABLE AS $$
  SELECT
    e.id, e.razao_social, e.nome_fantasia, e.tipos, e.uf, e.municipio,
    e.logo_url, e.score_relevancia, e.fonte,
    (SELECT count(*) FROM public.mercado_veiculo_prestadores p WHERE p.entidade_id = e.id) AS num_veiculos,
    CASE
      WHEN p_q IS NULL OR p_q = '' THEN 0
      ELSE GREATEST(
        ts_rank(e.busca_tsv, websearch_to_tsquery('portuguese', p_q)),
        similarity(coalesce(e.nome_fantasia, e.razao_social), p_q)
      )
    END AS rank
  FROM public.mercado_entidades e
  WHERE e.redistribuivel = true
    AND (p_tipos IS NULL OR e.tipos && p_tipos)
    AND (p_uf IS NULL OR e.uf = p_uf)
    AND (
      p_q IS NULL OR p_q = ''
      OR e.busca_tsv @@ websearch_to_tsquery('portuguese', p_q)
      OR (coalesce(e.nome_fantasia, e.razao_social) % p_q)
    )
  ORDER BY rank DESC, e.score_relevancia DESC NULLS LAST, e.razao_social
  LIMIT p_limit OFFSET p_offset;
$$;


-- ============================================================
-- RPC: mercado_rebuild_conexoes — materializa o grafo de co-serviço
-- ============================================================
-- Para cada par de entidades que atuam no mesmo veículo, cria/atualiza a
-- aresta 'co_servico' com peso = nº de veículos em comum. Base do mapa de
-- relacionamentos. Chamado pelo ETL após a carga (rebuildGrafoEScore).
-- ============================================================
CREATE OR REPLACE FUNCTION public.mercado_rebuild_conexoes()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.mercado_conexoes WHERE tipo = 'co_servico';
  INSERT INTO public.mercado_conexoes (origem_id, destino_id, tipo, peso, evidencia)
  SELECT a.entidade_id, b.entidade_id, 'co_servico',
         count(DISTINCT a.veiculo_id),
         jsonb_build_object('veiculos_em_comum', count(DISTINCT a.veiculo_id))
  FROM public.mercado_veiculo_prestadores a
  JOIN public.mercado_veiculo_prestadores b
    ON a.veiculo_id = b.veiculo_id AND a.entidade_id <> b.entidade_id
  GROUP BY a.entidade_id, b.entidade_id
  ON CONFLICT (origem_id, destino_id, tipo)
  DO UPDATE SET peso = EXCLUDED.peso, evidencia = EXCLUDED.evidencia, atualizado_em = now();
END;
$$;


-- ============================================================
-- RPC: mercado_recalcular_score — score de relevância proprietário
-- ============================================================
-- Heurística log sobre o nº de veículos em que a entidade atua. Só mexe em
-- entidades de fonte 'cvm' (preserva scores curados do seed/manual).
-- ============================================================
CREATE OR REPLACE FUNCTION public.mercado_recalcular_score()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.mercado_entidades e
  SET score_relevancia = LEAST(100, ROUND((20 + 15 * ln(1 + sub.cnt))::numeric, 1))
  FROM (
    SELECT entidade_id, count(DISTINCT veiculo_id) AS cnt
    FROM public.mercado_veiculo_prestadores
    GROUP BY entidade_id
  ) sub
  WHERE e.id = sub.entidade_id
    AND e.fonte = 'cvm';
END;
$$;


-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.mercado_entidades            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mercado_veiculos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mercado_veiculo_prestadores  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mercado_metricas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mercado_conexoes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mercado_rankings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mercado_ingestao_runs        ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer usuário autenticado vê SOMENTE linhas redistribuíveis.
-- (Dado licenciado, redistribuivel=false, só é acessível via service_role
--  em fluxos internos.)
CREATE POLICY "mercado_entidades_read_pub" ON public.mercado_entidades
  FOR SELECT TO authenticated USING (redistribuivel = true);
CREATE POLICY "mercado_veiculos_read_pub" ON public.mercado_veiculos
  FOR SELECT TO authenticated USING (redistribuivel = true);
CREATE POLICY "mercado_metricas_read_pub" ON public.mercado_metricas
  FOR SELECT TO authenticated USING (redistribuivel = true);
-- Tabelas de relação: leitura liberada a autenticados (as entidades já são gated).
CREATE POLICY "mercado_prestadores_read" ON public.mercado_veiculo_prestadores
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "mercado_conexoes_read" ON public.mercado_conexoes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "mercado_rankings_read" ON public.mercado_rankings
  FOR SELECT TO authenticated USING (true);

-- Escrita/ETL: apenas service_role.
CREATE POLICY "mercado_entidades_service"   ON public.mercado_entidades           FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "mercado_veiculos_service"    ON public.mercado_veiculos            FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "mercado_prestadores_service" ON public.mercado_veiculo_prestadores FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "mercado_metricas_service"    ON public.mercado_metricas            FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "mercado_conexoes_service"    ON public.mercado_conexoes            FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "mercado_rankings_service"    ON public.mercado_rankings            FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "mercado_ingestao_service"    ON public.mercado_ingestao_runs       FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================================
-- SEED de demonstração (dado aberto / público; idempotente)
-- ============================================================
-- Conjunto curado de participantes reais do mercado para o painel já
-- renderizar antes do primeiro ETL. fonte='seed', redistribuivel=true.
-- Pode ser apagado com: DELETE FROM public.mercado_entidades WHERE fonte='seed';
-- ============================================================
INSERT INTO public.mercado_entidades (razao_social, nome_fantasia, tipos, situacao, uf, municipio, fonte, score_relevancia)
VALUES
  ('BTG PACTUAL SERVICOS FINANCEIROS S.A. DTVM', 'BTG Pactual',        ARRAY['administrador','custodiante','banco','gestora'], 'ativa', 'RJ', 'Rio de Janeiro', 'seed', 96),
  ('XP INVESTIMENTOS CCTVM S.A.',                'XP Investimentos',   ARRAY['distribuidor','administrador','gestora'],         'ativa', 'SP', 'São Paulo',       'seed', 94),
  ('VORTX DTVM LTDA',                            'Vórtx',              ARRAY['administrador','custodiante'],                    'ativa', 'SP', 'São Paulo',       'seed', 88),
  ('SINGULARE CORRETORA DE TITULOS E VALORES MOBILIARIOS S.A.', 'Singulare', ARRAY['administrador','custodiante'],          'ativa', 'SP', 'São Paulo',       'seed', 82),
  ('OLIVEIRA TRUST DTVM S.A.',                   'Oliveira Trust',     ARRAY['administrador','custodiante','controladoria'],    'ativa', 'RJ', 'Rio de Janeiro', 'seed', 80),
  ('KINEA INVESTIMENTOS LTDA',                   'Kinea',              ARRAY['gestora'],                                        'ativa', 'SP', 'São Paulo',       'seed', 85),
  ('SPX GESTAO DE RECURSOS LTDA',                'SPX Capital',        ARRAY['gestora'],                                        'ativa', 'SP', 'São Paulo',       'seed', 83),
  ('CANVAS GESTAO DE RECURSOS LTDA',             'Canvas Capital',     ARRAY['gestora'],                                        'ativa', 'SP', 'São Paulo',       'seed', 72),
  ('TRUE SECURITIZADORA S.A.',                   'True Securitizadora',ARRAY['securitizadora'],                                 'ativa', 'SP', 'São Paulo',       'seed', 78),
  ('OPEA SECURITIZADORA S.A.',                   'Opea',               ARRAY['securitizadora'],                                 'ativa', 'SP', 'São Paulo',       'seed', 81),
  ('BANCO BTG PACTUAL S.A.',                     'Banco BTG Pactual',  ARRAY['banco'],                                          'ativa', 'RJ', 'Rio de Janeiro', 'seed', 95),
  ('EMPIRICA INVESTIMENTOS GESTAO DE RECURSOS LTDA','Empírica',        ARRAY['gestora','escritorio_credito_estruturado'],       'ativa', 'SP', 'São Paulo',       'seed', 76)
ON CONFLICT (cnpj) DO NOTHING;

-- Veículos demo + prestadores (formam o grafo de conexões da demo)
INSERT INTO public.mercado_veiculos (nome, tipo, categoria_cvm, situacao, fonte)
VALUES
  ('Kinea Crédito Estruturado FIDC',      'FIDC', 'FIDC', 'ativo', 'seed'),
  ('Empírica Recebíveis Multissetorial FIDC', 'FIDC', 'FIDC', 'ativo', 'seed'),
  ('Kinea Renda Imobiliária FII',         'FII',  'FII',  'ativo', 'seed')
ON CONFLICT (cnpj, tipo) DO NOTHING;

-- Liga prestadores aos veículos (apenas quando o seed acima foi inserido).
DO $seed$
DECLARE
  v_kinea_fidc   uuid; v_empirica_fidc uuid; v_kinea_fii uuid;
  e_kinea uuid; e_empirica uuid; e_vortx uuid; e_btg uuid; e_singulare uuid; e_xp uuid;
BEGIN
  SELECT id INTO v_kinea_fidc    FROM public.mercado_veiculos WHERE nome = 'Kinea Crédito Estruturado FIDC' AND fonte='seed';
  SELECT id INTO v_empirica_fidc FROM public.mercado_veiculos WHERE nome = 'Empírica Recebíveis Multissetorial FIDC' AND fonte='seed';
  SELECT id INTO v_kinea_fii     FROM public.mercado_veiculos WHERE nome = 'Kinea Renda Imobiliária FII' AND fonte='seed';
  SELECT id INTO e_kinea     FROM public.mercado_entidades WHERE nome_fantasia = 'Kinea' AND fonte='seed';
  SELECT id INTO e_empirica  FROM public.mercado_entidades WHERE nome_fantasia = 'Empírica' AND fonte='seed';
  SELECT id INTO e_vortx     FROM public.mercado_entidades WHERE nome_fantasia = 'Vórtx' AND fonte='seed';
  SELECT id INTO e_btg       FROM public.mercado_entidades WHERE nome_fantasia = 'BTG Pactual' AND fonte='seed';
  SELECT id INTO e_singulare FROM public.mercado_entidades WHERE nome_fantasia = 'Singulare' AND fonte='seed';
  SELECT id INTO e_xp        FROM public.mercado_entidades WHERE nome_fantasia = 'XP Investimentos' AND fonte='seed';

  IF v_kinea_fidc IS NOT NULL THEN
    INSERT INTO public.mercado_veiculo_prestadores (veiculo_id, entidade_id, papel, fonte) VALUES
      (v_kinea_fidc, e_kinea, 'gestor', 'seed'),
      (v_kinea_fidc, e_vortx, 'administrador', 'seed'),
      (v_kinea_fidc, e_btg, 'custodiante', 'seed'),
      (v_kinea_fidc, e_xp, 'distribuidor', 'seed'),
      (v_empirica_fidc, e_empirica, 'gestor', 'seed'),
      (v_empirica_fidc, e_singulare, 'administrador', 'seed'),
      (v_empirica_fidc, e_btg, 'custodiante', 'seed'),
      (v_kinea_fii, e_kinea, 'gestor', 'seed'),
      (v_kinea_fii, e_btg, 'administrador', 'seed')
    ON CONFLICT (veiculo_id, entidade_id, papel) DO NOTHING;
  END IF;
END
$seed$;


-- ===== 20260612_mapa_mercado_alvos.sql =====
-- ============================================================
-- Mapa Inteligente do Mercado — RPC: alvos de captação (2026-06-12)
-- ============================================================
-- A partir do mandato de um deal (tipos de veículo: FIDC, FIP, FII, ...),
-- retorna GESTORAS que já operam aquele mandato no mercado, rankeadas por
-- experiência (nº de veículos no mandato) + score de relevância.
--
-- É o motor de originação assistida: "para quem levo este deal?".
-- Só dado aberto (CVM), redistribuível. NÃO é recomendação de investimento;
-- é um sinal de afinidade de mandato derivado do histórico público.
-- ============================================================
CREATE OR REPLACE FUNCTION public.mercado_alvos_captacao(
  p_tipos_veiculo text[],
  p_papeis        text[] DEFAULT ARRAY['gestor'],
  p_uf            text   DEFAULT NULL,
  p_limit         int    DEFAULT 20
)
RETURNS TABLE (
  entidade_id          uuid,
  razao_social         text,
  nome_fantasia        text,
  tipos                text[],
  uf                   text,
  score_relevancia     numeric,
  veiculos_no_mandato  bigint,
  total_veiculos       bigint
)
LANGUAGE sql STABLE AS $$
  SELECT
    e.id, e.razao_social, e.nome_fantasia, e.tipos, e.uf, e.score_relevancia,
    count(DISTINCT vp.veiculo_id) FILTER (WHERE v.tipo = ANY(p_tipos_veiculo)) AS veiculos_no_mandato,
    count(DISTINCT vp.veiculo_id) AS total_veiculos
  FROM public.mercado_entidades e
  JOIN public.mercado_veiculo_prestadores vp
    ON vp.entidade_id = e.id AND vp.papel = ANY(p_papeis)
  JOIN public.mercado_veiculos v
    ON v.id = vp.veiculo_id AND v.redistribuivel = true
  WHERE e.redistribuivel = true
    AND (p_uf IS NULL OR e.uf = p_uf)
  GROUP BY e.id
  HAVING count(DISTINCT vp.veiculo_id) FILTER (WHERE v.tipo = ANY(p_tipos_veiculo)) > 0
  ORDER BY veiculos_no_mandato DESC, e.score_relevancia DESC NULLS LAST
  LIMIT p_limit;
$$;


-- ===== 20260612_mapa_mercado_perfis.sql =====
-- ============================================================
-- Mapa Inteligente do Mercado — Classificação por nome (2026-06-12)
-- ============================================================
-- A CVM classifica papéis (gestor/admin/custodiante), não modelo de negócio.
-- Esta RPC marca, por heurística de NOME, perfis de negócio sobre quem já está
-- na base (tipicamente como gestora):
--   - family_office       : family offices / wealth / gestão de patrimônio
--   - boutique_investimento: boutiques de M&A/assessoria (partners/advisor/...)
--   - escritorio_credito_estruturado: crédito estruturado (raro na fonte aberta)
-- Append idempotente (não duplica), preserva os demais papéis. Re-aplicável
-- (chamada no pós-processamento do ETL p/ sobreviver ao cron semanal).
-- NÃO usa "CAPITAL" (genérico demais → super-marcaria).
-- ============================================================
CREATE OR REPLACE FUNCTION public.mercado_classificar_por_nome()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- family_office
  UPDATE public.mercado_entidades e
  SET tipos = (SELECT array_agg(DISTINCT t) FROM unnest(e.tipos || ARRAY['family_office']) t)
  WHERE NOT ('family_office' = ANY(e.tipos))
    AND upper(coalesce(e.nome_fantasia,'') || ' ' || e.razao_social) ~
        '(FAMILY OFFICE|MULTI[ -]?FAMILY|WEALTH MANAG|GEST.O DE PATRIM|GEST.O PATRIMONIAL|GEST.O DE FORTUNA)';

  -- boutique_investimento
  UPDATE public.mercado_entidades e
  SET tipos = (SELECT array_agg(DISTINCT t) FROM unnest(e.tipos || ARRAY['boutique_investimento']) t)
  WHERE NOT ('boutique_investimento' = ANY(e.tipos))
    AND upper(coalesce(e.nome_fantasia,'') || ' ' || e.razao_social) ~
        '(PARTNERS|ADVISOR|INVESTMENT BANK|ASSESSORIA|M&A|MERGERS)';

  -- escritorio_credito_estruturado (raro: maioria não é registrada na CVM)
  UPDATE public.mercado_entidades e
  SET tipos = (SELECT array_agg(DISTINCT t) FROM unnest(e.tipos || ARRAY['escritorio_credito_estruturado']) t)
  WHERE NOT ('escritorio_credito_estruturado' = ANY(e.tipos))
    AND upper(coalesce(e.nome_fantasia,'') || ' ' || e.razao_social) ~
        '(CR.DITO ESTRUTURAD|ESTRUTURA..O DE CR.DITO)';
END;
$$;

-- Aplica imediatamente.
SELECT public.mercado_classificar_por_nome();


-- ===== 20260612_mapa_mercado_semantica.sql =====
-- ============================================================
-- Mapa Inteligente do Mercado — Busca semântica (2026-06-12)
-- ============================================================
-- Adiciona embedding (voyage-3-large, 1024d) às entidades e a RPC de busca
-- por similaridade de cosseno (pgvector + HNSW). Permite perguntar em
-- linguagem natural ("gestoras de crédito estruturado em SP").
-- ============================================================
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE public.mercado_entidades ADD COLUMN IF NOT EXISTS embedding vector(1024);

CREATE INDEX IF NOT EXISTS idx_mercado_entidades_embedding_hnsw
  ON public.mercado_entidades USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ============================================================
-- RPC: mercado_busca_semantica — top-K por similaridade de cosseno
-- ============================================================
CREATE OR REPLACE FUNCTION public.mercado_busca_semantica(
  p_query_embedding vector(1024),
  p_tipos           text[]           DEFAULT NULL,
  p_uf              text             DEFAULT NULL,
  p_limit           int              DEFAULT 30,
  p_min             double precision DEFAULT 0.3
)
RETURNS TABLE (
  id               uuid,
  razao_social     text,
  nome_fantasia    text,
  tipos            text[],
  uf               text,
  municipio        text,
  logo_url         text,
  score_relevancia numeric,
  fonte            text,
  num_veiculos     bigint,
  similaridade     double precision
)
LANGUAGE sql STABLE AS $$
  SELECT
    e.id, e.razao_social, e.nome_fantasia, e.tipos, e.uf, e.municipio,
    e.logo_url, e.score_relevancia, e.fonte,
    (SELECT count(*) FROM public.mercado_veiculo_prestadores p WHERE p.entidade_id = e.id) AS num_veiculos,
    1 - (e.embedding <=> p_query_embedding) AS similaridade
  FROM public.mercado_entidades e
  WHERE e.redistribuivel = true
    AND e.embedding IS NOT NULL
    AND (p_tipos IS NULL OR e.tipos && p_tipos)
    AND (p_uf IS NULL OR e.uf = p_uf)
    AND 1 - (e.embedding <=> p_query_embedding) >= p_min
  ORDER BY e.embedding <=> p_query_embedding
  LIMIT p_limit;
$$;


-- ===== 20260612_regeneracoes_atomicidade.sql =====
-- ============================================================
-- Regenerações — atomicidade do contador + anti-reuso (2026-06-12)
-- ============================================================
-- 1) Incremento atômico de analises.regeneracoes_count (evita lost-update
--    quando duas regenerações distintas confirmam quase ao mesmo tempo).
-- 2) Coluna aplicada_em em regeneracoes: marca quando o briefing já foi
--    efetivamente aplicado por um /step, para impedir reaplicar o mesmo
--    briefing (pago) em chamadas repetidas.
-- ============================================================

CREATE OR REPLACE FUNCTION public.increment_regeneracoes_count(p_analise_id uuid)
RETURNS int
LANGUAGE sql AS $$
  UPDATE public.analises
     SET regeneracoes_count = COALESCE(regeneracoes_count, 0) + 1,
         atualizado_em = now()
   WHERE id = p_analise_id
  RETURNING regeneracoes_count;
$$;

ALTER TABLE public.regeneracoes
  ADD COLUMN IF NOT EXISTS aplicada_em timestamptz;


-- ===== 20260615_mapa_buscas_log_rls.sql =====
-- ============================================================
-- LGPD: RLS + retenção no mapa_buscas_log (2026-06-15)
-- ============================================================
-- O log de buscas IA do Mapa grava o termo de busca cru (coluna q),
-- que pode conter dados pessoais (ex.: nome de uma pessoa pesquisada).
-- Esta migration fecha duas lacunas de proteção de dados:
--   1) RLS: a tabela não tinha Row Level Security. Passa a ter.
--      Leitura/escrita pelo app já usam service_role (bypassa RLS),
--      então o registro (registrarBuscaIa) e a contagem mensal
--      (mercado_buscas_ia_mes_count) seguem funcionando.
--   2) Retenção: a contagem mensal só precisa das linhas do mês
--      corrente. Linhas antigas viram apenas resíduo de dado pessoal.
--      Adiciona função de expurgo (minimização de dados, Art. 6º LGPD).
-- ============================================================

ALTER TABLE public.mapa_buscas_log ENABLE ROW LEVEL SECURITY;

-- service_role: acesso total (usado pelo app para registrar e contar).
DROP POLICY IF EXISTS "mapa_buscas_log_service" ON public.mapa_buscas_log;
CREATE POLICY "mapa_buscas_log_service" ON public.mapa_buscas_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Gestor/membro autenticado: pode LER apenas as buscas do próprio escritório
-- (auditoria; nenhum acesso a logs de outro escritório).
DROP POLICY IF EXISTS "mapa_buscas_log_own_escritorio" ON public.mapa_buscas_log;
CREATE POLICY "mapa_buscas_log_own_escritorio" ON public.mapa_buscas_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfis p
      WHERE p.user_id = auth.uid()
        AND p.escritorio_id = mapa_buscas_log.escritorio_id
    )
    OR EXISTS (
      SELECT 1 FROM public.escritorios e
      WHERE e.id = mapa_buscas_log.escritorio_id
        AND e.user_id = auth.uid()
    )
  );

-- ============================================================
-- Retenção: expurga buscas com mais de 60 dias (mantém folga sobre
-- a janela mensal usada na contagem). Minimização de dados (LGPD).
-- ============================================================
CREATE OR REPLACE FUNCTION public.mapa_buscas_log_purge(p_retention_days int DEFAULT 60)
RETURNS int
LANGUAGE plpgsql AS $$
DECLARE
  v_deleted int;
BEGIN
  DELETE FROM public.mapa_buscas_log
  WHERE criado_em < now() - make_interval(days => p_retention_days);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Agendamento diário do expurgo (apenas se a extensão pg_cron existir).
-- Em Supabase sem pg_cron, o expurgo pode ser disparado por um cron de
-- aplicação (Inngest) chamando a RPC mapa_buscas_log_purge.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'mapa-buscas-log-purge',
      '0 4 * * *',
      $cron$ SELECT public.mapa_buscas_log_purge(60); $cron$
    );
  END IF;
END;
$$;


-- ===== 20260616_app_settings.sql =====
-- Configurações globais da plataforma (key/value). Hoje usado para o modo
-- manutenção (liga/desliga sem redeploy). Apenas o service role (API admin)
-- escreve; a leitura da flag de manutenção é PÚBLICA porque o middleware precisa
-- decidir o gate antes mesmo da autenticação completa do usuário.
CREATE TABLE IF NOT EXISTS app_settings (
  key         text        PRIMARY KEY,
  value       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Reusa a função global set_updated_at() (criada em 20260513_blog_posts.sql).
DROP TRIGGER IF EXISTS app_settings_updated_at ON app_settings;
CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Leitura pública APENAS da flag de manutenção (não vaza outras configs).
DROP POLICY IF EXISTS "public_read_maintenance" ON app_settings;
CREATE POLICY "public_read_maintenance"
  ON app_settings FOR SELECT
  USING (key = 'maintenance');

-- Service role bypassa RLS — escrita pela API admin.

-- Seed do modo manutenção (desligado).
INSERT INTO app_settings (key, value)
VALUES ('maintenance', '{"enabled": false, "message": ""}'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- ===== 20260616_platform_releases.sql =====
-- Notas de versão voltadas ao CLIENTE ("Plataforma Atualizada"). O admin cria e
-- publica; o app mostra a última release publicada UMA VEZ por usuário, rastreando
-- a versão vista em user_metadata (mesmo padrão do onboarding). É deliberadamente
-- separada do changelog técnico (Backup/Mandor_Arquivo_Ancora_Mestre.md).
CREATE TABLE IF NOT EXISTS platform_releases (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  version       text        UNIQUE NOT NULL,        -- ex.: "2026.06" ou "1.4.0"
  title         text        NOT NULL DEFAULT 'Plataforma atualizada',
  release_date  date        NOT NULL DEFAULT now(),
  improvements  text[]      NOT NULL DEFAULT '{}',  -- melhorias
  new_features  text[]      NOT NULL DEFAULT '{}',  -- novos recursos
  fixes         text[]      NOT NULL DEFAULT '{}',  -- correções
  published     boolean     NOT NULL DEFAULT false,
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Listagem da última release publicada (ordenada por data de publicação).
CREATE INDEX IF NOT EXISTS platform_releases_published_idx
  ON platform_releases (published, published_at DESC);

-- Reusa a função global set_updated_at() (criada em 20260513_blog_posts.sql).
DROP TRIGGER IF EXISTS platform_releases_updated_at ON platform_releases;
CREATE TRIGGER platform_releases_updated_at
  BEFORE UPDATE ON platform_releases
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE platform_releases ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário (mesmo anônimo) pode ler releases publicadas.
DROP POLICY IF EXISTS "public_read_published_releases" ON platform_releases;
CREATE POLICY "public_read_published_releases"
  ON platform_releases FOR SELECT
  USING (published = true);

-- Service role bypassa RLS — criação/edição/publicação pela API admin.

