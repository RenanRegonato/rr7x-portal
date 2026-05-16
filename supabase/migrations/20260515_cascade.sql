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
