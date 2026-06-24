// Mapa Inteligente do Mercado — Ficha da entidade (perfil 360º)
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getEntidade, getVeiculosDaEntidade, contarVeiculosDaEntidade, getConexoes, getMetricas, montarPerfil } from '@/lib/mapa-mercado/queries'
import { TIPO_LABEL, PAPEL_LABEL, CONEXAO_LABEL, veiculoEncerrado, type EntidadeTipo } from '@/lib/mapa-mercado/types'
import { IconArrowLeft, IconArrowRight, IconHandshake } from '@/components/Icons'
import NotaMercado from '../../_components/NotaMercado'

// Tipos do Mapa que fazem sentido como investidor/alocador no Invest Match.
const TIPOS_INVESTIDOR = new Set<EntidadeTipo>([
  'gestora', 'banco', 'family_office', 'asset', 'boutique_investimento',
  'escritorio_credito_estruturado', 'securitizadora', 'consultoria',
])

export const dynamic = 'force-dynamic'

function formatCnpj(cnpj: string | null): string | null {
  if (!cnpj || cnpj.length !== 14) return cnpj
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`
}

export default async function EntidadePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const entidade = await getEntidade(id)
  if (!entidade) notFound()

  const [veiculos, totalVeiculos, conexoes, metricas] = await Promise.all([
    getVeiculosDaEntidade(id, 500),
    contarVeiculosDaEntidade(id),
    getConexoes(id),
    getMetricas(id),
  ])

  const nome = entidade.nome_fantasia || entidade.razao_social
  const veiculosAtivos    = veiculos.filter(v => !veiculoEncerrado(v.veiculo_situacao))
  const veiculosEncerrados = veiculos.filter(v => veiculoEncerrado(v.veiculo_situacao))
  const perfil = montarPerfil(totalVeiculos, veiculos)
  // Último valor por métrica financeira (BCB)
  const FIN_ORDEM: { k: string; label: string }[] = [
    { k: 'ativo_total', label: 'Ativo total' },
    { k: 'carteira_pj', label: 'Carteira PJ' },
    { k: 'carteira_credito', label: 'Carteira de crédito' },
    { k: 'patrimonio_liquido', label: 'Patrimônio líquido' },
    { k: 'lucro_liquido', label: 'Lucro líquido' },
    { k: 'captacoes', label: 'Captações' },
  ]
  const ultimoPorMetrica = new Map<string, { valor: number | null; competencia: string }>()
  for (const m of metricas) {
    const cur = ultimoPorMetrica.get(m.metrica)
    if (!cur || m.competencia > cur.competencia) ultimoPorMetrica.set(m.metrica, { valor: m.valor, competencia: m.competencia })
  }
  const finItens = FIN_ORDEM.filter(f => ultimoPorMetrica.has(f.k))
  const teseTexto = montarTeseTexto(nome, entidade.tipos, perfil, conexoes.slice(0, 3).map(c => c.nome))

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto w-full space-y-6">
      <Link href="/dashboard/mapa-inteligente/buscar" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
        <IconArrowLeft size={15}/> Voltar à busca
      </Link>

      {/* Header */}
      <header className="bg-surface border border-border rounded-xl p-6 flex items-start gap-5">
        <div className="w-16 h-16 rounded-xl bg-surface-2 border border-border grid place-items-center text-ink-3 text-xl font-semibold flex-none overflow-hidden">
          {entidade.logo_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={entidade.logo_url} alt="" className="w-full h-full object-contain"/>
            : nome.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-ink">{nome}</h1>
          {entidade.nome_fantasia && entidade.razao_social !== entidade.nome_fantasia && (
            <p className="text-sm text-ink-3">{entidade.razao_social}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {entidade.tipos.map(t => (
              <span key={t} className="text-[11px] font-medium border border-border rounded-full px-2 py-0.5 text-ink-2 bg-surface-2">
                {TIPO_LABEL[t] ?? t}
              </span>
            ))}
          </div>
          <div className="text-xs text-ink-3 mt-2 space-x-3">
            {entidade.cnpj && <span>CNPJ {formatCnpj(entidade.cnpj)}</span>}
            {entidade.situacao && <span>{entidade.situacao}</span>}
            {entidade.uf && <span>{entidade.municipio ? `${entidade.municipio}/` : ''}{entidade.uf}</span>}
          </div>
        </div>
        {entidade.score_relevancia != null && (
          <div className="text-center flex-none">
            <div className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold mb-1">Relevância de mercado</div>
            <div className="text-3xl font-semibold text-accent-ink tabular-nums">{Math.round(entidade.score_relevancia)}</div>
            <div className="w-16 h-1.5 rounded-full bg-surface-2 mt-1 overflow-hidden">
              <div className="h-full bg-accent-strong" style={{ width: `${entidade.score_relevancia}%` }}/>
            </div>
          </div>
        )}
      </header>

      {/* Ação: originar investidor no Invest Match (Mapa → Invest Match) */}
      {entidade.tipos.some(t => TIPOS_INVESTIDOR.has(t)) && (
        <Link
          href={`/dashboard/invest-match/investidores/novo?${new URLSearchParams({
            nome:   entidade.razao_social,
            tipo:   entidade.tipos.find(t => TIPOS_INVESTIDOR.has(t)) ?? '',
            cidade: entidade.municipio ?? '',
            uf:     entidade.uf ?? '',
          }).toString()}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-strong text-white text-sm font-medium hover:opacity-90"
        >
          <IconHandshake size={16}/> Cadastrar como investidor no Invest Match
        </Link>
      )}

      {/* Cards de indicadores */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="Veículos" value={totalVeiculos.toLocaleString('pt-BR')}/>
        <Card label="Conexões" value={conexoes.length.toLocaleString('pt-BR')}/>
        <Card label="Papéis" value={entidade.tipos.length.toLocaleString('pt-BR')}/>
        <Card label="FIDCs" value={(perfil.por_tipo.find(t => t.tipo === 'FIDC')?.n ?? 0).toLocaleString('pt-BR')}/>
      </section>

      {/* Indicadores financeiros (BCB IF.data) — só p/ bancos com dados */}
      {finItens.length > 0 && (
        <section className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink">Indicadores financeiros</h2>
            <span className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold">Fonte BCB IF.data</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {finItens.map(f => {
              const item = ultimoPorMetrica.get(f.k)!
              return (
                <div key={f.k}>
                  <div className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mb-1">{f.label}</div>
                  <div className="text-lg font-semibold text-ink tabular-nums">{brlCompacto(item.valor)}</div>
                  <div className="text-[10px] text-ink-3 tabular-nums">{item.competencia.slice(5, 7)}/{item.competencia.slice(0, 4)}</div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Perfil de atuação (tese derivada dos dados) */}
      <section className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-ink">Perfil de atuação</h2>
          <span className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold">tese · derivada dos dados</span>
        </div>
        <p className="text-sm text-ink-2 leading-relaxed">{teseTexto}</p>
        {(perfil.por_tipo.length > 0 || perfil.top_categorias.length > 0) && (
          <div className="grid sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
            {perfil.por_tipo.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mb-2">Veículos por tipo</div>
                <div className="flex flex-wrap gap-1.5">
                  {perfil.por_tipo.slice(0, 6).map(t => (
                    <span key={t.tipo} className="text-[11px] border border-border rounded-full px-2 py-0.5 text-ink-2 bg-surface-2 tabular-nums">
                      {t.tipo} · {t.n}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {perfil.top_categorias.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mb-2">Principais classes (mandato CVM)</div>
                <div className="flex flex-wrap gap-1.5">
                  {perfil.top_categorias.map(c => (
                    <span key={c.categoria} className="text-[11px] border border-border rounded-full px-2 py-0.5 text-ink-2 bg-surface-2 tabular-nums">
                      {c.categoria} · {c.n}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Veículos */}
        <section className="bg-surface border border-border rounded-xl p-5 space-y-5">
          <h2 className="text-sm font-semibold text-ink">
            Veículos ({totalVeiculos.toLocaleString('pt-BR')}{totalVeiculos > veiculos.length ? ` · mostrando ${veiculos.length}` : ''})
          </h2>
          {veiculos.length === 0 ? (
            <p className="text-ink-3 text-sm">Nenhum veículo vinculado.</p>
          ) : (
            <>
              {veiculosAtivos.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-2">
                    Ativos ({veiculosAtivos.length})
                  </div>
                  <ul className="divide-y divide-border">
                    {veiculosAtivos.slice(0, 40).map(v => (
                      <li key={`${v.veiculo_id}-${v.papel}`}>
                        <Link
                          href={`/dashboard/mapa-inteligente/veiculo/${v.veiculo_id}`}
                          className="py-2 flex items-center gap-3 hover:bg-surface-hover rounded-lg px-1 transition"
                        >
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-2 text-ink-2 border border-border flex-none">{v.veiculo_tipo}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-ink truncate">{v.veiculo_nome}</div>
                            {v.veiculo_categoria && <div className="text-[11px] text-ink-3 truncate">{v.veiculo_categoria}</div>}
                          </div>
                          <span className="text-xs text-ink-3 flex-none">{PAPEL_LABEL[v.papel] ?? v.papel}</span>
                          <IconArrowRight size={12}/>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {veiculosEncerrados.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-2">
                    Histórico — encerrados ({veiculosEncerrados.length})
                  </div>
                  <ul className="divide-y divide-border opacity-60">
                    {veiculosEncerrados.slice(0, 20).map(v => (
                      <li key={`${v.veiculo_id}-${v.papel}`}>
                        <Link
                          href={`/dashboard/mapa-inteligente/veiculo/${v.veiculo_id}`}
                          className="py-2 flex items-center gap-3 hover:bg-surface-hover rounded-lg px-1 transition"
                        >
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-2 text-ink-2 border border-border flex-none">{v.veiculo_tipo}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-ink truncate line-through">{v.veiculo_nome}</div>
                            {v.veiculo_situacao && <div className="text-[11px] text-ink-3 truncate">{v.veiculo_situacao}</div>}
                          </div>
                          <span className="text-xs text-ink-3 flex-none">{PAPEL_LABEL[v.papel] ?? v.papel}</span>
                          <IconArrowRight size={12}/>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>

        {/* Mapa de conexões (vizinhança) */}
        <section className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink">Conexões ({conexoes.length})</h2>
            {conexoes.length > 0 && (
              <Link href={`/dashboard/mapa-inteligente/entidade/${id}/grafo`} className="text-xs font-medium text-accent-ink hover:underline">
                Ver mapa →
              </Link>
            )}
          </div>
          {conexoes.length === 0 ? (
            <p className="text-ink-3 text-sm">Nenhuma conexão mapeada ainda. As conexões são geradas após o ETL da CVM.</p>
          ) : (
            <ul className="space-y-1.5">
              {conexoes.map(c => (
                <li key={c.entidade_id}>
                  <Link
                    href={`/dashboard/mapa-inteligente/entidade/${c.entidade_id}`}
                    className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-surface-hover transition"
                  >
                    <span className="flex-1 text-sm text-ink truncate">{c.nome}</span>
                    <span className="text-[11px] text-ink-3">{CONEXAO_LABEL[c.tipo] ?? c.tipo}</span>
                    <span className="text-xs text-ink-2 tabular-nums w-8 text-right">{c.peso}</span>
                    <IconArrowRight size={13}/>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="space-y-1">
        <p className="text-[11px] text-ink-3">
          Fonte: {entidade.fonte === 'seed' ? 'demonstração' : entidade.fonte.toUpperCase()} · dados públicos com atribuição de fonte.
        </p>
        <NotaMercado/>
      </div>
    </div>
  )
}

// Monta a "tese de atuação" em texto, a partir do perfil derivado.
function montarTeseTexto(
  nome: string,
  tipos: EntidadeTipo[],
  perfil: { total_veiculos: number; por_tipo: { tipo: string; n: number }[]; por_papel: { papel: string; n: number }[]; top_categorias: { categoria: string; n: number }[] },
  parceiros: string[],
): string {
  const papeis = tipos.map(t => (TIPO_LABEL[t] ?? t).toLowerCase())
  const papelTxt = papeis.length === 1
    ? papeis[0]
    : papeis.slice(0, -1).join(', ') + ' e ' + papeis[papeis.length - 1]

  if (perfil.total_veiculos === 0) {
    return `${nome} atua como ${papelTxt} no mercado de capitais brasileiro. Ainda não há veículos vinculados na base pública da CVM.`
  }

  const tiposTop = perfil.por_tipo.slice(0, 3).map(t => `${t.n} ${t.tipo}`).join(', ')
  const catTop = perfil.top_categorias.slice(0, 3).map(c => c.categoria).join(', ')
  const papelPrincipal = perfil.por_papel[0]
    ? (PAPEL_LABEL[perfil.por_papel[0].papel as keyof typeof PAPEL_LABEL] ?? perfil.por_papel[0].papel).toLowerCase()
    : papelTxt

  let txt = `${nome} atua como ${papelTxt} e aparece em ${perfil.total_veiculos.toLocaleString('pt-BR')} veículo${perfil.total_veiculos === 1 ? '' : 's'} regulado${perfil.total_veiculos === 1 ? '' : 's'} pela CVM`
  if (tiposTop) txt += ` (${tiposTop})`
  txt += `, predominantemente como ${papelPrincipal}.`
  if (catTop) txt += ` Mandatos mais frequentes: ${catTop}.`
  if (parceiros.length) txt += ` Principais parceiros recorrentes: ${parceiros.join(', ')}.`
  return txt
}

// Formata BRL de forma compacta (tri/bi/mi) para os indicadores financeiros.
function brlCompacto(v: number | null): string {
  if (v == null) return '—'
  const a = Math.abs(v)
  if (a >= 1e12) return `R$ ${(v / 1e12).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} tri`
  if (a >= 1e9)  return `R$ ${(v / 1e9).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} bi`
  if (a >= 1e6)  return `R$ ${(v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  return `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mb-2">{label}</div>
      <div className="text-2xl font-semibold text-ink tabular-nums">{value}</div>
    </div>
  )
}
