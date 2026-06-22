import { createAdminClient } from '@/lib/supabase-server'
import { judgeMatch, type MatchJudgeInput, type MatchJudgeOutput } from '@/lib/agents/match-judge'
import { gerarSugestoesMercado } from './sugestoes-mercado'
import type { MatchScoreBreakdown } from './types'

// Motor de matching v2 — orquestra as 5 camadas.
//
//   Camada 1 (hard filter) + Camada 2 (structured score)  → RPC invest_match_buscar_candidatos
//   Camada 3 (semantic)                                    → RPC invest_match_busca_semantica
//   Camada 4 (LLM judge)                                   → judgeMatch (top-K)
//   Camada 5 (score composto)                              → combineScore
//
// Pesos do score final:
//   - com embedding nos dois lados: 0.50 estruturado + 0.20 semântico + 0.30 LLM
//   - sem embedding (algum lado):   0.65 estruturado + 0.35 LLM (renormalizado)
//
// Thresholds:
//   - score_final >= 85 → status 'aprovado_auto'
//   - score_final 70-84 → status 'sugerido' (curadoria admin)
//   - score_final < 70  → descartado (não persiste)
//   - LLM recommendation 'skip' → descartado mesmo com score alto (anti-falso-positivo)

const MOTOR_VERSAO       = 'v2.0'
const TOP_K_PARA_JUDGE   = 20    // só os 20 melhores vão pro LLM (custo)
const JUDGE_CONCURRENCY  = 5     // chamadas Sonnet simultâneas
const SCORE_MIN_PERSIST  = 70
const SCORE_AUTO_APPROVE = 85
const PRE_RANK_MIN        = 45   // candidatos abaixo disso nem entram no pré-rank


// step/logger são injetados pelo Inngest. Tipo `any` no boundary porque o SDK
// envolve retornos em Jsonify<T> e isso não casa com generics manuais — mesmo
// padrão de lib/ingestion/process-document.ts. Type safety preservada DENTRO de
// cada callback via casts explícitos do retorno.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Step = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Logger = any

// Quando chamado fora do Inngest (teste/endpoint síncrono), usa o directRunner
// que apenas executa sem idempotência.
const directRunner: Step = { run: (_n: string, fn: () => Promise<unknown>) => fn() }
const consoleLogger: Logger = {
  info:  (m: string, meta?: Record<string, unknown>) => console.log('[matching-engine]', m, meta ?? ''),
  error: (m: string, meta?: Record<string, unknown>) => console.error('[matching-engine]', m, meta ?? ''),
}


export interface RunMatchingParams {
  teseId:  string
  step?:   Step
  logger?: Logger
}

export interface RunMatchingResult {
  tese_id:            string
  candidatos_camada12: number  // passaram hard filter + structured
  candidatos_julgados: number  // foram ao LLM
  matches_persistidos: number  // score >= 70 e não-skip
  aprovados_auto:      number  // score >= 85
}


