'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { IconSparkle } from '@/components/Icons'

// Dispara a originação reversa (busca de teses compatíveis) para um investidor.
export default function BuscarOportunidadesButton({ investidorId }: { investidorId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  function run() {
    setMsg(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/invest-match/investidores/${investidorId}/buscar-oportunidades`, { method: 'POST' })
        const data = await res.json()
        if (!res.ok) { setMsg(data.error ?? 'Falha'); return }
        setMsg('Busca enfileirada. As oportunidades aparecem em instantes.')
        setTimeout(() => router.refresh(), 5000)
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
        <IconSparkle size={15}/> {isPending ? 'Buscando…' : 'Buscar oportunidades'}
      </button>
      {msg && <span className="text-[11px] text-ink-3">{msg}</span>}
    </div>
  )
}
