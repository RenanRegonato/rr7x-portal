import { createAdminClient } from '@/lib/supabase-server'

// Agent Claims (Fase 8) — parsing, persistência e leitura de afirmações
// estruturadas emitidas pelos agentes.
//
// Cada agente analítico emite, ao final do output, um bloco invisível:
//
//   <!--CLAIMS-START-->{"claims":[...]}<!--CLAIMS-END-->
//
// O bloco é parseado server-side, persistido em agent_claims, e REMOVIDO
// do texto que vai para outputs[step] (que vai pra UI/PDF/etc).

export type ClaimType = 'numero' | 'fato' | 'recomendacao' | 'risco' | 'avaliacao'

export interface Claim {
  id?:            string
  analise_id?:    string
  step_key?:      string
  claim_type:     ClaimType
  assertion:      string
  fact_ids:       string[]
  benchmark_ids:  string[]
  source_quote:   string | null
  confidence:    number
  metadata?:      Record<string, unknown> | null
  run_at?:        string
}

const CLAIMS_REGEX = /<!--CLAIMS-START-->([\s\S]*?)<!--CLAIMS-END-->/

// Bloco de instrução para injetar no system prompt dos agentes analíticos.
// Diz a eles QUE devem emitir claims ao final.
export const CLAIMS_DIRECTIVE = `# OUTPUT ESTRUTURADO — CLAIMS

Além da narrativa em markdown que produz para o usuário final, ao FINAL da sua resposta você DEVE emitir um bloco INVISÍVEL com as afirmações críticas estruturadas. Este bloco é parseado pelo sistema para auditoria e detecção de contradições — NÃO é exibido ao usuário.

Formato EXATO (sem cercas de código, copie a estrutura literal):

<!--CLAIMS-START-->
{"claims":[
  {
    "type": "numero" | "fato" | "recomendacao" | "risco" | "avaliacao",
    "assertion": "1 frase descrevendo a afirmação crítica",
    "fact_ids": ["F:tipo:chave"],
    "benchmark_ids": ["B:INSTRUMENT:parameter"],
    "confidence": 0.85,
    "source_quote": "trecho literal opcional"
  }
]}
<!--CLAIMS-END-->

REGRAS:
- Inclua APENAS afirmações críticas (~3 a 12 claims por output). Não toda frase.
- type:
  - "numero": fato numérico (receita, EBITDA, ticket, prazo, múltiplo)
  - "fato": afirmação de estado (documento disponível, sócio identificado)
  - "recomendacao": ação proposta (recomendar FIDC, sugerir LOI)
  - "risco": risco identificado
  - "avaliacao": julgamento qualitativo (DRS, viabilidade, prioridade)
- Para cada número, cite o fact_id se vier do truth layer (formato \`F:tipo:chave\`)
- Para cada recomendação, cite o benchmark_id se aplicável (formato \`B:INSTRUMENT:parameter\`)
- confidence 0–1: refletindo quão certo você está com base nas fontes
- O bloco DEVE ser JSON válido (aspas duplas, sem trailing commas)
- Se não houver claim crítica neste output, emita: <!--CLAIMS-START-->{"claims":[]}<!--CLAIMS-END-->

O bloco vai ENTRE marcadores HTML comment para que o markdown não o renderize visualmente.`

interface ParseResult {
  claims:      Claim[]
  cleanedText: string   // texto sem o bloco CLAIMS
}

// Extrai e remove o bloco CLAIMS do texto. Retorna lista de claims parseadas
// e o texto limpo. Robusto: se o bloco não existir ou estiver malformado,
// retorna claims vazias e o texto original.
export function parseClaims(text: string): ParseResult {
  const match = text.match(CLAIMS_REGEX)
  if (!match) {
    return { claims: [], cleanedText: text }
  }

  const rawBlock   = match[0]
  const rawJson    = match[1].trim()
  const cleanedText = text.replace(rawBlock, '').trim()

  // Tenta extrair JSON. Se vier com cercas (```json) ou texto extra, tenta achar { ... }
  let jsonStr = rawJson
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
  if (jsonMatch) jsonStr = jsonMatch[0]

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    console.error('[claims] JSON malformado:', jsonStr.slice(0, 200))
    return { claims: [], cleanedText }
  }

  const obj = parsed as { claims?: unknown }
  if (!Array.isArray(obj.claims)) {
    return { claims: [], cleanedText }
  }

  const VALID_TYPES: ClaimType[] = ['numero', 'fato', 'recomendacao', 'risco', 'avaliacao']
  const claims: Claim[] = []

  for (const item of obj.claims) {
    if (!item || typeof item !== 'object') continue
    const it = item as Partial<{
      type: string
      assertion: string
      fact_ids: unknown
      benchmark_ids: unknown
      source_quote: string
      confidence: number
    }>
    if (typeof it.type !== 'string' || !VALID_TYPES.includes(it.type as ClaimType)) continue
    if (typeof it.assertion !== 'string' || it.assertion.length === 0) continue
    if (typeof it.confidence !== 'number' || it.confidence < 0 || it.confidence > 1) continue

    claims.push({
      claim_type:    it.type as ClaimType,
      assertion:     it.assertion.trim(),
      fact_ids:      Array.isArray(it.fact_ids)      ? it.fact_ids.filter((x): x is string => typeof x === 'string')      : [],
      benchmark_ids: Array.isArray(it.benchmark_ids) ? it.benchmark_ids.filter((x): x is string => typeof x === 'string') : [],
      source_quote:  typeof it.source_quote === 'string' ? it.source_quote : null,
      confidence:    it.confidence,
    })
  }

  return { claims, cleanedText }
}

// Persiste claims para um (analise, step). Apaga as anteriores deste step
// antes de inserir as novas (a regeneração ou cascade re-roda steps).
export async function persistClaims(
  analiseId: string,
  stepKey:   string,
  claims:    Claim[],
): Promise<void> {
  const admin = createAdminClient()

  await admin
    .from('agent_claims')
    .delete()
    .eq('analise_id', analiseId)
    .eq('step_key',   stepKey)

  if (claims.length === 0) return

  const rows = claims.map(c => ({
    analise_id:    analiseId,
    step_key:      stepKey,
    claim_type:    c.claim_type,
    assertion:     c.assertion,
    fact_ids:      c.fact_ids,
    benchmark_ids: c.benchmark_ids,
    source_quote:  c.source_quote,
    confidence:    Math.max(0, Math.min(1, c.confidence)),
    metadata:      c.metadata ?? null,
  }))

  const { error } = await admin.from('agent_claims').insert(rows)
  if (error) console.error('[claims] failed to insert:', error)
}

export async function getClaims(analiseId: string, stepKey?: string): Promise<Claim[]> {
  const admin = createAdminClient()
  let q = admin
    .from('agent_claims')
    .select('*')
    .eq('analise_id', analiseId)
    .order('step_key', { ascending: true })
    .order('claim_type', { ascending: true })

  if (stepKey) q = q.eq('step_key', stepKey)

  const { data, error } = await q
  if (error) {
    console.error('[claims] getClaims failed:', error)
    return []
  }
  return (data ?? []) as Claim[]
}
