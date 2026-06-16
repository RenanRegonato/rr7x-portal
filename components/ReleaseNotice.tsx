'use client'

import { useCallback, useRef, useState } from 'react'

// Aviso "Plataforma Atualizada" — espelha o padrão do OnboardingTour: o server
// decide se deve aparecer (autoShow) comparando a versão da release publicada com
// a última vista pelo usuário (user_metadata.last_seen_release_version). Ao fechar,
// grava a versão como vista via /api/release/seen para não reaparecer.

export interface ReleaseData {
  version:      string
  title:        string
  release_date: string
  improvements: string[]
  new_features: string[]
  fixes:        string[]
}

function Section({ label, items, color }: { label: string; items: string[]; color: string }) {
  if (!items?.length) return null
  return (
    <div className="mb-4">
      <p className={`text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${color}`}>{label}</p>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="text-[13.5px] text-ink-2 leading-relaxed flex gap-2">
            <span className="text-ink-3 mt-[2px]">•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function ReleaseNotice({
  release,
  autoShow = false,
}: {
  release: ReleaseData | null
  autoShow?: boolean
}) {
  const [open, setOpen] = useState(autoShow && !!release)
  const markedRef = useRef(false)

  const close = useCallback(() => {
    setOpen(false)
    if (markedRef.current || !release) return
    markedRef.current = true
    fetch('/api/release/seen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: release.version }),
    }).catch(() => {})
  }, [release])

  if (!open || !release) return null

  const dataFmt = (() => {
    try {
      return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
        .format(new Date(release.release_date))
    } catch { return release.release_date }
  })()

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" aria-modal role="dialog">
      <div className="absolute inset-0 bg-black/55" onClick={close} />
      <div className="relative bg-surface border border-border rounded-2xl shadow-xl w-full max-w-[480px] max-h-[85vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent-strong">
              {release.title} · v{release.version}
            </span>
            <button onClick={close} className="text-ink-3 hover:text-ink text-sm" aria-label="Fechar">✕</button>
          </div>
          <h3 className="text-[19px] font-semibold text-ink mb-1">Uma nova versão está disponível</h3>
          <p className="text-[12.5px] text-ink-3 mb-5">Publicada em {dataFmt}. Confira as novidades:</p>

          <Section label="Novos recursos" items={release.new_features} color="text-accent-strong" />
          <Section label="Melhorias"      items={release.improvements} color="text-info" />
          <Section label="Correções"      items={release.fixes}        color="text-ok" />

          <div className="flex justify-end mt-2">
            <button
              onClick={close}
              className="px-5 py-2 rounded-lg bg-accent-strong text-white text-[13px] font-medium hover:opacity-90"
            >
              Entendi
            </button>
          </div>
          <p className="text-[11px] text-ink-3 text-center mt-4">Obrigado por utilizar O Mandor.</p>
        </div>
      </div>
    </div>
  )
}
