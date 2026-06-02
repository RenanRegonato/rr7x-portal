// Orquestrador que constrói uma Tese estruturada (Invest Match) a partir
// de uma análise da Mandor. Combina:
//   - mapping determinístico (intake + fact_bank + facts + scores)
//   - extração via LLM (thesis-builder agent — campos qualitativos)
//   - embedding voyage-3-large (busca semântica)
//   - upsert em `teses` (unique constraint por analise_id)
//
// Uso:
//   const tese = await buildThesisFromAnalise({ analiseId, userId })
//
// Idempotente: rodar duas vezes UPDATE-a a mesma linha (vincula via analise_id).

import { createAdminClient } from '@/lib/supabase-server'
import { getFacts } from '@/lib/truth-layer'
import { embedQuery } from '@/lib/ingestion/voyage-embeddings'
import { buildThesisLlm, type ThesisBuilderOutput } from '@/lib/agents/thesis-builder'
import {
  formatFactBankCompact,
  getLatestFinancialAmount,
  getGrowthYoY,
  hasAuditedFinancials,
  approximateDocumentationCoverage,
} from './fact-lookup'
import { resolveEscritorioId } from './auth-helpers'
import type { FactBank } from './mandor-mapping'
import type {
  StructuredThesis, Estagio, OrigemTese, StatusTese,
} from './types'
import type { DealIntake, PipelineOutputs } from '@/lib/types'


// ============================================================
// Tipos do contexto carregado do banco
// ============================================================
interface AnaliseLoaded {
  id:              string
  user_id:         string
  nome_ativo:      string
  deal_intake:     DealIntake
  outputs:         PipelineOutputs
  mesa_revisao:    Record<string, unknown> | null
  fact_bank:       FactBank | null
  coverage_check:  CoverageCheck | null
}

interface CoverageCheck {
  tipo_operacao?: string
  early_stage?:   boolean
  resumo?: { coberto?: number; parcial?: number; nao_coberto?: number; nao_aplicavel?: number }
  items?:  Array<{ key: string; status: string }>
}

interface ConsistencyCounts {
  bloqueante: number
  alerta:     number
  info:       number
}

const SETORES_CONHECIDOS = [
  'Saúde', 'Imobiliário', 'Agronegócio', 'Energia', 'Startups', 'Tecnologia',
  'Indústria', 'Varejo', 'Serviços', 'Educação', 'Financeiro', 'Infraestrutura',
  'Logística', 'Mineração', 'Outros',
]


// ============================================================
// Função pública principal
// ============================================================
export interface BuildThesisInput {
  analiseId:     string
  /** UUID do user que disparou a ação (pra rastreabilidade + escritorio_id). */
  userId:        string
}

export interface BuildThesisResult {
  tese_id:       string
  origem:        OrigemTese
  is_new:        boolean   // true = criada agora; false = atualizou existente
  model_id:      string
  embedding_dim: number
}

