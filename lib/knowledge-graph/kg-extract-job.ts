/**
 * Job Inngest: Extrai entidades e relacionamentos de chunks para o Knowledge Graph.
 * Roda em background após ingestão de documentos.
 *
 * Fluxo:
 * 1. Busca chunks não processados (categoria IS NOT NULL, para priorizar)
 * 2. Para cada chunk: extrai entidades + relacionamentos via Haiku
 * 3. Persiste em kg_entidades + kg_relacionamentos com rastreabilidade
 * 4. Marca como "validacao_necessaria=true" se confiança < 90%
 */

import { createAdminClient } from '@/lib/supabase-server'
import { extractRelationshipsBatch, type ExtractionResult, type ExtractedEntity, type ExtractedRelationship } from './relationship-extractor'

interface KGExtractParams {
  analiseId: string
  step?: any
  logger?: any
}

export async function kgExtractJob({ analiseId, step, logger }: KGExtractParams) {
  const admin = createAdminClient()
  const BATCH_SIZE = 10

  logger?.info('Starting KG extraction', { analiseId })

  // 1) Busca chunks categorizados (prioridade: financeiro, juridico, garantias)
  const { data: chunks, error: fetchErr } = await admin
    .from('document_chunks')
    .select('id, chunk_text, categoria')
    .eq('analise_id', analiseId)
    .in('categoria', ['financeiro', 'juridico', 'garantias', 'estrutura'])  // tipos mais relevantes pro KG
    .order('categoria')
    .limit(50)  // limita pra não explodir o custo na primeira passada

  if (fetchErr) {
    logger?.error('Erro ao buscar chunks', { fetchErr })
    throw fetchErr
  }

  if (!chunks || chunks.length === 0) {
    logger?.info('Nenhum chunk para extrair KG')
    return { processado: 0 }
  }

  logger?.info(`Encontrado ${chunks.length} chunks para extrair KG`)

  let processedCount = 0
  const allEntities: Array<{ chunk_id: string; data: any }> = []
  const allRelationships: Array<{ chunk_id: string; data: any }> = []

  // 2) Processa em lotes
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE)

    const extractions = await (step?.run ? step.run(`kg-extract-batch-${i}`, async () => {
      return await extractRelationshipsBatch(
        batch.map((c) => ({ id: c.id, text: c.chunk_text })),
      )
    }) : extractRelationshipsBatch(
      batch.map((c) => ({ id: c.id, text: c.chunk_text })),
    ))

    // 3) Organiza resultado
    extractions.forEach((extraction: ExtractionResult, chunkId: string) => {
      extraction.entidades.forEach((ent: ExtractedEntity) => {
        allEntities.push({ chunk_id: chunkId, data: { ...ent, chunk_id: chunkId } })
      })
      extraction.relacionamentos.forEach((rel: ExtractedRelationship) => {
        allRelationships.push({ chunk_id: chunkId, data: { ...rel, chunk_id: chunkId } })
      })
    })

    processedCount += batch.length
    logger?.info(`Extraído ${processedCount}/${chunks.length} chunks`)
  }

  // 4) Persiste entidades (deduplicação por identificador)
  if (allEntities.length > 0) {
    const entitiesToInsert = allEntities.map((e) => ({
      analise_id: analiseId,
      tipo: e.data.tipo,
      identificador: e.data.identificador || null,
      nome: e.data.nome,
      dados: e.data.dados || {},
      confianca_extracao: e.data.confianca,
      chunk_fonte_id: e.chunk_id,
    }))

    const { error: insertErr } = await admin
      .from('kg_entidades')
      .upsert(entitiesToInsert, {
        onConflict: 'analise_id,tipo,identificador',
      })

    if (insertErr) {
      logger?.error('Erro ao persistir entidades', { insertErr })
      throw insertErr
    }
  }

  // 5) Persiste relacionamentos
  if (allRelationships.length > 0) {
    // Primeiro, resolve IDs das entidades origem/destino
    const { data: entidades } = await admin
      .from('kg_entidades')
      .select('id, nome, tipo')
      .eq('analise_id', analiseId)

    if (!entidades || entidades.length === 0) {
      logger?.warn('Nenhuma entidade encontrada para relacionamentos')
      return { processado: processedCount, entidades: allEntities.length, relacionamentos: 0 }
    }

    // Map nome+tipo → id pra resolver origem/destino
    const entityMap = new Map<string, string>()
    entidades.forEach((ent) => {
      entityMap.set(`${ent.nome}|${ent.tipo}`, ent.id)
    })

    const relationshipsToInsert = allRelationships
      .map((r) => {
        const originKey = `${r.data.entidade_origem_nome}|${r.data.entidade_origem_tipo}`
        const destKey = `${r.data.entidade_destino_nome}|${r.data.entidade_destino_tipo}`
        const originId = entityMap.get(originKey)
        const destId = entityMap.get(destKey)

        if (!originId || !destId) {
          logger?.warn('Entidades não resolvidas para relacionamento', { originKey, destKey })
          return null
        }

        return {
          analise_id: analiseId,
          entidade_origem_id: originId,
          entidade_destino_id: destId,
          tipo: r.data.tipo,
          percentual: r.data.percentual || null,
          dados_adicionais: {},
          confianca_extracao: r.data.confianca,
          validacao_necessaria: r.data.confianca < 0.9,
          chunk_fonte_id: r.chunk_id,
        }
      })
      .filter(Boolean)

    if (relationshipsToInsert.length > 0) {
      const { error: relErr } = await admin
        .from('kg_relacionamentos')
        .insert(relationshipsToInsert)

      if (relErr) {
        logger?.error('Erro ao persistir relacionamentos', { relErr })
        throw relErr
      }
    }

    logger?.info(`Persistidos ${relationshipsToInsert.length} relacionamentos`)
  }

  logger?.info('KG extraction concluído', {
    processedCount,
    entidades: allEntities.length,
    relacionamentos: allRelationships.length,
  })

  return {
    processado: processedCount,
    entidades: allEntities.length,
    relacionamentos: allRelationships.length,
  }
}
