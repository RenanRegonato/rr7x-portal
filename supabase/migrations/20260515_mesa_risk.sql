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
