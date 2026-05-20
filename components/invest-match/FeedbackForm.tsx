'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

// Avaliação manual de um match (loop de feedback). Compacto — fica embutido
// no card do match. Registra qualidade percebida + motivo opcional.

type Avaliacao = 'muito_bom' | 'bom' | 'neutro' | 'ruim' | 'muito_ruim'

const OPCOES: Array<{ v: Avaliacao; l: string; emoji: string }> = [
  { v: 'muito_bom',  l: 'Excelente', emoji: '★★' },
  { v: 'bom',        l: 'Bom',       emoji: '★' },
  { v: 'neutro',     l: 'Neutro',    emoji: '–' },
  { v: 'ruim',       l: 'Fraco',     emoji: '✕' },
  { v: 'muito_ruim', l: 'Ruim',      emoji: '✕✕' },
]

export default function FeedbackForm({ matchId }: { matchId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [aberto, setAberto] = useState(false)
  const [sel, setSel] = useState<Avaliacao | null>(null)
  const [motivo, setMotivo] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function submit() {
    if (!sel) { setError('Escolha uma avaliação'); return }
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/invest-match/matches/${matchId}/feedback`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ avaliacao: sel, motivo: motivo.trim() || null }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Falha'); return }
        setDone(true)
        setTimeout(() => router.refresh(), 1200)
      } catch (e) {
        setError((e as Error).message)
      }
    })
  }

  if (done) {
    return <span className="text-[11px] text-ok">✓ Avaliação registrada</span>
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-[11px] text-ink-3 hover:text-accent-strong"
      >
        Avaliar este match
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex flex-wrap gap-1.5">
        {OPCOES.map(o => (
          <button
            key={o.v}
            type="button"
            onClick={() => setSel(o.v)}
            className={`px-2.5 py-1 rounded-md text-[11px] border transition
              ${sel === o.v ? 'bg-accent-strong text-white border-accent-strong' : 'bg-surface text-ink-2 border-border hover:border-accent-strong/40'}`}
            title={o.l}
          >
            {o.l}
          </button>
        ))}
      </div>
      <input
        value={motivo}
        onChange={e => setMotivo(e.target.value)}
        placeholder="Motivo (opcional)"
        className="w-full border border-border rounded-md px-2.5 py-1.5 text-[12px] bg-surface outline-none focus:border-accent-strong"
        maxLength={1000}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="px-3 py-1 rounded-md bg-accent-strong text-white text-[11px] font-medium disabled:opacity-50"
        >
          {isPending ? 'Salvando…' : 'Registrar'}
        </button>
        <button type="button" onClick={() => setAberto(false)} className="text-[11px] text-ink-3 hover:text-ink">
          Cancelar
        </button>
        {error && <span className="text-[11px] text-warn">{error}</span>}
      </div>
    </div>
  )
}
