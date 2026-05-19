import { createAdminClient } from '@/lib/supabase-server'
import { embedQuery } from '@/lib/ingestion/voyage-embeddings'

export interface RetrievedChunk {
  chunk_id:      string
  document_id:   string
  document_name: string
  chunk_index:   number
  chunk_text:    string
  page_start:    number | null
  page_end:      number | null
  similarity:    number
}

/**
 * Busca top-K chunks mais relevantes à query dentro de uma análise.
 * Usa a função SQL match_document_chunks() (HNSW + cosine).
 */
export async function retrieveRelevantChunks(opts: {
  analiseId:     string
  query:         string
  k?:            number
  minSimilarity?: number
}): Promise<RetrievedChunk[]> {
  const k = opts.k ?? 8
  const minSim = opts.minSimilarity ?? 0.4

  const queryEmbedding = await embedQuery(opts.query)

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('match_document_chunks', {
    p_analise_id:      opts.analiseId,
    p_query_embedding: queryEmbedding as unknown as string,
    p_match_count:     k,
    p_similarity_min:  minSim,
  })

  if (error) throw new Error(`RAG retrieval falhou: ${error.message}`)
  return (data ?? []) as RetrievedChunk[]
}

/**
 * Formata chunks recuperados pra injeção como contexto em prompt.
 * Inclui citação clara (doc + page + similarity).
 */
export function formatChunksForPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return '(Nenhum trecho relevante encontrado nos documentos)'
  return chunks
    .map((c, i) => {
      const pageHint = c.page_start != null
        ? c.page_end != null && c.page_end !== c.page_start
          ? `pp. ${c.page_start}-${c.page_end}`
          : `p. ${c.page_start}`
        : 'página desconhecida'
      return `### Trecho ${i + 1} — ${c.document_name} (${pageHint}, similaridade ${c.similarity.toFixed(2)})\n\n${c.chunk_text}`
    })
    .join('\n\n---\n\n')
}
