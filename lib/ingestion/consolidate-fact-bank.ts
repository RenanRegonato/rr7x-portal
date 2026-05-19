import { anthropic, MODEL as SONNET_MODEL } from '@/lib/anthropic'
import { createAdminClient } from '@/lib/supabase-server'
import { sendIngestionCompleteEmail } from '@/lib/email'

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
  fact_value:    string         // JSON-encoded
  source_quote:  string | null
  source_page:   number | null
  confidence:    number
  document_id:   string
  document_name: string
}

const CONSOLIDATOR_SYSTEM = `Você é o Consolidador da Mandor — agrupa fatos extraídos de múltiplos chunks/documentos numa única "verdade" da análise (fact_bank).

Você recebe um array de fatos extraídos, cada um com source_doc + source_page + confidence. Eles vêm de diferentes documentos do mesmo deal. Pode haver:
- Duplicatas literais (mesmo fato em vários chunks).
- Variações do mesmo fato com unidades diferentes ("R$ 2,3 mi" vs "2.300.000").
- Conflitos (um doc diz EBITDA 2024 = 2.3M, outro doc diz 2.5M).

Sua tarefa: produzir o fact_bank consolidado em JSON estruturado.

## Regras de consolidação

1. **Deduplique** fatos idênticos: mesmo fact_type + fact_key + mesmo valor → 1 entrada com source_docs[] juntando todas as fontes.
2. **Resolva variações de unidade**: padronize. "R$ 2,3 mi" e "2.300.000 BRL" são o mesmo fato — escolha a forma canônica (número absoluto em BRL).
3. **Conflitos**: NÃO escolha um "vencedor". Emita entry com \`conflicting_values: [{value, source_doc, source_page}, ...]\` e \`status: "conflict"\`. Os agentes downstream decidem.
4. **Reduza confidence** quando consolidar várias fontes que concordam: nova confidence = max das originais. Em conflito: nova confidence = min das originais.
5. **Preserve TODAS as fontes**: cada fato consolidado mantém um array \`sources[]\` com {doc_id, doc_name, page, quote}.

## Output schema (JSON puro, sem markdown)

{
  "facts": [
    {
      "fact_type": "numero_financeiro" | "estrutura_societaria" | ...,
      "key": "ebitda_2024",
      "value": { /* objeto consolidado */ },
      "status": "consolidated" | "conflict",
      "confidence": 0.0 a 1.0,
      "sources": [
        { "doc_id": "uuid", "doc_name": "Balanço 2024.pdf", "page": 3, "quote": "..." }
      ],
      "conflicting_values": [ /* só quando status="conflict" */
        { "value": {...}, "doc_id": "uuid", "doc_name": "X.pdf", "page": 4 }
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

Nada além do JSON. Sem prosa, sem \`\`\`json\`\`\`.`

export async function consolidateFactBank({ analiseId, step, logger }: ConsolidateParams) {
  const admin = createAdminClient()

  // 1) Carrega TODOS os fatos da análise (com nome do documento)
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

    // Achata o nome do doc pra dentro do fact
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
    return await persistFactBank(admin, analiseId, step, {
      facts: [],
      stats: { total_facts_in: 0, total_facts_out: 0, conflicts: 0, duplicates_merged: 0 },
      consolidation_model: 'no-facts',
    })
  }

  // 2) Chama Sonnet pra consolidar
  const consolidated = await step.run('llm-consolidate', async () => {
    const factsForPrompt = facts.map(f => ({
      type:     f.fact_type,
      key:      f.fact_key,
      value:    safeParseJson(f.fact_value),
      doc_id:   f.document_id,
      doc_name: f.document_name,
      page:     f.source_page,
      quote:    f.source_quote,
      conf:     f.confidence,
    }))

    const userPrompt = `## Fatos extraídos (input)\n\n${JSON.stringify(factsForPrompt, null, 2)}\n\n## Sua tarefa\nProduza o fact_bank consolidado conforme o schema descrito no system prompt. JSON puro.`

    const msg = await anthropic.messages.create({
      model:       SONNET_MODEL,
      max_tokens:  16000,
      temperature: 0,
      system:      CONSOLIDATOR_SYSTEM,
      messages:    [{ role: 'user', content: userPrompt }],
    })

    const block = msg.content.find(b => b.type === 'text')
    if (!block || block.type !== 'text') throw new Error('Sonnet retornou bloco vazio')
    return parseJsonOrEmpty(block.text)
  })

  // 3) Persiste em analises.fact_bank
  return await persistFactBank(admin, analiseId, step, {
    ...consolidated as object,
    consolidation_model: SONNET_MODEL,
    total_facts_in:      facts.length,
  })
}

async function persistFactBank(
  admin:     ReturnType<typeof createAdminClient>,
  analiseId: string,
  step:      Step,
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

  // Notifica o usuário por email — best effort, não falha o job se Resend falhar
  await step.run('notify-user', async () => {
    try {
      const { data: analise } = await admin
        .from('analises')
        .select('user_id, nome_ativo, documents_total')
        .eq('id', analiseId)
        .single()
      if (!analise) return

      const { data: userInfo } = await admin.auth.admin.getUserById(analise.user_id)
      const email = userInfo?.user?.email
      if (!email) return

      const factsArr = Array.isArray((factBank as { facts?: unknown }).facts)
        ? (factBank as { facts: unknown[] }).facts
        : []

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.mandor.com.br'
      await sendIngestionCompleteEmail({
        to:         email,
        nomeAtivo:  analise.nome_ativo ?? 'Análise',
        analiseId,
        totalDocs:  analise.documents_total ?? 0,
        totalFacts: factsArr.length,
        baseUrl,
      })
    } catch (e) {
      console.error('[consolidate-fact-bank] email notification failed:', e)
    }
  })

  return { ok: true, fact_bank: factBank }
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
    return { facts: [], stats: { total_facts_in: 0, total_facts_out: 0, conflicts: 0, duplicates_merged: 0 }, parse_error: true }
  }
}