export async function runMatching(params: RunMatchingParams): Promise<RunMatchingResult> {
  const step   = params.step   ?? directRunner
  const logger = params.logger ?? consoleLogger
  const admin  = createAdminClient()
  const teseId = params.teseId

  // ---------------------------------------------------------
  // 0) Carrega a tese (campos pro judge + escritorio_id + analise_id)
  // ---------------------------------------------------------
  const tese = await step.run('load-tese', async () => {
    const { data, error } = await admin
      .from('teses')
      .select('*')
      .eq('id', teseId)
      .single()
    if (error || !data) throw new Error(`Tese ${teseId} não encontrada: ${error?.message}`)
    return data as TeseRow
  }) as TeseRow

  // ---------------------------------------------------------
  // 0.5) Sugestões de Conexão de Mercado (Mapa do Mercado, dado público)
  // ---------------------------------------------------------
  // Roda ANTES do early-return de candidatos: o escritório pode ter 0
  // investidores privados e ainda assim merece sugestões do mercado — é
  // justamente quem tem a base menor que mais se beneficia. Não confunde com
  // match: vai para tabela separada (mercado_sugestoes).
  await step.run('sugestoes-mercado', async () => {
    const n = await gerarSugestoesMercado({ tese, logger })
    return { sugestoes: n }
  })

  // ---------------------------------------------------------
  // 1+2) Hard filter + structured score (RPC)
  // ---------------------------------------------------------
  const estruturados = await step.run('buscar-candidatos', async () => {
    const { data, error } = await admin.rpc('invest_match_buscar_candidatos', {
      p_tese_id:   teseId,
      p_limit:     50,
      p_min_score: PRE_RANK_MIN,
    })
    if (error) throw new Error(`buscar-candidatos RPC: ${error.message}`)
    return (data ?? []) as CandidatoEstruturado[]
  }) as CandidatoEstruturado[]

  logger.info('Candidatos estruturados', { count: estruturados.length })

  if (estruturados.length === 0) {
    return emptyResult(teseId)
  }

  // ---------------------------------------------------------
  // 3) Semantic (RPC) — só se a tese tem embedding
  // ---------------------------------------------------------
  const semanticos = await step.run('busca-semantica', async () => {
    if (!tese.tese_embedding) return [] as CandidatoSemantico[]
    const { data, error } = await admin.rpc('invest_match_busca_semantica', {
      p_tese_id:        teseId,
      p_match_count:    50,
      p_similarity_min: 0.3,
    })
    if (error) throw new Error(`busca-semantica RPC: ${error.message}`)
    return (data ?? []) as CandidatoSemantico[]
  }) as CandidatoSemantico[]

  // Mapa investidor_id → similaridade (0-1)
  const simByInv = new Map<string, number>()
  for (const s of semanticos) simByInv.set(s.investidor_id, s.similarity)

  // ---------------------------------------------------------
  // 4-prep) Pré-rank: combina estruturado + semântico, pega top-K
  // ---------------------------------------------------------
  const preRanked = estruturados
    .map(c => {
      const sim = simByInv.get(c.investidor_id) ?? null
      const semScore = sim != null ? sim * 100 : null
      // Pré-rank: 0.7 estruturado + 0.3 semântico (quando há); senão só estruturado
      const preScore = semScore != null
        ? c.score_estruturado * 0.7 + semScore * 0.3
        : c.score_estruturado
      return { ...c, sem_score: semScore, pre_score: preScore }
    })
    .sort((a, b) => b.pre_score - a.pre_score)
    .slice(0, TOP_K_PARA_JUDGE)

  // ---------------------------------------------------------
  // 4) Carrega dados completos dos investidores do top-K (1 query)
  // ---------------------------------------------------------
  const invIds = preRanked.map(c => c.investidor_id)
  const investidores = await step.run('load-investidores', async () => {
    const { data, error } = await admin
      .from('investidores')
      .select(JUDGE_INVESTOR_FIELDS)
      .in('id', invIds)
    if (error) throw new Error(`load-investidores: ${error.message}`)
    return (data ?? []) as InvestidorJudgeRow[]
  }) as InvestidorJudgeRow[]

  const invById = new Map(investidores.map(i => [i.id, i]))

  // ---------------------------------------------------------
  // 4) LLM Judge — batches de JUDGE_CONCURRENCY
  // ---------------------------------------------------------
  const judged: JudgedCandidate[] = []
  const batches = chunk(preRanked, JUDGE_CONCURRENCY)

  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi]
    const results = await step.run(`judge-batch-${bi}`, async () => {
      const settled = await Promise.allSettled(
        batch.map(async (cand) => {
          const inv = invById.get(cand.investidor_id)
          if (!inv) return null
          const judgeInput = buildJudgeInput(inv, tese, cand.score_estruturado, cand.sem_score ?? 0)
          const verdict = await judgeMatch(judgeInput, { analiseId: tese.analise_id ?? null })
          return { cand, verdict }
        })
      )
      // step.run output precisa ser serializável e < 4MB — só dados essenciais
      return settled
        .map(s => (s.status === 'fulfilled' ? s.value : null))
        .filter((x): x is { cand: PreRankedCandidate; verdict: MatchJudgeOutput } => x !== null)
    }) as Array<{ cand: PreRankedCandidate; verdict: MatchJudgeOutput }>

    judged.push(...results)
  }

  logger.info('Candidatos julgados', { count: judged.length })

  // ---------------------------------------------------------
  // 5) Score composto + filtros + persistência
  // ---------------------------------------------------------
  const persistResult = await step.run('persist-matches', async () => {
    let persisted = 0
    let autoApproved = 0
    const now = new Date().toISOString()

    for (const { cand, verdict } of judged) {
      // Anti-falso-positivo: LLM disse skip → não cria match
      if (verdict.recommendation === 'skip') continue

      const scoreFinal = combineScore(cand.score_estruturado, cand.sem_score, verdict.synergy_score)
      if (scoreFinal < SCORE_MIN_PERSIST) continue

      const status = scoreFinal >= SCORE_AUTO_APPROVE ? 'aprovado_auto' : 'sugerido'
      if (status === 'aprovado_auto') autoApproved++

      const breakdown: MatchScoreBreakdown | Record<string, unknown> = {
        ...cand.breakdown,
        _semantic: { score: cand.sem_score ?? 0, peso: 0.20 },
        _llm:      { score: verdict.synergy_score, peso: 0.30 },
      }

      // Upsert por (investidor_id, tese_id) — recálculos atualizam
      const { error } = await admin
        .from('matches')
        .upsert({
          investidor_id:         cand.investidor_id,
          tese_id:               teseId,
          analise_id:            tese.analise_id,
          escritorio_id:         tese.escritorio_id,
          score_final:           scoreFinal,
          score_estruturado:     cand.score_estruturado,
          score_semantico:       cand.sem_score,
          score_llm:             verdict.synergy_score,
          score_breakdown:       breakdown,
          passou_hard_filter:    true,
          motivos_bloqueio:      [],
          llm_recommendation:    verdict.recommendation,
          llm_strengths:         verdict.strengths,
          llm_concerns:          verdict.concerns,
          llm_talking_points:    verdict.talking_points,
          llm_close_probability: verdict.close_probability,
          llm_resumo:            verdict.llm_resumo,
          llm_model_id:          'claude-sonnet-4-6',
          status,
          calculado_em:          now,
          motor_versao:          MOTOR_VERSAO,
          atualizado_em:         now,
        }, { onConflict: 'investidor_id,tese_id' })

      if (error) {
        console.error('[matching-engine] upsert match falhou:', error.message)
        continue
      }
      persisted++
    }

    return { persisted, autoApproved }
  }) as { persisted: number; autoApproved: number }

  // ---------------------------------------------------------
  // 6) Atualiza contador matches_recebidos nos investidores
  // ---------------------------------------------------------
  await step.run('bump-counts', async () => {
    const matchedInvIds = judged
      .filter(j => j.verdict.recommendation !== 'skip')
      .map(j => j.cand.investidor_id)
    if (matchedInvIds.length === 0) return { bumped: 0 }
    // Atualiza ultima_atividade — contador exato fica para o loop de feedback
    await admin
      .from('investidores')
      .update({ ultima_atividade_em: new Date().toISOString() })
      .in('id', matchedInvIds)
    return { bumped: matchedInvIds.length }
  })

  return {
    tese_id:             teseId,
    candidatos_camada12: estruturados.length,
    candidatos_julgados: judged.length,
    matches_persistidos: persistResult.persisted,
    aprovados_auto:      persistResult.autoApproved,
  }
}


