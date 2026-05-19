-- ============================================
-- Documents + Chunks + Facts + pgvector (Mandor) — 2026-05-19
-- ============================================
-- Habilita ingestão assíncrona que LÊ 100% dos documentos:
--   1. Cada arquivo vira 1 linha em analise_documents (status trackeado)
--   2. Texto extraído (com OCR quando preciso) é quebrado em CHUNKS
--   3. Cada chunk recebe embedding (voyage-3-large, 1024 dim)
--   4. Fact extractor (Haiku) processa cada chunk → document_facts
--   5. Consolidator (Sonnet) gera fact_bank consolidado em analises
--
-- Pipeline downstream lê fact_bank compacto + RAG sob demanda.

-- Extensão pgvector (Supabase tem nativamente, idempotente)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- 1) analise_documents — 1 linha por arquivo enviado
-- ============================================
CREATE TABLE IF NOT EXISTS public.analise_documents (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  analise_id          uuid        NOT NULL REFERENCES public.analises(id) ON DELETE CASCADE,
  file_path           text        NOT NULL,            -- path no Storage
  file_name           text        NOT NULL,
  file_size_bytes     bigint      NOT NULL DEFAULT 0,
  mime_type           text,
  file_category       text        NOT NULL,            -- pdf | image | docx | excel | text | unsupported
  status              text        NOT NULL DEFAULT 'pending',
                                  -- pending | downloading | ocr | parsing | chunking | embedding | fact_extracting | completed | failed
  ocr_provider        text,                            -- mistral | tesseract | native | null
  pages_count         integer,
  total_chars         integer,
  total_chunks        integer     NOT NULL DEFAULT 0,
  chunks_completed    integer     NOT NULL DEFAULT 0,
  error_message       text,
  retry_count         integer     NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  completed_at        timestamptz,
  UNIQUE (analise_id, file_path)
);

CREATE INDEX IF NOT EXISTS idx_analise_documents_analise   ON public.analise_documents (analise_id);
CREATE INDEX IF NOT EXISTS idx_analise_documents_status    ON public.analise_documents (status) WHERE status NOT IN ('completed', 'failed');
CREATE INDEX IF NOT EXISTS idx_analise_documents_pending   ON public.analise_documents (analise_id, status) WHERE status != 'completed';

-- Trigger updated_at (reutiliza set_updated_at criada em 20260513_blog_posts.sql)
CREATE TRIGGER analise_documents_updated_at
  BEFORE UPDATE ON public.analise_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- 2) document_chunks — chunks com embedding pgvector
-- ============================================
-- voyage-3-large = 1024 dimensões.
-- Se trocar de modelo, criar nova coluna ou nova tabela (não dá pra ALTER vector dim).
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id         uuid        NOT NULL REFERENCES public.analise_documents(id) ON DELETE CASCADE,
  analise_id          uuid        NOT NULL REFERENCES public.analises(id) ON DELETE CASCADE,
  chunk_index         integer     NOT NULL,            -- ordem dentro do documento (0-based)
  chunk_text          text        NOT NULL,            -- conteúdo bruto do chunk
  char_start          integer     NOT NULL,
  char_end            integer     NOT NULL,
  page_start          integer,
  page_end            integer,
  token_count         integer     NOT NULL,
  embedding           vector(1024),                    -- voyage-3-large
  embedding_model     text        NOT NULL DEFAULT 'voyage-3-large',
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document  ON public.document_chunks (document_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_document_chunks_analise   ON public.document_chunks (analise_id);

-- Índice de similaridade (HNSW > IVFFlat em qualidade, mesmo custo de escrita maior).
-- Criar SEM CONCURRENTLY na primeira vez (tabela vazia).
-- Operador <=> = cosine distance. Match com voyage embeddings já normalizados.
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw
  ON public.document_chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ============================================
-- 3) document_facts — fatos extraídos POR chunk
-- ============================================
-- Espelha o schema de analise_facts (Fase 6 — truth layer), mas em granularidade de chunk.
-- Consolidator monta a tabela analise_facts (já existente) a partir dessa aqui.
CREATE TABLE IF NOT EXISTS public.document_facts (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  analise_id          uuid        NOT NULL REFERENCES public.analises(id) ON DELETE CASCADE,
  document_id         uuid        NOT NULL REFERENCES public.analise_documents(id) ON DELETE CASCADE,
  chunk_id            uuid        NOT NULL REFERENCES public.document_chunks(id) ON DELETE CASCADE,
  fact_type           text        NOT NULL,            -- documento_disponivel | numero_financeiro | estrutura_societaria | contrato | garantia | passivo | evento_relevante | lacuna
  fact_key            text        NOT NULL,
  fact_value          text        NOT NULL,
  source_quote        text,
  source_page         integer,
  confidence          numeric(3,2) NOT NULL DEFAULT 0.7 CHECK (confidence >= 0 AND confidence <= 1),
  model_id            text        NOT NULL,            -- claude-haiku-4-5-20251001 (esperado)
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_facts_analise   ON public.document_facts (analise_id);
CREATE INDEX IF NOT EXISTS idx_document_facts_document  ON public.document_facts (document_id);
CREATE INDEX IF NOT EXISTS idx_document_facts_type      ON public.document_facts (analise_id, fact_type);

-- ============================================
-- 4) Colunas novas em analises pra trackear o pipeline async
-- ============================================
ALTER TABLE public.analises
  ADD COLUMN IF NOT EXISTS documents_ingestion_started_at  timestamptz,
  ADD COLUMN IF NOT EXISTS documents_ingested_at           timestamptz,
  ADD COLUMN IF NOT EXISTS documents_total                 integer,
  ADD COLUMN IF NOT EXISTS documents_completed             integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS documents_failed                integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS documents_total_chars           bigint,
  ADD COLUMN IF NOT EXISTS documents_total_tokens          bigint,
  ADD COLUMN IF NOT EXISTS fact_bank                       jsonb,
  ADD COLUMN IF NOT EXISTS fact_bank_consolidated_at       timestamptz,
  ADD COLUMN IF NOT EXISTS fact_bank_model_id              text;

