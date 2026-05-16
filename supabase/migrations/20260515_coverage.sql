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
