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