export async function buildThesisFromAnalise(input: BuildThesisInput): Promise<BuildThesisResult> {
  const admin = createAdminClient()

  // 1) Carrega o contexto da análise
  const ctx = await loadAnaliseContext(admin, input.analiseId)
  if (!ctx) throw new Error(`Análise ${input.analiseId} não encontrada`)
  if (!ctx.mesa_revisao) {
    throw new Error('Análise ainda não tem mesa_revisao — rode o pipeline completo antes.')
  }

  // 2) Descobre escritorio_id (multi-tenant: 1 user = 1 escritorio direto OU via perfis)
  const escritorioId = await resolveEscritorioId(ctx.user_id)
  if (!escritorioId) {
    throw new Error(`Usuário ${ctx.user_id} sem escritorio_id — cadastre o escritório antes.`)
  }

  // 3) Carrega facts da truth layer (rastreabilidade fina, complementa fact_bank)
  const facts = await getFacts(input.analiseId)

  // 3b) Conta issues de consistência (alimentam o risk_overall_score determinístico)
  const consistencyCounts = await loadConsistencyCounts(admin, input.analiseId)

  // 4) Aplica mapping determinístico (campos que NÃO precisam de LLM)
  const deterministic = applyDeterministicMapping(ctx, consistencyCounts)

  // 5) Chama o agente Sonnet pra preencher os campos qualitativos
  const llmOutput = await buildThesisLlm({
    analiseId:          ctx.id,
    nome_ativo:         ctx.nome_ativo,
    intake_resumo:      summarizeIntake(ctx.deal_intake),
    mesa_revisao_json:  JSON.stringify(ctx.mesa_revisao, null, 2),
    mesa_aprovacao:    (ctx.mesa_revisao as { aprovacao?: string })?.aprovacao ?? null,
    fact_bank_compact:  formatFactBankCompact(ctx.fact_bank),
    outputs_relevantes: extractRelevantOutputs(ctx.outputs),
    setores_conhecidos: SETORES_CONHECIDOS,
  })

  // 6) Mescla determinístico + LLM (LLM nunca sobrescreve fact deterministicamente conhecido)
  const merged = mergeThesis({
    escritorio_id: escritorioId,
    analise_id:    ctx.id,
    nome_ativo:    ctx.nome_ativo,
    deterministic,
    llmOutput,
    factsCount:    facts.length,
  })

  // 7) Gera embedding pra busca semântica
  const embeddingText = buildEmbeddingText(merged)
  const embedding = await embedQuery(embeddingText)

  // 8) Upsert em `teses` (unique constraint em analise_id)
  const existing = await admin
    .from('teses')
    .select('id')
    .eq('analise_id', ctx.id)
    .maybeSingle()

  const now = new Date().toISOString()
  const tesePayload = {
    ...merged,
    tese_embedding:       embedding,
    tese_embedding_model: 'voyage-3-large',
    tese_embedding_at:    now,
    origem_payload: {
      // Snapshot pra debug e reprocessamento. NÃO contém docs originais — só
      // metadados das fontes (rastreabilidade).
      mesa_aprovacao:      (ctx.mesa_revisao as { aprovacao?: string })?.aprovacao ?? null,
      fact_bank_size:      ctx.fact_bank?.facts?.length ?? 0,
      facts_truth_layer:   facts.length,
      llm_model:           process.env.ANTHROPIC_MODEL_OVERRIDE ?? 'claude-sonnet-4-6',
      built_at:            now,
    },
    origem_model_id:      'claude-sonnet-4-6',
    criado_por:           input.userId,
  }

  if (existing.data?.id) {
    // UPDATE — mantém criado_em, atualiza tudo
    await admin
      .from('teses')
      .update(tesePayload)
      .eq('id', existing.data.id)
    return {
      tese_id:       existing.data.id,
      origem:        'mandor',
      is_new:        false,
      model_id:      'claude-sonnet-4-6',
      embedding_dim: embedding.length,
    }
  }

  // INSERT — primeira vez
  const { data: inserted, error: insertErr } = await admin
    .from('teses')
    .insert({ ...tesePayload, criado_em: now })
    .select('id')
    .single()

  if (insertErr || !inserted) {
    throw new Error(`Falha ao inserir tese: ${insertErr?.message ?? 'sem detalhes'}`)
  }

  return {
    tese_id:       inserted.id,
    origem:        'mandor',
    is_new:        true,
    model_id:      'claude-sonnet-4-6',
    embedding_dim: embedding.length,
  }
}


// ============================================================
// Carregamento do contexto da análise
// ============================================================
async function loadAnaliseContext(
  admin:     ReturnType<typeof createAdminClient>,
  analiseId: string,
): Promise<AnaliseLoaded | null> {
  const { data, error } = await admin
    .from('analises')
    .select('id, user_id, nome_ativo, deal_intake, outputs, mesa_revisao, fact_bank, coverage_check')
    .eq('id', analiseId)
    .single()
  if (error || !data) return null
  return data as AnaliseLoaded
}

// Conta issues de consistência por severidade (não-resolvidas).
async function loadConsistencyCounts(
  admin:     ReturnType<typeof createAdminClient>,
  analiseId: string,
): Promise<ConsistencyCounts> {
  const { data, error } = await admin
    .from('consistency_issues')
    .select('severidade')
    .eq('analise_id', analiseId)
    .eq('resolvido', false)
  if (error || !data) return { bloqueante: 0, alerta: 0, info: 0 }

  const counts: ConsistencyCounts = { bloqueante: 0, alerta: 0, info: 0 }
  for (const row of data) {
    const sev = (row as { severidade: string }).severidade
    if (sev === 'bloqueante') counts.bloqueante++
    else if (sev === 'alerta') counts.alerta++
    else if (sev === 'info')   counts.info++
  }
  return counts
}

// ============================================================
// Mapping determinístico (sem LLM)
// ============================================================
interface DeterministicFields {
  setor_primario:           string
  estagio:                  Estagio
  receita_anual_brl:        number | null
  ebitda_brl:               number | null
  margem_ebitda_pct:        number | null
  crescimento_yoy_pct:      number | null
  capital_buscado_brl:      number
  capital_minimo_ticket_brl: number | null
  valuation_pre_money_brl:  number | null
  tem_auditoria:            boolean | null
  hq_estado:                string | null
  hq_cidade:                string | null
  risk_factors:             string[]
  documentacao_score:       number | null
  risk_overall_score:       number | null
  pronto_para_dd:           boolean
}

