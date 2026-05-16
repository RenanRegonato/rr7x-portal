import { createAdminClient } from '@/lib/supabase-server'
import { getFacts, type Fact } from '@/lib/truth-layer'
import { getClaims, type Claim } from '@/lib/claims'
import { listBenchmarks, type Benchmark } from '@/lib/benchmarks'

// Consistency Engine (Fase 9) — checagens determinísticas pós-pipeline.
// Não usa IA. Executa regras concretas:
//   1. Claims numéricos batem com truth_layer?
//   2. Dois agentes citando mesmo fact_id têm assertions concordantes?
//   3. Recomendações violam benchmark_ids citados?
//   4. Claims citam fact_ids que são lacunas?
//   5. Recomendações sem nenhum fact_id nem benchmark_id citado?

export type Severidade = 'bloqueante' | 'alerta' | 'info'

export type IssueType =
  | 'numero_divergente'
  | 'numero_inter_agente'
  | 'benchmark_violado'
  | 'fato_contradito'
  | 'lacuna_critica'
  | 'recomendacao_sem_fonte'

export interface Issue {
  severidade:        Severidade
  tipo:              IssueType
  resumo:            string
  detalhes?:         Record<string, unknown>
  steps_envolvidos:  string[]
  fact_ids:          string[]
  benchmark_ids:     string[]
  claim_ids:         string[]
}

// Extrai número de uma assertion (heurística). Procura padrões R$, números
// com pontuação BR, etc. Retorna lista de números encontrados (até 3).
function extractNumbers(text: string): number[] {
  const numbers: number[] = []
  // R$ 1.234.567,89 ou R$ 1.234.567 ou 1.234.567,89 ou 12.345.678
  const re = /R?\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]+)?|[0-9]+(?:[.,][0-9]+)?)\b/g
  let m
  while ((m = re.exec(text)) !== null && numbers.length < 5) {
    const raw = m[1].replace(/\./g, '').replace(',', '.')
    const n = parseFloat(raw)
    if (Number.isFinite(n) && n > 0) numbers.push(n)
  }
  return numbers
}

// Tolerância: claim numérico pode diferir do truth_layer em até 1% sem ser
// flag de divergência (ex: arredondamentos).
const NUMERIC_TOLERANCE = 0.01

function numbersMatch(a: number, b: number, tolerance = NUMERIC_TOLERANCE): boolean {
  if (a === 0 || b === 0) return Math.abs(a - b) < 1
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b)) <= tolerance
}

// Procura fato pelo formato 'F:tipo:chave' nos fatos da análise
function findFact(facts: Fact[], factRef: string): Fact | undefined {
  const m = factRef.match(/^F:([^:]+):(.+)$/)
  if (!m) return undefined
  return facts.find(f => f.fact_type === m[1] && f.key === m[2])
}

// Procura benchmark pelo formato 'B:INSTRUMENT:parameter'
function findBenchmark(benchmarks: Benchmark[], ref: string): Benchmark | undefined {
  const m = ref.match(/^B:([^:]+):(.+)$/)
  if (!m) return undefined
  return benchmarks.find(b => b.instrument === m[1] && b.parameter === m[2])
}

// Check 1 + 4 + 5: por claim, verifica
//   - se cita fact_id, o número na assertion bate com o valor do fato
//   - se cita fact_id de uma lacuna, é alerta crítico
//   - se é recomendação sem nenhuma fonte citada, alerta
function checkClaimsAgainstFacts(claims: Claim[], facts: Fact[]): Issue[] {
  const issues: Issue[] = []

  for (const claim of claims) {
    // Check 5: recomendação sem fonte
    if (claim.claim_type === 'recomendacao' && claim.fact_ids.length === 0 && claim.benchmark_ids.length === 0) {
      issues.push({
        severidade: 'alerta',
        tipo:       'recomendacao_sem_fonte',
        resumo:     `${claim.step_key} fez recomendação sem citar fonte: "${claim.assertion.slice(0, 80)}"`,
        steps_envolvidos: [claim.step_key ?? ''],
        fact_ids:    [],
        benchmark_ids: [],
        claim_ids:   claim.id ? [claim.id] : [],
      })
    }

    for (const factRef of claim.fact_ids) {
      const fact = findFact(facts, factRef)
      if (!fact) continue

      // Check 4: claim depende de uma lacuna
      if (fact.fact_type === 'lacuna') {
        issues.push({
          severidade: 'bloqueante',
          tipo:       'lacuna_critica',
          resumo:     `${claim.step_key} cita lacuna ${factRef} como base. Conclusão pode ser infundada.`,
          detalhes:   { lacuna_descricao: fact.value, claim: claim.assertion },
          steps_envolvidos: [claim.step_key ?? ''],
          fact_ids:    [factRef],
          benchmark_ids: [],
          claim_ids:   claim.id ? [claim.id] : [],
        })
        continue
      }

      // Check 1: número na assertion bate com o valor do fato?
      if (claim.claim_type === 'numero' && fact.fact_type === 'numero_financeiro') {
        const factValue = (fact.value as { amount?: number }).amount
        if (typeof factValue !== 'number') continue

        const claimNumbers = extractNumbers(claim.assertion)
        if (claimNumbers.length === 0) continue

        // Se NENHUM número na assertion bate com o fato, é divergente
        const hasMatch = claimNumbers.some(n => numbersMatch(n, factValue))
        if (!hasMatch) {
          issues.push({
            severidade: 'bloqueante',
            tipo:       'numero_divergente',
            resumo:     `${claim.step_key} cita ${factRef} mas o número na afirmação (${claimNumbers.map(n => n.toLocaleString('pt-BR')).join(', ')}) não bate com truth_layer (${factValue.toLocaleString('pt-BR')})`,
            detalhes:   { fact_value: factValue, claim_numbers: claimNumbers, claim_assertion: claim.assertion },
            steps_envolvidos: [claim.step_key ?? ''],
            fact_ids:    [factRef],
            benchmark_ids: [],
            claim_ids:   claim.id ? [claim.id] : [],
          })
        }
      }
    }
  }

  return issues
}

