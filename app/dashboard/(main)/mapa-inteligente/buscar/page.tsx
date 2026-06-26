// Mapa Inteligente do Mercado — Busca + resultados (filtros via form GET)
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUserContext } from '@/lib/get-role'
import { hasModulo, getMapaBuscasIaUsage } from '@/lib/entitlements'
import { buscarEntidades, buscarSemantica, registrarBuscaIa } from '@/lib/mapa-mercado/queries'
import { TIPO_LABEL, type EntidadeTipo } from '@/lib/mapa-mercado/types'
import { IconSearch, IconArrowLeft } from '@/components/Icons'
import NotaMercado from '../_components/NotaMercado'

export const dynamic = 'force-dynamic'

const TIPOS_FILTRO: EntidadeTipo[] = [
  'gestora', 'administrador', 'custodiante', 'distribuidor',
  'banco', 'securitizadora', 'escritorio_credito_estruturado', 'family_office',
]

const UFS = ['SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'BA', 'DF', 'PE', 'CE', 'GO']

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full bg-accent-soft text-accent-ink">
      {Math.round(score)}
    </span>
  )
}

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  const isAdmin = ctx.role === 'admin'

  // tipos pode chegar como string ('gestora') OU array (['gestora','banco'])
  // quando o form marca vários checkboxes — tratar os dois casos.
  const sp = await searchParams
  const primeiro = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''
  const comoArray = (v: string | string[] | undefined): string[] =>
    v == null ? [] : Array.isArray(v) ? v : v.split(',')
  const q = primeiro(sp.q).trim()
  const tiposSel = comoArray(sp.tipos).filter(Boolean) as EntidadeTipo[]
  const uf = primeiro(sp.uf)

  // Módulo (liga o recurso) + limite mensal de buscas IA (conta o uso).
  const podeIA = isAdmin || await hasModulo(ctx.escritorioId, 'mapa_completo')
  const querIA = primeiro(sp.modo) === 'ia' && !!q && podeIA
  // Admin tem bypass do limite; demais checam mapa_buscas_ia_mes do mês corrente.
  const usoIA = querIA && !isAdmin ? await getMapaBuscasIaUsage(ctx.escritorioId) : null
  const limiteIaAtingido = usoIA?.atLimit ?? false
  const modoIA = querIA && !limiteIaAtingido

  const resultados = modoIA
    ? await buscarSemantica({ q, tipos: tiposSel.length ? tiposSel : undefined, uf: uf || undefined, limit: 50 })
    : await buscarEntidades({
        q: q || undefined,
        tipos: tiposSel.length ? tiposSel : undefined,
        uf: uf || undefined,
        limit: 50,
      })

  // Registra a busca IA para a contagem mensal (best-effort; só não-admin).
  // TODO: Implementar logging
  // if (modoIA && !isAdmin && ctx.escritorioId) {
  //   await registrarBuscaIa(ctx.escritorioId, ctx.userId, q, resultados.total)
  // }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      <Link href="/dashboard/mapa-inteligente" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink mb-4">
        <IconArrowLeft size={15}/> Mapa do Mercado
      </Link>

      <div className="grid md:grid-cols-[240px_1fr] gap-6">
        {/* Filtros (form GET) */}
        <aside>
          <form className="bg-surface border border-border rounded-xl p-4 space-y-4 sticky top-6">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"><IconSearch size={16}/></span>
              <input
                name="q" defaultValue={q} placeholder="Buscar..."
                className="w-full border border-border rounded-lg pl-9 pr-3 py-2 text-[13px] bg-surface outline-none focus:border-accent-strong"
              />
            </div>

            {podeIA ? (
              <label className="flex items-center gap-2 text-[12px] text-ink-2 cursor-pointer">
                <input type="checkbox" name="modo" value="ia" defaultChecked={modoIA} className="accent-[var(--color-accent-strong)]"/>
                Busca inteligente (IA)
              </label>
            ) : (
              <div className="flex items-center gap-2 text-[12px] text-ink-3">
                <input type="checkbox" disabled className="accent-[var(--color-accent-strong)]"/>
                Busca inteligente (IA) <span className="text-[10px] uppercase tracking-wider">· Professional</span>
              </div>
            )}

            <div>
              <div className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mb-2">Tipo</div>
              <div className="space-y-1.5">
                {TIPOS_FILTRO.map(t => (
                  <label key={t} className="flex items-center gap-2 text-[13px] text-ink-2 cursor-pointer">
                    <input type="checkbox" name="tipos" value={t} defaultChecked={tiposSel.includes(t)} className="accent-[var(--color-accent-strong)]"/>
                    {TIPO_LABEL[t]}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mb-2">UF</div>
              <select name="uf" defaultValue={uf} className="w-full border border-border rounded-lg px-2 py-2 text-[13px] bg-surface outline-none">
                <option value="">Todas</option>
                {UFS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="flex-1 px-3 py-2 rounded-lg bg-accent-strong text-white text-[13px] font-medium hover:opacity-90">Aplicar</button>
              <Link href="/dashboard/mapa-inteligente/buscar" className="px-3 py-2 rounded-lg border border-border text-[13px] text-ink-2 hover:bg-surface-hover">Limpar</Link>
            </div>
          </form>
        </aside>

        {/* Resultados */}
        <main>
          {limiteIaAtingido && (
            <div className="mb-3 bg-surface border border-accent-strong/30 rounded-xl px-4 py-3">
              <p className="text-[13px] font-medium text-ink mb-0.5">
                Limite de buscas IA do mês atingido
              </p>
              <p className="text-[12px] text-ink-3 leading-relaxed">
                Seu plano inclui <span className="font-semibold text-ink">{usoIA?.max}</span> buscas inteligentes por mês.
                Mostrando resultados por nome. O limite renova no início do próximo mês; para ampliar, faça upgrade
                em <span className="text-accent-strong">Planos</span>.
              </p>
            </div>
          )}

          <div className="flex items-baseline justify-between mb-3">
            <h1 className="text-lg font-semibold text-ink">
              {q ? <>Resultados para “{q}”</> : 'Participantes do mercado'}
              {modoIA && <span className="ml-2 text-[11px] font-semibold align-middle px-1.5 py-0.5 rounded-full bg-accent-soft text-accent-ink">IA</span>}
            </h1>
            <span className="text-sm text-ink-3 tabular-nums">{resultados.total} {resultados.total === 1 ? 'resultado' : 'resultados'}</span>
          </div>

          {modoIA && usoIA && usoIA.max != null && (
            <p className="text-[11px] text-ink-3 -mt-2 mb-3">
              Buscas IA: {Math.min(usoIA.count + 1, usoIA.max)} de {usoIA.max} este mês
            </p>
          )}

          {resultados.total === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-8 text-center">
              <p className="text-ink-2 text-sm">Nenhum participante encontrado.</p>
              <p className="text-ink-3 text-xs mt-1">Ajuste os filtros ou rode o ETL da CVM (admin) para popular a base.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {resultados.entidades.map(e => (
                <li key={e.id}>
                  <Link
                    href={`/dashboard/mapa-inteligente/entidade/${e.id}`}
                    className="flex items-center gap-4 bg-surface border border-border rounded-xl p-4 hover:border-accent-strong/40 hover:shadow-sm transition"
                  >
                    <div className="w-10 h-10 rounded-lg bg-surface-2 border border-border grid place-items-center text-ink-3 text-sm font-semibold flex-none overflow-hidden">
                      {e.logo_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={e.logo_url} alt="" className="w-full h-full object-contain"/>
                        : (e.nome_fantasia || e.razao_social).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-ink truncate">{e.nome_fantasia || e.razao_social}</span>
                        <ScoreBadge score={e.score_relevancia}/>
                      </div>
                      <div className="text-xs text-ink-3 truncate">
                        {e.tipos.map(t => TIPO_LABEL[t] ?? t).join(' · ')}
                        {e.uf ? ` · ${e.municipio ? e.municipio + '/' : ''}${e.uf}` : ''}
                      </div>
                    </div>
                    <div className="text-right flex-none">
                      {/* TODO: num_veiculos */}
                      <div className="text-[10px] uppercase tracking-wider text-ink-3">veículos</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <NotaMercado className="mt-4"/>
        </main>
      </div>
    </div>
  )
}