// ============================================================
// ORIGINAÇÃO REVERSA — investidor → teses
// ============================================================
// Espelha runMatching, mas parte de um investidor e busca teses compatíveis.
// Persiste na MESMA tabela `matches` (par investidor×tese). Usa as funções SQL
// reversas (migration 20260521) + o mesmo Match Judge + mesmo score composto.

export interface RunReverseMatchingResult {
  investidor_id:       string
  teses_camada12:      number
  teses_julgadas:      number
  matches_persistidos: number
  aprovados_auto:      number
}

export async function runReverseMatching(params: {
  investidorId: string
  step?:        Step
  logger?:      Logger
}): Promise<RunReverseMatchingResult> {
  const step   = params.step   ?? directRunner
  const logger = params.logger ?? consoleLogger
  const admin  = createAdminClient()
  const investidorId = params.investidorId

  // 0) Carrega o investidor (campos do judge + escritorio_id)
  const inv = await step.run('load-investidor', async () => {
    const { data, error } = await admin
      .from('investidores')
      .select(`${JUDGE_INVESTOR_FIELDS}, escritorio_id`)
      .eq('id', investidorId)
      .single()
    if (error || !data) throw new Error(`Investidor ${investidorId} não encontrado: ${error?.message}`)
    return data as InvestidorJudgeRow & { escritorio_id: string }
  }) as InvestidorJudgeRow & { escritorio_id: string }

  // 1+2) Hard filter + structured (RPC reverso)
  const estruturados = await step.run('buscar-teses', async () => {
    const { data, error } = await admin.rpc('invest_match_buscar_teses_para_investidor', {
      p_investidor_id: investidorId,
      p_limit:         50,
      p_min_score:     PRE_RANK_MIN,
    })
    if (error) throw new Error(`buscar-teses RPC: ${error.message}`)
    return (data ?? []) as TeseCandidata[]
  }) as TeseCandidata[]

  logger.info('Teses candidatas', { count: estruturados.length })
  if (estruturados.length === 0) {
    return { investidor_id: investidorId, teses_camada12: 0, teses_julgadas: 0, matches_persistidos: 0, aprovados_auto: 0 }
  }

  // 3) Semântico reverso (RPC lida com embedding ausente devolvendo vazio)
  const semanticos = await step.run('busca-semantica-teses', async () => {
    const { data, error } = await admin.rpc('invest_match_busca_semantica_teses', {
      p_investidor_id:  investidorId,
      p_match_count:    50,
      p_similarity_min: 0.3,
    })
    if (error) throw new Error(`busca-semantica-teses RPC: ${error.message}`)
    return (data ?? []) as TeseSemantica[]
  }) as TeseSemantica[]

  const simByTese = new Map<string, number>()
  for (const s of semanticos) simByTese.set(s.tese_id, s.similarity)

  // pré-rank top-K
  const preRanked = estruturados
    .map(c => {
      const sim = simByTese.get(c.tese_id) ?? null
      const semScore = sim != null ? sim * 100 : null
      const preScore = semScore != null ? c.score_estruturado * 0.7 + semScore * 0.3 : c.score_estruturado
      return { ...c, sem_score: semScore, pre_score: preScore }
    })
    .sort((a, b) => b.pre_score - a.pre_score)
    .slice(0, TOP_K_PARA_JUDGE)

  // 4) Carrega teses completas do top-K (1 query)
  const teseIds = preRanked.map(c => c.tese_id)
  const teses = await step.run('load-teses', async () => {
    const { data, error } = await admin
      .from('teses')
      .select(TESE_JUDGE_FIELDS)
      .in('id', teseIds)
    if (error) throw new Error(`load-teses: ${error.message}`)
    return (data ?? []) as TeseRow[]
  }) as TeseRow[]
  const teseById = new Map(teses.map(t => [t.id, t]))

  // 4) LLM Judge em batches
  const judged: Array<{ tese_id: string; sem_score: number | null; estruturado: number; breakdown: Record<string, unknown>; verdict: MatchJudgeOutput }> = []
  const batches = chunk(preRanked, JUDGE_CONCURRENCY)

  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi]
    const results = await step.run(`judge-teses-batch-${bi}`, async () => {
      const settled = await Promise.allSettled(
        batch.map(async (cand) => {
          const tese = teseById.get(cand.tese_id)
          if (!tese) return null
          const judgeInput = buildJudgeInput(inv, tese, cand.score_estruturado, cand.sem_score ?? 0)
          const verdict = await judgeMatch(judgeInput, { analiseId: tese.analise_id ?? null })
          return { tese_id: cand.tese_id, sem_score: cand.sem_score, estruturado: cand.score_estruturado, breakdown: cand.breakdown, verdict }
        })
      )
      return settled
        .map(s => (s.status === 'fulfilled' ? s.value : null))
        .filter((x): x is { tese_id: string; sem_score: number | null; estruturado: number; breakdown: Record<string, unknown>; verdict: MatchJudgeOutput } => x !== null)
    }) as Array<{ tese_id: string; sem_score: number | null; estruturado: number; breakdown: Record<string, unknown>; verdict: MatchJudgeOutput }>
    judged.push(...results)
  }

  logger.info('Teses julgadas', { count: judged.length })

  // 5) Persiste matches (mesma tabela, upsert por par)
  const persistResult = await step.run('persist-reverse-matches', async () => {
    let persisted = 0
    let autoApproved = 0
    const now = new Date().toISOString()

    for (const j of judged) {
      if (j.verdict.recommendation === 'skip') continue
      const scoreFinal = combineScore(j.estruturado, j.sem_score, j.verdict.synergy_score)
      if (scoreFinal < SCORE_MIN_PERSIST) continue

      const status = scoreFinal >= SCORE_AUTO_APPROVE ? 'aprovado_auto' : 'sugerido'
      if (status === 'aprovado_auto') autoApproved++

      const tese = teseById.get(j.tese_id)
      const breakdown = {
        ...j.breakdown,
        _semantic: { score: j.sem_score ?? 0, peso: 0.20 },
        _llm:      { score: j.verdict.synergy_score, peso: 0.30 },
      }

      const { error } = await admin
        .from('matches')
        .upsert({
          investidor_id:         investidorId,
          tese_id:               j.tese_id,
          analise_id:            tese?.analise_id ?? null,
          escritorio_id:         inv.escritorio_id,
          score_final:           scoreFinal,
          score_estruturado:     j.estruturado,
          score_semantico:       j.sem_score,
          score_llm:             j.verdict.synergy_score,
          score_breakdown:       breakdown,
          passou_hard_filter:    true,
          motivos_bloqueio:      [],
          llm_recommendation:    j.verdict.recommendation,
          llm_strengths:         j.verdict.strengths,
          llm_concerns:          j.verdict.concerns,
          llm_talking_points:    j.verdict.talking_points,
          llm_close_probability: j.verdict.close_probability,
          llm_resumo:            j.verdict.llm_resumo,
          llm_model_id:          'claude-sonnet-4-6',
          status,
          calculado_em:          now,
          motor_versao:          MOTOR_VERSAO + '-reverse',
          atualizado_em:         now,
        }, { onConflict: 'investidor_id,tese_id' })

      if (error) { console.error('[matching-engine] upsert reverse falhou:', error.message); continue }
      persisted++
    }
    return { persisted, autoApproved }
  }) as { persisted: number; autoApproved: number }

  return {
    investidor_id:       investidorId,
    teses_camada12:      estruturados.length,
    teses_julgadas:      judged.length,
    matches_persistidos: persistResult.persisted,
    aprovados_auto:      persistResult.autoApproved,
  }
}


