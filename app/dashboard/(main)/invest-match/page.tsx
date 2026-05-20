import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { resolveEscritorioId } from '@/lib/invest-match/auth-helpers'
import { IconHandshake, IconUsers, IconBuilding, IconPlus, IconSparkle } from '@/components/Icons'

// Overview do módulo Invest Match.
// Server component: lê contagens diretas do banco com createAdminClient
// (autorizado pelo escritório do user). Sem fetch ao próprio API.

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

  // Contagens
  const admin = createAdminClient()
  const [invAtivosRes, invTotalRes, tesesRes, matchesRes] = await Promise.all([
    admin.from('investidores').select('*', { count: 'exact', head: true })
      .eq('escritorio_id', escritorioId).eq('status', 'ativo'),
    admin.from('investidores').select('*', { count: 'exact', head: true })
      .eq('escritorio_id', escritorioId),
    admin.from('teses').select('*', { count: 'exact', head: true })
      .eq('escritorio_id', escritorioId),
    admin.from('matches').select('*', { count: 'exact', head: true })
      .eq('escritorio_id', escritorioId).in('status', ['sugerido','aprovado_auto','aprovado_admin','notificado','em_negociacao']),
  ])

  const kpis = [
    {
      label: 'Investidores ativos',
      value: invAtivosRes.count ?? 0,
      total: invTotalRes.count ?? 0,
      icon:  IconUsers,
      href:  '/dashboard/invest-match/investidores',
    },
    {
      label: 'Teses estruturadas',
      value: tesesRes.count ?? 0,
      icon:  IconBuilding,
      href:  '/dashboard/invest-match/teses',
    },
    {
      label: 'Matches em andamento',
      value: matchesRes.count ?? 0,
      icon:  IconSparkle,
      href:  '/dashboard/invest-match/matches',
    },
  ]

  const linksRapidos = [
    { label: 'Central de matches', href: '/dashboard/invest-match/matches' },
    { label: 'Teses', href: '/dashboard/invest-match/teses' },
    { label: 'Investidores', href: '/dashboard/invest-match/investidores' },
    { label: 'Insights & calibração', href: '/dashboard/invest-match/insights' },
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
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

      {/* Navegação rápida */}
      <section className="flex flex-wrap gap-2">
        {linksRapidos.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className="px-3 py-1.5 rounded-lg bg-surface border border-border text-sm text-ink-2 hover:border-accent-strong/40 hover:text-ink transition"
          >
            {l.label}
          </Link>
        ))}
      </section>

      {/* Como funciona — 3 passos */}
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
    </div>
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
