// Estudo de viabilidade do 1.c (pular o Haiku): mede, por chunk, quantos
// produzem SÓ fatos estruturados (candidatos a pular) vs quantos têm semântico
// (precisam do LLM), e o gap de recuperação do determinístico.
// Read-only. Uso: node scripts/eval-skip-feasibility.mjs <analise_id>
import { adminClient } from './lib/supa.mjs'
import { extractDeterministicFacts } from '../lib/extract/deterministic-facts.ts'

const SEMANTIC = new Set(['evento_relevante', 'contrato', 'garantia', 'passivo', 'lacuna'])
// estruturado = numero_financeiro, estrutura_societaria, documento_disponivel

const id = process.argv[2]
if (!id) { console.error('Uso: node scripts/eval-skip-feasibility.mjs <analise_id>'); process.exit(1) }
const a = adminClient()

const { data: chunks } = await a.from('document_chunks').select('id, chunk_text').eq('analise_id', id).order('chunk_index')
const { data: facts } = await a.from('document_facts').select('chunk_id, fact_type').eq('analise_id', id)
if (!chunks?.length) { console.error('sem chunks'); process.exit(1) }

const haikuByChunk = new Map()
for (const f of facts ?? []) {
  if (!haikuByChunk.has(f.chunk_id)) haikuByChunk.set(f.chunk_id, [])
  haikuByChunk.get(f.chunk_id).push(f.fact_type)
}

let structuredOnly = 0, needsLLM = 0, emptyChunks = 0
let detOnStructuredOnly = 0, haikuOnStructuredOnly = 0
for (const c of chunks) {
  const types = haikuByChunk.get(c.id) ?? []
  if (types.length === 0) { emptyChunks++; continue }
  const hasSemantic = types.some(t => SEMANTIC.has(t))
  if (hasSemantic) { needsLLM++; continue }
  // chunk só-estruturado: candidato a pular o Haiku
  structuredOnly++
  haikuOnStructuredOnly += types.length
  detOnStructuredOnly += extractDeterministicFacts(c.chunk_text || '').length
}

const total = chunks.length
const skippable = structuredOnly + emptyChunks
console.log(`\n=== ${id} — ${total} chunks ===`)
console.log(`Chunks com fato semântico (PRECISAM do Haiku): ${needsLLM} (${pct(needsLLM, total)})`)
console.log(`Chunks só-estruturado (candidatos a pular):     ${structuredOnly} (${pct(structuredOnly, total)})`)
console.log(`Chunks sem fato nenhum (puláveis trivialmente): ${emptyChunks} (${pct(emptyChunks, total)})`)
console.log(`\nTETO de redução de chamadas Haiku: ~${pct(skippable, total)} dos chunks`)
console.log(`\nNos chunks só-estruturado: Haiku extraiu ${haikuOnStructuredOnly} fatos; determinístico recuperou ${detOnStructuredOnly}.`)
console.log(`  → gap de recuperação: ${haikuOnStructuredOnly - detOnStructuredOnly} fatos que se perderiam se simplesmente pulasse (sem ampliar o determinístico).`)

function pct(n, d) { return d ? Math.round((n / d) * 100) + '%' : '0%' }
