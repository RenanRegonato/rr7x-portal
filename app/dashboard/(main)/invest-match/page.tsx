import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { resolveEscritorioId } from '@/lib/invest-match/auth-helpers'
import { getDashboardData } from '@/lib/invest-match/dashboard-service'
import { STATUS_MATCH, STATUS_TESE_LABEL, formatBRL, scoreBg } from '@/lib/invest-match/labels'
import {
  IconHandshake, IconUsers, IconBuilding, IconPlus, IconSparkle,
  IconPipeline, IconCheck, IconClock, IconBell, IconArrowRight,
} from '@/components/Icons'

// Painel operacional do módulo Invest Match.
// Server component: KPIs por count direto + agregados via getDashboardData.
export const dynamic = 'force-dynamic'

export default async function InvestMatchOverviewPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const escritorioId = await resolveEscritorioId(user.id)

  // Sem escritório: convida a configurar
  if (!escritorioId) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold text-ink mb-2">Invest Match</h1>
        <p className="text-ink-2 mb-6">
          Para usar o módulo de matching, você precisa primeiro cadastrar seu escritório.
        </p>
        <Link
          href="/dashboard/escritorio"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-strong text-white text-sm font-medium hover:opacity-90"
        >
          <IconBuilding size={16}/> Cadastrar escritório
        </Link>
      </div>
    )
  }

  // Contagens de investidores (direto) + agregados do pipeline
  const admin = createAdminClient()
  const [invAtivosRes, invTotalRes, dash] = await Promise.all([
    admin.from('investidores').select('*', { count: 'exact', head: true })
      .eq('escritorio_id', escritorioId).eq('status', 'ativo'),
    admin.from('investidores').select('*', { count: 'exact', head: true })
      .eq('escritorio_id', escritorioId),
    getDashboardData(escritorioId),
  ])

  const investidoresAtivos = invAtivosRes.count ?? 0
  const investidoresTotal  = invTotalRes.count ?? 0

  const temDados = dash.kpis.teses > 0 || dash.atividade.length > 0

  const kpis = [
    { label: 'Investidores ativos', value: investidoresAtivos, total: investidoresTotal, icon: IconUsers, href: '/dashboard/invest-match/investidores' },
    { label: 'Teses estruturadas',  value: dash.kpis.teses,    icon: IconBuilding, href: '/dashboard/invest-match/teses' },
    { label: 'Matches no pipeline', value: dash.kpis.matchesAtivos, icon: IconSparkle, href: '/dashboard/invest-match/matches' },
    { label: 'Fechados',            value: dash.kpis.fechados, icon: IconCheck, href: '/dashboard/invest-match/matches' },
  ]

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-ink-3 text-xs uppercase tracking-wider font-semibold mb-2">
            <IconHandshake size={14}/> Módulo
          </div>
          <h1 className="text-2xl font-semibold text-ink">Invest Match</h1>
          <p className="text-ink-2 text-sm mt-1 max-w-2xl">
            Originação inteligente: cruza teses de investidores com análises da Mandor para
            gerar matches qualificados com explicação e score multi-camada.
          </p>
        </div>
        <Link
          href="/dashboard/invest-match/investidores/novo"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-strong text-white text-sm font-medium hover:opacity-90 shrink-0"
        >
          <IconPlus size={16}/> Novo investidor
        </Link>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Link
            key={k.label}
            href={k.href}
            className="block bg-surface border border-border rounded-xl p-5 hover:border-accent-strong/40 hover:shadow-sm transition"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold">{k.label}</span>
              <k.icon size={18}/>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-ink tabular-nums">{k.value}</span>
              {k.total !== undefined && k.total !== k.value && (
                <span className="text-xs text-ink-3">de {k.total}</span>
              )}
            </div>
          </Link>
        ))}
      </section>

      {!temDados ? (
        <OnboardingSteps/>
      ) : (
        <>
          {/* Valor em jogo */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-surface border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold">Valor em jogo</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-semibold text-ink tabular-nums">{formatBRL(dash.valor.emJogoBrl)}</span>
                <span className="text-xs text-ink-3">
                  em {dash.valor.tesesEmJogo} {dash.valor.tesesEmJogo === 1 ? 'tese ativa' : 'teses ativas'} no pipeline
                </span>
              </div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <IconCheck size={14}/>
                <span className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold">Capital fechado</span>
              </div>
              <span className="text-3xl font-semibold text-ok tabular-nums">{formatBRL(dash.valor.fechadoBrl)}</span>
            </div>
          </section>

          {/* Funil do pipeline */}
          <section className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <IconPipeline size={15}/>
              <h2 className="text-sm font-semibold text-ink">Funil do pipeline</h2>
            </div>
            <p className="text-xs text-ink-3 mb-4">
              Cada degrau conta os matches que chegaram pelo menos até aquela etapa (estado atual). A taxa é a conversão vinda da etapa anterior.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {dash.funil.map((f, i) => (
                <div key={f.id} className="relative bg-surface-2/50 border border-border rounded-lg p-3">
                  <div className="text-[11px] text-ink-3 font-medium mb-1">{f.label}</div>
                  <div className="text-2xl font-semibold text-ink tabular-nums">{f.count}</div>
                  {f.taxa != null && (
                    <div className="text-[11px] text-ink-3 mt-1 flex items-center gap-1">
                      <IconArrowRight size={11}/> {f.taxa}% da anterior
                    </div>
                  )}
                  {i === 0 && (
                    <div className="text-[11px] text-ink-3 mt-1">100% base</div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Fila de ação + Atividade recente */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Fila de ação */}
            <div className="bg-surface border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <IconBell size={15}/>
                <h2 className="text-sm font-semibold text-ink">Fila de ação</h2>
              </div>

              <FilaBloco
                titulo="Sugeridos aguardando curadoria"
                total={dash.fila.sugeridosTotal}
                itens={dash.fila.sugeridos}
                hrefTodos="/dashboard/invest-match/matches"
                vazio="Nada para curar agora."
              />
              <div className="h-4"/>
              <FilaBloco
                titulo="Aprovados aguardando notificação"
                total={dash.fila.aprovadosTotal}
                itens={dash.fila.aprovadosNaoNotificados}
                hrefTodos="/dashboard/invest-match/matches"
                vazio="Nenhum aprovado pendente."
              />
            </div>

            {/* Atividade recente */}
            <div className="bg-surface border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <IconClock size={15}/>
                <h2 className="text-sm font-semibold text-ink">Atividade recente</h2>
              </div>
              {dash.atividade.length === 0 ? (
                <p className="text-sm text-ink-3">Sem movimentações ainda.</p>
              ) : (
                <ul className="space-y-2.5">
                  {dash.atividade.map(a => {
                    const meta = STATUS_MATCH[a.status as keyof typeof STATUS_MATCH]
                    return (
                      <li key={a.id}>
                        <Link
                          href={`/dashboard/invest-match/teses/${a.teseId}`}
                          className="flex items-center gap-3 group"
                        >
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full border text-[11px] font-bold tabular-nums shrink-0 ${scoreBg(a.score)}`}>
                            {a.score}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] text-ink group-hover:text-accent-strong leading-tight line-clamp-1">
                              {a.empresaNome} <span className="text-accent-strong">↔</span> {a.investidorNome}
                            </div>
                            <div className="text-[11px] text-ink-3 leading-tight mt-0.5 flex items-center gap-1.5">
                              <span className={`inline-block px-1.5 py-0.5 rounded border ${meta?.cls ?? 'bg-surface-2 text-ink-3 border-border'}`}>
                                {meta?.label ?? a.status}
                              </span>
                              <span>{tempoRelativo(a.em)}</span>
                            </div>
                          </div>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* Top teses */}
          {dash.topTeses.length > 0 && (
            <section className="bg-surface border border-border rounded-xl p-5">
              <div className="flex items-center justify-between gap-4 mb-4">
                <h2 className="text-sm font-semibold text-ink">Teses com mais conexões</h2>
                <Link href="/dashboard/invest-match/teses" className="text-xs text-accent-strong hover:underline">
                  Ver todas →
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-ink-3 text-[11px] uppercase tracking-wider border-b border-border">
                    <tr>
                      <th className="text-left font-semibold py-2">Empresa</th>
                      <th className="text-left font-semibold py-2">Status</th>
                      <th className="text-right font-semibold py-2">Capital buscado</th>
                      <th className="text-right font-semibold py-2">Conexões</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dash.topTeses.map(t => (
                      <tr key={t.id} className="border-b border-border/60 hover:bg-surface-2/40 transition">
                        <td className="py-2.5">
                          <Link href={`/dashboard/invest-match/teses/${t.id}`} className="text-ink hover:text-accent-strong font-medium">
                            {t.empresaNome}
                          </Link>
                        </td>
                        <td className="py-2.5 text-ink-2">{STATUS_TESE_LABEL[t.status as keyof typeof STATUS_TESE_LABEL] ?? t.status}</td>
                        <td className="py-2.5 text-right tabular-nums text-ink-2">{formatBRL(t.capitalBuscadoBrl)}</td>
                        <td className="py-2.5 text-right tabular-nums text-ink font-semibold">{t.matchesCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Navegação rápida */}
          <section className="flex flex-wrap gap-2">
            {[
              { label: 'Central de matches', href: '/dashboard/invest-match/matches' },
              { label: 'Teses', href: '/dashboard/invest-match/teses' },
              { label: 'Investidores', href: '/dashboard/invest-match/investidores' },
              { label: 'Insights & calibração', href: '/dashboard/invest-match/insights' },
            ].map(l => (
              <Link
                key={l.href}
                href={l.href}
                className="px-3 py-1.5 rounded-lg bg-surface border border-border text-sm text-ink-2 hover:border-accent-strong/40 hover:text-ink transition"
              >
                {l.label}
              </Link>
            ))}
          </section>
        </>
      )}
    </div>
  )
}

function FilaBloco({
  titulo, total, itens, hrefTodos, vazio,
}: {
  titulo:    string
  total:     number
  itens:     { id: string; empresaNome: string; investidorNome: string; score: number; teseId: string }[]
  hrefTodos: string
  vazio:     string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[13px] font-medium text-ink">{titulo}</h3>
        <span className="bg-surface-2 px-2 py-0.5 rounded-full text-[11px] text-ink-3 tabular-nums">{total}</span>
      </div>
      {itens.length === 0 ? (
        <p className="text-xs text-ink-3">{vazio}</p>
      ) : (
        <ul className="space-y-1.5">
          {itens.map(m => (
            <li key={m.id}>
              <Link
                href={`/dashboard/invest-match/teses/${m.teseId}`}
                className="flex items-center gap-2.5 group rounded-md px-1 -mx-1 py-1 hover:bg-surface-2/50"
              >
                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full border text-[11px] font-bold tabular-nums shrink-0 ${scoreBg(m.score)}`}>
                  {m.score}
                </span>
                <span className="min-w-0 flex-1 text-[13px] text-ink-2 group-hover:text-ink leading-tight line-clamp-1">
                  {m.empresaNome} <span className="text-accent-strong">↔</span> {m.investidorNome}
                </span>
              </Link>
            </li>
          ))}
          {total > itens.length && (
            <li>
              <Link href={hrefTodos} className="text-xs text-accent-strong hover:underline">
                + {total - itens.length} no quadro →
              </Link>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

function OnboardingSteps() {
  return (
    <section className="bg-surface border border-border rounded-xl p-6">
      <h2 className="text-sm font-semibold text-ink mb-5">Como funciona, em 3 passos</h2>
      <div className="space-y-5">
        <PassoItem
          numero={1}
          titulo="Cadastre seus investidores"
          descricao="Registre o perfil de cada investidor: setores de interesse, faixa de ticket, estágio das empresas e uma descrição da estratégia. Quanto mais completo, melhores e mais certeiras as conexões."
          acaoLabel="Cadastrar investidor"
          acaoHref="/dashboard/invest-match/investidores/novo"
        />
        <PassoItem
          numero={2}
          titulo="Transforme uma análise em oportunidade"
          descricao="Escolha uma análise já concluída e, com um clique, ela vira uma tese de investimento pronta para conexão. O sistema lê o diagnóstico e organiza tudo automaticamente."
          acaoLabel="Gerar tese de uma análise"
          acaoHref="/dashboard/invest-match/teses/nova"
        />
        <PassoItem
          numero={3}
          titulo="Receba as conexões qualificadas"
          descricao="O sistema compara cada empresa com a base de investidores e apresenta as conexões mais promissoras — com uma explicação clara de por que combinam e o que conversar na primeira reunião."
          acaoLabel="Ver conexões"
          acaoHref="/dashboard/invest-match/matches"
        />
      </div>
    </section>
  )
}

function PassoItem({
  numero, titulo, descricao, acaoLabel, acaoHref,
}: {
  numero:    number
  titulo:    string
  descricao: string
  acaoLabel: string
  acaoHref:  string
}) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-7 h-7 rounded-full bg-accent-soft text-accent-ink grid place-items-center text-sm font-semibold">
        {numero}
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-ink">{titulo}</h3>
        <p className="text-sm text-ink-2 mt-1 leading-relaxed">{descricao}</p>
        <Link href={acaoHref} className="inline-block mt-2 text-sm font-medium text-accent-strong hover:underline">
          {acaoLabel} →
        </Link>
      </div>
    </div>
  )
}

// Tempo relativo simples em pt-BR (server-side, sem libs).
function tempoRelativo(iso: string): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diffMs = Date.now() - then
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.floor(h / 24)
  if (d < 30) return `há ${d} ${d === 1 ? 'dia' : 'dias'}`
  const meses = Math.floor(d / 30)
  return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`
}
