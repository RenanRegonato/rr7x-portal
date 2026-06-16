// Service de leitura e curadoria de matches + teses.
// Usado pelas rotas /api/invest-match/matches e /teses e pelas páginas server-side.

import { createAdminClient } from '@/lib/supabase-server'
import { recordOutcomeFeedback } from './feedback-service'
import { TRANSICOES_MATCH } from './labels'
import type { Match, StructuredThesis, StatusMatch } from './types'

// ============================================================
// Tipos enriquecidos (com joins)
// ============================================================
export interface MatchEnriquecido extends Match {
  investidor?: { id: string; nome: string; tipo: string } | null
  tese?:       { id: string; empresa_nome: string; setor_primario: string; status: string } | null
}

const MATCH_SELECT = `
  *,
  investidor:investidores ( id, nome, tipo ),
  tese:teses ( id, empresa_nome, setor_primario, status )
`


// ============================================================
// LIST matches (com filtros)
// ============================================================
export interface ListMatchesCtx {
  escritorioId: string
  status?:      StatusMatch
  teseId?:      string
  investidorId?: string
  minScore?:    number
  limit:        number
  offset:       number
}

export async function listMatches(ctx: ListMatchesCtx): Promise<{ rows: MatchEnriquecido[]; total: number }> {
  const admin = createAdminClient()

  let q = admin
    .from('matches')
    .select(MATCH_SELECT, { count: 'exact' })
    .eq('escritorio_id', ctx.escritorioId)
    .order('score_final', { ascending: false })
    .range(ctx.offset, ctx.offset + ctx.limit - 1)

  if (ctx.status)       q = q.eq('status', ctx.status)
  if (ctx.teseId)       q = q.eq('tese_id', ctx.teseId)
  if (ctx.investidorId) q = q.eq('investidor_id', ctx.investidorId)
  if (ctx.minScore != null) q = q.gte('score_final', ctx.minScore)

  const { data, count, error } = await q
  if (error) throw new Error(`listMatches: ${error.message}`)
  return { rows: (data ?? []) as unknown as MatchEnriquecido[], total: count ?? 0 }
}


// ============================================================
// GET match by id (enriquecido)
// ============================================================
export async function getMatch(matchId: string, escritorioId: string): Promise<MatchEnriquecido | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('matches')
    .select(MATCH_SELECT)
    .eq('id', matchId)
    .eq('escritorio_id', escritorioId)
    .maybeSingle()
  if (error) throw new Error(`getMatch: ${error.message}`)
  return (data ?? null) as unknown as MatchEnriquecido | null
}


// ============================================================
// Transição de status (curadoria + pipeline)
// ============================================================
// State machine de status — fonte única em ./labels (TRANSICOES_MATCH), reusada
// pelo cliente (Kanban) para validar o drop antes de chamar a API.
export function transicaoValida(de: string, para: StatusMatch): boolean {
  const permitidas = TRANSICOES_MATCH[de as StatusMatch]
  if (!permitidas) return false
  return permitidas.includes(para)
}

export interface UpdateMatchStatusCtx {
  matchId:      string
  escritorioId: string
  novoStatus:   StatusMatch
  userId:       string
  motivo?:      string | null
}

