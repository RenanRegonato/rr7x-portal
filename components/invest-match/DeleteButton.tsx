'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { IconTrash } from '@/components/Icons'

// Botão de exclusão (hard delete) com modal de confirmação.
// Chama DELETE no endpoint; em sucesso redireciona (redirectTo) ou só
// dá refresh na rota atual (listas). Exclusão é irreversível — o modal
// deixa isso explícito e, opcionalmente, exige digitar uma palavra.

interface Props {
  endpoint:    string            // URL do DELETE (ex: /api/invest-match/teses/123)
  entityLabel: string            // "investidor" | "tese" | "match"
  name?:       string            // nome do registro (mostrado na confirmação)
  cascadeNote?: string           // aviso sobre o que mais será removido
  redirectTo?: string            // se setado, navega após excluir; senão refresh()
  variant?:    'button' | 'icon'
  size?:       'sm' | 'md'
  confirmWord?: string           // se setado, exige digitar essa palavra p/ habilitar
}

export default function DeleteButton({
  endpoint, entityLabel, name, cascadeNote, redirectTo,
  variant = 'button', size = 'md', confirmWord,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const canConfirm = !confirmWord || typed.trim().toUpperCase() === confirmWord.toUpperCase()

  function confirmDelete() {
    if (!canConfirm) return
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch(endpoint, { method: 'DELETE' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) { setError(data.error ?? 'Falha ao excluir'); return }
        setOpen(false)
        if (redirectTo) { router.push(redirectTo); router.refresh() }
        else router.refresh()
      } catch (e) {
        setError((e as Error).message)
      }
    })
  }

  const trigger = variant === 'icon' ? (
    <button
      type="button"
      onClick={() => { setOpen(true); setError(null); setTyped('') }}
      className="text-ink-3 hover:text-warn transition p-1 rounded"
      aria-label={`Excluir ${entityLabel}`}
      title={`Excluir ${entityLabel}`}
    >
      <IconTrash size={16}/>
    </button>
  ) : (
    <button
      type="button"
      onClick={() => { setOpen(true); setError(null); setTyped('') }}
      className={`inline-flex items-center gap-2 rounded-lg bg-surface text-warn border border-warn/30 hover:bg-warn/10 font-medium transition ${
        size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
      }`}
    >
      <IconTrash size={size === 'sm' ? 14 : 16}/> Excluir
    </button>
  )

  return (
    <>
      {trigger}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !isPending && setOpen(false)}
        >
          <div
            className="bg-surface border border-border rounded-xl shadow-lg max-w-md w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="shrink-0 w-9 h-9 rounded-full bg-warn/10 text-warn grid place-items-center">
                <IconTrash size={18}/>
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-ink">Excluir {entityLabel}?</h3>
                <p className="text-sm text-ink-2 mt-1">
                  {name ? <>Você está prestes a excluir <strong className="text-ink">{name}</strong>. </> : null}
                  Esta ação é permanente e não pode ser desfeita.
                </p>
              </div>
            </div>

            {cascadeNote && (
              <div className="text-xs text-warn bg-warn/10 border border-warn/20 rounded-lg px-3 py-2 mb-3">
                {cascadeNote}
              </div>
            )}

            {confirmWord && (
              <div className="mb-3">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 block mb-1.5">
                  Digite <span className="font-mono text-ink">{confirmWord}</span> para confirmar
                </label>
                <input
                  className="w-full border border-border rounded-[10px] px-3 py-2 text-[13px] bg-surface outline-none focus:border-warn"
                  value={typed}
                  onChange={e => setTyped(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            {error && <p className="text-xs text-warn mb-3">{error}</p>}

            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="px-4 py-2 rounded-lg text-sm text-ink-2 hover:text-ink disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isPending || !canConfirm}
                className="px-4 py-2 rounded-lg bg-warn text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {isPending ? 'Excluindo…' : 'Excluir definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
