'use client'

import { useEffect, useState } from 'react'

export type Severidade = 'alta' | 'media' | 'baixa'

export interface ImpactoCascade {
  step_key:      string
  severidade:    Severidade
  justificativa: string
}

interface CascadeImpactoModalProps {
  open:             boolean
  loading:          boolean
  impactos:         ImpactoCascade[]
  stepLabels:       Record<string, string>
  stepOrigemKey:    string
  stepOrigemLabel:  string
  onClose:          () => void
  onReprocessar:    (stepKeys: string[]) => void
}

const SEV_CONFIG: Record<Severidade, { label: string; cls: string; defaultChecked: boolean }> = {
  alta:  { label: 'Alta',  cls: 'text-warn bg-warn/10 border-warn/30',  defaultChecked: true  },
  media: { label: 'Média', cls: 'text-accent-strong bg-accent-soft border-accent/30', defaultChecked: true  },
  baixa: { label: 'Baixa', cls: 'text-ink-3 bg-surface-2 border-border', defaultChecked: false },
}

export default function CascadeImpactoModal({
  open, loading, impactos, stepLabels, stepOrigemLabel,
  onClose, onReprocessar,
}: CascadeImpactoModalProps) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open && impactos.length > 0) {
      const padroes = new Set(
        impactos
          .filter(i => SEV_CONFIG[i.severidade].defaultChecked)
          .map(i => i.step_key)
      )
      setSelecionados(padroes)
    }
  }, [open, impactos])

  if (!open) return null

  function toggle(stepKey: string) {
    setSelecionados(prev => {
      const next = new Set(prev)
      if (next.has(stepKey)) next.delete(stepKey)
      else next.add(stepKey)
      return next
    })
  }

  function reprocessarAgora() {
    const lista = impactos
      .filter(i => selecionados.has(i.step_key))
      .map(i => i.step_key)
    onReprocessar(lista)
  }

  const total = impactos.length
  const selecionadosCount = selecionados.size

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg border border-border rounded-[14px] shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-[20px] font-medium tracking-tight">Impacto da regeneração</h2>
            <p className="text-[12px] text-ink-3 mt-0.5">
              Detetive Dependência analisou os efeitos da nova versão de{' '}
              <span className="font-medium text-ink-2">{stepOrigemLabel}</span> nos demais agentes.
            </p>
          </div>
          <button onClick={onClose} className="text-ink-3 hover:text-ink text-[20px] leading-none">×</button>
        </div>

        <div className="px-6 py-5">
          {loading && (
            <div className="py-10 text-center text-[13px] text-ink-3 animate-pulse">
              Detetive analisando dependências... (pode levar até 30 segundos)
            </div>
          )}

          {!loading && impactos.length === 0 && (
            <div className="rounded-[10px] bg-ok/10 border border-ok/30 p-4 text-[13px]">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-ok font-medium">✓ Nenhum impacto detectado</span>
              </div>
              <p className="text-ink-2">
                O Detetive avaliou os demais agentes e não identificou inconsistências
                significativas que justifiquem reprocessamento. Os outputs atuais
                permanecem coerentes com a nova versão.
              </p>
            </div>
          )}

          {!loading && impactos.length > 0 && (
            <>
              <div className="rounded-[8px] bg-surface border border-border p-3 mb-4 text-[12px] text-ink-2">
                Marque os agentes que deseja reprocessar. <strong>Reprocessar não consome do limite de regenerações</strong> —
                é um efeito automático da alteração original. Por padrão, "Alta" e "Média" vêm marcados; "Baixa" desmarcado.
              </div>

              <div className="space-y-2">
                {impactos.map(imp => {
                  const cfg = SEV_CONFIG[imp.severidade]
                  const checked = selecionados.has(imp.step_key)
                  const label = stepLabels[imp.step_key] ?? imp.step_key
                  return (
                    <label
                      key={imp.step_key}
                      className={`flex items-start gap-3 p-3 rounded-[10px] border cursor-pointer transition ${
                        checked
                          ? 'border-accent-strong bg-accent-soft/30'
                          : 'border-border bg-surface hover:border-border-strong'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(imp.step_key)}
                        className="mt-1 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-[14px]">{label}</span>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${cfg.cls}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-[12px] text-ink-2 leading-relaxed">{imp.justificativa}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-2">
          <div className="text-[12px] text-ink-3">
            {!loading && total > 0 && `${selecionadosCount} de ${total} selecionado${selecionadosCount === 1 ? '' : 's'}`}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-[8px] text-[13px] text-ink-2 hover:text-ink transition"
            >
              {total === 0 ? 'Fechar' : 'Pular reprocessamento'}
            </button>
            {!loading && selecionadosCount > 0 && (
              <button
                onClick={reprocessarAgora}
                className="bg-accent-strong text-white px-4 py-2 rounded-[8px] text-[13px] font-semibold hover:opacity-90 transition"
              >
                Reprocessar {selecionadosCount} agente{selecionadosCount === 1 ? '' : 's'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
