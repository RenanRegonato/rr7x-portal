-- ============================================
-- Document chunks categoria (Mandor) — 2026-06-23
-- ============================================
-- Adiciona coluna categoria em document_chunks para permitir
-- que agentes especializados consultem apenas chunks relevantes.
-- Economias esperadas: 60-70% de tokens sem mudança funcional.
--
-- Categorias:
--   financeiro   - DRE, balanço, fluxo de caixa, extratos
--   juridico     - contratos, matrículas, certidões, procurações
--   tributario   - IR, DARF, certidões de regularização
--   garantias    - garantias imobiliárias, penhoras, adversários
--   estrutura    - estrutura societária, participações, cedentes
--   outro        - informações gerais, notas, outros

ALTER TABLE public.document_chunks
  ADD COLUMN IF NOT EXISTS categoria text CHECK (categoria IN ('financeiro', 'juridico', 'tributario', 'garantias', 'estrutura', 'outro'));

-- Índice para consultas por categoria (agentes consultam: "WHERE categoria = $1")
CREATE INDEX IF NOT EXISTS idx_document_chunks_categoria
  ON public.document_chunks (analise_id, categoria)
  WHERE categoria IS NOT NULL;

-- Track: coluna para saber se foi categorizado (para re-processar se necessário)
ALTER TABLE public.document_chunks
  ADD COLUMN IF NOT EXISTS categoria_model_id text;  -- ex: 'claude-haiku-4-5-20251001'

ALTER TABLE public.document_chunks
  ADD COLUMN IF NOT EXISTS categorizado_em timestamptz;
