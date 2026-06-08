'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatDateTimeBR } from '@/lib/format-date'

type Severidade = 'bloqueante' | 'alerta' | 'info'

interface Issue {
  id:                string
  severidade:        Severidade
  tipo:              string
  resumo:            string
  detalhes:          Record<string, unknown> | null
  steps_envolvidos:  string[]
  fact_ids:          string[]
  benchmark_ids:     string[]
  claim_ids:         string[]
  resolvido:         boolean
  resolucao_nota:    string | null
  criado_em:         string
}

const SEV_CFG: Record<Severidade, { label: string; cls: string; icon: string }> = {
  bloqueante: { label: 'BLOQUEANTE', cls: 'text-warn bg-warn/10 border-warn/30',                       icon: '⛔' },
  alerta:     { label: 'ALERTA',     cls: 'text-accent-strong bg-accent-soft border-accent/30',       icon: '⚠'  },
  info:       { label: 'INFO',       cls: 'text-ink-2 bg-surface-2 border-border',                    icon: 'ℹ'  },
}

const TIPO_LABEL: Record<string, string> = {
  numero_divergente:      'Número diverge do truth layer',
  numero_inter_agente:    'Dois agentes citam valores diferentes',
  benchmark_violado:      'Recomendação viola benchmark',
  fato_contradito:        'Fato contradito',
  lacuna_critica:         'Claim baseada em lacuna',
  recomendacao_sem_fonte: 'Recomendação sem fonte citada',
}

interface ConsistencyPanelProps {
  analiseId: string
}

export default function ConsistencyPanel({ analiseId }: ConsistencyPanelProps) {
  const [issues,    setIssues]    = useState<Issue[]>([])
  const [checkedAt, setCheckedAt] = useState<string | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [rerunning, setRerunning] = useState(false)
  const [erro,      setErro]      = useState('')

  const load = useCallback(async () => {
    setLoading(true); setErro('')
    try {
      const r = await fetch(`/api/analise/${analiseId}/consistency-check`, { cache: 'no-store' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Erro')
      setIssues(d.issues ?? [])
      setCheckedAt(d.checked_at ?? null)
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [analiseId])

  useEffect(() => { void load() }, [load])

  async function rerun() {
    setRerunning(true)
    try {
      const r = await fetch(`/api/analise/${analiseId}/consistency-check`, { method: 'POST' })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        alert(d.error || 'Erro ao re-validar')
        return
      }
      await load()
    } finally {
      setRerunning(false)
    }
  }

  if (loading) {
    return <div className="text-ink-3 text-[13px] py-10 text-center">Carregando análise de consistência...</div>
  }

  if (erro) {
    return <div className="rounded-[10px] bg-warn/10 text-warn text-[13px] p-4">{erro}</div>
  }

  // Agrupa por severidade
  const grupos = new Map<Severidade, Issue[]>()
  for (const i of issues) {
    if (i.resolvido) continue
    const arr = grupos.get(i.severidade) ?? []
    arr.push(i)
    grupos.set(i.severidade, arr)
  }

  const totalNaoResolvido = Array.from(grupos.values()).reduce((a, b) => a + b.length, 0)
  const bloqueantes = grupos.get('bloqueante')?.length ?? 0

  return (
    <div className="bg-surface border border-border rounded-[14px] shadow-soft-sm overflow-hidden">
      <div className="flex items-center justify-between px-7 py-4 border-b border-border">
        <div>
          <h2 className="font-display text-[18px] font-medium">
            Análise de consistência
            {bloqueantes > 0 && (
              <span className="ml-3 text-[12px] text-warn font-medium">⛔ Revisão pendente</span>
            )}
          </h2>
          <p className="text-[11px] text-ink-3 mt-0.5">
            {checkedAt
              ? `Última verificação: ${formatDateTimeBR(checkedAt, { second: '2-digit' })}`
              : 'Ainda não verificada. Clique em Re-validar'}
            {totalNaoResolvido > 0 && ` · ${totalNaoResolvido} pendente${totalNaoResolvido === 1 ? '' : 's'}`}
          </p>
        </div>
        <button
          onClick={rerun}
          disabled={rerunning}
          className="text-[12px] text-ink-3 hover:text-ink flex items-center gap-1.5 disabled:opacity-40"
        >
          {rerunning ? 'Validando...' : '↺ Re-validar'}
        </button>
      </div>

      <div className="p-7">
        {totalNaoResolvido === 0 ? (
          <div className="text-center py-10 text-[13px]">
            <p className="text-ok font-medium">✓ Nenhuma inconsistência detectada</p>
            <p className="text-ink-3 mt-1.5">
              Todos os números na análise batem com o truth layer, recomendações respeitam
              benchmarks e não há contradições entre agentes.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {(['bloqueante', 'alerta', 'info'] as Severidade[]).map(sev => {
              const list = grupos.get(sev)
              if (!list || list.length === 0) return null
              const cfg = SEV_CFG[sev]
              return (
                <div key={sev}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${cfg.cls}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                    <span className="text-[11px] text-ink-3">{list.length} {list.length === 1 ? 'issue' : 'issues'}</span>
                  </div>
                  <div className="space-y-2">
                    {list.map(i => (
                      <div key={i.id} className="rounded-[10px] bg-bg border border-border p-3">
                        <div className="flex items-start gap-3 mb-1.5">
                          <span className="text-[11px] font-medium text-ink-3 shrink-0 uppercase tracking-wider mt-0.5">
                            {TIPO_LABEL[i.tipo] ?? i.tipo}
                          </span>
                        </div>
                        <div className="text-[13px] text-ink leading-relaxed">{i.resumo}</div>
                        {(i.steps_envolvidos.length > 0 || i.fact_ids.length > 0 || i.benchmark_ids.length > 0) && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {i.steps_envolvidos.map(s => (
                              <span key={s} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-2 text-ink-2 border border-border">
                                {s}
                              </span>
                            ))}
                            {i.fact_ids.map(f => (
                              <span key={f} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                                {f}
                              </span>
                            ))}
                            {i.benchmark_ids.map(b => (
                              <span key={b} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent-soft text-accent-strong border border-accent/30">
                                {b}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
