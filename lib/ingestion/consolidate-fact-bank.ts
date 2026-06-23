import { callLLM } from '@/lib/llm/call'
import { routeFor } from '@/lib/llm/models'
import { PROMPT_INJECTION_GUARD } from '@/lib/llm/prompt-safety'
import { computeFinancials, metricsToConsolidatedFacts } from '@/lib/extract/financial-engine'
import { evaluateRisk, triggersToFacts } from '@/lib/extract/risk-engine'
import { createAdminClient } from '@/lib/supabase-server'
import { sendIngestionCompleteEmail } from '@/lib/email'
import { evaluateTriagemGate } from '@/lib/triagem/gate'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Step = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Logger = any

interface ConsolidateParams {
  analiseId: string
  step:      Step
  logger:    Logger
}

interface RawFact {
  fact_type:     string
  fact_key:      string
  fact_value:    string
  source_quote:  string | null
  source_page:   number | null
  confidence:    number
  document_id:   string
  document_name: string
}

interface ConsolidatedFact {
  fact_type:           string
  key:                 string
  value:               unknown
  status?:             'consolidated' | 'conflict'
  confidence:          number
  sources:             Array<{ doc_id: string; doc_name: string; page: number | null; quote: string | null }>
  conflicting_values?: Array<{ value: unknown; doc_id: string; doc_name: string; page: number | null }>
}

const CONSOLIDATOR_SYSTEM = `Você é o Consolidador do Mandor — agrupa fatos extraídos de múltiplos chunks/documentos numa única "verdade" da análise (fact_bank).

Você recebe um BATCH de fatos extraídos. Esse batch é apenas uma fração de TODOS os fatos da análise. Foque em deduplicar e consolidar dentro deste batch.

## Regras

1. **Deduplique** fatos com mesmo (fact_type, key) e valor idêntico/equivalente → 1 entrada com sources[] juntando todas as fontes.
2. **Padronize unidades**: "R$ 2,3 mi" e "2.300.000 BRL" são o mesmo valor — escolha forma canônica (número absoluto em BRL).
3. **Conflitos** (mesmo key, valores divergentes): emita entry com status="conflict" e \`conflicting_values\` listando as variantes.
4. **Confidence consolidado**: max das originais quando concordam; min quando conflito.
5. **Preserve TODAS as fontes** em \`sources\`: { doc_id, doc_name, page, quote }.

## Output schema (JSON puro, sem markdown, sem prosa)

{
  "facts": [
    {
      "fact_type": "numero_financeiro",
      "key": "ebitda_2024",
      "value": { "amount": 2300000, "unit": "BRL", "periodo": "2024" },
      "status": "consolidated",
      "confidence": 0.92,
      "sources": [
        { "doc_id": "uuid", "doc_name": "Balanço 2024.pdf", "page": 3, "quote": "EBITDA = R$ 2.300.000" }
      ]
    }
  ],
  "stats": {
    "total_facts_in":   <int>,
    "total_facts_out":  <int>,
    "conflicts":        <int>,
    "duplicates_merged": <int>
  }
}

Nada além do JSON. Sem \`\`\`json\`\`\`.

${PROMPT_INJECTION_GUARD}`

const BATCH_SIZE      = 40       // 40 facts por chamada Sonnet
const MAX_TOKENS_PER_BATCH = 8000 // safe vs limite de 8192 do Sonnet 4.6 standard

