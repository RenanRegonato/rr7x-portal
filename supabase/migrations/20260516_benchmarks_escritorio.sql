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
