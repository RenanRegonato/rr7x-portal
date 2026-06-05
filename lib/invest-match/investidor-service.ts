// Service do investidor: orquestra a criação/atualização incluindo a geração
// de embedding da tese declarada (voyage-3-large) quando os campos narrativos
// mudam.
//
// Princípio: a única forma de gravar `tese_embedding` é via este service —
// nunca direto na rota — pra garantir consistência entre o texto e o vetor.

import { createAdminClient } from '@/lib/supabase-server'
import { embedQuery } from '@/lib/ingestion/voyage-embeddings'
import type {
  InvestidorCreateInput, InvestidorUpdateInput,
} from './schemas'
import type { Investidor } from './types'


// ============================================================
// Embedding — texto canônico do investidor
// ============================================================
// Concatena tese declarada (resumo + completa + exemplos) + sinalizadores
// estruturados (setores, modelos, tags) num único bloco. Esse bloco vai
// pro voyage embedQuery (input_type='query' porque vai matchar contra
// documents-style embeddings das teses).
//
// Aceita tanto InvestidorCreateInput (tipo: enum) quanto Investidor merged
// com patch (tipo: string). Só usa campos textuais — o valor exato do enum
// não importa pro embedding.
interface EmbeddingTextFields {
  nome?:                    string
  tipo?:                    string
  setores_alvo?:            string[]
  sub_setores?:             string[]
  modelos_negocio?:         string[]
  vertical_tags?:           string[]
  estagios_aceitos?:        string[]
  tese_resumo?:             string | null
  tese_completa?:           string | null
  exemplos_deals_passados?: string | null
}

function buildInvestorEmbeddingText(fields: EmbeddingTextFields): string | null {
  const parts: string[] = []
  parts.push(`Investidor: ${fields.nome ?? '(sem nome)'} (${fields.tipo ?? 'tipo desconhecido'})`)

  if (fields.setores_alvo?.length)     parts.push(`Setores: ${fields.setores_alvo.join(', ')}`)
  if (fields.sub_setores?.length)      parts.push(`Sub-setores: ${fields.sub_setores.join(', ')}`)
  if (fields.modelos_negocio?.length)  parts.push(`Modelos: ${fields.modelos_negocio.join(', ')}`)
  if (fields.vertical_tags?.length)    parts.push(`Tags: ${fields.vertical_tags.join(', ')}`)
  if (fields.estagios_aceitos?.length) parts.push(`Estágios: ${fields.estagios_aceitos.join(', ')}`)

  if (fields.tese_resumo)             parts.push(`\nResumo da tese: ${fields.tese_resumo}`)
  if (fields.tese_completa)           parts.push(`\nTese completa: ${fields.tese_completa}`)
  if (fields.exemplos_deals_passados) parts.push(`\nDeals passados: ${fields.exemplos_deals_passados}`)

  const text = parts.join('\n').trim()
  // Sem tese declarada nem narrativa → não vale gerar embedding (vai dar
  // matching ruim). Retorna null pra service salvar sem embedding.
  if (!fields.tese_resumo && !fields.tese_completa && !fields.exemplos_deals_passados) {
    return null
  }
  return text
}


// ============================================================
// Texto narrativo mudou? (decide se regenera embedding)
// ============================================================
const NARRATIVE_FIELDS = [
  'tese_resumo', 'tese_completa', 'exemplos_deals_passados',
  'setores_alvo', 'sub_setores', 'modelos_negocio', 'vertical_tags',
  'estagios_aceitos', 'nome', 'tipo',
] as const

function shouldRegenerateEmbedding(
  current:  Partial<Investidor>,
  incoming: Partial<InvestidorUpdateInput>,
): boolean {
  for (const f of NARRATIVE_FIELDS) {
    if (incoming[f] === undefined) continue
    const c = (current as Record<string, unknown>)[f]
    const i = (incoming as Record<string, unknown>)[f]
    if (JSON.stringify(c ?? null) !== JSON.stringify(i ?? null)) return true
  }
  return false
}


// ============================================================
// CREATE
// ============================================================
export interface CreateContext {
  escritorioId: string
  userId:       string
}

export async function createInvestidor(
  input: InvestidorCreateInput,
  ctx:   CreateContext,
): Promise<{ id: string; tem_embedding: boolean }> {
  const admin = createAdminClient()

  // 1) Tenta gerar embedding (se houver texto narrativo)
  const embeddingText = buildInvestorEmbeddingText(input)
  let embedding: number[] | null = null
  if (embeddingText) {
    try {
      embedding = await embedQuery(embeddingText)
    } catch (e) {
      console.error('[investidor-service] embedQuery failed (sem embedding):', e)
      // Não bloqueia o cadastro — embedding pode ser regenerado depois.
    }
  }

  const now = new Date().toISOString()
  const payload = {
    ...input,
    escritorio_id:        ctx.escritorioId,
    criado_por:           ctx.userId,
    status:               'ativo' as const,
    matches_recebidos:    0,
    matches_aprovados:    0,
    matches_rejeitados:   0,
    ndas_assinados:       0,
    deals_fechados:       0,
    criado_em:            now,
    atualizado_em:        now,
    tese_embedding:       embedding,
    tese_embedding_model: embedding ? 'voyage-3-large' : null,
    tese_embedding_at:    embedding ? now : null,
  }

  const { data, error } = await admin
    .from('investidores')
    .insert(payload)
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`Falha ao criar investidor: ${error?.message ?? 'sem detalhes'}`)
  }

  return { id: data.id, tem_embedding: embedding !== null }
}


