// Teste do engine financeiro. Roda: node scripts/test-financial-engine.mjs
import { computeFinancials, metricsToFacts } from '../lib/extract/financial-engine.ts'

let failed = 0
const ok = (cond, msg) => { if (!cond) { failed++; console.error(`  ✗ ${msg}`) } else console.log(`  ✓ ${msg}`) }
const get = (ms, key) => ms.find(m => m.key === key)

// Fatos no shape do fact_bank consolidado.
const fb = [
  { fact_type: 'numero_financeiro', key: 'ebitda_2025',          value: { amount: 108100000, unit: 'BRL', periodo: 2025 } },
  { fact_type: 'numero_financeiro', key: 'receita_liquida_2025', value: { amount: 487300000, unit: 'BRL', periodo: 2025 } },
  { fact_type: 'numero_financeiro', key: 'divida_liquida_2025',  value: { amount: 270250000, unit: 'BRL', periodo: 2025 } },
  { fact_type: 'numero_financeiro', key: 'lucro_liquido_2025',   value: { amount: 48730000,  unit: 'BRL', periodo: 2025 } },
  { fact_type: 'numero_financeiro', key: 'ativo_circulante_2025',  value: { amount: 200000000, periodo: 2025 } },
  { fact_type: 'numero_financeiro', key: 'passivo_circulante_2025',value: { amount: 125000000, periodo: 2025 } },
  { fact_type: 'estrutura_societaria', key: 'cnpj_x', value: { cnpj: '00.000.000/0001-00' } }, // ignorado
]
const ms = computeFinancials(fb)

console.log('\n[indicadores 2025]')
ok(get(ms, 'alavancagem_liquida_2025')?.value === 2.5, 'alavancagem líquida = 2,5x (270,25 / 108,1)')
ok(get(ms, 'margem_ebitda_2025')?.value === 22.2, 'margem EBITDA = 22,2% (108,1 / 487,3)')
ok(get(ms, 'margem_liquida_2025')?.value === 10, 'margem líquida = 10%')
ok(get(ms, 'liquidez_corrente_2025')?.value === 1.6, 'liquidez corrente = 1,6x')
ok(get(ms, 'capital_de_giro_2025')?.value === 75000000, 'capital de giro = 75M')
ok(get(ms, 'alavancagem_liquida_2025')?.unit === 'x', 'unidade x')
ok(get(ms, 'margem_ebitda_2025')?.inputs.join(',') === 'ebitda,receita', 'inputs auditáveis')

console.log('\n[defensivo: insumo faltando → não calcula]')
const partial = computeFinancials([
  { fact_type: 'numero_financeiro', key: 'ebitda', value: { amount: 1000000 } },
])
ok(partial.find(m => m.key.startsWith('alavancagem')) === undefined, 'sem dívida → sem alavancagem')
ok(partial.find(m => m.key.startsWith('margem')) === undefined, 'sem receita → sem margem')

console.log('\n[defensivo: EBITDA <= 0 → sem alavancagem]')
const neg = computeFinancials([
  { fact_type: 'numero_financeiro', key: 'ebitda', value: { amount: -500000 } },
  { fact_type: 'numero_financeiro', key: 'divida_liquida', value: { amount: 1000000 } },
])
ok(neg.find(m => m.key.startsWith('alavancagem')) === undefined, 'EBITDA negativo → não divide')

console.log('\n[cobertura de garantia]')
const cov = computeFinancials([
  { fact_type: 'numero_financeiro', key: 'valor_operacao', value: { amount: 280000000 } },
  { fact_type: 'numero_financeiro', key: 'valor_garantia', value: { amount: 420000000 } },
])
ok(get(cov, 'cobertura_garantia')?.value === 1.5, 'cobertura garantia = 1,5x')

console.log('\n[metricsToFacts]')
const cf = metricsToFacts(ms)
ok(cf.length === ms.length && cf.every(f => f.fact_type === 'indicador_calculado' && f.confidence === 1), 'vira fato indicador_calculado conf 1')
const alav = cf.find(f => f.fact_key === 'alavancagem_liquida_2025')
ok(alav && JSON.parse(alav.fact_value).formula.includes('EBITDA'), 'fato carrega a fórmula (auditável)')

console.log(failed === 0 ? '\n✅ todos os testes passaram' : `\n❌ ${failed} teste(s) falharam`)
process.exit(failed === 0 ? 0 : 1)
