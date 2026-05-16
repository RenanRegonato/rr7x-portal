import { createAdminClient } from '@/lib/supabase-server'

// Camada de Memória Factual Consolidada (Truth Layer).
// Fase 6 da reformulação multiagente.
//
// Os agentes downstream NÃO podem afirmar disponibilidade/ausência documental
// ou citar números financeiros sem antes consultar esta camada.

export type FactType =
  | 'documento_disponivel'
  | 'numero_financeiro'
  | 'estrutura_societaria'
  | 'contrato'
  | 'garantia'
  | 'passivo'
  | 'evento_relevante'
  | 'lacuna'

export interface Fact {
  id:            string
  analise_id:    string
  fact_type:     FactType
  key:           string
  value:         Record<string, unknown> | unknown[]
  source_doc:    string | null
  source_page:   number | null
  source_quote:  string | null
  asserted_by:   string
  confidence:    number
  notes:         string | null
  criado_em:     string
}

export async function getFacts(analiseId: string, fact_type?: FactType): Promise<Fact[]> {
  const admin = createAdminClient()
  let q = admin
    .from('analise_facts')
    .select('*')
    .eq('analise_id', analiseId)
    .order('fact_type', { ascending: true })
    .order('key',       { ascending: true })

  if (fact_type) q = q.eq('fact_type', fact_type)

  const { data, error } = await q
  if (error) {
    console.error('[truth-layer] getFacts failed:', error)
    return []
  }
  return (data ?? []) as Fact[]
}

interface UpsertFactInput {
  analise_id:   string
  fact_type:    FactType
  key:          string
  value:        Record<string, unknown> | unknown[]
  source_doc?:  string | null
  source_page?: number | null
  source_quote?: string | null
  asserted_by:  string
  confidence:   number
  notes?:       string | null
}

export async function upsertFact(input: UpsertFactInput): Promise<void> {
  const admin = createAdminClient()
  await admin.from('analise_facts').upsert({
    analise_id:   input.analise_id,
    fact_type:    input.fact_type,
    key:          input.key,
    value:        input.value,
    source_doc:   input.source_doc   ?? null,
    source_page:  input.source_page  ?? null,
    source_quote: input.source_quote ?? null,
    asserted_by:  input.asserted_by,
    confidence:   Math.max(0, Math.min(1, input.confidence)),
    notes:        input.notes ?? null,
  }, { onConflict: 'analise_id,fact_type,key' })
}

