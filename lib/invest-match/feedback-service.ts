// Service do loop de feedback dos matches.
//   - createMatchFeedback     → registra avaliação manual (admin)
//   - recordOutcomeFeedback   → registra feedback automático quando o match
//                               atinge estado terminal (fechado/rejeitado)
//   - computeFeedbackStats    → analytics + SUGESTÃO de pesos recalibrados
//
// A sugestão de pesos NÃO é aplicada automaticamente — é exibida no painel
// para decisão humana. Aplicar pesos com amostra pequena causaria overfitting.

import { createAdminClient } from '@/lib/supabase-server'
import { DIMENSOES, PESOS_ATUAIS, DIMENSAO_LABEL, type Dimensao } from './weights'

export type Avaliacao = 'muito_bom' | 'bom' | 'neutro' | 'ruim' | 'muito_ruim'
export type RatedBy   = 'admin' | 'investidor' | 'projeto' | 'sistema_outcome'

// ============================================================
// CREATE — avaliação manual
// ============================================================
export interface CreateFeedbackInput {
  matchId:        string
  escritorioId:   string
  userId:         string
  ratedBy:        RatedBy
  avaliacao?:     Avaliacao | null
  motivo?:        string | null
  dimensoesFeedback?: Record<string, string>
  avancouPara?:   string | null
  outcomeValorBrl?: number | null
  outcomeTempoDias?: number | null
}

