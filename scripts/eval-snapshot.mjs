// Snapshot de gabarito do golden-set.
// Captura o output de uma análise REAL e VALIDADA como baseline de qualidade.
//
// Uso:  node scripts/eval-snapshot.mjs <analise_id> <slug>
// Ex.:  node scripts/eval-snapshot.mjs 1234-abcd resort-campo-alegre
//
// IMPORTANTE: use uma análise real que rodou o pipeline completo e cujo resultado
// você considera correto. NÃO use o deal vitrine Cobalto (seedado com outputs
// prontos, sem analise_facts/agent_claims reais).
import { writeFileSync, mkdirSync } from 'node:fs'
import { adminClient } from './lib/supa.mjs'
import { fetchAndBuild } from './lib/eval-fetch.mjs'

const [analiseId, slug] = process.argv.slice(2)
if (!analiseId || !slug) {
  console.error('Uso: node scripts/eval-snapshot.mjs <analise_id> <slug>')
  process.exit(1)
}

const admin = adminClient()
const gab = await fetchAndBuild(admin, analiseId, slug)

if (gab.stats.n_facts === 0 && gab.stats.n_claims === 0) {
  console.error('⚠️  Esta análise não tem facts nem claims — gabarito vazio, provavelmente não rodou o pipeline real. Abortando.')
  process.exit(1)
}

const dir = new URL('../eval/goldenset/', import.meta.url)
mkdirSync(dir, { recursive: true })
const path = new URL(`${slug}.json`, dir)
writeFileSync(path, JSON.stringify(gab, null, 2))

console.log(`✅ Gabarito gravado: eval/goldenset/${slug}.json`)
console.log(`   ativo: ${gab.ativo ?? '(s/ativo)'}`)
console.log(`   fatos: ${gab.stats.n_facts} | números-chave: ${gab.key_numbers.length} | claims: ${gab.stats.n_claims}`)
console.log(`   hallucination: ${gab.hallucination_rate} | cobertura: ${gab.coverage.score ?? 'n/a'} | bloqueantes: ${gab.consistency.bloqueante}`)
