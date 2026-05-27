// Mostra os indicadores que o engine financeiro calcularia a partir do fact_bank
// de uma análise (read-only). Uso: node scripts/eval-financial-indicators.mjs <analise_id>
import { adminClient } from './lib/supa.mjs'
import { computeFinancials } from '../lib/extract/financial-engine.ts'

const id = process.argv[2]
if (!id) { console.error('Uso: node scripts/eval-financial-indicators.mjs <analise_id>'); process.exit(1) }

const admin = adminClient()
const { data, error } = await admin.from('analises').select('nome_ativo, fact_bank').eq('id', id).maybeSingle()
if (error || !data) { console.error('Erro:', error?.message || 'não encontrada'); process.exit(1) }

const facts = data.fact_bank?.facts ?? []
const nums = facts.filter(f => f.fact_type === 'numero_financeiro')
console.log(`\n${data.nome_ativo} — fact_bank: ${facts.length} fatos, ${nums.length} numero_financeiro`)
console.log('numero_financeiro keys:', nums.map(f => f.key).join(', ') || '—')

const metrics = computeFinancials(facts)
console.log(`\nIndicadores calculáveis: ${metrics.length}`)
for (const m of metrics) {
  console.log(`  ${m.key} = ${m.value}${m.unit === 'BRL' ? ' BRL' : m.unit}  [${m.formula}]`)
}
if (metrics.length === 0) console.log('  (sem insumos suficientes — defensivo, não inventa)')
