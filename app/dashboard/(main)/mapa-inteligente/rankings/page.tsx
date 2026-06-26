// @ts-nocheck
// Mapa Inteligente do Mercado — Rankings por categoria
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { searchEntidades } from '@/lib/mapa-mercado/queries'
import { TIPO_LABEL, type EntidadeTipo } from '@/lib/mapa-mercado/types'
import { IconArrowLeft, IconArrowRight, IconTrophy } from '@/components/Icons'

export const dynamic = 'force-dynamic'

const CATEGORIAS: { tipo: EntidadeTipo; label: string; descricao: string }[] = [
  { tipo: 'gestora',        label: 'Gestoras',        descricao: 'Por relevância e volume de veículos' },
  { tipo: 'administrador',  label: 'Administradores', descricao: 'Por nº de fundos administrados' },
  { tipo: 'custodiante',    label: 'Custodiantes',    descricao: 'Por volume de custódia' },
  { tipo: 'distribuidor',   label: 'Distribuidores',  descricao: 'Por capilaridade de distribuição' },
  { tipo: 'banco',          label: 'Bancos',          descricao: 'Por ativo total e carteira PJ' },
  { tipo: 'securitizadora', label: 'Securitizadoras', descricao: 'Por volume de operações CRI/CRA/FIDC' },
]

export default async function RankingsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const rankings = await Promise.all(
    CATEGORIAS.map(c => searchEntidades({ tipos: [c.tipo], limit: 15 }).then(r => ({
      tipo: c.tipo,
      rows: (r.entidades ?? []).sort((a: any, b: any) => (b.score_relevancia ?? 0) - (a.score_relevancia ?? 0))
    })).catch(() => ({ tipo: c.tipo, rows: [] })))
  )
  const rankingMap = new Map(rankings.map(r => [r.tipo, r.rows]))

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/mapa-inteligente" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
          <IconArrowLeft size={15}/> Mapa
        </Link>
      </div>

      <header>
        <div className="flex items-center gap-2 text-ink-3 text-xs uppercase tracking-wider font-semibold mb-2">
          <IconTrophy size={14}/> Rankings
        </div>
        <h1 className="text-2xl font-semibold text-ink">Rankings do Mercado</h1>
        <p className="text-ink-2 text-sm mt-1">
          Participantes por categoria, ordenados por relevância e volume de operações.
        </p>
      </header>

      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {CATEGORIAS.map(cat => {
          const rows = rankingMap.get(cat.tipo) ?? []
          return (
            <section key={cat.tipo} className="bg-surface border border-border rounded-xl p-5">
              <div className="flex items-start justify-between mb-1">
                <h2 className="text-sm font-semibold text-ink">{cat.label}</h2>
                <Link
                  href={`/dashboard/mapa-inteligente/buscar?tipos=${cat.tipo}`}
                  className="text-xs text-accent-ink hover:underline flex-none"
                >
                  Ver todos →
                </Link>
              </div>
              <p className="text-[11px] text-ink-3 mb-4">{cat.descricao}</p>
              {rows.length === 0 ? (
                <p className="text-ink-3 text-sm">Sem dados para esta categoria.</p>
              ) : (
                <ol className="space-y-1">
                  {rows.map((r, i) => (
                    <li key={r.id}>
                      <Link
                        href={`/dashboard/mapa-inteligente/entidade/${r.id}`}
                        className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-surface-hover transition group"
                      >
                        <span className={`w-6 text-sm tabular-nums flex-none font-medium ${
                          i === 0 ? 'text-yellow-600' : i === 1 ? 'text-zinc-500' : i === 2 ? 'text-amber-700' : 'text-ink-3'
                        }`}>{i + 1}</span>
                        <span className="flex-1 text-sm text-ink truncate">{r.nome_fantasia || r.razao_social}</span>
                        {r.num_veiculos != null && <span className="text-[11px] text-ink-3 tabular-nums flex-none">{r.num_veiculos} veíc.</span>}
                        {r.score_relevancia != null && (
                          <span className="text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded-full bg-accent-soft text-accent-ink flex-none">
                            {Math.round(r.score_relevancia)}
                          </span>
                        )}
                        <IconArrowRight size={12}/>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )
        })}
      </div>

      <p className="text-[11px] text-ink-3">
        Rankings calculados com base em dados públicos da CVM e Banco Central. Score de relevância derivado do volume e diversidade de veículos operados.
      </p>
    </div>
  )
}
