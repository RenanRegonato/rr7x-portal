'use client'

import { useCallback, useEffect, useState } from 'react'

interface Claim {
  id:            string
  claim_type:    'numero' | 'fato' | 'recomendacao' | 'risco' | 'avaliacao'
  assertion:     string
  fact_ids:      string[]
  benchmark_ids: string[]
  source_quote:  string | null
  confidence:    number
}

const TYPE_CFG: Record<Claim['claim_type'], { label: string; cls: string; order: number }> = {
  numero:       { label: 'Número',       cls: 'text-ink-2 bg-surface-2 border-border',               order: 1 },
  fato:         { label: 'Fato',         cls: 'text-ink-2 bg-surface-2 border-border',               order: 2 },
  avaliacao:    { label: 'Avaliação',    cls: 'text-accent-strong bg-accent-soft border-accent/30', order: 3 },
  recomendacao: { label: 'Recomendação', cls: 'text-ok bg-ok/10 border-ok/30',                       order: 4 },
  risco:        { label: 'Risco',        cls: 'text-warn bg-warn/10 border-warn/30',                 order: 5 },
}

function fmtConf(c: number): { label: string; cls: string } {
  if (c >= 0.9) return { label: `${Math.round(c * 100)}%`, cls: 'text-ok' }
  if (c >= 0.7) return { label: `${Math.round(c * 100)}%`, cls: 'text-accent-strong' }
  return            { label: `${Math.round(c * 100)}%`, cls: 'text-warn' }
}

interface ClaimsSectionProps {
  analiseId: string
  stepKey:   string
}

export default function ClaimsSection({ analiseId, stepKey }: ClaimsSectionProps) {
  const [claims,  setClaims]  = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [open,    setOpen]    = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/analise/${analiseId}/claims?step=${stepKey}`, { cache: 'no-store' })
      const d = await r.json()
      if (r.ok) setClaims(d.claims ?? [])
    } finally {
      setLoading(false)
    }
  }, [analiseId, stepKey])

  useEffect(() => { void load() }, [load])

  // Recarrega quando o step é reprocessado (heurística: poll uma vez 3s após mount)
  useEffect(() => {
    const t = setTimeout(() => void load(), 3000)
    return () => clearTimeout(t)
  }, [load])

  if (loading && claims.length === 0) return null
  if (claims.length === 0)            return null

  return (
    <div className="border-t border-border bg-surface-2/40">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-7 py-3 flex items-center justify-between text-left hover:bg-surface-2 transition"
      >
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            Afirmações estruturadas
          </span>
          <span className="text-[11px] text-ink-3">({claims.length})</span>
        </div>
        <span className={`text-ink-3 transition ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="px-7 pb-5 space-y-2">
          {claims.map(c => {
            const cfg  = TYPE_CFG[c.claim_type]
            const conf = fmtConf(c.confidence)
            return (
              <div key={c.id} className="rounded-[8px] bg-bg border border-border p-3 text-[13px]">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border shrink-0 ${cfg.cls}`}>
                    {cfg.label}
                  </span>
                  <span className={`text-[11px] shrink-0 ${conf.cls}`} title="Confiança da afirmação">
                    {conf.label}
                  </span>
                </div>
                <div className="text-ink leading-relaxed">{c.assertion}</div>
                {c.source_quote && (
                  <div className="text-[11px] text-ink-3 italic mt-1.5">"{c.source_quote.slice(0, 200)}{c.source_quote.length > 200 ? '...' : ''}"</div>
                )}
                {(c.fact_ids.length > 0 || c.benchmark_ids.length > 0) && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {c.fact_ids.map(fid => (
                      <span key={fid} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                        {fid}
                      </span>
                    ))}
                    {c.benchmark_ids.map(bid => (
                      <span key={bid} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent-soft text-accent-strong border border-accent/30">
                        {bid}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
