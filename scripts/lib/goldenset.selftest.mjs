// Smoke-test da lógica pura de scoring (sem banco). Roda: node scripts/lib/goldenset.selftest.mjs
import { buildGabarito, scoreCandidate, formatReport } from './goldenset.mjs'

function mk(overrides = {}) {
  const facts = overrides.facts ?? [
    { fact_type: 'numero_financeiro', key: 'ebitda_2025',  value: { amount: 108100000, unit: 'BRL' }, confidence: 0.9, source_doc: 'dre.pdf' },
    { fact_type: 'numero_financeiro', key: 'receita_2025', value: { amount: 487300000, unit: 'BRL' }, confidence: 0.9, source_doc: 'dre.pdf' },
    { fact_type: 'garantia',          key: 'aval_socios',   value: { value: true }, confidence: 0.8, source_doc: 'contrato.pdf' },
  ]
  const claims = overrides.claims ?? [
    { step_key: 'diagnostico', claim_type: 'numero',       assertion: 'EBITDA 108M', fact_ids: ['F:numero_financeiro:ebitda_2025'], benchmark_ids: [], confidence: 0.9 },
    { step_key: 'originacao',  claim_type: 'recomendacao', assertion: 'Sugerir FIDC', fact_ids: ['F:x'], benchmark_ids: ['B:FIDC:taxa'], confidence: 0.8 },
  ]
  const issues = overrides.issues ?? [{ severidade: 'alerta', tipo: 'numero_divergente', resolvido: false }]
  const coverageCheck = overrides.coverageCheck ?? { items: [
    ...Array(8).fill({ status: 'coberto' }), { status: 'parcial' }, { status: 'parcial' }, { status: 'nao_coberto' },
  ] }
  return buildGabarito({ analiseId: overrides.id ?? 'g', slug: 't', ativo: 'Sinterra', facts, claims, issues, coverageCheck })
}

let failed = 0
function assert(cond, msg) { if (!cond) { failed++; console.error('  ✗ ' + msg) } else { console.log('  ✓ ' + msg) } }

// 1) Candidate idêntico ao gabarito → PASS
const gab = mk()
const same = mk({ id: 'c-same' })
const s1 = scoreCandidate(gab, same)
console.log('\n[Caso 1] candidate idêntico:')
assert(s1.pass === true, 'deve PASSAR')
assert(s1.checks.fact_recall.value === 1, 'fact_recall = 1')
assert(s1.checks.numeric_fidelity.value === 1, 'numeric_fidelity = 1')

// 2) Regressão: derruba 1 fato, muda EBITDA 20%, adiciona claim sem fonte → FAIL
const bad = mk({
  id: 'c-bad',
  facts: [
    { fact_type: 'numero_financeiro', key: 'ebitda_2025',  value: { amount: 130000000 }, confidence: 0.9 }, // +20%
    { fact_type: 'numero_financeiro', key: 'receita_2025', value: { amount: 487300000 }, confidence: 0.9 },
    // 'garantia:aval_socios' SUMIU (regressão de recall)
  ],
  claims: [
    { step_key: 'diagnostico', claim_type: 'numero',       assertion: 'x', fact_ids: [], benchmark_ids: [], confidence: 0.9 }, // hallucination
    { step_key: 'originacao',  claim_type: 'recomendacao', assertion: 'y', fact_ids: [], benchmark_ids: [], confidence: 0.8 }, // hallucination
  ],
  issues: [{ severidade: 'bloqueante', tipo: 'numero_divergente', resolvido: false }], // +1 bloqueante
})
const s2 = scoreCandidate(gab, bad)
console.log('\n[Caso 2] candidate regredido:')
assert(s2.pass === false, 'deve FALHAR')
assert(s2.checks.fact_recall.pass === false, 'fact_recall deve falhar (fato sumiu)')
assert(s2.checks.numeric_fidelity.pass === false, 'numeric_fidelity deve falhar (EBITDA +20%)')
assert(s2.checks.consistency_bloqueante_delta.pass === false, 'novo bloqueante deve falhar')
assert(s2.missingFacts.length === 1, '1 fato ausente detectado')
assert(s2.numeric_mismatches.length === 1, '1 número divergente detectado')

console.log('\n--- exemplo de relatório (caso 2) ---')
console.log(formatReport(gab, bad, s2))

console.log(failed === 0 ? '\n✅ self-test OK' : `\n❌ ${failed} asserção(ões) falharam`)
process.exit(failed === 0 ? 0 : 1)
