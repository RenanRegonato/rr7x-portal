'use client'

import { useState } from 'react'

type Estado = 'formulario' | 'avaliando' | 'avaliado' | 'erro'

interface Avaliacao {
  regeneracao_id: string
  ia_decisao:     'aprovou' | 'contra_argumentou'
  ia_argumento:   string
  ia_riscos:      string[]
  regeneracoes_restantes: number
}

interface RegenerarModalProps {
  analiseId:          string
  step:               string
  stepLabel:          string
  regeneracoesCount:  number
  maxRegeneracoes:    number
  open:               boolean
  onClose:            () => void
  /** Chamado quando o assessor confirma a execução. O parent deve disparar
   *  runStep(step, regeneracaoId) e exibir o streaming normalmente. */
  onConfirmed:        (regeneracaoId: string) => void
}

export default function RegenerarModal({
  analiseId, step, stepLabel,
  regeneracoesCount, maxRegeneracoes,
  open, onClose, onConfirmed,
}: RegenerarModalProps) {
  const [estado, setEstado]   = useState<Estado>('formulario')
  const [oQue,   setOQue]     = useState('')
  const [motivo, setMotivo]   = useState('')
  const [erro,   setErro]     = useState('')
  const [avaliacao, setAvaliacao] = useState<Avaliacao | null>(null)
  const [confirmando, setConfirmando] = useState(false)

  if (!open) return null

  const limiteAtingido = regeneracoesCount >= maxRegeneracoes
  const restantesAntes  = maxRegeneracoes - regeneracoesCount

  function reset() {
    setEstado('formulario')
    setOQue('')
    setMotivo('')
    setErro('')
    setAvaliacao(null)
    setConfirmando(false)
  }

  function fechar() {
    reset()
    onClose()
  }

  async function avaliar() {
    if (oQue.trim().length < 10 || motivo.trim().length < 10) {
      setErro('Preencha os dois campos com no mínimo 10 caracteres cada.')
      return
    }
    setErro('')
    setEstado('avaliando')

    try {
      const r = await fetch(`/api/analise/${analiseId}/regenerar/avaliar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, o_que: oQue.trim(), motivo: motivo.trim() }),
      })
      const d = await r.json()
      if (!r.ok) {
        if (d.limite_atingido) {
          setErro(d.error || 'Limite de regenerações atingido.')
          setEstado('erro')
          return
        }
        throw new Error(d.error || 'Erro ao avaliar')
      }
      setAvaliacao(d as Avaliacao)
      setEstado('avaliado')
    } catch (e) {
      setErro((e as Error).message)
      setEstado('erro')
    }
  }

  async function prosseguir() {
    if (!avaliacao) return
    setConfirmando(true)
    try {
      const r = await fetch(`/api/analise/${analiseId}/regenerar/executar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regeneracao_id: avaliacao.regeneracao_id }),
      })
      const d = await r.json()
      if (!r.ok) {
        if (d.limite_atingido) {
          setErro(d.error || 'Limite atingido entre etapas. Recarregue a página.')
          setEstado('erro')
          return
        }
        throw new Error(d.error || 'Erro ao confirmar')
      }
      // Dispara a regeneração no parent (que chama o endpoint /step com regeneracao_id)
      onConfirmed(avaliacao.regeneracao_id)
      reset()
      onClose()
    } catch (e) {
      setErro((e as Error).message)
      setEstado('erro')
    } finally {
      setConfirmando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4"
      onClick={fechar}
    >
      <div
        className="bg-bg border border-border rounded-[14px] shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-[20px] font-medium tracking-tight">Regenerar Resumo</h2>
            <p className="text-[12px] text-ink-3 mt-0.5">
              Step: <span className="font-medium text-ink-2">{stepLabel}</span>
              {' '}· {regeneracoesCount}/{maxRegeneracoes} regenerações usadas
            </p>
          </div>
          <button onClick={fechar} className="text-ink-3 hover:text-ink text-[20px] leading-none">×</button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {limiteAtingido && estado === 'formulario' && (
            <div className="rounded-[10px] bg-warn/10 border border-warn/30 p-4 text-[13px] text-warn">
              <p className="font-medium mb-1">Limite de regenerações atingido</p>
              <p className="text-[12px]">
                Esta análise já usou {maxRegeneracoes} regenerações. Para novas alterações, será necessário
                subir novamente o Deal, o que consome uma nova análise do pacote.
              </p>
            </div>
          )}

          {estado === 'formulario' && !limiteAtingido && (
            <div className="space-y-4">
              <div className="rounded-[10px] bg-accent-soft/30 border border-accent/30 p-3 text-[12px] text-ink-2">
                Preencha o briefing abaixo. A IA Revisora avaliará tecnicamente se a alteração faz sentido
                no contexto da análise. A decisão final é sua, mesmo que ela contra-argumente, você pode
                prosseguir. Você tem <strong>{restantesAntes} regenerações restantes</strong>.
              </div>

              <div>
                <label className="text-[12px] font-medium text-ink-2 block mb-1">
                  O que você deseja alterar? <span className="text-warn">*</span>
                </label>
                <textarea
                  rows={4}
                  value={oQue}
                  onChange={(e) => setOQue(e.target.value)}
                  placeholder="Ex: O cálculo de EBITDA ajustado está considerando despesas não-recorrentes que deveriam ser mantidas no resultado normal..."
                  className="w-full bg-surface border border-border rounded-[8px] px-3 py-2 text-[13px] resize-none"
                  maxLength={3000}
                />
                <div className="text-[11px] text-ink-3 text-right mt-0.5">{oQue.length} / 3000</div>
              </div>

              <div>
                <label className="text-[12px] font-medium text-ink-2 block mb-1">
                  Qual o motivo da alteração? <span className="text-warn">*</span>
                </label>
                <textarea
                  rows={3}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ex: Conversamos com a controladoria do ativo e identificamos que R$ 850k são gastos sazonais que se repetem todo ano..."
                  className="w-full bg-surface border border-border rounded-[8px] px-3 py-2 text-[13px] resize-none"
                  maxLength={3000}
                />
                <div className="text-[11px] text-ink-3 text-right mt-0.5">{motivo.length} / 3000</div>
              </div>

              {erro && (
                <div className="rounded-[8px] bg-warn/10 text-warn text-[12px] p-2.5">{erro}</div>
              )}
            </div>
          )}

          {estado === 'avaliando' && (
            <div className="py-10 text-center">
              <div className="inline-block animate-pulse text-[13px] text-ink-3">
                IA Revisora analisando seu pedido... (pode levar até 30 segundos)
              </div>
            </div>
          )}

          {estado === 'avaliado' && avaliacao && (
            <div className="space-y-4">
              <div className={`rounded-[10px] border p-4 ${
                avaliacao.ia_decisao === 'aprovou'
                  ? 'bg-ok/10 border-ok/30'
                  : 'bg-warn/10 border-warn/30'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                    Decisão do Revisor
                  </span>
                  <span className={`text-[12px] font-medium px-2 py-0.5 rounded-full ${
                    avaliacao.ia_decisao === 'aprovou'
                      ? 'bg-ok text-bg'
                      : 'bg-warn text-bg'
                  }`}>
                    {avaliacao.ia_decisao === 'aprovou' ? '✓ Aprovou' : '⚠ Contra-argumentou'}
                  </span>
                </div>
                <div className="text-[13px] text-ink whitespace-pre-wrap leading-relaxed">
                  {avaliacao.ia_argumento}
                </div>
                {avaliacao.ia_riscos.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-current/10">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-1.5">
                      Riscos identificados
                    </p>
                    <ul className="text-[12px] text-ink-2 list-disc pl-4 space-y-0.5">
                      {avaliacao.ia_riscos.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              <div className="rounded-[8px] bg-surface border border-border p-3 text-[12px] text-ink-3">
                A decisão final é sua. Você pode prosseguir mesmo que o Revisor tenha contra-argumentado.
                Esta regeneração consumirá <strong>1 das suas {restantesAntes} restantes</strong>.
              </div>

              {erro && (
                <div className="rounded-[8px] bg-warn/10 text-warn text-[12px] p-2.5">{erro}</div>
              )}
            </div>
          )}

          {estado === 'erro' && (
            <div className="rounded-[10px] bg-warn/10 border border-warn/30 p-4 text-[13px] text-warn">
              {erro || 'Erro inesperado'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
          {estado === 'formulario' && !limiteAtingido && (
            <>
              <button
                onClick={fechar}
                className="px-4 py-2 rounded-[8px] text-[13px] text-ink-2 hover:text-ink"
              >Cancelar</button>
              <button
                onClick={avaliar}
                disabled={oQue.trim().length < 10 || motivo.trim().length < 10}
                className="bg-ink text-bg px-4 py-2 rounded-[8px] text-[13px] font-semibold hover:opacity-90 disabled:opacity-40 transition"
              >Avaliar com IA</button>
            </>
          )}

          {estado === 'avaliado' && avaliacao && (
            <>
              <button
                onClick={fechar}
                disabled={confirmando}
                className="px-4 py-2 rounded-[8px] text-[13px] text-ink-2 hover:text-ink disabled:opacity-50"
              >Cancelar</button>
              <button
                onClick={prosseguir}
                disabled={confirmando}
                className={`px-4 py-2 rounded-[8px] text-[13px] font-semibold transition disabled:opacity-50 ${
                  avaliacao.ia_decisao === 'aprovou'
                    ? 'bg-ok text-bg hover:opacity-90'
                    : 'bg-warn text-bg hover:opacity-90'
                }`}
              >
                {confirmando
                  ? 'Confirmando...'
                  : avaliacao.ia_decisao === 'aprovou'
                    ? 'Prosseguir com a regeneração'
                    : 'Prosseguir mesmo assim'}
              </button>
            </>
          )}

          {(estado === 'avaliando') && (
            <button disabled className="px-4 py-2 rounded-[8px] text-[13px] text-ink-3">Avaliando...</button>
          )}

          {(estado === 'erro' || limiteAtingido) && (
            <button onClick={fechar} className="px-4 py-2 rounded-[8px] text-[13px] bg-ink text-bg">Fechar</button>
          )}
        </div>
      </div>
    </div>
  )
}