export async function consolidateFactBank({ analiseId, step, logger }: ConsolidateParams) {
  const admin = createAdminClient()

  // 1) Carrega fatos
  const facts = await step.run('load-facts', async () => {
    const { data, error } = await admin
      .from('document_facts')
      .select(`
        fact_type,
        fact_key,
        fact_value,
        source_quote,
        source_page,
        confidence,
        document_id,
        analise_documents!inner(file_name)
      `)
      .eq('analise_id', analiseId)
      .returns<Array<RawFact & { analise_documents: { file_name: string } }>>()
    if (error) throw new Error(`load-facts: ${error.message}`)

    return (data ?? []).map(f => ({
      fact_type:     f.fact_type,
      fact_key:      f.fact_key,
      fact_value:    f.fact_value,
      source_quote:  f.source_quote,
      source_page:   f.source_page,
      confidence:    f.confidence,
      document_id:   f.document_id,
      document_name: f.analise_documents?.file_name ?? 'desconhecido',
    })) as RawFact[]
  }) as RawFact[]

  logger.info('Loaded facts', { analiseId, count: facts.length })

  if (facts.length === 0) {
    return await persistFactBank(admin, analiseId, step, logger, {
      facts: [],
      stats: { total_facts_in: 0, total_facts_out: 0, conflicts: 0, duplicates_merged: 0 },
      consolidation_model: 'no-facts',
    })
  }

  // 2) Agrupa por fact_type — duplicatas reais ficam no mesmo grupo
  const byType: Record<string, RawFact[]> = {}
  for (const f of facts) {
    (byType[f.fact_type] ??= []).push(f)
  }

  // 3) Pra cada tipo, processa em batches de BATCH_SIZE.
  //    Cada batch é um step.run separado — output do step é só o array de facts
  //    consolidados desse batch (pequeno: ~40 facts × ~400 chars = ~16KB).
  const allFacts: ConsolidatedFact[] = []
  let totalConflicts = 0
  let totalDuplicatesMerged = 0

  for (const [factType, list] of Object.entries(byType)) {
    const batches = chunkArray(list, BATCH_SIZE)
    for (let bi = 0; bi < batches.length; bi++) {
      const batch = batches[bi]
      const batchKey = `${factType}-${bi}`

      const result = await step.run(`consolidate-batch-${batchKey}`, async () => {
        const factsForPrompt = batch.map(f => ({
          type:     f.fact_type,
          key:      f.fact_key,
          value:    safeParseJson(f.fact_value),
          doc_id:   f.document_id,
          doc_name: f.document_name,
          page:     f.source_page,
          quote:    f.source_quote,
          conf:     f.confidence,
        }))

        const userPrompt = `## Batch (apenas fatos do tipo "${factType}", parte ${bi + 1} de ${batches.length})\n\n${JSON.stringify(factsForPrompt, null, 2)}\n\n## Sua tarefa\nProduza o fact_bank parcial deste batch. JSON puro.`

        // System prompt é idêntico em todos os batches → cache TTL 1h.
        // Primeira chamada paga write (1.25x input), demais leem a 0.1x.
        const { text } = await callLLM({
          task:        'consolidate_fact_bank',
          context:     'ingestion',
          analiseId,
          system: [
            { type: 'text', text: CONSOLIDATOR_SYSTEM, cache_control: { type: 'ephemeral', ttl: '1h' } },
          ],
          messages:    [{ role: 'user', content: userPrompt }],
          maxTokens:   MAX_TOKENS_PER_BATCH,
          temperature: 0,
          meta:        { fact_type: factType, batch: bi },
        })
        if (!text) {
          return {
            facts: [] as ConsolidatedFact[],
            stats: { total_facts_in: batch.length, total_facts_out: 0, conflicts: 0, duplicates_merged: 0 },
            parse_error: true,
          }
        }
        return parseJsonOrEmpty(text)
      }) as { facts?: ConsolidatedFact[]; stats?: { conflicts?: number; duplicates_merged?: number }; parse_error?: boolean }

      if (Array.isArray(result.facts)) allFacts.push(...result.facts)
      totalConflicts        += result.stats?.conflicts ?? 0
      totalDuplicatesMerged += result.stats?.duplicates_merged ?? 0
    }
  }

  // 3.5) Indicadores financeiros + gatilhos de risco calculados por fórmula
  // (determinístico, conf 1.0, auditável). Entram no fact_bank para os agentes
  // receberem DSCR/alavancagem/margens e os riscos quantitativos prontos — sem
  // recalcular (menos tokens, zero erro aritmético). A sentinela INTERPRETA a
  // combinação dos gatilhos; o cálculo é do código (#8). Só dispara com insumo.
  const metricas = computeFinancials(allFacts)
  const indicadores = metricsToConsolidatedFacts(metricas)
  const riscos = triggersToFacts(evaluateRisk(metricas))
  if (indicadores.length) allFacts.push(...indicadores)
  if (riscos.length)      allFacts.push(...riscos)

  // 4) Persiste
  return await persistFactBank(admin, analiseId, step, logger, {
    facts: allFacts,
    stats: {
      total_facts_in:    facts.length,
      total_facts_out:   allFacts.length,
      conflicts:         totalConflicts,
      duplicates_merged: totalDuplicatesMerged,
    },
    consolidation_model: routeFor('consolidate_fact_bank').model,
  })
}

