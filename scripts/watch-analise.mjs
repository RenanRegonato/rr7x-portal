// Observador READ-ONLY do pipeline de uma análise, do início ao fim:
// ingestão -> consolidação do fact_bank -> auto-trigger -> 10 agentes -> checks.
// Não muta nada. Serve pra acompanhar ao vivo uma análise nova e validar a
// refatoração server-side (Inngest) + a robustez de ingestão (onFailure/watchdog).
//
// Uso:
//   node scripts/watch-analise.mjs                      -> lista as 10 análises mais recentes
//   node scripts/watch-analise.mjs <id|trecho-do-nome>  -> snapshot único
//   node scripts/watch-analise.mjs <id|nome> --watch    -> atualiza até concluir (Ctrl+C sai)
//   node scripts/watch-analise.mjs <id|nome> --watch --interval=5
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, '')] }),
)
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } })

// ── conditionais do objetivo (espelham lib/analise/run-pipeline.ts) ──
const MA_OBJECTIVES        = ['Vender 100%', 'Vender participação', 'Captar investimento']
const ESTRUTURA_OBJECTIVES = ['Estruturar crédito']
const isMA        = (o) => MA_OBJECTIVES.some(x => (o ?? '').includes(x))
const isEstrutura = (o) => ESTRUTURA_OBJECTIVES.some(x => (o ?? '').includes(x))

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const args = process.argv.slice(2)
const flags = new Set(args.filter(a => a.startsWith('--')))
const target = args.find(a => !a.startsWith('--'))
const watch = flags.has('--watch')
const interval = Number((args.find(a => a.startsWith('--interval=')) ?? '').split('=')[1] || 5)

const ICON_DOC = { pending: '⏸', downloading: '⏳', parsing: '⏳', chunking: '⏳', embedding: '⏳', fact_extracting: '⏳', completed: '✓', failed: '✗' }
const AGENTS_CORE = ['drive_intake', 'orchestration', 'pesquisa', 'diagnostico', 'kyc', 'contratos', 'originacao', 'maturidade']