function applyDeterministicMapping(
  ctx:                AnaliseLoaded,
  consistencyCounts:  ConsistencyCounts,
): DeterministicFields {
  const bank = ctx.fact_bank
  const mesa = ctx.mesa_revisao as MesaShape | null

  const receita     = getLatestFinancialAmount(bank, 'receita')
  const ebitda      = getLatestFinancialAmount(bank, 'ebitda')
  const valuation   = getLatestFinancialAmount(bank, 'valuation_pre_money')
  const yoy         = getGrowthYoY(bank, 'receita')
  const audited     = hasAuditedFinancials(bank)
  const loc         = parseLocalizacao(ctx.deal_intake.localizacao)
  const capital     = parseTicket(ctx.deal_intake.ticketEstimado) ?? 0

  // documentacao_score: prioriza coverage_check (fonte precisa); fallback p/ facts
  const docScore = computeDocumentacaoScore(ctx.coverage_check) ?? approximateDocumentationCoverage(bank)

  // risk_overall_score: heurística determinística (consistency_issues + mesa)
  const riskScore = computeRiskScore(consistencyCounts, mesa)

  const margem =
    receita?.amount && ebitda?.amount && receita.amount > 0
      ? (ebitda.amount / receita.amount) * 100
      : null

  return {
    setor_primario:           normalizeSetor(ctx.deal_intake.tipoAtivo),
    estagio:                  normalizeEstagio(ctx.deal_intake.estagio),
    receita_anual_brl:        receita?.amount ?? null,
    ebitda_brl:               ebitda?.amount ?? null,
    margem_ebitda_pct:        margem !== null ? round2(margem) : null,
    crescimento_yoy_pct:      yoy ? round2(yoy.yoy_pct) : null,
    capital_buscado_brl:      capital,
    capital_minimo_ticket_brl: capital > 0 ? Math.floor(capital * 0.2) : null,
    valuation_pre_money_brl:  valuation?.amount ?? null,
    tem_auditoria:            audited,
    hq_estado:                loc.estado,
    hq_cidade:                loc.cidade,
    risk_factors:             Array.isArray(mesa?.pontos_fracos) ? mesa.pontos_fracos.slice(0, 10) : [],
    documentacao_score:       docScore,
    risk_overall_score:       riskScore,
    pronto_para_dd:           (docScore ?? 0) >= 80 && mesa?.aprovacao !== 'revisao_necessaria',
  }
}

interface MesaShape {
  aprovacao?:    string
  pontos_fracos?: string[]
  contradicoes_detectadas?: Array<{ criticidade?: string }>
}

// documentacao_score a partir do coverage_check da Mandor.
// coberto vale 1.0, parcial 0.5, nao_coberto 0. Itens 'nao_aplicavel' (histórico
// financeiro de deals early-stage) NÃO entram no denominador — ausência justificada
// não penaliza o score. Retorna null se não há itens aplicáveis.
function computeDocumentacaoScore(coverage: CoverageCheck | null): number | null {
  const r = coverage?.resumo
  if (!r) return null
  const coberto    = r.coberto ?? 0
  const parcial    = r.parcial ?? 0
  const naoCoberto = r.nao_coberto ?? 0
  // nao_aplicavel deliberadamente excluído do total (denominador).
  const total      = coberto + parcial + naoCoberto
  if (total === 0) return null
  return Math.round(((coberto + parcial * 0.5) / total) * 100)
}