// ============================================================
// Score composto (Camada 5)
// ============================================================
export function combineScore(
  estruturado: number,
  semantico:   number | null,
  llm:         number,
): number {
  if (semantico != null) {
    return round2(estruturado * 0.50 + semantico * 0.20 + llm * 0.30)
  }
  // Sem embedding — renormaliza sem a parcela semântica
  return round2(estruturado * 0.65 + llm * 0.35)
}


// ============================================================
// Monta o input do judge a partir das linhas do banco
// ============================================================
function buildJudgeInput(
  inv:        InvestidorJudgeRow,
  tese:       TeseRow,
  estruturado: number,
  semantico:  number,
): MatchJudgeInput {
  return {
    investidor: {
      nome:                     inv.nome,
      tipo:                     inv.tipo,
      setores_alvo:             inv.setores_alvo ?? [],
      sub_setores:              inv.sub_setores ?? [],
      modelos_negocio:          inv.modelos_negocio ?? [],
      vertical_tags:            inv.vertical_tags ?? [],
      estagios_aceitos:         inv.estagios_aceitos ?? [],
      ticket_min_brl:           inv.ticket_min_brl,
      ticket_max_brl:           inv.ticket_max_brl,
      tipos_deal_aceitos:       inv.tipos_deal_aceitos ?? [],
      controle_aceito:          inv.controle_aceito ?? [],
      horizonte_saida_min_anos: inv.horizonte_saida_min_anos,
      horizonte_saida_max_anos: inv.horizonte_saida_max_anos,
      geografias_aceitas:       inv.geografias_aceitas ?? [],
      requer_esg:               inv.requer_esg ?? false,
      requer_pronto_para_dd:    inv.requer_pronto_para_dd ?? false,
      tese_resumo:              inv.tese_resumo,
      tese_completa:            inv.tese_completa,
      exemplos_deals_passados:  inv.exemplos_deals_passados,
    },
    tese: {
      empresa_nome:            tese.empresa_nome,
      setor_primario:          tese.setor_primario,
      sub_setores:             tese.sub_setores ?? [],
      modelos_negocio:         tese.modelos_negocio ?? [],
      vertical_tags:           tese.vertical_tags ?? [],
      estagio:                 tese.estagio,
      receita_anual_brl:       tese.receita_anual_brl,
      ebitda_brl:              tese.ebitda_brl,
      crescimento_yoy_pct:     tese.crescimento_yoy_pct,
      capital_buscado_brl:     tese.capital_buscado_brl,
      valuation_pre_money_brl: tese.valuation_pre_money_brl,
      equity_oferecido_pct:    tese.equity_oferecido_pct,
      governance_score:        tese.governance_score,
      risk_overall_score:      tese.risk_overall_score,
      documentacao_score:      tese.documentacao_score,
      pronto_para_dd:          tese.pronto_para_dd ?? false,
      esg_compliant:           tese.esg_compliant ?? false,
      hq_estado:               tese.hq_estado,
      tipo_deal:               tese.tipo_deal,
      controle_oferecido:      tese.controle_oferecido,
      horizonte_saida_anos:    tese.horizonte_saida_anos,
      urgencia:                tese.urgencia ?? 'media',
      tese_investimento:       tese.tese_investimento,
      value_proposition:       tese.value_proposition,
      competitive_moat:        tese.competitive_moat,
      risk_narrative:          tese.risk_narrative,
      exit_story:              tese.exit_story,
      risk_factors:            tese.risk_factors ?? [],
      key_dependencies:        tese.key_dependencies ?? [],
    },
    score_estruturado: estruturado,
    score_semantico:   semantico,
  }
}


