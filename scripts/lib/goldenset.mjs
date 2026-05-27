// Golden-set / harness de avaliação (Fase 0.3) — lógica pura de scoring.
//
// Filosofia: REGRESSÃO, não verdade absoluta. Capturamos o output de uma análise
// REAL e VALIDADA como "baseline" (gabarito). Qualquer mudança futura (trocar
// modelo, extração determinística, cross-reading via claims) é pontuada contra o
// gabarito: ela DERRUBOU algum fato? MUDOU algum número? AUMENTOU hallucination?
// PIOROU cobertura? Os limiares abaixo são conservadores porque a regra absoluta
// da Mandor é nunca reduzir qualidade.
//
// Sem dependências — roda com `node`. Funções puras, testáveis.

// Tolerância numérica (1%), igual à do consistency-engine.
const NUM_TOL = 0.01

// Claims que asseveram algo verificável e, portanto, deveriam citar fonte.
const CHECKABLE_CLAIM_TYPES = new Set(['numero', 'recomendacao', 'risco'])

// ── extração de sinais a partir das linhas cruas do banco ────────────────────

export function extractKeyNumbers(facts) {
  const out = []
  for (const f of facts) {
    if (f.fact_type !== 'numero_financeiro') continue
    const v = f.value ?? {}
    const amount = typeof v.amount === 'number' ? v.amount : null
    if (amount === null) continue
    out.push({ key: f.key, amount, unit: v.unit ?? null, periodo: v.periodo ?? null })
  }
  return out
}

export function hallucinationRate(claims) {
  const checkable = claims.filter((c) => CHECKABLE_CLAIM_TYPES.has(c.claim_type))
  if (checkable.length === 0) return 0
  const semFonte = checkable.filter(
    (c) => (c.fact_ids?.length ?? 0) === 0 && (c.benchmark_ids?.length ?? 0) === 0,
  )
  return round(semFonte.length / checkable.length, 4)
}

export function summarizeConsistency(issues) {
  const sev = { bloqueante: 0, alerta: 0, info: 0 }
  const by_tipo = {}
  for (const i of issues) {
    if (i.resolvido) continue
    if (sev[i.severidade] != null) sev[i.severidade]++
    by_tipo[i.tipo] = (by_tipo[i.tipo] ?? 0) + 1
  }
  return { ...sev, by_tipo }
}

export function summarizeCoverage(coverageCheck) {
  if (!coverageCheck || !Array.isArray(coverageCheck.items)) {
    return { coberto: 0, parcial: 0, nao_coberto: 0, nao_aplicavel: 0, score: null }
  }
  const c = { coberto: 0, parcial: 0, nao_coberto: 0, nao_aplicavel: 0 }
  for (const it of coverageCheck.items) if (c[it.status] != null) c[it.status]++
  const denom = c.coberto + c.parcial + c.nao_coberto // exclui nao_aplicavel
  const score = denom > 0 ? round((c.coberto + 0.5 * c.parcial) / denom, 4) : null
  return { ...c, score }
}

// ── monta o gabarito a partir dos sinais ─────────────────────────────────────

export function buildGabarito({ analiseId, slug, ativo, facts, claims, issues, coverageCheck }) {
  return {
    slug,
    analise_id: analiseId,
    ativo: ativo ?? null,
    captured_at: new Date().toISOString(),
    facts: facts.map((f) => ({
      fact_type: f.fact_type, key: f.key, value: f.value,
      confidence: f.confidence, source_doc: f.source_doc ?? null,
    })),
    key_numbers: extractKeyNumbers(facts),
    claims: claims.map((c) => ({
      step_key: c.step_key, claim_type: c.claim_type, assertion: c.assertion,
      fact_ids: c.fact_ids ?? [], benchmark_ids: c.benchmark_ids ?? [], confidence: c.confidence,
    })),
    consistency: summarizeConsistency(issues),
    coverage: summarizeCoverage(coverageCheck),
    hallucination_rate: hallucinationRate(claims),
    stats: { n_facts: facts.length, n_claims: claims.length },
  }
}

// candidate é o MESMO shape do gabarito (construído por buildGabarito).

// ── scoring: candidate vs gabarito ───────────────────────────────────────────

const factId = (f) => `${f.fact_type}::${f.key}`