// risk_overall_score 0-100 (MENOR = menos risco). Heurística determinística.
// Base 25. Penaliza issues de consistência (peso por severidade), o veredito
// da mesa e contradições detectadas. Clamp 0-100.
function computeRiskScore(counts: ConsistencyCounts, mesa: MesaShape | null): number | null {
  // Sem nenhum sinal (nem mesa nem issues) → não arrisca um número
  if (!mesa && counts.bloqueante === 0 && counts.alerta === 0 && counts.info === 0) {
    return null
  }

  let score = 25
  score += counts.bloqueante * 18  // cada issue bloqueante pesa muito
  score += counts.alerta     * 8
  score += counts.info       * 2

  // Veredito da mesa
  if (mesa?.aprovacao === 'revisao_necessaria')      score += 25
  else if (mesa?.aprovacao === 'aprovado_com_ressalvas') score += 12

  // Contradições semânticas detectadas pela mesa
  for (const c of mesa?.contradicoes_detectadas ?? []) {
    if (c.criticidade === 'alta')  score += 10
    else if (c.criticidade === 'media') score += 5
    else score += 2
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}


// ============================================================
// Merge: determinístico + LLM → StructuredThesis completa
// ============================================================
function mergeThesis(args: {
  escritorio_id: string
  analise_id:    string
  nome_ativo:    string
  deterministic: DeterministicFields
  llmOutput:     ThesisBuilderOutput
  factsCount:    number
}): Omit<StructuredThesis, 'id' | 'criado_em' | 'atualizado_em' | 'criado_por'> {
  const { deterministic: d, llmOutput: l } = args

  return {
    escritorio_id:             args.escritorio_id,
    analise_id:                args.analise_id,
    origem:                    'mandor' as OrigemTese,

    empresa_nome:              args.nome_ativo,
    empresa_descricao_curta:   null,

    setor_primario:            d.setor_primario,
    sub_setores:               l.sub_setores,
    modelos_negocio:           l.modelos_negocio,
    vertical_tags:             l.vertical_tags,

    estagio:                   d.estagio,
    maturity_score:            l.maturity_score,   // LLM (deriva do agente maturidade)
    anos_operacao:             null,

    receita_anual_brl:         d.receita_anual_brl,
    ebitda_brl:                d.ebitda_brl,
    margem_ebitda_pct:         d.margem_ebitda_pct,
    crescimento_yoy_pct:       d.crescimento_yoy_pct,
    capital_buscado_brl:       d.capital_buscado_brl,
    capital_minimo_ticket_brl: d.capital_minimo_ticket_brl,
    uso_capital:               l.uso_capital,
    valuation_pre_money_brl:   d.valuation_pre_money_brl,
    equity_oferecido_pct:      l.equity_oferecido_pct,

    governance_score:          l.governance_score,   // LLM (estrutura societária + compliance)
    tem_conselho:              l.tem_conselho,
    tem_auditoria:             d.tem_auditoria,
    nivel_compliance:          l.nivel_compliance,

    risk_overall_score:        d.risk_overall_score, // determinístico (consistency + mesa)
    risk_factors:              d.risk_factors,

    operational_score:         l.operational_score,  // LLM (time, processos, dependências)
    team_size:                 l.team_size,
    key_dependencies:          l.key_dependencies,

    hq_estado:                 d.hq_estado,
    hq_cidade:                 d.hq_cidade,
    regioes_operacao:          l.regioes_operacao,

    tipo_deal:                 l.tipo_deal,
    controle_oferecido:        l.controle_oferecido,
    horizonte_saida_anos:      l.horizonte_saida_anos,
    urgencia:                  l.urgencia,

    documentacao_score:        d.documentacao_score,
    pronto_para_dd:            d.pronto_para_dd,

    tipos_investidor_excluidos: l.tipos_investidor_excluidos,
    esg_compliant:             l.esg_compliant,

    tese_investimento:         l.tese_investimento || null,
    value_proposition:         l.value_proposition || null,
    competitive_moat:          l.competitive_moat || null,
    risk_narrative:            l.risk_narrative || null,
    exit_story:                l.exit_story || null,

    status:                    'lead' as StatusTese,

    origem_model_id:           null,
    origem_payload:            null,
  }
}


// ============================================================
// Texto que vai para o embedding (concatena narrativa + estruturado)
// ============================================================
function buildEmbeddingText(t: ReturnType<typeof mergeThesis>): string {
  const parts: string[] = []
  parts.push(`Setor: ${t.setor_primario}`)
  if (t.sub_setores.length)     parts.push(`Sub-setores: ${t.sub_setores.join(', ')}`)
  if (t.modelos_negocio.length) parts.push(`Modelos: ${t.modelos_negocio.join(', ')}`)
  if (t.vertical_tags.length)   parts.push(`Tags: ${t.vertical_tags.join(', ')}`)
  parts.push(`Estágio: ${t.estagio}`)
  if (t.tipo_deal)              parts.push(`Tipo de deal: ${t.tipo_deal}`)
  if (t.tese_investimento)      parts.push(`\nTese: ${t.tese_investimento}`)
  if (t.value_proposition)      parts.push(`\nProposta de valor: ${t.value_proposition}`)
  if (t.competitive_moat)       parts.push(`\nMoat: ${t.competitive_moat}`)
  if (t.risk_narrative)         parts.push(`\nRiscos: ${t.risk_narrative}`)
  if (t.exit_story)             parts.push(`\nSaída: ${t.exit_story}`)
  return parts.join('\n')
}


// ============================================================
// Normalizadores (intake → enums)
// ============================================================
function normalizeEstagio(raw: string): Estagio {
  const s = (raw || '').toLowerCase().trim()
  if (/ideia|conceito|prototip/.test(s))                return 'ideia'
  if (/mvp|piloto/.test(s))                             return 'mvp'
  if (/projeto.*andament|inicial|operac|tração/.test(s)) return 'early_revenue'
  if (/cresciment|expans|growth/.test(s))               return 'growth'
  if (/consolidad|matur|estabelec/.test(s))             return 'mature'
  if (/turnaround|reestrutur|recuper/.test(s))          return 'turnaround'
  return 'early_revenue'  // fallback razoável
}

function normalizeSetor(raw: string): string {
  const s = (raw || '').trim()
  if (!s) return 'Outros'
  // Match case-insensitive contra lista conhecida; senão retorna o texto original capitalizado
  const found = SETORES_CONHECIDOS.find(c => c.toLowerCase() === s.toLowerCase())
  if (found) return found
  return s.charAt(0).toUpperCase() + s.slice(1)
}

interface ParsedLoc { estado: string | null; cidade: string | null }
function parseLocalizacao(raw: string): ParsedLoc {
  const s = (raw || '').trim()
  if (!s) return { estado: null, cidade: null }
  // Padrões aceitos: "São Paulo, SP" | "SP" | "Curitiba/PR" | "Belo Horizonte - MG"
  const ufMatch = s.match(/\b([A-Z]{2})\b\s*$/)
  if (ufMatch) {
    const estado = ufMatch[1]
    const cidade = s.slice(0, ufMatch.index).replace(/[,\-/]\s*$/, '').trim() || null
    return { estado, cidade }
  }
  // Sem UF explícito — assume é cidade
  return { estado: null, cidade: s }
}

/** Parseia "R$ 5 milhões", "5MM", "5.000.000", "5M" → 5000000. */
function parseTicket(raw: string | undefined | null): number | null {
  if (!raw) return null
  const s = raw.toLowerCase().replace(/r\$|\s/g, '')

  const numberOnly = s.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.')
  const base = parseFloat(numberOnly)
  if (!Number.isFinite(base) || base <= 0) return null

  let multiplier = 1
  if (/bilh|bi\b|bn\b/.test(s)) multiplier = 1_000_000_000
  else if (/milh|mm\b|mn\b|\bm\b/.test(s)) multiplier = 1_000_000
  else if (/mil\b|\bk\b/.test(s))           multiplier = 1_000

  return Math.round(base * multiplier)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}


// ============================================================
// Helpers de prompt
// ============================================================
function summarizeIntake(intake: DealIntake): string {
  const lines: string[] = []
  lines.push(`Ativo: ${intake.nomeAtivo}`)
  lines.push(`Tipo: ${intake.tipoAtivo}`)
  lines.push(`Estágio: ${intake.estagio}`)
  lines.push(`Objetivo: ${intake.objetivo}`)
  lines.push(`Localização: ${intake.localizacao}`)
  lines.push(`Ticket estimado: ${intake.ticketEstimado}`)
  if (intake.receitaCaixa)         lines.push(`Receita/Caixa: ${intake.receitaCaixa}`)
  if (intake.passivos)             lines.push(`Passivos: ${intake.passivos}`)
  if (intake.resumoAtivo)          lines.push(`\nResumo: ${intake.resumoAtivo}`)
  if (intake.informacoesAdicionais) lines.push(`\nInfo adicional: ${intake.informacoesAdicionais}`)
  if (intake.obsMandato)           lines.push(`\nObservações do mandato: ${intake.obsMandato}`)
  return lines.join('\n')
}

/** Concatena outputs dos agentes relevantes pra tese (com limite por agente). */
function extractRelevantOutputs(outputs: PipelineOutputs): string {
  const RELEVANT: Array<keyof PipelineOutputs> = [
    'diagnostico', 'analise_ma', 'originacao', 'maturidade', 'revisao',
  ]
  const MAX_PER_AGENT = 2500

  const parts: string[] = []
  for (const key of RELEVANT) {
    const content = outputs?.[key]
    if (!content || typeof content !== 'string') continue
    const truncated = content.length > MAX_PER_AGENT
      ? content.slice(0, MAX_PER_AGENT) + '\n...[truncado]'
      : content
    parts.push(`## ${key}\n${truncated}`)
  }
  return parts.join('\n\n---\n\n') || '(sem outputs disponíveis)'
}