// Check 2: dois agentes citam mesmo fact_id mas com valores numéricos diferentes
function checkInterAgentNumbers(claims: Claim[]): Issue[] {
  const issues: Issue[] = []
  // Agrupa por fact_id
  const byFact = new Map<string, { claim: Claim; numbers: number[] }[]>()

  for (const claim of claims) {
    if (claim.claim_type !== 'numero') continue
    const numbers = extractNumbers(claim.assertion)
    if (numbers.length === 0) continue
    for (const factRef of claim.fact_ids) {
      const arr = byFact.get(factRef) ?? []
      arr.push({ claim, numbers })
      byFact.set(factRef, arr)
    }
  }

  for (const [factRef, entries] of byFact) {
    if (entries.length < 2) continue

    // Pega o "número primário" de cada (o primeiro, heurística)
    const primarios = entries.map(e => e.numbers[0])
    const allMatch = primarios.every(n => numbersMatch(n, primarios[0]))
    if (allMatch) continue

    const stepsList = entries.map(e => e.claim.step_key).filter((s): s is string => !!s)
    issues.push({
      severidade: 'bloqueante',
      tipo:       'numero_inter_agente',
      resumo:     `Discrepância numérica em ${factRef} entre agentes: ${stepsList.join(' vs ')} — valores ${primarios.map(n => n.toLocaleString('pt-BR')).join(' / ')}`,
      detalhes:   { entries: entries.map(e => ({ step: e.claim.step_key, valor: e.numbers[0], assertion: e.claim.assertion })) },
      steps_envolvidos: Array.from(new Set(stepsList)),
      fact_ids:    [factRef],
      benchmark_ids: [],
      claim_ids:   entries.map(e => e.claim.id).filter((x): x is string => !!x),
    })
  }

  return issues
}

// Check 3: claim recomendação cita benchmark mas viola o range
function checkBenchmarkCompliance(claims: Claim[], benchmarks: Benchmark[]): Issue[] {
  const issues: Issue[] = []

  for (const claim of claims) {
    if (claim.claim_type !== 'recomendacao') continue

    for (const bRef of claim.benchmark_ids) {
      const benchmark = findBenchmark(benchmarks, bRef)
      if (!benchmark) continue

      const numbers = extractNumbers(claim.assertion)
      if (numbers.length === 0) continue

      // Se NENHUM número da assertion cabe no range do benchmark, é violação
      const fits = numbers.some(n => n >= benchmark.value_min && n <= benchmark.value_max)
      if (!fits) {
        issues.push({
          severidade: 'bloqueante',
          tipo:       'benchmark_violado',
          resumo:     `${claim.step_key} recomenda algo que viola ${bRef}: range esperado ${benchmark.value_min}–${benchmark.value_max} ${benchmark.unit}, valor citado ${numbers[0]}`,
          detalhes:   {
            benchmark_id:    benchmark.id,
            range:           [benchmark.value_min, benchmark.value_max],
            unit:            benchmark.unit,
            claim_numbers:   numbers,
            claim_assertion: claim.assertion,
          },
          steps_envolvidos: [claim.step_key ?? ''],
          fact_ids:    [],
          benchmark_ids: [bRef],
          claim_ids:   claim.id ? [claim.id] : [],
        })
      }
    }
  }

  return issues
}

export interface ConsistencyResult {
  issues:        Issue[]
  total:         number
  por_severidade: Record<Severidade, number>
  checked_at:    string
}

export async function runConsistencyCheck(analiseId: string): Promise<ConsistencyResult> {
  const admin = createAdminClient()

  const [facts, claims, benchmarks] = await Promise.all([
    getFacts(analiseId),
    getClaims(analiseId),
    listBenchmarks(),
  ])

  const issues: Issue[] = [
    ...checkClaimsAgainstFacts(claims, facts),
    ...checkInterAgentNumbers(claims),
    ...checkBenchmarkCompliance(claims, benchmarks),
  ]

  // Persiste: delete antigos + insert novos
  await admin.from('consistency_issues').delete().eq('analise_id', analiseId).eq('resolvido', false)

  if (issues.length > 0) {
    await admin.from('consistency_issues').insert(
      issues.map(i => ({
        analise_id:        analiseId,
        severidade:        i.severidade,
        tipo:              i.tipo,
        resumo:            i.resumo,
        detalhes:          i.detalhes ?? null,
        steps_envolvidos:  i.steps_envolvidos,
        fact_ids:          i.fact_ids,
        benchmark_ids:     i.benchmark_ids,
        claim_ids:         i.claim_ids,
      }))
    )
  }

  const checked_at = new Date().toISOString()
  await admin.from('analises').update({ consistency_checked_at: checked_at }).eq('id', analiseId)

  const por_severidade: Record<Severidade, number> = { bloqueante: 0, alerta: 0, info: 0 }
  for (const i of issues) por_severidade[i.severidade]++

  return {
    issues,
    total: issues.length,
    por_severidade,
    checked_at,
  }
}
