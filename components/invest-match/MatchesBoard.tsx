'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { KANBAN_COLUNAS, scoreBg, transicaoMatchValida } from '@/lib/invest-match/labels'
import type { StatusMatch } from '@/lib/invest-match/types'
import MatchActions from './MatchActions'

// DTO serializável que a página server-side monta a partir de MatchEnriquecido.
export interface BoardCard {
  id:              string
  status:          StatusMatch
  score_final:     number
  llm_resumo:      string | null
  tese_id:         string | null
  empresa_nome:    string
  investidor_nome: string
}

export default function MatchesBoard({ initial }: { initial: BoardCard[] }) {
  const router = useRouter()
  const [cards, setCards] = useState<BoardCard[]>(initial)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  // Reconcilia com o servidor sempre que a página revalidar (router.refresh,
  // ações de rejeição via botões, etc.). `initial` muda de referência a cada
  // render do server component, então o efeito re-sincroniza o estado local.
  useEffect(() => { setCards(initial) }, [initial])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const porStatus = useMemo(() => {
    const m = new Map<StatusMatch, BoardCard[]>()
    for (const col of KANBAN_COLUNAS) m.set(col.id, [])
    for (const c of cards) {
      const arr = m.get(c.status)
      if (arr) arr.push(c) // cards em status rejeitado não têm coluna → ficam fora (igual antes)
    }
    return m
  }, [cards])

  const activeCard = activeId ? cards.find(c => c.id === activeId) ?? null : null

  function onDragStart(e: DragStartEvent) {
    setErro(null)
    setActiveId(String(e.active.id))
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const card = cards.find(c => c.id === String(active.id))
    if (!card) return
    const para = String(over.id) as StatusMatch
    const de = card.status
    if (de === para) return

    if (!transicaoMatchValida(de, para)) {
      setErro(`Movimento não permitido: ${colTitulo(de)} → ${colTitulo(para)}.`)
      return
    }

    // Otimista: move já; reverte se a API recusar.
    setCards(prev => prev.map(c => (c.id === card.id ? { ...c, status: para } : c)))
    try {
      const res = await fetch(`/api/invest-match/matches/${card.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: para }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCards(prev => prev.map(c => (c.id === card.id ? { ...c, status: de } : c)))
        setErro(data.error ?? 'Falha ao mover o card.')
        return
      }
      // Reconcilia marcos temporais/derivados calculados no servidor.
      router.refresh()
    } catch (err) {
      setCards(prev => prev.map(c => (c.id === card.id ? { ...c, status: de } : c)))
      setErro((err as Error).message)
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      {erro && (
        <div className="mb-3 text-[12px] text-warn bg-warn/10 border border-warn/30 rounded-md px-3 py-1.5">
          {erro}
        </div>
      )}
      <div className="flex gap-4 overflow-x-auto pb-4 items-start flex-1">
        {KANBAN_COLUNAS.map(col => {
          const items = porStatus.get(col.id) ?? []
          const podeReceber = activeCard ? transicaoMatchValida(activeCard.status, col.id) : false
          return (
            <Coluna
              key={col.id}
              id={col.id}
              titulo={col.titulo}
              count={items.length}
              destacar={activeCard != null && podeReceber && activeCard.status !== col.id}
            >
              {items.map(c => <CardDraggable key={c.id} card={c} />)}
              {items.length === 0 && (
                <div className="h-16 border border-dashed border-border rounded-lg"/>
              )}
            </Coluna>
          )
        })}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeCard ? <CardConteudo card={activeCard} overlay /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function colTitulo(id: StatusMatch): string {
  return KANBAN_COLUNAS.find(c => c.id === id)?.titulo ?? id
}

function Coluna({
  id, titulo, count, destacar, children,
}: {
  id: StatusMatch; titulo: string; count: number; destacar: boolean; children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`min-w-[300px] w-[300px] rounded-xl border flex flex-col max-h-full shrink-0 transition-colors
        ${isOver && destacar ? 'border-accent-strong bg-accent-soft/30'
          : destacar ? 'border-accent-strong/40 bg-surface-2/40'
          : 'border-border bg-surface-2/40'}`}
    >
      <div className="p-3 border-b border-border sticky top-0 bg-surface rounded-t-xl z-10">
        <h3 className="font-semibold text-[13px] text-ink flex justify-between items-center">
          {titulo}
          <span className="bg-surface-2 px-2 py-0.5 rounded-full text-[11px] text-ink-3 tabular-nums">{count}</span>
        </h3>
      </div>
      <div className="p-2.5 flex-1 overflow-y-auto space-y-2.5">{children}</div>
    </div>
  )
}

function CardDraggable({ card }: { card: BoardCard }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({ id: card.id })
  return (
    <div ref={setNodeRef} className={isDragging ? 'opacity-40' : ''}>
      <CardConteudo
        card={card}
        handleRef={setActivatorNodeRef}
        handleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

function CardConteudo({
  card, handleRef, handleProps, overlay = false,
}: {
  card: BoardCard
  handleRef?: (el: HTMLElement | null) => void
  handleProps?: Record<string, unknown>
  overlay?: boolean
}) {
  return (
    <div className={`bg-surface border rounded-lg p-3 transition
      ${overlay ? 'border-accent-strong shadow-lg w-[276px] rotate-1' : 'border-border hover:border-accent-strong/40'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-1.5 min-w-0">
          {/* Alça de arraste — só ela inicia o drag, deixando link e botões clicáveis */}
          <button
            type="button"
            ref={handleRef}
            {...(handleProps ?? {})}
            aria-label="Arrastar card"
            className="mt-0.5 text-ink-3 hover:text-ink-2 cursor-grab active:cursor-grabbing touch-none shrink-0"
          >
            <GripIcon/>
          </button>
          <Link href={card.tese_id ? `/dashboard/invest-match/teses/${card.tese_id}` : '#'} className="min-w-0 group">
            <div className="font-medium text-[13px] text-ink group-hover:text-accent-strong leading-tight line-clamp-1">
              {card.empresa_nome}
            </div>
            <div className="text-[11px] text-ink-3 leading-tight mt-0.5 line-clamp-1">
              <span className="text-accent-strong">↔</span> {card.investidor_nome}
            </div>
          </Link>
        </div>
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full border text-xs font-bold tabular-nums shrink-0 ${scoreBg(card.score_final)}`}>
          {Math.round(card.score_final)}
        </span>
      </div>
      {card.llm_resumo && (
        <p className="text-[11px] text-ink-2 line-clamp-2 mb-2.5">{card.llm_resumo}</p>
      )}
      {!overlay && <MatchActions matchId={card.id} status={card.status} size="sm"/>}
    </div>
  )
}

function GripIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
      <circle cx="3" cy="2" r="1"/><circle cx="9" cy="2" r="1"/>
      <circle cx="3" cy="6" r="1"/><circle cx="9" cy="6" r="1"/>
      <circle cx="3" cy="10" r="1"/><circle cx="9" cy="10" r="1"/>
    </svg>
  )
}
