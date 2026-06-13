-- ============================================================
-- Mapa Inteligente do Mercado — Busca semântica (2026-06-12)
-- ============================================================
-- Adiciona embedding (voyage-3-large, 1024d) às entidades e a RPC de busca
-- por similaridade de cosseno (pgvector + HNSW). Permite perguntar em
-- linguagem natural ("gestoras de crédito estruturado em SP").
-- ============================================================
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE public.mercado_entidades ADD COLUMN IF NOT EXISTS embedding vector(1024);

CREATE INDEX IF NOT EXISTS idx_mercado_entidades_embedding_hnsw
  ON public.mercado_entidades USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ============================================================
-- RPC: mercado_busca_semantica — top-K por similaridade de cosseno
-- ============================================================
CREATE OR REPLACE FUNCTION public.mercado_busca_semantica(
  p_query_embedding vector(1024),
  p_tipos           text[]           DEFAULT NULL,
  p_uf              text             DEFAULT NULL,
  p_limit           int              DEFAULT 30,
  p_min             double precision DEFAULT 0.3
)
RETURNS TABLE (
  id               uuid,
  razao_social     text,
  nome_fantasia    text,
  tipos            text[],
  uf               text,
  municipio        text,
  logo_url         text,
  score_relevancia numeric,
  fonte            text,
  num_veiculos     bigint,
  similaridade     double precision
)
LANGUAGE sql STABLE AS $$
  SELECT
    e.id, e.razao_social, e.nome_fantasia, e.tipos, e.uf, e.municipio,
    e.logo_url, e.score_relevancia, e.fonte,
    (SELECT count(*) FROM public.mercado_veiculo_prestadores p WHERE p.entidade_id = e.id) AS num_veiculos,
    1 - (e.embedding <=> p_query_embedding) AS similaridade
  FROM public.mercado_entidades e
  WHERE e.redistribuivel = true
    AND e.embedding IS NOT NULL
    AND (p_tipos IS NULL OR e.tipos && p_tipos)
    AND (p_uf IS NULL OR e.uf = p_uf)
    AND 1 - (e.embedding <=> p_query_embedding) >= p_min
  ORDER BY e.embedding <=> p_query_embedding
  LIMIT p_limit;
$$;