// Formata os fatos como bloco markdown a ser injetado no system prompt dos agentes.
// Esse bloco deve aparecer ANTES das instruções específicas de cada agente, para que
// ele seja consultado prioritariamente.
export function formatTruthLayer(facts: Fact[]): string {
  if (facts.length === 0) {
    return `# 🔒 CAMADA DE FATOS CONSOLIDADOS (TRUTH LAYER)

(Vazia — a extração de fatos ainda não rodou ou não encontrou dados estruturáveis.
Proceda com cautela: prefira declarar "dado não disponível" a fabricar números.)
`
  }

  const byType = new Map<FactType, Fact[]>()
  for (const f of facts) {
    const arr = byType.get(f.fact_type) ?? []
    arr.push(f)
    byType.set(f.fact_type, arr)
  }

  const sections: string[] = []

  const docs = byType.get('documento_disponivel') ?? []
  if (docs.length > 0) {
    sections.push('## Documentos disponíveis\n' + docs.map(formatDocFact).join('\n'))
  }

  const numeros = byType.get('numero_financeiro') ?? []
  if (numeros.length > 0) {
    sections.push('## Dados financeiros consolidados\n' + numeros.map(formatNumeroFact).join('\n'))
  }

  const societaria = byType.get('estrutura_societaria') ?? []
  if (societaria.length > 0) {
    sections.push('## Estrutura societária\n' + societaria.map(formatGenericFact).join('\n'))
  }

  const contratos = byType.get('contrato') ?? []
  if (contratos.length > 0) {
    sections.push('## Contratos identificados\n' + contratos.map(formatGenericFact).join('\n'))
  }

  const garantias = byType.get('garantia') ?? []
  if (garantias.length > 0) {
    sections.push('## Garantias / colaterais\n' + garantias.map(formatGenericFact).join('\n'))
  }

  const passivos = byType.get('passivo') ?? []
  if (passivos.length > 0) {
    sections.push('## Passivos identificados\n' + passivos.map(formatGenericFact).join('\n'))
  }

  const eventos = byType.get('evento_relevante') ?? []
  if (eventos.length > 0) {
    sections.push('## Eventos relevantes\n' + eventos.map(formatGenericFact).join('\n'))
  }

  const lacunas = byType.get('lacuna') ?? []
  if (lacunas.length > 0) {
    sections.push('## Lacunas detectadas (informação NÃO encontrada)\n' + lacunas.map(formatGenericFact).join('\n'))
  }

  return `# 🔒 CAMADA DE FATOS CONSOLIDADOS (TRUTH LAYER)

Esta camada lista o que foi efetivamente extraído da ingestão documental. Antes de
qualquer afirmação sobre disponibilidade de documentos, números financeiros ou
informações do ativo:

1. CONSULTE esta camada. Se um documento aparecer abaixo como "disponível",
   NÃO declare ausência dele.
2. Se citar um número, use o valor desta camada. Se discordar, justifique citando
   a fonte alternativa.
3. Cite o fact_id quando usar um fato crítico, no formato \`[F:tipo:chave]\`
   (ex: \`[F:numero_financeiro:ebitda_2024]\`).
4. Se a camada estiver vazia para um dado que você precisaria, declare
   explicitamente "dado não consolidado pela ingestão" — NÃO invente.

${sections.join('\n\n')}

---

REGRAS ABSOLUTAS:
- Afirmar "documento X não disponível" quando X consta acima → ERRO_FATO
- Citar número diferente do truth layer sem justificar com nova fonte → ERRO_FATO
- Recomendar ação que depende de documento ausente sem flag → ERRO_FATO
`
}

function formatConfidence(c: number): string {
  if (c >= 0.9) return '✓ confiança alta'
  if (c >= 0.7) return '∼ confiança média'
  return '⚠ confiança baixa'
}

function formatSource(f: Fact): string {
  if (!f.source_doc) return ''
  const page = f.source_page ? `, p${f.source_page}` : ''
  return ` (fonte: ${f.source_doc}${page})`
}

function factId(f: Fact): string {
  return `[F:${f.fact_type}:${f.key}]`
}

function formatDocFact(f: Fact): string {
  const v = f.value as { nome?: string; disponivel?: boolean; status?: string }
  const status = v.disponivel === false ? '✗ AUSENTE' : v.status ?? '✓ disponível'
  return `- ${factId(f)} **${v.nome ?? f.key}** — ${status}${formatSource(f)} (${formatConfidence(f.confidence)})${f.notes ? ` — ${f.notes}` : ''}`
}

function formatNumeroFact(f: Fact): string {
  const v = f.value as { amount?: number; unit?: string; periodo?: string; descricao?: string }
  const amount = typeof v.amount === 'number'
    ? v.amount.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    : '?'
  const unit    = v.unit ?? ''
  const periodo = v.periodo ? ` (${v.periodo})` : ''
  const desc    = v.descricao ?? f.key
  return `- ${factId(f)} **${desc}**${periodo}: ${unit} ${amount}${formatSource(f)} (${formatConfidence(f.confidence)})`
}

function formatGenericFact(f: Fact): string {
  const v = f.value as Record<string, unknown>
  // Tenta mostrar de forma legível: pega keys principais
  const display = JSON.stringify(v, null, 0).slice(0, 250)
  return `- ${factId(f)} **${f.key}**: ${display}${formatSource(f)} (${formatConfidence(f.confidence)})`
}

// Helper para checar especificamente: este documento foi processado?
export async function getDocumentAvailability(analiseId: string): Promise<Record<string, boolean>> {
  const facts = await getFacts(analiseId, 'documento_disponivel')
  const map: Record<string, boolean> = {}
  for (const f of facts) {
    const v = f.value as { nome?: string; disponivel?: boolean }
    if (v.nome) map[v.nome] = v.disponivel !== false
  }
  return map
}
