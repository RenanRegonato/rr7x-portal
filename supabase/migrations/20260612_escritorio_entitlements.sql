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
