// Score de uma análise candidate contra um gabarito do golden-set.
// Roda DEPOIS de uma mudança (trocar modelo, extração determinística, etc.):
// pega uma análise nova do mesmo deal e mede se a qualidade regrediu.
//
// Uso:  node scripts/eval-score.mjs <candidate_analise_id> <slug>
// Ex.:  node scripts/eval-score.mjs 9999-novo resort-campo-alegre
//
// Saída: relatório no console + eval/reports/<slug>-<timestamp>.md
// Exit code 0 = PASS (qualidade preservada), 1 = FAIL (regressão detectada).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { adminClient } from './lib/supa.mjs'
import { fetchAndBuild } from './lib/eval-fetch.mjs'
import { scoreCandidate, formatReport } from './lib/goldenset.mjs'

const [candidateId, slug] = process.argv.slice(2)
if (!candidateId || !slug) {
  console.error('Uso: node scripts/eval-score.mjs <candidate_analise_id> <slug>')
  process.exit(1)
}

let gab
try {
  gab = JSON.parse(readFileSync(new URL(`../eval/goldenset/${slug}.json`, import.meta.url), 'utf8'))
} catch {
  console.error(`Gabarito não encontrado: eval/goldenset/${slug}.json — rode eval-snapshot.mjs antes.`)
  process.exit(1)
}

const admin = adminClient()
const cand = await fetchAndBuild(admin, candidateId, `${slug}-candidate`)

const score = scoreCandidate(gab, cand)
const report = formatReport(gab, cand, score)

console.log(report)

const dir = new URL('../eval/reports/', import.meta.url)
mkdirSync(dir, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
writeFileSync(new URL(`${slug}-${stamp}.md`, dir), report)

process.exit(score.pass ? 0 : 1)
