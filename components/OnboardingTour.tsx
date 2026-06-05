'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Tour guiado com "spotlight" sobre elementos reais da interface.
// - Abre automaticamente no primeiro acesso (autoStart).
// - Pode ser reaberto a qualquer momento pelo menu (evento 'mandor:open-onboarding').
// - Ancora cada passo num elemento marcado com [data-tour="<key>"] (no Sidebar).
//   Passos sem âncora aparecem centralizados (boas-vindas / encerramento).
// - Ao concluir/pular, marca onboarding_completed via /api/onboarding/complete.

interface Step {
  anchor?: string   // valor de data-tour; ausente = card centralizado
  title:   string
  body:    string
}

const STEPS: Step[] = [
  {
    title: 'Bem-vindo à Mandor',
    body:  'Um tour rápido pelas principais áreas da plataforma. Leva menos de um minuto — você pode pular quando quiser e refazer depois pelo menu Ajuda.',
  },
  {
    anchor: 'pipeline',
    title:  'Pipeline de análises',
    body:   'Aqui ficam suas análises de crédito e M&A. Acompanhe cada deal pelas etapas, da ingestão dos documentos ao relatório da mesa de crédito.',
  },
  {
    anchor: 'invest-match',
    title:  'Invest Match',
    body:   'Transforme análises em teses de investimento e cruze com sua base de investidores. O painel mostra funil, valor em jogo e a fila de matches a curar.',
  },
  {
    anchor: 'escritorio',
    title:  'Seu escritório',
    body:   'Dados do escritório, equipe e configurações. É a base do seu workspace dentro da Mandor.',
  },
  {
    anchor: 'benchmarks',
    title:  'Benchmarks',
    body:   'Referências de mercado usadas nas análises. Você pode ajustar parâmetros para o perfil do seu escritório.',
  },
  {
    anchor: 'planos',
    title:  'Planos e conta',
    body:   'Gerencie seu plano e os dados da sua conta. Precisa de mais capacidade? É por aqui.',
  },
  {
    anchor: 'ajuda',
    title:  'Refaça quando quiser',
    body:   'Este tour fica sempre disponível aqui em Ajuda. Bom trabalho!',
  },
]

const CARD_W = 320

export default function OnboardingTour({ autoStart = false }: { autoStart?: boolean }) {
  // Inicializa aberto direto da prop (1º acesso) — evita setState síncrono em effect.
  const [open, setOpen] = useState(autoStart)
  const [idx, setIdx]   = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const markedRef = useRef(false)

  const total = STEPS.length
  const step  = STEPS[idx]

  const start = useCallback(() => { setIdx(0); setOpen(true) }, [])

  // Gatilho do menu "Ajuda" (reabrir). setState só no callback do evento.
  useEffect(() => {
    const onOpen = () => start()
    window.addEventListener('mandor:open-onboarding', onOpen)
    return () => window.removeEventListener('mandor:open-onboarding', onOpen)
  }, [start])

  // Recalcula a posição do alvo do passo atual (mede o DOM).
  const recompute = useCallback(() => {
    const anchor = STEPS[idx]?.anchor
    if (!anchor) { setRect(null); return }
    const el = document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`)
    setRect(el ? el.getBoundingClientRect() : null)
  }, [idx])

  useEffect(() => {
    if (!open) return
    // rAF: difere a medição/setState para fora do corpo síncrono do effect.
    const raf = requestAnimationFrame(recompute)
    window.addEventListener('resize', recompute)
    window.addEventListener('scroll', recompute, true)
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', recompute)
      window.removeEventListener('scroll', recompute, true)
      document.body.style.overflow = ''
    }
  }, [open, idx, recompute])

  const markDone = useCallback(() => {
    if (markedRef.current) return
    markedRef.current = true
    fetch('/api/onboarding/complete', { method: 'POST' }).catch(() => {})
  }, [])

  const close  = useCallback(() => { setOpen(false); markDone() }, [markDone])
  const next   = useCallback(() => { if (idx < total - 1) setIdx(i => i + 1); else close() }, [idx, total, close])
  const prev   = useCallback(() => setIdx(i => Math.max(0, i - 1)), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close, next, prev])

  if (!open) return null

  // Posição do card: ao lado do alvo (à direita do sidebar) ou centralizado.
  let cardStyle: React.CSSProperties
  if (rect) {
    const top = Math.min(Math.max(rect.top - 8, 16), window.innerHeight - 240)
    const left = Math.min(rect.right + 14, window.innerWidth - CARD_W - 16)
    cardStyle = { top, left, width: CARD_W }
  } else {
    cardStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: CARD_W }
  }

  const PAD = 6
  const hole = rect
    ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
    : null

  return (
    <div className="fixed inset-0 z-[100]" aria-modal role="dialog">
      {/* Dim: 4 retângulos ao redor do "furo" (ou tela cheia se centralizado) */}
      {hole ? (
        <>
          <div className="absolute bg-black/55" style={{ top: 0, left: 0, right: 0, height: Math.max(0, hole.top) }} onClick={close}/>
          <div className="absolute bg-black/55" style={{ top: hole.top + hole.height, left: 0, right: 0, bottom: 0 }} onClick={close}/>
          <div className="absolute bg-black/55" style={{ top: hole.top, left: 0, width: Math.max(0, hole.left), height: hole.height }} onClick={close}/>
          <div className="absolute bg-black/55" style={{ top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height }} onClick={close}/>
          {/* Anel de destaque */}
          <div
            className="absolute rounded-lg ring-2 ring-accent-strong pointer-events-none"
            style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/55" onClick={close}/>
      )}

      {/* Card do passo */}
      <div className="absolute bg-surface border border-border rounded-xl shadow-xl p-5" style={cardStyle}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
            Passo {idx + 1} de {total}
          </span>
          <button onClick={close} className="text-ink-3 hover:text-ink text-sm" aria-label="Fechar tour">✕</button>
        </div>
        <h3 className="text-base font-semibold text-ink mb-1.5">{step.title}</h3>
        <p className="text-sm text-ink-2 leading-relaxed">{step.body}</p>

        {/* Progresso */}
        <div className="flex items-center gap-1.5 mt-4 mb-4">
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-5 bg-accent-strong' : 'w-1.5 bg-border'}`}/>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button onClick={close} className="text-xs text-ink-3 hover:text-ink">Pular</button>
          <div className="flex items-center gap-2">
            {idx > 0 && (
              <button onClick={prev} className="px-3 py-1.5 rounded-lg text-xs text-ink-2 border border-border hover:bg-surface-2">
                Anterior
              </button>
            )}
            <button onClick={next} className="px-4 py-1.5 rounded-lg bg-accent-strong text-white text-xs font-medium hover:opacity-90">
              {idx < total - 1 ? 'Próximo' : 'Concluir'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