async function persistFactBank(
  admin:     ReturnType<typeof createAdminClient>,
  analiseId: string,
  step:      Step,
  logger:    Logger,
  factBank:  Record<string, unknown>,
) {
  await step.run('save-fact-bank', async () => {
    const now = new Date().toISOString()
    await admin
      .from('analises')
      .update({
        fact_bank:                 factBank,
        fact_bank_consolidated_at: now,
        fact_bank_model_id:        factBank.consolidation_model ?? null,
        documents_ingested_at:     now,
      })
      .eq('id', analiseId)
  })

  // Notifica o usuário por email — best effort, não falha o job se Resend falhar.
  // Retorna info estruturada pra debug via Inngest UI.
  await step.run('notify-user', async () => {
    const { data: analise } = await admin
      .from('analises')
      .select('user_id, nome_ativo, documents_total')
      .eq('id', analiseId)
      .single()
    if (!analise) return { status: 'skipped', reason: 'analise_not_found' }

    const { data: userInfo, error: userErr } = await admin.auth.admin.getUserById(analise.user_id)
    if (userErr) return { status: 'failed', reason: 'auth_admin_error', error: userErr.message }
    const email = userInfo?.user?.email
    if (!email) return { status: 'skipped', reason: 'user_email_empty', user_id: analise.user_id }

    const factsArr = Array.isArray((factBank as { facts?: unknown }).facts)
      ? (factBank as { facts: unknown[] }).facts
      : []

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.mandor.com.br'

    try {
      await sendIngestionCompleteEmail({
        to:         email,
        nomeAtivo:  analise.nome_ativo ?? 'Análise',
        analiseId,
        totalDocs:  analise.documents_total ?? 0,
        totalFacts: factsArr.length,
        baseUrl,
      })
      return { status: 'sent', to: email, facts: factsArr.length, from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev' }
    } catch (e) {
      const err = e as Error
      console.error('[consolidate-fact-bank] resend failed:', err)
      return { status: 'failed', reason: 'resend_error', error: err.message, to: email, from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev' }
    }
  })

  // Dispara categorização de chunks em background (paralelo ao pipeline)
  // Isso garante que quando agentes consultarem chunks, já têm categoria indexada.
  // Best-effort: se falhar, agentes funcionam normalmente (fallback a não categorizados).
  await step.run('kickoff-chunk-categorization', async () => {
    try {
      const { inngest } = await import('@/lib/inngest')
      await inngest.send({
        name: 'analise/chunks.categorize_requested',
        data: { analiseId },
      })
      return { queued: true, analiseId }
    } catch (err) {
      logger?.warn('Falha ao disparar categorização de chunks', { analiseId, err })
      return { queued: false, error: err instanceof Error ? err.message : 'unknown' }
    }
  })

  // Dispara extração de Knowledge Graph (entidades + relacionamentos)
  // Roda após categorização (dependência implícita: KG precisa de chunks categorizados)
  // Best-effort: falha não bloqueia o pipeline.
  await step.run('kickoff-kg-extraction', async () => {
    try {
      const { inngest } = await import('@/lib/inngest')
      await inngest.send({
        name: 'analise/kg.extract_requested',
        data: { analiseId },
      })
      return { queued: true, analiseId }
    } catch (err) {
      logger?.warn('Falha ao disparar extração KG', { analiseId, err })
      return { queued: false, error: err instanceof Error ? err.message : 'unknown' }
    }
  })

  // Gate de documentos críticos: em vez de disparar o pipeline direto, reavalia
  // se há documento com falha não resolvido. Se houver, SEGURA a análise
  // (triagem pendente); senão, libera e dispara o pipeline. Ver lib/triagem/gate.
  await step.run('kickoff-analysis-pipeline', async () => {
    const gate = await evaluateTriagemGate(analiseId)
    return { ...gate, analiseId }
  })

  return { ok: true, fact_bank: factBank }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function safeParseJson(s: string): unknown {
  try { return JSON.parse(s) } catch { return s }
}

function parseJsonOrEmpty(text: string): Record<string, unknown> {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  const candidate = fenced ? fenced[1] : trimmed
  const first = candidate.indexOf('{')
  const last  = candidate.lastIndexOf('}')
  const slice = first !== -1 && last > first ? candidate.slice(first, last + 1) : candidate
  try {
    return JSON.parse(slice) as Record<string, unknown>
  } catch {
    return {
      facts: [],
      stats: { total_facts_in: 0, total_facts_out: 0, conflicts: 0, duplicates_merged: 0 },
      parse_error: true,
    }
  }
}
