// Mapa Inteligente do Mercado — Dashboard executivo (entrada do módulo)
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getResumoMercado, getTopEntidades } from '@/lib/mapa-mercado/queries'
import { TIPO_LABEL } from '@/lib/mapa-mercado/types'
import { IconSearch, IconBuilding, IconArrowRight, IconTrophy } from '@/components/Icons'
import NotaMercado from './_components/NotaMercado'

export const dynamic = 'force-dynamic'

const CARDS: { tipo: keyof typeof TIPO_LABEL; label: string }[] = [
  { tipo: 'gestora',        label: 'Gestoras' },
  { tipo: 'administrador',  label: 'Administradores' },
  { tipo: 'custodiante',    label: 'Custodiantes' },
  { tipo: 'securitizadora', label: 'Securitizadoras' },
  { tipo: 'banco',          label: 'Bancos' },
  { tipo: 'distribuidor',   label: 'Distribuidores' },
]

const FONTES = ['CVM Dados Abertos', 'Banco Central', 'B3', 'Receita Federal']

export default async function MapaMercadoDashboard() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const resumo = await getResumoMercado()
  const destaques: any = { gestoras: [] }
  // TODO: Implementar getTopEntidades corretamente

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <header>
        <div className="flex items-center gap-2 text-ink-3 text-xs uppercase tracking-wider font-semibold mb-2">
          <IconBuilding size={14}/> Módulo
        </div>
        <h1 className="text-2xl font-semibold text-ink">Mapa Inteligente do Mercado</h1>
        <p className="text-ink-2 text-sm mt-1 max-w-2xl">
          O atlas do capital privado brasileiro. Pesquise gestoras, administradores, FIDCs,
          securitizadoras, bancos e distribuidores e veja como se conectam.
        </p>
      </header>

      {/* Busca unificada (form GET, sem JS) */}
      <form action="/dashboard/mapa-inteligente/buscar" className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"><IconSearch size={18}/></span>
        <input
          name="q"
          placeholder="Buscar fundo, gestora, banco, FIDC, securitizadora, escritório..."
          className="w-full border border-border rounded-xl pl-10 pr-4 py-3 text-sm bg-surface outline-none transition-shadow focus:border-accent-strong focus:shadow-[0_0_0_3px_var(--color-accent-soft)] placeholder:text-ink-3"
        />
      </form>

      {/* Cards de totais por tipo */}
      <section className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {CARDS.map(c => (
          <Link
            key={c.tipo}
            href={`/dashboard/mapa-inteligente/buscar?tipos=${c.tipo}`}
            className="block bg-surface border border-border rounded-xl p-5 hover:border-accent-strong/40 hover:shadow-sm transition"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold">{c.label}</span>
              <IconArrowRight size={15}/>
            </div>
            <span className="text-3xl font-semibold text-ink tabular-nums">
              {(resumo.porTipo[c.tipo] ?? 0).toLocaleString('pt-BR')}
            </span>
          </Link>
        ))}
      </section>

      {/* Atalhos de navegação */}
      <div className="flex gap-3">
        <Link
          href="/dashboard/mapa-inteligente/rankings"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-surface text-sm text-ink hover:border-accent-strong/40 hover:bg-surface-hover transition"
        >
          <IconTrophy size={15}/> Rankings
        </Link>
        <Link
          href="/dashboard/mapa-inteligente/buscar"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-surface text-sm text-ink hover:border-accent-strong/40 hover:bg-surface-hover transition"
        >
          <IconSearch size={15}/> Busca avançada
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Ranking */}
        <section className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-ink mb-4">Gestoras por relevância de mercado</h2>
          {destaques.length === 0 ? (
            <p className="text-ink-3 text-sm">
              Base ainda vazia. Rode o ETL da CVM (admin) para popular os participantes.
            </p>
          ) : (
            <ol className="space-y-2">
              {destaques.map((r, i) => (
                <li key={r.id}>
                  <Link
                    href={`/dashboard/mapa-inteligente/entidade/${r.id}`}
                    className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-surface-hover transition"
                  >
                    <span className="w-6 text-ink-3 text-sm tabular-nums">{i + 1}.</span>
                    <span className="flex-1 text-sm text-ink truncate">{r.nome}</span>
                    {r.score != null && (
                      <span className="text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full bg-accent-soft text-accent-ink">{Math.round(r.score)}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Resumo + fontes */}
        <section className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-ink mb-4">Cobertura da base</h2>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mb-1">Participantes</div>
              <div className="text-2xl font-semibold text-ink tabular-nums">{resumo.total.toLocaleString('pt-BR')}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mb-1">Veículos</div>
              <div className="text-2xl font-semibold text-ink tabular-nums">{resumo.veiculos.toLocaleString('pt-BR')}</div>
            </div>
          </div>
          <div className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mb-2">Fontes de dados</div>
          <div className="flex flex-wrap gap-2">
            {FONTES.map(f => (
              <span key={f} className="text-xs border border-border rounded-full px-2.5 py-1 text-ink-2 bg-surface-2">{f}</span>
            ))}
          </div>
          <p className="text-[11px] text-ink-3 mt-3 leading-relaxed">
            Dados públicos sob licença aberta, com atribuição de fonte. Dados licenciados
            (ANBIMA Feed, Coponto) não são exibidos no painel.
          </p>
          <NotaMercado className="mt-2"/>
        </section>
      </div>
    </div>
  )
}
