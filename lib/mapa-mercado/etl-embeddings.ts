// ============================================================
// Mapa Inteligente do Mercado — Embeddings das entidades (busca semântica)
// ============================================================
// Gera embedding (voyage-3-large, 1024d) de um "perfil textual" de cada
// entidade, a partir de campos já existentes (nome, papéis, localização, CNAE).
// Reusa o helper de embeddings do pipeline (lib/ingestion/voyage-embeddings).
// Paginado e idempotente: processa embedding IS NULL até esgotar.
// ============================================================
import { createAdminClient } from '@/lib/supabase-server'
import { embedDocuments } from '@/lib/ingestion/voyage-embeddings'
import { TIPO_LABEL, type EntidadeTipo } from './types'

type Logger = { info: (m: string, d?: unknown) => void; error?: (m: string, d?: unknown) => void }

interface Row {
  id: string
  razao_social: string
  nome_fantasia: string | null
  tipos: string[]
  uf: string | null
  municipio: string | null
  cnae: string | null
}

// Monta o texto que vira o embedding. Quanto mais descritivo, melhor a busca.
function perfilTexto(e: Row): string {
  const nome = e.nome_fantasia || e.razao_social
  const papeis = (e.tipos ?? []).map(t => TIPO_LABEL[t as EntidadeTipo] ?? t).join(', ')
  const local = [e.municipio, e.uf].filter(Boolean).join('/')
  return [
    nome,
    e.nome_fantasia && e.nome_fantasia !== e.razao_social ? e.razao_social : '',
    papeis ? `Atuação: ${papeis}.` : '',
    e.cnae ? `Atividade (CNAE): ${e.cnae}.` : '',
    local ? `Localização: ${local}.` : '',
  ].filter(Boolean).join(' ')
}

export interface EmbedResult { processadas: number; gravadas: number }

export async function embedEntidadesPage(opts: { limit?: number; logger?: Logger } = {}): Promise<EmbedResult> {
  const logger = opts.logger ?? { info: console.log, error: console.error }
  const limit = opts.limit ?? 128 // bate com o batch máximo do voyage
  const admin = createAdminClient()

  const { data: rows, error } = await admin
    .from('mercado_entidades')
    .select('id, razao_social, nome_fantasia, tipos, uf, municipio, cnae')
    .is('embedding', null)
    .eq('redistribuivel', true)
    .limit(limit)
  if (error) { logger.error?.('[etl-embed] select: ' + error.message); return { processadas: 0, gravadas: 0 } }
  const lote = (rows ?? []) as Row[]
  if (!lote.length) return { processadas: 0, gravadas: 0 }

  const textos = lote.map(perfilTexto)
  const embeddings = await embedDocuments(textos) // lança em caso de falha → Inngest re-tenta

  let gravadas = 0
  for (let i = 0; i < lote.length; i++) {
    const { error: upErr } = await admin
      .from('mercado_entidades')
      .update({ embedding: embeddings[i] as unknown as string })
      .eq('id', lote[i].id)
    if (!upErr) gravadas++
  }

  logger.info(`[etl-embed] lote: ${lote.length} processadas, ${gravadas} gravadas`)
  return { processadas: lote.length, gravadas }
}
