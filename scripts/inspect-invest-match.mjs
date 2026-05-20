// Inspeção read-only do estado do Invest Match em produção.
// Uso: node --env-file=.env.local scripts/inspect-invest-match.mjs
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('Faltam env vars Supabase'); process.exit(1) }

const sb = createClient(url, key, { auth: { persistSession: false } })

async function tableExists(name) {
  const { error } = await sb.from(name).select('*', { head: true, count: 'exact' }).limit(1)
  if (error && /does not exist|schema cache/i.test(error.message)) return false
  return !error
}

console.log('\n=== 1) Migrations do Invest Match aplicadas? ===')
for (const t of ['investidores', 'teses', 'matches', 'match_feedback']) {
  console.log(`  ${t}: ${(await tableExists(t)) ? 'EXISTE ✓' : 'NÃO EXISTE ✗'}`)
}

console.log('\n=== 2) Escritórios ===')
const { data: escritorios, error: escErr } = await sb
  .from('escritorios')
  .select('id, nome, user_id, criado_em')
  .order('criado_em', { ascending: true })
if (escErr) console.log('  erro:', escErr.message)
else for (const e of escritorios ?? []) console.log(`  ${e.id} | ${e.nome ?? '(sem nome)'} | user_id=${e.user_id}`)

console.log('\n=== 3) Análises com "preven" no nome ===')
const { data: analises, error: anErr } = await sb
  .from('analises')
  .select('id, nome_ativo, user_id, status, criado_em, mesa_revisao, deal_intake')
  .ilike('nome_ativo', '%preven%')
if (anErr) console.log('  erro:', anErr.message)
else if (!analises?.length) console.log('  Nenhuma análise com "preven" encontrada')
else for (const a of analises) {
  const intake = a.deal_intake ?? {}
  console.log(`  ${a.id} | "${a.nome_ativo}" | status=${a.status} | mesa_revisao=${a.mesa_revisao ? 'SIM' : 'não'}`)
  console.log(`      tipo=${intake.tipoAtivo ?? '?'} | estagio=${intake.estagio ?? '?'} | ticket=${intake.ticketEstimado ?? '?'} | local=${intake.localizacao ?? '?'} | user_id=${a.user_id}`)
}

console.log('\n=== 4) Teses existentes (se tabela existe) ===')
if (await tableExists('teses')) {
  const { data: teses } = await sb
    .from('teses')
    .select('id, empresa_nome, empresa_codinome, setor_primario, capital_buscado_brl, analise_id, escritorio_id, status')
    .order('criado_em', { ascending: false })
    .limit(20)
  if (!teses?.length) console.log('  Nenhuma tese cadastrada ainda')
  else for (const t of teses) console.log(`  ${t.id} | "${t.empresa_nome}" (${t.empresa_codinome}) | ${t.setor_primario} | R$${t.capital_buscado_brl} | analise=${t.analise_id ?? '—'} | escritorio=${t.escritorio_id}`)
} else {
  console.log('  (tabela teses não existe — migrations não aplicadas)')
}

console.log('\n=== fim ===\n')