// ============================================================
// Tipos internos (espelham colunas usadas)
// ============================================================
const JUDGE_INVESTOR_FIELDS = `
  id, nome, tipo, setores_alvo, sub_setores, modelos_negocio, vertical_tags,
  estagios_aceitos, ticket_min_brl, ticket_max_brl, tipos_deal_aceitos,
  controle_aceito, horizonte_saida_min_anos, horizonte_saida_max_anos,
  geografias_aceitas, requer_esg, requer_pronto_para_dd,
  tese_resumo, tese_completa, exemplos_deals_passados
`

// Campos da tese carregados pro judge no fluxo reverso (espelha TeseRow,
// sem o embedding — vetor pesado e desnecessário aqui).
const TESE_JUDGE_FIELDS = `
  id, escritorio_id, analise_id, empresa_nome, setor_primario, sub_setores,
  modelos_negocio, vertical_tags, estagio, receita_anual_brl, ebitda_brl,
  crescimento_yoy_pct, capital_buscado_brl, valuation_pre_money_brl,
  equity_oferecido_pct, governance_score, risk_overall_score, documentacao_score,
  pronto_para_dd, esg_compliant, hq_estado, tipo_deal, controle_oferecido,
  horizonte_saida_anos, urgencia, tese_investimento, value_proposition,
  competitive_moat, risk_narrative, exit_story, risk_factors, key_dependencies
`

