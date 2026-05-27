// Mede o que a extração determinística pega nos chunks REAIS de uma análise,
// sem tocar no banco (read-only). Uso: node scripts/eval-deterministic-coverage.mjs <analise_id>
import { adminClient } from './lib/supa.mjs'
import { extractDeterministicFacts } from '../lib/extract/deterministic-facts.ts'

const analiseId = process.argv[2]
if (!analiseId) { console.error('Uso: node scripts/eval-deterministic-coverage.mjs <analise_id>'); process.exit(1) }

const admin = adminClient()
const { data: chunks, error } = await admin
  .from('document_chunks')
  .select('chunk_text')
  .eq('analise_id', analiseId)
if (error) { console.error('Erro:', error.message); process.exit(1) }
if (!chunks?.length) { console.error('Sem chunks para', analiseId); process.exit(1) }

let all = []
for (const c of chunks) all = all.concat(extractDeterministicFacts(c.chunk_text || ''))

// dedup por (type,key) como o pipeline fará
const byKey = new Map()
for (const f of all) byKey.set(`${f.fact_type}::${f.fact_key}`, f)
const facts = [...byKey.values()]

const byType = {}
for (const f of facts) byType[f.fact_type] = (byType[f.fact_type] || 0) + 1

console.log(`\nAnálise ${analiseId} — ${chunks.length} chunks`)
console.log(`Fatos determinísticos (dedup): ${facts.length}`)
console.log('Por tipo:', JSON.stringify(byType))

const cnpjs = facts.filter(f => f.fact_key.startsWith('cnpj_')).map(f => JSON.parse(f.fact_value).cnpj)
const cpfs  = facts.filter(f => f.fact_key.startsWith('cpf_')).map(f => JSON.parse(f.fact_value).cpf)
const fin   = facts.filter(f => f.fact_type === 'numero_financeiro')

console.log(`\nCNPJs (${cnpjs.length}):`, cnpjs.join(', ') || '—')
console.log(`CPFs (${cpfs.length}):`, cpfs.join(', ') || '—')
console.log(`\nFinanceiros rotulados (${fin.length}):`)
for (const f of fin.slice(0, 25)) {
  const v = JSON.parse(f.fact_value)
  console.log(`  ${f.fact_key} = ${v.amount}${v.unit ? ' ' + v.unit : ''}  | "${(f.source_quote||'').slice(0,80)}"`)
}