export async function updateMatchStatus(ctx: UpdateMatchStatusCtx): Promise<{ de: string; para: StatusMatch }> {
  const admin = createAdminClient()

  const { data: atual, error: loadErr } = await admin
    .from('matches')
    .select('id, status, primeiro_contato_em')
    .eq('id', ctx.matchId)
    .eq('escritorio_id', ctx.escritorioId)
    .single()
  if (loadErr || !atual) throw new Error('Match não encontrado')

  const de = atual.status as string
  if (de === ctx.novoStatus) return { de, para: ctx.novoStatus }

  if (!transicaoValida(de, ctx.novoStatus)) {
    throw new Error(`Transição inválida: ${de} → ${ctx.novoStatus}`)
  }

  const now = new Date().toISOString()
  const patch: Record<string, unknown> = {
    status:        ctx.novoStatus,
    atualizado_em: now,
  }

  // Carimbos por estado
  if (ctx.novoStatus === 'aprovado_admin') {
    patch.aprovado_em  = now
    patch.aprovado_por = ctx.userId
  }
  if (ctx.novoStatus === 'notificado')   patch.notificado_em       = now
  if (ctx.novoStatus === 'em_negociacao') patch.primeiro_contato_em = now
  if (ctx.novoStatus === 'fechado')      patch.fechado_em          = now
  if (ctx.novoStatus.startsWith('rejeitado') || ctx.novoStatus === 'descartado') {
    patch.rejeicao_motivo = ctx.motivo ?? null
  }

  const { error: updErr } = await admin
    .from('matches')
    .update(patch)
    .eq('id', ctx.matchId)
  if (updErr) throw new Error(`updateMatchStatus: ${updErr.message}`)

  // Auto-outcome: estados terminais geram feedback automático (loop de aprendizado).
  // Best-effort — não falha a transição se o registro de feedback falhar.
  try {
    await recordOutcomeFeedback({
      matchId:           ctx.matchId,
      escritorioId:      ctx.escritorioId,
      userId:            ctx.userId,
      status:            ctx.novoStatus,
      primeiroContatoEm: (atual as { primeiro_contato_em?: string | null }).primeiro_contato_em ?? null,
    })
  } catch (e) {
    console.error('[match-service] recordOutcomeFeedback falhou:', e)
  }

  return { de, para: ctx.novoStatus }
}


// ============================================================
// Toggle de tag de negociação
// ============================================================
const TAGS_VALIDAS = ['nda_assinado', 'reuniao_realizada', 'proposta_enviada', 'em_diligencia']

export async function toggleMatchTag(
  matchId: string, escritorioId: string, tag: string,
): Promise<{ tags: string[] }> {
  if (!TAGS_VALIDAS.includes(tag)) throw new Error(`Tag inválida: ${tag}`)
  const admin = createAdminClient()

  const { data: atual, error } = await admin
    .from('matches')
    .select('tags')
    .eq('id', matchId)
    .eq('escritorio_id', escritorioId)
    .single()
  if (error || !atual) throw new Error('Match não encontrado')

  const tags: string[] = Array.isArray(atual.tags) ? atual.tags : []
  const novas = tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]

  const { error: updErr } = await admin
    .from('matches')
    .update({ tags: novas, atualizado_em: new Date().toISOString() })
    .eq('id', matchId)
  if (updErr) throw new Error(`toggleMatchTag: ${updErr.message}`)

  return { tags: novas }
}


// ============================================================
// TESES — list + get
// ============================================================
export interface ListTesesCtx {
  escritorioId: string
  status?:      string
  limit:        number
  offset:       number
}

export interface TeseComContagem extends StructuredThesis {
  matches_count?: number
}

export async function listTeses(ctx: ListTesesCtx): Promise<{ rows: TeseComContagem[]; total: number }> {
  const admin = createAdminClient()

  let q = admin
    .from('teses')
    .select('*', { count: 'exact' })
    .eq('escritorio_id', ctx.escritorioId)
    .order('criado_em', { ascending: false })
    .range(ctx.offset, ctx.offset + ctx.limit - 1)

  if (ctx.status) q = q.eq('status', ctx.status)

  const { data, count, error } = await q
  if (error) throw new Error(`listTeses: ${error.message}`)

  const teses = (data ?? []) as TeseComContagem[]

  // Contagem de matches por tese (1 query agregada)
  if (teses.length > 0) {
    const ids = teses.map(t => t.id!).filter(Boolean)
    const { data: counts } = await admin
      .from('matches')
      .select('tese_id')
      .eq('escritorio_id', ctx.escritorioId)
      .in('tese_id', ids)
      .in('status', ['sugerido', 'aprovado_auto', 'aprovado_admin', 'notificado', 'em_negociacao', 'nda', 'proposta', 'dd', 'fechado'])

    const byTese = new Map<string, number>()
    for (const row of counts ?? []) {
      const tid = (row as { tese_id: string }).tese_id
      byTese.set(tid, (byTese.get(tid) ?? 0) + 1)
    }
    for (const t of teses) t.matches_count = byTese.get(t.id!) ?? 0
  }

  return { rows: teses, total: count ?? 0 }
}

