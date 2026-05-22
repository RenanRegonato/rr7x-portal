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
