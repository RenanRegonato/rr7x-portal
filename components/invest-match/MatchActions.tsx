'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { StatusMatch } from '@/lib/invest-match/types'
import DeleteButton from './DeleteButton'

// Ações de curadoria/pipeline de um match. Renderiza botões contextuais ao
// status atual e chama PATCH /api/invest-match/matches/[id].

interface Action {
  label:   string
  status:  StatusMatch
  variant: 'primary' | 'danger' | 'ghost'
  pedeMotivo?: boolean
}

// Próximas ações possíveis a partir de cada status (UI — espelha a state
// machine do match-service, mas só expõe o caminho "feliz" + rejeição).
function actionsFor(status: StatusMatch): Action[] {
  switch (status) {
    case 'sugerido':
    case 'aprovado_auto':
      return [
        { label: 'Aprovar',  status: 'aprovado_admin', variant: 'primary' },
        { label: 'Rejeitar', status: 'rejeitado_admin', variant: 'danger', pedeMotivo: true },
      ]
    case 'aprovado_admin':
      return [
        { label: 'Notificar', status: 'notificado',     variant: 'primary' },
        { label: 'Rejeitar',  status: 'rejeitado_admin', variant: 'danger', pedeMotivo: true },
      ]
    case 'notificado':
      return [
        { label: 'Iniciar negociação', status: 'em_negociacao',        variant: 'primary' },
        { label: 'Recusado',           status: 'rejeitado_investidor',  variant: 'danger', pedeMotivo: true },
      ]
    case 'em_negociacao':
      return [
        { label: 'Avançar p/ NDA', status: 'nda',                  variant: 'primary' },
        { label: 'Encerrar',       status: 'rejeitado_investidor', variant: 'danger', pedeMotivo: true },
      ]
    case 'nda':
      return [
        { label: 'Avançar p/ proposta', status: 'proposta',             variant: 'primary' },
        { label: 'Encerrar',            status: 'rejeitado_investidor',  variant: 'danger', pedeMotivo: true },
      ]
    case 'proposta':
      return [
        { label: 'Avançar p/ DD', status: 'dd',                   variant: 'primary' },
        { label: 'Encerrar',      status: 'rejeitado_investidor', variant: 'danger', pedeMotivo: true },
      ]
    case 'dd':
      return [
        { label: 'Marcar fechado', status: 'fechado',              variant: 'primary' },
        { label: 'Encerrar',       status: 'rejeitado_investidor', variant: 'danger', pedeMotivo: true },
      ]
    case 'rejeitado_admin':
    case 'rejeitado_investidor':
    case 'rejeitado_projeto':
    case 'descartado':
      return [{ label: 'Reabrir', status: 'sugerido', variant: 'ghost' }]
    case 'fechado':
    default:
      return []
  }
}

const VARIANT_CLS: Record<Action['variant'], string> = {
  primary: 'bg-accent-strong text-white hover:opacity-90',
  danger:  'bg-surface text-warn border border-warn/30 hover:bg-warn/10',
  ghost:   'bg-surface text-ink-2 border border-border hover:bg-surface-hover',
}

export default function MatchActions({
  matchId, status, size = 'md',
}: {
  matchId: string
  status:  StatusMatch
  size?:   'sm' | 'md'
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const actions = actionsFor(status)

  function run(action: Action) {
    setError(null)
    let motivo: string | null = null
    if (action.pedeMotivo) {
      motivo = window.prompt('Motivo (opcional):') ?? null
    }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/invest-match/matches/${matchId}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ status: action.status, motivo }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Falha'); return }
        router.refresh()
      } catch (e) {
        setError((e as Error).message)
      }
    })
  }

  const pad = size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map(a => (
        <button
          key={a.status}
          type="button"
          disabled={isPending}
          onClick={() => run(a)}
          className={`rounded-md font-medium transition disabled:opacity-50 ${pad} ${VARIANT_CLS[a.variant]}`}
        >
          {a.label}
        </button>
      ))}
      <DeleteButton
        endpoint={`/api/invest-match/matches/${matchId}`}
        entityLabel="match"
        variant="icon"
      />
      {error && <span className="text-[11px] text-warn">{error}</span>}
    </div>
  )
}
