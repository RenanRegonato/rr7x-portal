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