// ============================================================
// Análises elegíveis para virar tese
// ============================================================
// Lista análises concluídas dos membros do escritório, marcando quais já têm
// mesa de revisão (pré-requisito p/ gerar tese) e quais já viraram tese.
export interface AnaliseElegivel {
  id:           string
  nome_ativo:   string
  setor:        string | null
  ticket:       string | null
  criado_em:    string
  tem_mesa:     boolean   // mesa de revisão emitida → pode gerar tese
  tem_tese:     boolean   // já existe tese para esta análise
  tese_id:      string | null
}

export async function listAnalisesElegiveis(escritorioId: string): Promise<AnaliseElegivel[]> {
  const admin = createAdminClient()

  // 1) user_ids do escritório: dono + membros (perfis)
  const [{ data: dono }, { data: membros }] = await Promise.all([
    admin.from('escritorios').select('user_id').eq('id', escritorioId).maybeSingle(),
    admin.from('perfis').select('user_id').eq('escritorio_id', escritorioId),
  ])
  const userIds = new Set<string>()
  if (dono?.user_id) userIds.add(dono.user_id)
  for (const m of membros ?? []) if (m.user_id) userIds.add(m.user_id)
  if (userIds.size === 0) return []

  // 2) análises concluídas desses usuários
  const { data: analises, error } = await admin
    .from('analises')
    .select('id, nome_ativo, criado_em, deal_intake, mesa_revisao_at, status')
    .in('user_id', Array.from(userIds))
    .eq('status', 'concluido')
    .order('criado_em', { ascending: false })
    .limit(100)
  if (error) throw new Error(`listAnalisesElegiveis: ${error.message}`)
  if (!analises?.length) return []

  // 3) teses já existentes (por analise_id) no escritório
  const { data: teses } = await admin
    .from('teses')
    .select('id, analise_id')
    .eq('escritorio_id', escritorioId)
    .not('analise_id', 'is', null)
  const teseByAnalise = new Map<string, string>()
  for (const t of teses ?? []) {
    if (t.analise_id) teseByAnalise.set(t.analise_id, t.id)
  }

  return analises.map(a => {
    const intake = (a.deal_intake ?? {}) as { tipoAtivo?: string; ticketEstimado?: string }
    const teseId = teseByAnalise.get(a.id) ?? null
    return {
      id:        a.id,
      nome_ativo: a.nome_ativo,
      setor:     intake.tipoAtivo ?? null,
      ticket:    intake.ticketEstimado ?? null,
      criado_em: a.criado_em,
      tem_mesa:  a.mesa_revisao_at != null,
      tem_tese:  teseId != null,
      tese_id:   teseId,
    }
  })
}

// ============================================================
// DELETE (hard delete) — tese e match
// ============================================================
// Remove a linha do banco. Excluir uma tese arrasta seus matches (e feedbacks)
// em cascata via FK (matches.tese_id ON DELETE CASCADE). Irreversível.
// Escopo por escritorio_id.
export async function deleteTese(teseId: string, escritorioId: string): Promise<void> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('teses')
    .delete()
    .eq('id', teseId)
    .eq('escritorio_id', escritorioId)
    .select('id')
  if (error) throw new Error(`deleteTese: ${error.message}`)
  if (!data || data.length === 0) throw new Error('Tese não encontrada')
}

// Remove um match. Seus feedbacks somem em cascata (match_feedback.match_id
// ON DELETE CASCADE). Irreversível. Escopo por escritorio_id.
export async function deleteMatch(matchId: string, escritorioId: string): Promise<void> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('matches')
    .delete()
    .eq('id', matchId)
    .eq('escritorio_id', escritorioId)
    .select('id')
  if (error) throw new Error(`deleteMatch: ${error.message}`)
  if (!data || data.length === 0) throw new Error('Match não encontrado')
}

export async function getTese(teseId: string, escritorioId: string): Promise<StructuredThesis | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('teses')
    .select('*')
    .eq('id', teseId)
    .eq('escritorio_id', escritorioId)
    .maybeSingle()
  if (error) throw new Error(`getTese: ${error.message}`)
  if (!data) return null
  // Remove embedding (vetor grande) antes de devolver
  const { tese_embedding: _, ...rest } = data as Record<string, unknown>
  void _
  return rest as unknown as StructuredThesis
}