interface CandidatoEstruturado {
  investidor_id:      string
  nome:               string
  score_estruturado:  number
  passou_hard_filter: boolean
  motivos_bloqueio:   string[]
  breakdown:          Record<string, unknown>
}

interface CandidatoSemantico {
  investidor_id: string
  nome:          string
  similarity:    number
}

// Resultados das RPCs reversas (investidor → teses)
interface TeseCandidata {
  tese_id:            string
  empresa_nome:       string | null
  score_estruturado:  number
  passou_hard_filter: boolean
  motivos_bloqueio:   string[]
  breakdown:          Record<string, unknown>
}

interface TeseSemantica {
  tese_id:          string
  empresa_nome:     string | null
  similarity:       number
}

interface PreRankedCandidate extends CandidatoEstruturado {
  sem_score: number | null
  pre_score: number
}

interface JudgedCandidate {
  cand:    PreRankedCandidate
  verdict: MatchJudgeOutput
}

interface InvestidorJudgeRow {
  id:                       string
  nome:                     string
  tipo:                     string
  setores_alvo:             string[] | null
  sub_setores:              string[] | null
  modelos_negocio:          string[] | null
  vertical_tags:            string[] | null
  estagios_aceitos:         string[] | null
  ticket_min_brl:           number | null
  ticket_max_brl:           number | null
  tipos_deal_aceitos:       string[] | null
  controle_aceito:          string[] | null
  horizonte_saida_min_anos: number | null
  horizonte_saida_max_anos: number | null
  geografias_aceitas:       string[] | null
  requer_esg:               boolean | null
  requer_pronto_para_dd:    boolean | null
  tese_resumo:              string | null
  tese_completa:            string | null
  exemplos_deals_passados:  string | null
}

