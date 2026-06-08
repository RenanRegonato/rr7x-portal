'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { IconSparkle } from '@/components/Icons'

// Gera (ou regenera) a tese de uma análise do Mandor com um clique.
// Esconde totalmente a API — o assessor só vê "Gerar tese".
export default function GerarTeseButton({
  analiseId, teseId, temMesa,
}: {
  analiseId: string
  teseId:    string | null
  temMesa:   boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  function gerar() {
    setMsg(null); setErro(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/invest-match/teses/from-analise/${analiseId}`, { method: 'POST' })
        const data = await res.json()
        if (!res.ok) { setErro(data.error ?? 'Falha ao gerar tese'); return }
        setMsg('Tese gerada! Buscando matches…')
        setTimeout(() => router.push(`/dashboard/invest-match/teses/${data.tese_id}`), 1500)
      } catch (e) {
        setErro((e as Error).message)
      }
    })
  }

  // Já tem tese → leva direto pra ela
  if (teseId) {
    return (
      <button
        type="button"
        onClick={() => router.push(`/dashboard/invest-match/teses/${teseId}`)}
        className="px-3 py-1.5 rounded-lg bg-surface border border-border text-sm font-medium text-ink-2 hover:bg-surface-hover"
      >
        Ver tese →
      </button>
    )
  }

  // Sem mesa de revisão → não pode gerar ainda
  if (!temMesa) {
    return (
      <span className="text-[11px] text-ink-3" title="A análise precisa ter a mesa de revisão concluída">
        Conclua a análise primeiro
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={gerar}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-strong text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        <IconSparkle size={14}/> {isPending ? 'Gerando…' : 'Gerar tese'}
      </button>
      {msg && <span className="text-[11px] text-accent-strong">{msg}</span>}
      {erro && <span className="text-[11px] text-warn">{erro}</span>}
    </div>
  )
}