// ============================================================
// UPDATE
// ============================================================
export interface UpdateContext {
  investidorId: string
  escritorioId: string  // pra checar autorização
}

export async function updateInvestidor(
  patch: InvestidorUpdateInput,
  ctx:   UpdateContext,
): Promise<{ id: string; embedding_regenerated: boolean }> {
  const admin = createAdminClient()

  // 1) Carrega o estado atual pra decidir se precisa regenerar embedding
  const { data: current, error: loadErr } = await admin
    .from('investidores')
    .select('*')
    .eq('id', ctx.investidorId)
    .eq('escritorio_id', ctx.escritorioId)
    .single()

  if (loadErr || !current) {
    throw new Error(`Investidor não encontrado ou sem permissão (id=${ctx.investidorId})`)
  }

  const investidor = current as Investidor

  // 2) Decide se regenera embedding
  const regen = shouldRegenerateEmbedding(investidor, patch)
  let embedding: number[] | null | undefined = undefined  // undefined = não toca a coluna

  if (regen) {
    const merged = { ...investidor, ...patch }
    const text = buildInvestorEmbeddingText(merged)
    if (text) {
      try {
        embedding = await embedQuery(text)
      } catch (e) {
        console.error('[investidor-service] embedQuery falhou no update:', e)
        embedding = undefined  // mantém o anterior
      }
    } else {
      // Removeu toda narrativa → zera embedding
      embedding = null
    }
  }

  const now = new Date().toISOString()
  const updatePayload: Record<string, unknown> = { ...patch, atualizado_em: now }

  if (embedding !== undefined) {
    updatePayload.tese_embedding       = embedding
    updatePayload.tese_embedding_model = embedding ? 'voyage-3-large' : null
    updatePayload.tese_embedding_at    = embedding ? now : null
  }

  const { error: updErr } = await admin
    .from('investidores')
    .update(updatePayload)
    .eq('id', ctx.investidorId)

  if (updErr) throw new Error(`Falha ao atualizar investidor: ${updErr.message}`)

  return { id: ctx.investidorId, embedding_regenerated: embedding !== undefined }
}


// ============================================================
// DELETE (hard delete)
// ============================================================
// Remove a linha do banco. Os matches do investidor (e seus feedbacks) somem
// em cascata via FK (matches.investidor_id ON DELETE CASCADE). Irreversível.
// Escopo por escritorio_id (não apaga registro de outro escritório).
export async function deleteInvestidor(ctx: UpdateContext): Promise<void> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('investidores')
    .delete()
    .eq('id', ctx.investidorId)
    .eq('escritorio_id', ctx.escritorioId)
    .select('id')
  if (error) throw new Error(`Falha ao excluir investidor: ${error.message}`)
  if (!data || data.length === 0) throw new Error('Investidor não encontrado')
}


// ============================================================
// LIST
// ============================================================
export interface ListContext {
  escritorioId: string
  status?:      'ativo' | 'pausado' | 'arquivado'
  q?:           string
  limit:        number
  offset:       number
}

export async function listInvestidores(ctx: ListContext): Promise<{
  rows:  Investidor[]
  total: number
}> {
  const admin = createAdminClient()

  let query = admin
    .from('investidores')
    .select('*', { count: 'exact' })
    .eq('escritorio_id', ctx.escritorioId)
    .order('criado_em', { ascending: false })
    .range(ctx.offset, ctx.offset + ctx.limit - 1)

  if (ctx.status) query = query.eq('status', ctx.status)
  if (ctx.q && ctx.q.length > 0) {
    // ilike sobre nome OU email
    query = query.or(`nome.ilike.%${ctx.q}%,email.ilike.%${ctx.q}%`)
  }

  const { data, count, error } = await query
  if (error) throw new Error(`Falha ao listar investidores: ${error.message}`)
  return { rows: (data ?? []) as Investidor[], total: count ?? 0 }
}


// ============================================================
// GET BY ID
// ============================================================
export async function getInvestidor(
  investidorId: string,
  escritorioId: string,
): Promise<Investidor | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('investidores')
    .select('*')
    .eq('id', investidorId)
    .eq('escritorio_id', escritorioId)
    .maybeSingle()
  if (error) throw new Error(`Falha ao buscar investidor: ${error.message}`)
  return (data ?? null) as Investidor | null
}
