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
