// Teste do risk engine determinístico. Roda: node scripts/test-risk-engine.mjs
import { computeFinancials } from '../lib/extract/financial-engine.ts'
import { evaluateRisk, triggersToFacts } from '../lib/extract/risk-engine.ts'

let failed = 0
const ok = (cond, msg) => { if (!cond) { failed++; console.error(`  ✗ ${msg}`) } else console.log(`  ✓ ${msg}`) }
const has = (ts, code) => ts.find(t => t.code === code)

console.log('\n[empresa alavancada e pouco rentável → gatilhos]')
const ruim = computeFinancials([
  { fact_type: 'numero_financeiro', key: 'ebitda_2025',          value: { amount: 10000000, periodo: 2025 } },
  { fact_type: 'numero_financeiro', key: 'divida_liquida_2025',  value: { amount: 60000000, periodo: 2025 } }, // 6x → crítico
  { fact_type: 'numero_financeiro', key: 'receita_liquida_2025', value: { amount: 250000000, periodo: 2025 } }, // margem EBITDA 4% → alto
  { fact_type: 'numero_financeiro', key: 'lucro_liquido_2025',   value: { amount: -5000000, periodo: 2025 } },  // prejuízo → crítico
  { fact_type: 'numero_financeiro', key: 'ativo_circulante_2025',  value: { amount: 40000000, periodo: 2025 } },
  { fact_type: 'numero_financeiro', key: 'passivo_circulante_2025',value: { amount: 50000000, periodo: 2025 } }, // liquidez 0.8 → alto, CDG <0 → alto
])
const tr = evaluateRisk(ruim)
ok(has(tr, 'alavancagem_critica')?.severity === 'critico', 'alavancagem 6x → crítico')
ok(has(tr, 'margem_ebitda_critica')?.severity === 'alto', 'margem EBITDA 4% → alto')
ok(has(tr, 'prejuizo_liquido')?.severity === 'critico', 'prejuízo → crítico')
ok(has(tr, 'liquidez_negativa')?.severity === 'alto', 'liquidez 0.8x → alto')
ok(has(tr, 'capital_giro_negativo')?.severity === 'alto', 'capital de giro negativo → alto')
ok(tr[0].severity === 'critico', 'ordenado: crítico primeiro')
ok(has(tr, 'alavancagem_critica').threshold === '> 5,0x', 'gatilho carrega o limiar (auditável)')

console.log('\n[empresa saudável → sem gatilhos]')
const boa = computeFinancials([
  { fact_type: 'numero_financeiro', key: 'ebitda_2025',          value: { amount: 100000000, periodo: 2025 } },
  { fact_type: 'numero_financeiro', key: 'divida_liquida_2025',  value: { amount: 150000000, periodo: 2025 } }, // 1.5x ok
  { fact_type: 'numero_financeiro', key: 'receita_liquida_2025', value: { amount: 400000000, periodo: 2025 } }, // margem 25% ok
  { fact_type: 'numero_financeiro', key: 'lucro_liquido_2025',   value: { amount: 60000000, periodo: 2025 } },  // 15% ok
  { fact_type: 'numero_financeiro', key: 'ativo_circulante_2025',  value: { amount: 200000000, periodo: 2025 } },
  { fact_type: 'numero_financeiro', key: 'passivo_circulante_2025',value: { amount: 100000000, periodo: 2025 } }, // 2.0x ok
])
ok(evaluateRisk(boa).length === 0, 'empresa saudável → zero gatilhos')

console.log('\n[cobertura de garantia]')
const cov = evaluateRisk(computeFinancials([
  { fact_type: 'numero_financeiro', key: 'valor_operacao', value: { amount: 100000000 } },
  { fact_type: 'numero_financeiro', key: 'valor_garantia', value: { amount: 80000000 } }, // 0.8x → alto
]))
ok(has(cov, 'garantia_insuficiente')?.severity === 'alto', 'garantia 0.8x → alto (LTV > 100%)')

console.log('\n[triggersToFacts]')
const facts = triggersToFacts(tr)
ok(facts.every(f => f.fact_type === 'risco_quantitativo' && f.confidence === 1), 'vira fato risco_quantitativo conf 1')
ok(facts.find(f => f.key.startsWith('alavancagem_critica')), 'fato com chave do gatilho')

console.log(failed === 0 ? '\n✅ todos os testes passaram' : `\n❌ ${failed} teste(s) falharam`)
process.exit(failed === 0 ? 0 : 1)
