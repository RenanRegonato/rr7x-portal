-- ============================================
-- Match document chunks com suporte a categoria
-- ============================================
-- Estende a RPC match_document_chunks para aceitar filtro opcional por categoria.
-- Permite RAG semanticamente relevante E categorizado (economia de tokens).

-- Nova versão com categoria_filter (opcional)
CREATE OR REPLACE FUNCTION public.match_document_chunks(
  p_analise_id        uuid,
  p_query_embedding   vector(1024),
  p_match_count       integer DEFAULT 10,
  p_similarity_min    double precision DEFAULT 0.0,
  p_categoria         text DEFAULT NULL  -- novo: filtro opcional
)
RETURNS TABLE (
  chunk_id        uuid,
  document_id     uuid,
  document_name   text,
  chunk_index     integer,
  chunk_text      text,
  page_start      integer,
  page_end        integer,
  categoria       text,
  similarity      double precision
)
LANGUAGE sql STABLE PARALLEL SAFE
AS $$
  SELECT
    c.id              AS chunk_id,
    c.document_id     AS document_id,
    d.file_name       AS document_name,
    c.chunk_index     AS chunk_index,
    c.chunk_text      AS chunk_text,
    c.page_start      AS page_start,
    c.page_end        AS page_end,
    c.categoria       AS categoria,
    1 - (c.embedding <=> p_query_embedding) AS similarity
  FROM public.document_chunks c
  JOIN public.analise_documents d ON d.id = c.document_id
  WHERE c.analise_id = p_analise_id
    AND c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> p_query_embedding) >= p_similarity_min
    AND (p_categoria IS NULL OR c.categoria = p_categoria)  -- filtro condicional
  ORDER BY c.embedding <=> p_query_embedding
  LIMIT p_match_count;
$$;

-- Comentário documentando o novo parâmetro
COMMENT ON FUNCTION public.match_document_chunks(uuid, vector, integer, double precision, text) IS
  'Busca top-K chunks por similaridade semântica (HNSW cosine). Com p_categoria, filtra por domínio (financeiro/juridico/etc) antes de ordenar. Sem categoria, retorna chunks em qualquer categoria.';
