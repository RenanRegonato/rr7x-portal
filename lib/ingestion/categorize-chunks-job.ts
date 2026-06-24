/**
 * Job Inngest: categoriza chunks não categorizados em background.
 * Roda em batch para economizar API calls.
 *
 * Disparo:
 * - Automático: após ingestão completar, dispara categorização em background
 * - Manual: admin pode disparar manualmente via admin/categorize endpoint
 */

import { createAdminClient } from '@/lib/supabase-server'
import { categorizeChunksBatch, ChunkCategory } from '@/lib/ingestion/chunk-categorizer'

interface CategorizeChunksParams {
  analiseId?: string // se vazio, categoriza TODOS não categorizados
  step?: any
  logger?: any
}

export async function categorizeChunksJob({ analiseId, step, logger }: CategorizeChunksParams) {
  const admin = createAdminClient()
  const BATCH_SIZE = 50

  logger?.info('Starting chunk categorization', { analiseId })

  // 1) Busca chunks não categorizados
  let query = admin
    .from('document_chunks')
    .select('id, chunk_text')
    .is('categoria', null)
    .order('created_at')

  if (analiseId) {
    query = query.eq('analise_id', analiseId)
  }

  const { data: allChunks, error: fetchErr } = await query

  if (fetchErr) {
    logger?.error('Erro ao buscar chunks', { fetchErr })
    throw fetchErr
  }

  if (!allChunks || allChunks.length === 0) {
    logger?.info('Nenhum chunk para categorizar')
    return { processed: 0 }
  }

  logger?.info(`Encontrado ${allChunks.length} chunks para categorizar`)

  let processedCount = 0

  // 2) Processa em lotes
  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE)

    const categorizations = await (step?.run ? step.run('categorize-batch', async () => {
      const result = new Map<string, ChunkCategory>()
      for (const chunk of batch) {
        const { categorizeChunk } = await import('@/lib/ingestion/chunk-categorizer')
        const { categoria } = await categorizeChunk(chunk.chunk_text)
        result.set(chunk.id, categoria)
      }
      return Object.fromEntries(result)
    }) : (async () => {
      const result = new Map<string, ChunkCategory>()
      for (const chunk of batch) {
        const { categorizeChunk } = await import('@/lib/ingestion/chunk-categorizer')
        const { categoria } = await categorizeChunk(chunk.chunk_text)
        result.set(chunk.id, categoria)
      }
      return Object.fromEntries(result)
    })())

    // 3) Salva categorizações
    const updates = Object.entries(categorizations).map(([id, categoria]) => ({
      id,
      categoria,
      categoria_model_id: 'claude-3-5-haiku-20241022',
      categorizado_em: new Date().toISOString(),
    }))

    const { error: updateErr } = await admin
      .from('document_chunks')
      .upsert(updates, { onConflict: 'id' })

    if (updateErr) {
      logger?.error('Erro ao salvar categorias', { updateErr, batch: batch.length })
      throw updateErr
    }

    processedCount += batch.length
    logger?.info(`Categorizados ${processedCount}/${allChunks.length} chunks`)
  }

  logger?.info('Categorização concluída', { processedCount })
  return { processed: processedCount }
}