interface TeseRow {
  id:                      string
  escritorio_id:           string
  analise_id:              string | null
  empresa_nome:            string
  setor_primario:          string
  sub_setores:             string[] | null
  modelos_negocio:         string[] | null
  vertical_tags:           string[] | null
  estagio:                 string
  receita_anual_brl:       number | null
  ebitda_brl:              number | null
  crescimento_yoy_pct:     number | null
  capital_buscado_brl:     number
  valuation_pre_money_brl: number | null
  equity_oferecido_pct:    number | null
  governance_score:        number | null
  risk_overall_score:      number | null
  documentacao_score:      number | null
  pronto_para_dd:          boolean | null
  esg_compliant:           boolean | null
  hq_estado:               string | null
  tipo_deal:               string | null
  controle_oferecido:      string | null
  horizonte_saida_anos:    number | null
  urgencia:                string | null
  tese_investimento:       string | null
  value_proposition:       string | null
  competitive_moat:        string | null
  risk_narrative:          string | null
  exit_story:              string | null
  risk_factors:            string[] | null
  key_dependencies:        string[] | null
  tese_embedding:          number[] | null
}


// ============================================================
// Helpers
// ============================================================
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function emptyResult(teseId: string): RunMatchingResult {
  return {
    tese_id:             teseId,
    candidatos_camada12: 0,
    candidatos_julgados: 0,
    matches_persistidos: 0,
    aprovados_auto:      0,
  }
}
