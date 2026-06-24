// Mapa Inteligente do Mercado — Ficha do Veículo (fundo/FIDC/CRI/CRA etc.)
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getVeiculo, getPrestadoresDoVeiculo } from '@/lib/mapa-mercado/queries'
import { TIPO_LABEL, PAPEL_LABEL } from '@/lib/mapa-mercado/types'
import { IconArrowLeft, IconArrowRight } from '@/components/Icons'
import NotaMercado from '../../_components/NotaMercado'

export const dynamic = 'force-dynamic'

function formatCnpj(cnpj: string | null): string | null {
  if (!cnpj || cnpj.length !== 14) return cnpj
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`
}

const PAPEL_ORDEM = ['administrador', 'gestor', 'co_gestor', 'custodiante', 'distribuidor', 'controladoria']

export default async function VeiculoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [veiculo, prestadores] = await Promise.all([
    getVeiculo(id),
    getPrestadoresDoVeiculo(id),
  ])

  if (!veiculo) notFound()

  const prestadoresOrdenados = prestadores.sort((a, b) => {
    const ia = PAPEL_ORDEM.indexOf(a.papel)
    const ib = PAPEL_ORDEM.indexOf(b.papel)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })

  const porPapel = new Map<string, typeof prestadores>()
  for (const p of prestadoresOrdenados) {
    const arr = porPapel.get(p.papel) ?? []
    arr.push(p)
    porPapel.set(p.papel, arr)
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full space-y-6">
      <Link href="/dashboard/mapa-inteligente/buscar" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
        <IconArrowLeft size={15}/> Voltar à busca
      </Link>

      {/* Header */}
      <header className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-accent-soft text-accent-ink border border-accent-soft">
                {veiculo.tipo}
              </span>
              {veiculo.situacao && (
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${
                  veiculo.situacao.toLowerCase() === 'ativo'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {veiculo.situacao.toUpperCase()}
                </span>
              )}
              {veiculo.esg && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">ESG</span>
              )}
            </div>
            <h1 className="text-xl font-semibold text-ink">{veiculo.nome}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-ink-3">
              {veiculo.cnpj && <span>CNPJ {formatCnpj(veiculo.cnpj)}</span>}
              {veiculo.codigo_cvm && <span>CVM {veiculo.codigo_cvm}</span>}
              {veiculo.categoria_cvm && <span>{veiculo.categoria_cvm}</span>}
              {veiculo.classe_anbima && <span>ANBIMA · {veiculo.classe_anbima}</span>}
            </div>
          </div>
        </div>
      </header>

      {/* Prestadores de serviço */}
      <section className="bg-surface border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-ink mb-4">
          Prestadores de serviço ({prestadores.length})
        </h2>
        {prestadores.length === 0 ? (
          <p className="text-ink-3 text-sm">Nenhum prestador vinculado na base CVM.</p>
        ) : (
          <div className="space-y-5">
            {[...porPapel.entries()].map(([papel, lista]) => (
              <div key={papel}>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-2">
                  {PAPEL_LABEL[papel as keyof typeof PAPEL_LABEL] ?? papel}
                </div>
                <ul className="divide-y divide-border">
                  {lista.map(p => (
                    <li key={p.entidade_id}>
                      <Link
                        href={`/dashboard/mapa-inteligente/entidade/${p.entidade_id}`}
                        className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-surface-hover transition"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-ink">{p.nome}</div>
                          {p.tipos.length > 0 && (
                            <div className="text-[11px] text-ink-3 mt-0.5">
                              {p.tipos.map(t => TIPO_LABEL[t] ?? t).join(', ')}
                            </div>
                          )}
                        </div>
                        {p.uf && <span className="text-xs text-ink-3 flex-none">{p.uf}</span>}
                        <IconArrowRight size={13}/>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="space-y-1">
        <p className="text-[11px] text-ink-3">
          Fonte: {veiculo.fonte === 'seed' ? 'demonstração' : veiculo.fonte.toUpperCase()} · dados públicos com atribuição de fonte.
        </p>
        <NotaMercado/>
      </div>
    </div>
  )
}
