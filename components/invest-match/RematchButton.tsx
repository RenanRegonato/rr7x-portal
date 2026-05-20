'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { IconSparkle } from '@/components/Icons'

// Botão que re-dispara o motor de matching para uma tese (Inngest async).
export default function RematchButton({ teseId }: { teseId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  function run() {
    setMsg(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/invest-match/teses/${teseId}/rematch`, { method: 'POST' })
        const data = await res.json()
        if (!res.ok) { setMsg(data.error ?? 'Falha'); return }
        setMsg('Matching enfileirado — os resultados aparecem em instantes.')
        setTimeout(() => router.refresh(), 4000)
      } catch (e) {
        setMsg((e as Error).message)
      }
    })
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={run}
        disabled={isPending}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border text-sm font-medium text-ink-2 hover:bg-surface-hover disabled:opacity-50"
      >
        <IconSparkle size={15}/> {isPending ? 'Enfileirando…' : 'Rodar matching'}
      </button>
      {msg && <span className="text-[11px] text-ink-3">{msg}</span>}
    </div>
  )
}