-- ============================================
-- 5) Função pra RAG retrieval (top-K chunks por similaridade)
-- ============================================
-- Uso: SELECT * FROM match_document_chunks('analise-uuid', '[0.1, 0.2, ...]'::vector, 10, 0.5);
-- Retorna chunks ordenados por similaridade decrescente, com metadata pra citação.
CREATE OR REPLACE FUNCTION public.match_document_chunks(
  p_analise_id        uuid,
  p_query_embedding   vector(1024),
  p_match_count       integer DEFAULT 10,
  p_similarity_min    double precision DEFAULT 0.0
)
RETURNS TABLE (
  chunk_id        uuid,
  document_id     uuid,
  document_name   text,
  chunk_index     integer,
  chunk_text      text,
  page_start      integer,
  page_end        integer,
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
    1 - (c.embedding <=> p_query_embedding) AS similarity
  FROM public.document_chunks c
  JOIN public.analise_documents d ON d.id = c.document_id
  WHERE c.analise_id = p_analise_id
    AND c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> p_query_embedding) >= p_similarity_min
  ORDER BY c.embedding <=> p_query_embedding
  LIMIT p_match_count;
$$;

-- ============================================
-- 6) Row Level Security
-- ============================================
ALTER TABLE public.analise_documents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_facts     ENABLE ROW LEVEL SECURITY;

-- Owners e membros do deal podem ler. Service role bypassa RLS pro worker.
CREATE POLICY "documents_read_owner_or_member" ON public.analise_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.analises a
      WHERE a.id = analise_documents.analise_id
        AND (a.user_id = auth.uid()
             OR EXISTS (SELECT 1 FROM public.deal_members m WHERE m.analise_id = a.id AND m.user_id = auth.uid()))
    )
  );

CREATE POLICY "chunks_read_owner_or_member" ON public.document_chunks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.analises a
      WHERE a.id = document_chunks.analise_id
        AND (a.user_id = auth.uid()
             OR EXISTS (SELECT 1 FROM public.deal_members m WHERE m.analise_id = a.id AND m.user_id = auth.uid()))
    )
  );

CREATE POLICY "facts_read_owner_or_member" ON public.document_facts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.analises a
      WHERE a.id = document_facts.analise_id
        AND (a.user_id = auth.uid()
             OR EXISTS (SELECT 1 FROM public.deal_members m WHERE m.analise_id = a.id AND m.user_id = auth.uid()))
    )
  );

-- ============================================
-- NOTAS
-- ============================================
-- 1) Embedding dim: voyage-3-large = 1024. Se mudar pra OpenAI text-embedding-3-large (3072) ou
--    text-embedding-3-small (1536), criar NOVA tabela ou nova coluna; ALTER de vector dim
--    não é suportado.
-- 2) HNSW vs IVFFlat: HNSW tem melhor recall e não precisa de "training" — escolhido.
-- 3) Operador <=> = cosine distance. voyage embeddings vêm normalizados (norma 1), então
--    cosine = produto interno. Match com operator class vector_cosine_ops.
-- 4) chunk_text fica como text (não tsvector) — busca semântica via embedding cobre o caso.
--    Se quiser BM25 híbrido depois, adiciona coluna tsvector + GIN index.
-- 5) document_facts.fact_type é o mesmo vocabulário de analise_facts (não tem CHECK pra
--    permitir evolução; documentação canônica em lib/truth-layer.ts).
