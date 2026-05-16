import { createAdminClient } from '@/lib/supabase-server'

// Benchmark Registry (Fase 7) — fonte centralizada e versionada de regras
// de mercado. Substitui hardcode + alucinação por base auditável.

export interface Benchmark {
  id:            string
  instrument:    string
  parameter:     string
  value_min:     number
  value_max:     number
  unit:          string       // 'BRL' | 'pct' | 'multiplo' | 'meses' | 'qtd' | 'pct_cdi'
  descricao:     string | null
  notes:         string | null
  source:        string | null
  valid_from:    string
  valid_to:      string | null
  ativo:         boolean
  criado_em:     string
  atualizado_em: string
}

export interface BenchmarkLookup {
  instrument: string
  parameter?: string
}

// Lista benchmarks ativos filtrando opcionalmente por instrument/parameter.
// Service role bypassa RLS — ok pois é usado server-side a partir de rotas
// já protegidas por autenticação.
export async function listBenchmarks(lookup?: BenchmarkLookup): Promise<Benchmark[]> {
  const admin = createAdminClient()
  let q = admin
    .from('market_benchmarks')
    .select('*')
    .eq('ativo', true)
    .order('instrument', { ascending: true })
    .order('parameter',  { ascending: true })

  if (lookup?.instrument) q = q.eq('instrument', lookup.instrument)
  if (lookup?.parameter)  q = q.eq('parameter',  lookup.parameter)

  const { data, error } = await q
  if (error) {
    console.error('[benchmarks] listBenchmarks failed:', error)
    return []
  }
  return (data ?? []) as Benchmark[]
}

// Formata benchmarks como bloco markdown injetável em prompts de agentes.
// Os agentes consultam isto antes de recomendar produtos financeiros.
export function formatBenchmarksForPrompt(benchmarks: Benchmark[]): string {
  if (benchmarks.length === 0) return ''

  const byInstrument = new Map<string, Benchmark[]>()
  for (const b of benchmarks) {
    const arr = byInstrument.get(b.instrument) ?? []
    arr.push(b)
    byInstrument.set(b.instrument, arr)
  }

  const sections: string[] = []
  for (const [instrument, list] of byInstrument) {
    const lines = list.map(b => {
      const range = b.value_min === b.value_max
        ? formatValue(b.value_min, b.unit)
        : `${formatValue(b.value_min, b.unit)} a ${formatValue(b.value_max, b.unit)}`
      const desc = b.descricao ? ` — ${b.descricao}` : ''
      const src  = b.source ? ` (fonte: ${b.source})` : ''
      return `  - **${b.parameter}**: ${range}${desc}${src}`
    }).join('\n')
    sections.push(`### ${instrument}\n${lines}`)
  }

  return `# 📊 BENCHMARKS DE MERCADO (parâmetros vigentes)

Antes de recomendar qualquer produto financeiro ou validar uma estrutura,
CONSULTE estes parâmetros. Se uma recomendação violar um benchmark crítico
(ticket abaixo do mínimo, prazo fora do range, múltiplo fora do intervalo
de mercado), declare explicitamente o conflito e justifique tecnicamente
— ou recomende um produto alternativo compatível.

${sections.join('\n\n')}

---

REGRAS:
1. Recomendar FIDC para ticket < ticket_minimo → declarar inviabilidade ou justificar.
2. Citar múltiplo EBITDA fora do range do segmento → flag de alerta.
3. Sempre cite o benchmark usado (formato: \`[B:INSTRUMENT:parameter]\`).
`
}

function formatValue(v: number, unit: string): string {
  switch (unit) {
    case 'BRL':
      return v >= 1_000_000
        ? `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`
        : `R$ ${v.toLocaleString('pt-BR')}`
    case 'pct':      return `${v}%`
    case 'pct_cdi':  return `CDI + ${v}%`
    case 'multiplo': return `${v}x`
    case 'meses':    return `${v}m`
    case 'qtd':      return `${v}`
    default:         return String(v)
  }
}

// Verificação de elegibilidade — uso em código para hard-block de
// recomendações impossíveis. Função pode ser chamada por endpoints
// ou por código de validação no /step.
export interface EligibilityInput {
  instrument:           string
  ticket?:              number   // BRL
  prazo_meses?:         number
  patrimonio_cedente?:  number   // BRL
  num_devedores?:       number
  multiplo_ebitda?:     number
}

export interface EligibilityViolation {
  parameter:     string
  expected:      string   // range esperado, formatado
  actual:        string   // valor real, formatado
  benchmark_id:  string
  severidade:    'bloqueante' | 'alerta'
}

export interface EligibilityResult {
  eligible:    boolean
  violations:  EligibilityViolation[]
  benchmarks_consultados: string[]   // IDs
}

export async function isEligible(input: EligibilityInput): Promise<EligibilityResult> {
  const benchmarks = await listBenchmarks({ instrument: input.instrument })
  const violations: EligibilityViolation[] = []
  const consulted: string[] = []

  function check(param: string, actual: number | undefined, severidade: 'bloqueante' | 'alerta' = 'bloqueante') {
    if (actual === undefined) return
    const b = benchmarks.find(x => x.parameter === param)
    if (!b) return
    consulted.push(b.id)
    if (actual < b.value_min || actual > b.value_max) {
      violations.push({
        parameter:    param,
        expected:     `${formatValue(b.value_min, b.unit)} a ${formatValue(b.value_max, b.unit)}`,
        actual:       formatValue(actual, b.unit),
        benchmark_id: b.id,
        severidade,
      })
    }
  }

  check('ticket_minimo',             input.ticket,             'bloqueante')
  check('patrimonio_minimo_cedente', input.patrimonio_cedente, 'alerta')
  check('prazo_tipico_meses',        input.prazo_meses,        'alerta')
  check('prazo_minimo_meses',        input.prazo_meses,        'bloqueante')
  check('prazo_maximo_meses',        input.prazo_meses,        'alerta')
  check('num_devedores_minimo',      input.num_devedores,      'alerta')
  check('multiplo_ebitda_min',       input.multiplo_ebitda,    'alerta')
  check('multiplo_ebitda_max',       input.multiplo_ebitda,    'alerta')

  const bloqueantes = violations.filter(v => v.severidade === 'bloqueante')
  return {
    eligible: bloqueantes.length === 0,
    violations,
    benchmarks_consultados: consulted,
  }
}
