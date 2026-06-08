import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { resolveEscritorioId } from '@/lib/invest-match/auth-helpers'
import { computeFeedbackStats } from '@/lib/invest-match/feedback-service'
import { IconArrowLeft } from '@/components/Icons'

export const dynamic = 'force-dynamic'

const AVALIACAO_LABEL: Record<string, string> = {
  muito_bom: 'Excelente', bom: 'Bom', neutro: 'Neutro', ruim: 'Fraco', muito_ruim: 'Ruim',
}

export default async function InsightsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const escritorioId = await resolveEscritorioId(user.id)
  if (!escritorioId) redirect('/dashboard/invest-match')

  const stats = await computeFeedbackStats(escritorioId)

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/invest-match" className="p-1.5 rounded-md hover:bg-surface-hover text-ink-2">
          <IconArrowLeft size={18}/>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-ink">Insights & Calibração</h1>
          <p className="text-ink-3 text-xs mt-0.5">Aprendizado do motor a partir do feedback real dos matches</p>
        </div>
      </div>

      {/* Resumo */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Matches" value={stats.total_matches}/>
        <Kpi label="Com outcome" value={stats.com_outcome}/>
        <Kpi label="Sucessos" value={stats.sucessos} tone="ok"/>
        <Kpi label="Fracassos" value={stats.fracassos} tone="warn"/>
      </section>

      {/* Conversão por faixa de score */}
      <section className="bg-surface border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-ink mb-1">Conversão por faixa de score</h2>
        <p className="text-xs text-ink-3 mb-4">
          Valida se score mais alto realmente prediz mais avanço no funil. Se a taxa não cresce com a faixa, o motor precisa de calibração.
        </p>
        <div className="space-y-2">
          {stats.conversao_por_faixa.map(f => (
            <div key={f.faixa} className="flex items-center gap-3">
              <span className="text-xs text-ink-2 w-16 tabular-nums">{f.faixa}</span>
              <div className="flex-1 h-5 bg-surface-2 rounded-md overflow-hidden relative">
                <div className="h-full bg-accent-strong/70" style={{ width: `${f.taxa}%` }}/>
                <span className="absolute inset-0 flex items-center px-2 text-[11px] text-ink-2">
                  {f.taxa}% · {f.sucessos}/{f.total}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Distribuição de avaliações */}
      {Object.keys(stats.distribuicao_avaliacao).length > 0 && (
        <section className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-ink mb-4">Distribuição de avaliações</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.distribuicao_avaliacao).map(([k, v]) => (
              <div key={k} className="bg-surface-2 rounded-lg px-4 py-2 text-center">
                <div className="text-lg font-semibold text-ink tabular-nums">{v}</div>
                <div className="text-[11px] text-ink-3">{AVALIACAO_LABEL[k] ?? k}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Poder discriminativo + pesos sugeridos */}
      <section className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 mb-1">
          <h2 className="text-sm font-semibold text-ink">Dimensões: poder preditivo e calibração sugerida</h2>
        </div>
        <p className="text-xs text-ink-3 mb-4">
          Para cada dimensão: média do score em matches que avançaram (sucesso) vs encerraram (fracasso).
          A diferença (poder) indica o quanto a dimensão separa bons de maus matches.
          {stats.amostra_suficiente
            ? ' O peso sugerido mistura 30% desse sinal com os pesos atuais.'
            : ` Amostra insuficiente para sugerir pesos (mínimo ${stats.min_amostra} matches com outcome).`}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-ink-3 text-[11px] uppercase tracking-wider border-b border-border">
              <tr>
                <th className="text-left font-semibold py-2">Dimensão</th>
                <th className="text-right font-semibold py-2">Méd. sucesso</th>
                <th className="text-right font-semibold py-2">Méd. fracasso</th>
                <th className="text-right font-semibold py-2">Poder</th>
                <th className="text-right font-semibold py-2">Peso atual</th>
                <th className="text-right font-semibold py-2">Peso sugerido</th>
              </tr>
            </thead>
            <tbody>
              {stats.dimensoes.map(d => {
                const delta = d.peso_sugerido != null ? d.peso_sugerido - d.peso_atual : null
                return (
                  <tr key={d.dimensao} className="border-b border-border/60">
                    <td className="py-2 text-ink">{d.label}</td>
                    <td className="py-2 text-right tabular-nums text-ink-2">{d.media_sucesso ?? '—'}</td>
                    <td className="py-2 text-right tabular-nums text-ink-2">{d.media_fracasso ?? '—'}</td>
                    <td className={`py-2 text-right tabular-nums ${d.poder > 0 ? 'text-ok' : d.poder < 0 ? 'text-warn' : 'text-ink-3'}`}>
                      {d.poder > 0 ? '+' : ''}{d.poder}
                    </td>
                    <td className="py-2 text-right tabular-nums text-ink-3">{(d.peso_atual * 100).toFixed(0)}%</td>
                    <td className="py-2 text-right tabular-nums">
                      {d.peso_sugerido != null ? (
                        <span className="text-ink">
                          {(d.peso_sugerido * 100).toFixed(1)}%
                          {delta != null && Math.abs(delta) >= 0.005 && (
                            <span className={delta > 0 ? 'text-ok' : 'text-warn'}>
                              {' '}({delta > 0 ? '+' : ''}{(delta * 100).toFixed(1)})
                            </span>
                          )}
                        </span>
                      ) : <span className="text-ink-3">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {stats.amostra_suficiente && (
          <div className="mt-4 p-3 rounded-lg bg-surface-2 text-xs text-ink-2 leading-relaxed">
            <strong className="text-ink">Como aplicar:</strong> os pesos sugeridos são uma recomendação baseada
            em {stats.com_outcome} matches com outcome. A aplicação é manual e deve ser feita por quem conhece o
            negócio. Edite os pesos na função SQL <span className="font-mono">invest_match_buscar_candidatos</span>{' '}
            e em <span className="font-mono">lib/invest-match/weights.ts</span>. Recalibração automática foi
            deixada de fora de propósito: aplicar pesos com amostra pequena causa overfitting.
          </div>
        )}
      </section>
    </div>
  )
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: 'ok' | 'warn' }) {
  const color = tone === 'ok' ? 'text-ok' : tone === 'warn' ? 'text-warn' : 'text-ink'
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums mt-1 ${color}`}>{value}</div>
    </div>
  )
}