export async function createMatchFeedback(input: CreateFeedbackInput): Promise<{ id: string }> {
  const admin = createAdminClient()

  // Confirma que o match pertence ao escritório (autorização)
  const { data: match } = await admin
    .from('matches')
    .select('id')
    .eq('id', input.matchId)
    .eq('escritorio_id', input.escritorioId)
    .maybeSingle()
  if (!match) throw new Error('Match não encontrado')

  const { data, error } = await admin
    .from('match_feedback')
    .insert({
      match_id:           input.matchId,
      escritorio_id:      input.escritorioId,
      user_id:            input.userId,
      rated_by:           input.ratedBy,
      avaliacao:          input.avaliacao ?? null,
      motivo:             input.motivo ?? null,
      dimensoes_feedback: input.dimensoesFeedback ?? {},
      avancou_para:       input.avancouPara ?? null,
      outcome_valor_brl:  input.outcomeValorBrl ?? null,
      outcome_tempo_dias: input.outcomeTempoDias ?? null,
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(`createMatchFeedback: ${error?.message ?? 'sem dados'}`)
  return { id: data.id }
}

// ============================================================
// Auto-outcome — chamado quando o match atinge estado terminal
// ============================================================
// Mapeia status terminal → outcome registrado automaticamente (rated_by=sistema).
const STATUS_TO_OUTCOME: Record<string, { avancou: string; avaliacao: Avaliacao | null }> = {
  fechado:              { avancou: 'fechado',    avaliacao: 'muito_bom' },
  dd:                   { avancou: 'dd',         avaliacao: 'bom' },
  proposta:             { avancou: 'proposta',   avaliacao: 'bom' },
  nda:                  { avancou: 'nda',        avaliacao: 'bom' },
  rejeitado_admin:      { avancou: 'abandonado', avaliacao: 'ruim' },
  rejeitado_investidor: { avancou: 'abandonado', avaliacao: 'ruim' },
  rejeitado_projeto:    { avancou: 'abandonado', avaliacao: 'ruim' },
  descartado:           { avancou: 'abandonado', avaliacao: 'muito_ruim' },
}

export async function recordOutcomeFeedback(args: {
  matchId:      string
  escritorioId: string
  userId:       string
  status:       string
  primeiroContatoEm?: string | null
}): Promise<void> {
  const mapped = STATUS_TO_OUTCOME[args.status]
  if (!mapped) return  // status não-terminal — nada a registrar

  const admin = createAdminClient()

  // Tempo até o outcome (dias desde notificação/primeiro contato, se houver)
  let tempoDias: number | null = null
  if (args.primeiroContatoEm) {
    const ms = Date.now() - new Date(args.primeiroContatoEm).getTime()
    tempoDias = Math.max(0, Math.round(ms / 86_400_000))
  }

  await admin.from('match_feedback').insert({
    match_id:           args.matchId,
    escritorio_id:      args.escritorioId,
    user_id:            args.userId,
    rated_by:           'sistema_outcome',
    avaliacao:          mapped.avaliacao,
    motivo:             `Outcome automático: ${args.status}`,
    dimensoes_feedback: {},
    avancou_para:       mapped.avancou,
    outcome_tempo_dias: tempoDias,
  })
}

// ============================================================
// STATS + sugestão de recalibração
// ============================================================
export interface FeedbackStats {
  total_matches:         number
  com_outcome:           number      // sucessos + fracassos
  sucessos:              number
  fracassos:             number
  distribuicao_avaliacao: Record<string, number>
  conversao_por_faixa:   Array<{ faixa: string; total: number; sucessos: number; taxa: number }>
  dimensoes:             Array<{
    dimensao:        Dimensao
    label:           string
    media_sucesso:   number | null
    media_fracasso:  number | null
    poder:           number      // diff sucesso-fracasso (poder discriminativo)
    peso_atual:      number
    peso_sugerido:   number | null
  }>
  amostra_suficiente:    boolean
  min_amostra:           number
}

const MIN_AMOSTRA = 8         // mínimo de matches com outcome p/ sugerir pesos
const BLEND_SUGESTAO = 0.30   // 30% sugestão + 70% peso atual (suaviza)

interface MatchRow {
  status:          string
  score_final:     number
  score_breakdown: Record<string, { score?: number }> | null
}

export async function computeFeedbackStats(escritorioId: string): Promise<FeedbackStats> {
  const admin = createAdminClient()

  const { data: matchesData } = await admin
    .from('matches')
    .select('status, score_final, score_breakdown')
    .eq('escritorio_id', escritorioId)
  const matches = (matchesData ?? []) as MatchRow[]

  const { data: fbData } = await admin
    .from('match_feedback')
    .select('avaliacao')
    .eq('escritorio_id', escritorioId)

  // Distribuição de avaliações
  const distribuicao: Record<string, number> = {}
  for (const f of fbData ?? []) {
    const a = (f as { avaliacao: string | null }).avaliacao
    if (a) distribuicao[a] = (distribuicao[a] ?? 0) + 1
  }

  // Classifica cada match
  const SUCESSO = new Set(['nda', 'proposta', 'dd', 'fechado'])
  const FRACASSO = new Set(['rejeitado_admin', 'rejeitado_investidor', 'rejeitado_projeto', 'descartado'])

  const sucessos: MatchRow[] = []
  const fracassos: MatchRow[] = []
  for (const m of matches) {
    if (SUCESSO.has(m.status)) sucessos.push(m)
    else if (FRACASSO.has(m.status)) fracassos.push(m)
  }

  // Conversão por faixa de score
  const faixas = [
    { faixa: '70–79', min: 70, max: 79.99 },
    { faixa: '80–84', min: 80, max: 84.99 },
    { faixa: '85–100', min: 85, max: 100 },
  ]
  const conversao = faixas.map(f => {
    const naFaixa = matches.filter(m => m.score_final >= f.min && m.score_final <= f.max)
    const suc = naFaixa.filter(m => SUCESSO.has(m.status)).length
    return {
      faixa:   f.faixa,
      total:   naFaixa.length,
      sucessos: suc,
      taxa:    naFaixa.length > 0 ? Math.round((suc / naFaixa.length) * 100) : 0,
    }
  })

  // Média de score por dimensão em sucessos vs fracassos
  const comOutcome = sucessos.length + fracassos.length
  const amostraSuficiente = comOutcome >= MIN_AMOSTRA

  const dimMedia = (rows: MatchRow[], dim: Dimensao): number | null => {
    const vals = rows
      .map(r => r.score_breakdown?.[dim]?.score)
      .filter((v): v is number => typeof v === 'number')
    if (vals.length === 0) return null
    return vals.reduce((a, b) => a + b, 0) / vals.length
  }

  const dimRaw = DIMENSOES.map(dim => {
    const ms = dimMedia(sucessos, dim)
    const mf = dimMedia(fracassos, dim)
    const poder = ms != null && mf != null ? ms - mf : 0
    return { dim, ms, mf, poder }
  })

  // Sugestão de pesos: normaliza o poder discriminativo positivo e mistura
  // com os pesos atuais (blend) para suavizar. Só se amostra suficiente.
  let pesosSugeridos: Record<Dimensao, number> | null = null
  if (amostraSuficiente) {
    const poderPositivo = dimRaw.map(d => Math.max(0, d.poder))
    const somaPoder = poderPositivo.reduce((a, b) => a + b, 0)
    if (somaPoder > 0) {
      pesosSugeridos = {} as Record<Dimensao, number>
      dimRaw.forEach((d, i) => {
        const pesoData = poderPositivo[i] / somaPoder            // normalizado por dados
        const blended  = PESOS_ATUAIS[d.dim] * (1 - BLEND_SUGESTAO) + pesoData * BLEND_SUGESTAO
        pesosSugeridos![d.dim] = blended
      })
      // Renormaliza para somar exatamente 1
      const total = Object.values(pesosSugeridos).reduce((a, b) => a + b, 0)
      for (const dim of DIMENSOES) pesosSugeridos[dim] = Math.round((pesosSugeridos[dim] / total) * 1000) / 1000
    }
  }

  const dimensoes = dimRaw.map(d => ({
    dimensao:       d.dim,
    label:          DIMENSAO_LABEL[d.dim],
    media_sucesso:  d.ms != null ? Math.round(d.ms) : null,
    media_fracasso: d.mf != null ? Math.round(d.mf) : null,
    poder:          Math.round(d.poder),
    peso_atual:     PESOS_ATUAIS[d.dim],
    peso_sugerido:  pesosSugeridos ? pesosSugeridos[d.dim] : null,
  }))

  return {
    total_matches:          matches.length,
    com_outcome:            comOutcome,
    sucessos:               sucessos.length,
    fracassos:              fracassos.length,
    distribuicao_avaliacao: distribuicao,
    conversao_por_faixa:    conversao,
    dimensoes,
    amostra_suficiente:     amostraSuficiente,
    min_amostra:            MIN_AMOSTRA,
  }
}
