// Fix de visibilidade do demo Sinterra para agenciarr7@gmail.com.
// Decisão (15/06/2026): agenciarr7 já é GERENTE do escritório RR7x - Capita Hub
// (cfd1727b). A análise demo pertencia ao usuário demo@meridianocapital, que está
// FORA desse escritório, então o Pipeline (filtra por user_id do time) a escondia.
// Fix: reatribuir a análise ao agenciarr7 (dono dentro da própria equipe) para
// aparecer no Pipeline e abrir no detalhe. Branding passa a RR7x. Invest Match
// fica intacto (a tese referencia analise_id + escritorio_id, ambos preservados).
// Efeito colateral aceito: o login demo@meridianocapital deixa de ter a análise.
// Idempotente. Uso: node --env-file=.env.local scripts/fix-sinterra-visibility.mjs
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const AGENCIARR7 = '16fc2589-0d2b-42ce-8151-ef6194a8c6fc' // agenciarr7@gmail.com (gerente cfd1727b)
const ESCRITORIO = 'cfd1727b-431e-4112-88df-764affb5c4e9' // RR7x - Capita Hub
const ANALISE    = 'a9388a50-a2f6-43da-b53e-6fe06118fee9' // Sinterra (Projeto Cobalto)

// Pré-condições: agenciarr7 é gerente do escritório que é dele
const { data: esc } = await sb.from('escritorios').select('user_id').eq('id', ESCRITORIO).single()
const { data: perfil } = await sb.from('perfis').select('role, escritorio_id').eq('user_id', AGENCIARR7).maybeSingle()
if (esc?.user_id !== AGENCIARR7 || perfil?.escritorio_id !== ESCRITORIO || perfil?.role !== 'gerente') {
  console.error('ABORTADO: pré-condições não batem.', { esc, perfil }); process.exit(1)
}
console.log('• pré-condições OK: agenciarr7 é gerente e dono do escritório', ESCRITORIO)

// Reatribui a análise demo para o agenciarr7
const { error: aErr } = await sb.from('analises')
  .update({ user_id: AGENCIARR7, atualizado_em: new Date().toISOString() })
  .eq('id', ANALISE)
if (aErr) { console.error('erro análise:', aErr.message); process.exit(1) }
console.log('• análise Sinterra reatribuída ao agenciarr7')

// Verificação
const { data: a } = await sb.from('analises').select('user_id, status, nome_ativo').eq('id', ANALISE).single()
const { data: tese } = await sb.from('teses').select('escritorio_id, analise_id, status').eq('analise_id', ANALISE).maybeSingle()
const { data: matches } = await sb.from('matches').select('id', { count: 'exact', head: true }).eq('analise_id', ANALISE)
console.log('\n=== VERIFICAÇÃO ===')
console.log('análise dono   :', a?.user_id, a?.user_id === AGENCIARR7 ? '✓' : '✗', '| status', a?.status)
console.log('tese escritório:', tese?.escritorio_id, tese?.escritorio_id === ESCRITORIO ? '✓ Invest Match intacto' : '✗')
console.log('Pipeline mostrará p/ agenciarr7 (gerente, dono na equipe):', a?.user_id === AGENCIARR7 ? 'SIM ✓' : 'NÃO ✗')
