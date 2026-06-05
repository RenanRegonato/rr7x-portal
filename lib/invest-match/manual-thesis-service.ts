// Service de criação MANUAL de tese (origem='manual', sem análise da Mandor).
// Espelha o final de builder.ts (persistência + embedding), mas a partir de um
// payload já validado (TeseCreateSchema) em vez do diagnóstico da Mandor.
//
// Princípio (igual ao investidor-service): o embedding só é gravado por aqui,
// garantindo consistência entre o texto e o vetor. Embedding é best-effort —
// uma falha do voyage não impede o cadastro (o matching estrutural funciona
// sem ele; o semântico volta quando a tese for editada/reprocessada).

import { createAdminClient } from '@/lib/supabase-server'
import { embedQuery } from '@/lib/ingestion/voyage-embeddings'
import type { TeseCreateInput } from './schemas'

export interface CreateManualThesisCtx {
  escritorioId: string
  userId:       string
}

// Texto canônico para o embedding: concatena sinalizadores estruturais +
// narrativa (mesma lógica do buildEmbeddingText do builder).
function buildEmbeddingText(t: TeseCreateInput): string {
  const parts: string[] = []
  parts.push(`Empresa: ${t.empresa_nome}`)
  parts.push(`Setor: ${t.setor_primario}`)
  if (t.sub_setores?.length)     parts.push(`Sub-setores: ${t.sub_setores.join(', ')}`)
  if (t.modelos_negocio?.length) parts.push(`Modelos: ${t.modelos_negocio.join(', ')}`)
  if (t.vertical_tags?.length)   parts.push(`Tags: ${t.vertical_tags.join(', ')}`)
  parts.push(`Estágio: ${t.estagio}`)
  if (t.tipo_deal)               parts.push(`Tipo de deal: ${t.tipo_deal}`)
  if (t.empresa_descricao_curta) parts.push(`\nDescrição: ${t.empresa_descricao_curta}`)
  if (t.tese_investimento)       parts.push(`\nTese: ${t.tese_investimento}`)
  if (t.value_proposition)       parts.push(`\nProposta de valor: ${t.value_proposition}`)
  if (t.competitive_moat)        parts.push(`\nMoat: ${t.competitive_moat}`)
  if (t.risk_narrative)          parts.push(`\nRiscos: ${t.risk_narrative}`)
  if (t.exit_story)              parts.push(`\nSaída: ${t.exit_story}`)
  return parts.join('\n')
}

export async function createManualThesis(
  input: TeseCreateInput,
  ctx:   CreateManualThesisCtx,
): Promise<{ id: string; tem_embedding: boolean }> {
  const admin = createAdminClient()

  // 1) Embedding (best-effort)
  let embedding: number[] | null = null
  try {
    embedding = await embedQuery(buildEmbeddingText(input))
  } catch (e) {
    console.error('[manual-thesis-service] embedQuery falhou (sem embedding):', e)
  }

  const now = new Date().toISOString()
  const payload = {
    ...input,
    escritorio_id:        ctx.escritorioId,
    analise_id:           null,            // tese manual não vem de análise
    origem:               'manual' as const,
    criado_por:           ctx.userId,
    criado_em:            now,
    atualizado_em:        now,
    tese_embedding:       embedding,
    tese_embedding_model: embedding ? 'voyage-3-large' : null,
    tese_embedding_at:    embedding ? now : null,
  }

  const { data, error } = await admin
    .from('teses')
    .insert(payload)
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`Falha ao criar tese manual: ${error?.message ?? 'sem detalhes'}`)
  }

  return { id: data.id, tem_embedding: embedding !== null }
}
