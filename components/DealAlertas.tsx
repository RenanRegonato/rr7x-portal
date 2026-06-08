'use client'

import { useEffect, useState } from 'react'

// Banner de alertas do monitoramento contínuo. Owner-facing: red flags sobre
// o ativo/tomador detectadas após a análise (ex.: empresa saiu de ATIVA).
// Auto-gated: sem alertas abertos, não renderiza nada.

interface Alerta {
  id:         string
  tipo:       string
  severidade: 'info' | 'warn' | 'critico'
  titulo:     string
  detalhe:    string | null
  criado_em:  string
}

const TONE: Record<Alerta['severidade'], string> = {
  critico: 'bg-[oklch(0.62_0.2_25)]/8 border-[oklch(0.62_0.2_25)]/30',
  warn:    'bg-warn/10 border-warn/30',
  info:    'bg-surface-2 border-border',
}
const ICON: Record<Alerta['severidade'], string> = { critico: '⛔', warn: '⚠️', info: 'ℹ️' }

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' })
  } catch { return '' }
}

export default function DealAlertas({ analiseId }: { analiseId: string }) {
  const [alertas, setAlertas] = useState<Alerta[]>([])

  useEffect(() => {
    let alive = true
    fetch(`/api/analise/${analiseId}/alertas`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.alertas) setAlertas(d.alertas as Alerta[]) })
      .catch(() => {})
    return () => { alive = false }
  }, [analiseId])

  if (alertas.length === 0) return null

  return (
    <div className="mb-6 flex flex-col gap-2">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
        Monitoramento · {alertas.length} alerta(s) aberto(s)
      </div>
      {alertas.map((a) => (
        <div key={a.id} className={`flex items-start gap-2.5 rounded-[10px] border px-3.5 py-2.5 ${TONE[a.severidade]}`}>
          <span className="text-[16px] leading-none mt-0.5">{ICON[a.severidade]}</span>
          <div className="flex-1">
            <div className="text-[13px] font-medium text-ink">{a.titulo}</div>
            {a.detalhe && <div className="text-[12px] text-ink-2 mt-0.5">{a.detalhe}</div>}
          </div>
          <span className="text-[11px] text-ink-3 whitespace-nowrap mt-0.5">{fmtDate(a.criado_em)}</span>
        </div>
      ))}
    </div>
  )
}