function age(ts) {
  if (!ts) return '—'
  const s = Math.round((Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 90) return `${s}s atrás`
  if (s < 5400) return `${Math.round(s / 60)}min atrás`
  return `${(s / 3600).toFixed(1)}h atrás`
}
const kb = (s) => `${(String(s).length / 1024).toFixed(1)}KB`

async function findAnalise() {
  if (!target) return null
  if (UUID_RE.test(target)) {
    const { data } = await admin.from('analises').select('id').eq('id', target).maybeSingle()
    return data?.id ?? null
  }
  const { data } = await admin.from('analises').select('id, nome_ativo, atualizado_em')
    .ilike('nome_ativo', `%${target}%`).order('atualizado_em', { ascending: false }).limit(1)
  return data?.[0]?.id ?? null
}

async function listRecent() {
  const { data } = await admin.from('analises')
    .select('id, nome_ativo, status, atualizado_em')
    .order('atualizado_em', { ascending: false }).limit(10)
  console.log('\nAnálises mais recentes (passe id ou trecho do nome como argumento):\n')
  for (const a of data ?? []) {
    console.log(`  ${a.status.padEnd(12)} ${a.nome_ativo ?? '(sem nome)'}  [${a.id}]  ${age(a.atualizado_em)}`)
  }
  console.log()
}

async function render(analiseId) {
  const { data: a } = await admin.from('analises').select(`
    id, nome_ativo, status, deal_intake,
    documents_total, documents_completed, documents_failed,
    documents_ingestion_started_at, documents_ingested_at,
    fact_bank, fact_bank_consolidated_at, fact_bank_model_id,
    outputs, consistency_checked_at, risk_correlation_at, coverage_checked_at, mesa_revisao_at,
    atualizado_em
  `).eq('id', analiseId).single()
  if (!a) { console.log('Análise não encontrada'); return 'erro' }

  const intake = a.deal_intake ?? {}
  const outputs = a.outputs ?? {}
  const objetivo = intake.objetivo
  const ma = isMA(objetivo), estrutura = isEstrutura(objetivo)
  const optRT = intake.reformaTributaria === 'diagnosticar'

  const { data: docs } = await admin.from('analise_documents')
    .select('file_name, status, chunks_completed, total_chunks, error_message')
    .eq('analise_id', analiseId).order('file_name')

  const out = []
  out.push(`\n═══ ${a.nome_ativo ?? '(sem nome)'} ═══  [${a.id}]`)
  out.push(`status: ${a.status.toUpperCase()}  |  atualizado ${age(a.atualizado_em)}`)
  out.push(`objetivo: ${objetivo ?? '—'}  |  M&A=${ma ? 'sim' : 'não'}  estrutura=${estrutura ? 'sim' : 'não'}  reformaTributaria=${intake.reformaTributaria ?? 'na'}`)

  // INGESTÃO
  const terminal = (docs ?? []).filter(d => d.status === 'completed' || d.status === 'failed').length
  const total = a.documents_total ?? (docs?.length ?? 0)
  out.push(`\n── INGESTÃO ──  ${terminal}/${total} terminais  (completed=${a.documents_completed ?? 0} failed=${a.documents_failed ?? 0})`)
  out.push(`   iniciada: ${age(a.documents_ingestion_started_at)}  |  ingestão concluída: ${a.documents_ingested_at ? age(a.documents_ingested_at) : 'pendente'}`)
  for (const d of docs ?? []) {
    const ic = ICON_DOC[d.status] ?? '?'
    const prog = d.total_chunks ? ` ${d.chunks_completed ?? 0}/${d.total_chunks} chunks` : ''
    const err = d.status === 'failed' && d.error_message ? `  «${d.error_message.slice(0, 80)}»` : ''
    out.push(`   ${ic} ${d.status.padEnd(15)} ${(d.file_name ?? '').slice(0, 42).padEnd(42)}${prog}${err}`)
  }

  // FACT BANK
  const fb = a.fact_bank ?? null
  const nFacts = Array.isArray(fb?.facts) ? fb.facts.length : null
  out.push(`\n── FACT BANK ──`)
  if (a.fact_bank_consolidated_at) {
    out.push(`   ✓ consolidado ${age(a.fact_bank_consolidated_at)}  |  modelo: ${a.fact_bank_model_id ?? '—'}  |  fatos: ${nFacts ?? '?'}  conflitos: ${fb?.stats?.conflicts ?? '?'}`)
  } else {
    out.push(`   ⏳ ainda não consolidado (pipeline não dispara até consolidar)`)
  }

  // PIPELINE
  out.push(`\n── PIPELINE (agentes) ──`)
  const expected = [...AGENTS_CORE]
  if (ma) expected.splice(expected.indexOf('originacao'), 0, 'analise_ma')
  if (estrutura) expected.splice(expected.indexOf('originacao'), 0, 'estruturacao')
  if (optRT) expected.splice(expected.indexOf('maturidade'), 0, 'reforma_tributaria')
  for (const k of expected) {
    const v = outputs[k]
    out.push(`   ${v ? '✓' : '·'} ${k.padEnd(20)} ${v ? kb(typeof v === 'string' ? v : JSON.stringify(v)) : '(faltando)'}`)
  }
  out.push(`   checks: consistency ${a.consistency_checked_at ? '✓' : '·'}  risk_correlation ${a.risk_correlation_at ? '✓' : '·'}  coverage ${a.coverage_checked_at ? '✓' : '·'}  mesa_revisao ${a.mesa_revisao_at ? '✓' : '·'}`)

  if (outputs.__pipeline_error__) {
    out.push(`\n   🔴 __pipeline_error__: ${outputs.__pipeline_error__.slice(0, 200)}`)
  }
  console.log(out.join('\n'))
  return a.status
}

// ── main ──
const id = await findAnalise()
if (!id) { await listRecent(); process.exit(0) }

if (!watch) {
  await render(id)
  process.exit(0)
}

console.log(`Observando ${id} (intervalo ${interval}s, Ctrl+C pra sair)...`)
for (;;) {
  process.stdout.write('\x1B[2J\x1B[H') // limpa a tela
  const status = await render(id)
  if (status === 'concluido' || status === 'erro') {
    console.log(`\n>>> Pipeline em estado terminal: ${status.toUpperCase()}. Encerrando watch.`)
    break
  }
  await new Promise(r => setTimeout(r, interval * 1000))
}