export function scoreCandidate(gab, cand) {
  // 1) Fact recall: quantos fatos do gabarito sobreviveram no candidate.
  const candFactKeys = new Set(cand.facts.map(factId))
  const missingFacts = gab.facts.filter((f) => !candFactKeys.has(factId(f)))
  const fact_recall = gab.facts.length > 0
    ? round((gab.facts.length - missingFacts.length) / gab.facts.length, 4) : 1
  const gabFactKeys = new Set(gab.facts.map(factId))
  const facts_added = cand.facts.filter((f) => !gabFactKeys.has(factId(f))).length

  // 2) Fidelidade numérica: números-chave do gabarito batem (dentro de 1%)?
  const candNums = new Map(cand.key_numbers.map((n) => [n.key, n]))
  const numeric_mismatches = []
  let numOk = 0
  for (const gn of gab.key_numbers) {
    const cn = candNums.get(gn.key)
    if (!cn) { numeric_mismatches.push({ key: gn.key, gabarito: gn.amount, candidate: null }); continue }
    const denom = Math.abs(gn.amount) || 1
    if (Math.abs(cn.amount - gn.amount) / denom <= NUM_TOL) numOk++
    else numeric_mismatches.push({ key: gn.key, gabarito: gn.amount, candidate: cn.amount })
  }
  const numeric_fidelity = gab.key_numbers.length > 0
    ? round(numOk / gab.key_numbers.length, 4) : 1

  // 3) Hallucination, 4) consistência bloqueante, 5) cobertura — deltas vs gabarito.
  const hallucination_delta = round(cand.hallucination_rate - gab.hallucination_rate, 4)
  const consistency_bloqueante_delta = cand.consistency.bloqueante - gab.consistency.bloqueante
  const coverage_delta =
    gab.coverage.score != null && cand.coverage.score != null
      ? round(cand.coverage.score - gab.coverage.score, 4) : null

  // Limiares conservadores (a regra absoluta: nunca reduzir qualidade).
  const checks = {
    fact_recall:                 { value: fact_recall,                 threshold: '>= 0.95', pass: fact_recall >= 0.95 },
    numeric_fidelity:            { value: numeric_fidelity,            threshold: '>= 0.98', pass: numeric_fidelity >= 0.98 },
    hallucination_delta:         { value: hallucination_delta,         threshold: '<= 0.02', pass: hallucination_delta <= 0.02 },
    consistency_bloqueante_delta:{ value: consistency_bloqueante_delta,threshold: '<= 0',    pass: consistency_bloqueante_delta <= 0 },
    coverage_delta:              { value: coverage_delta,              threshold: '>= -0.02', pass: coverage_delta == null || coverage_delta >= -0.02 },
  }
  const pass = Object.values(checks).every((c) => c.pass)

  return { pass, checks, missingFacts, facts_added, numeric_mismatches }
}

// ── relatório legível ────────────────────────────────────────────────────────

export function formatReport(gab, cand, score) {
  const L = []
  const ok = (b) => (b ? 'PASS ✅' : 'FAIL ❌')
  L.push(`# Golden-set — ${gab.slug}`)
  L.push('')
  L.push(`Gabarito: análise ${gab.analise_id} (${gab.ativo ?? 's/ativo'}), capturado ${gab.captured_at}`)
  L.push(`Candidate: análise ${cand.analise_id} (${cand.ativo ?? 's/ativo'})`)
  L.push('')
  L.push(`## Veredito: ${ok(score.pass)}`)
  L.push('')
  L.push('| Métrica | Valor | Limiar | Resultado |')
  L.push('|---|---|---|---|')
  for (const [name, c] of Object.entries(score.checks)) {
    L.push(`| ${name} | ${c.value} | ${c.threshold} | ${c.pass ? 'PASS' : 'FAIL'} |`)
  }
  L.push('')
  L.push(`Fatos: gabarito ${gab.stats.n_facts} → candidate ${cand.stats.n_facts} (faltando ${score.missingFacts.length}, novos ${score.facts_added})`)
  if (score.missingFacts.length) {
    L.push('')
    L.push('### Fatos do gabarito AUSENTES no candidate (regressão):')
    for (const f of score.missingFacts.slice(0, 30)) L.push(`- ${f.fact_type}::${f.key}`)
    if (score.missingFacts.length > 30) L.push(`- ... +${score.missingFacts.length - 30}`)
  }
  if (score.numeric_mismatches.length) {
    L.push('')
    L.push('### Números-chave divergentes (>1%):')
    for (const m of score.numeric_mismatches) L.push(`- ${m.key}: gabarito ${m.gabarito} vs candidate ${m.candidate}`)
  }
  return L.join('\n')
}

function round(n, d = 4) {
  const p = 10 ** d
  return Math.round(n * p) / p
}
