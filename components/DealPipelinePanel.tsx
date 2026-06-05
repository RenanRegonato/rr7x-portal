'use client'

import { useState, useEffect, useRef } from 'react'
import { formatDateTimeBR } from '@/lib/format-date'

export type PipelineStage = 'originacao' | 'analise' | 'compliance' | 'comite' | 'aprovado' | 'rejeitado'

export interface PipelineEvent {
  id:         string
  user_email: string | null
  tipo:       string
  stage_de?:  string | null
  stage_para?: string | null
  comentario?: string | null
  criado_em:  string
}

export interface DealMember {
  id:       string
  user_id:  string
  role:     string
  adicionado_em: string
}

const STAGES: { key: PipelineStage; label: string; short: string }[] = [
  { key: 'originacao', label: 'Originação',   short: 'Orig.' },
  { key: 'analise',    label: 'Análise',       short: 'Anál.' },
  { key: 'compliance', label: 'Compliance',    short: 'Comp.' },
  { key: 'comite',     label: 'Comitê',        short: 'Com.' },
  { key: 'aprovado',   label: 'Aprovado',      short: 'Aprov.' },
]

const ADVANCE_LABEL: Partial<Record<PipelineStage, string>> = {
  originacao: 'Enviar para Análise',
  analise:    'Enviar para Compliance',
  compliance: 'Enviar para Comitê',
  comite:     'Aprovar Deal',
}

const ROLE_LABEL: Record<string, string> = {
  originador: 'Originador',
  analista:   'Analista',
  compliance: 'Compliance',
  parceiro:   'Parceiro',
  gestor:     'Gestor',
}

const TIPO_LABEL: Record<string, string> = {
  stage_change: 'Avançou para',
  aprovacao:    'Aprovado',
  rejeicao:     'Rejeitado',
  comment:      '',
}

function fmtDate(iso: string) {
  return formatDateTimeBR(iso, { day: '2-digit', month: 'short', year: undefined, hour: '2-digit', minute: '2-digit' })
}

function StageBar({ stage }: { stage: PipelineStage }) {
  const isRejected = stage === 'rejeitado'
  const currentIdx = STAGES.findIndex((s) => s.key === stage)

  return (
    <div className="flex items-center gap-0">
      {STAGES.map((s, i) => {
        const done    = isRejected ? false : i < currentIdx
        const active  = !isRejected && s.key === stage
        const future  = !done && !active

        return (
          <div key={s.key} className="flex items-center flex-1 min-w-0">
            <div className={`
              flex-1 text-center py-2 px-1 text-[11px] font-semibold truncate rounded
              transition-colors
              ${active  ? 'bg-accent-strong text-white'                : ''}
              ${done    ? 'bg-ok-soft text-ok'                          : ''}
              ${future  ? 'bg-surface-2 text-ink-3'                     : ''}
              ${isRejected && s.key === 'aprovado' ? 'hidden' : ''}
            `}>
              {done ? '✓ ' : ''}{s.short}
            </div>
            {i < STAGES.length - 1 && (
              <div className={`w-[2px] h-4 mx-0.5 rounded-full ${done ? 'bg-ok' : 'bg-border'}`}/>
            )}
          </div>
        )
      })}

      {isRejected && (
        <div className="flex-1 text-center py-2 px-2 text-[11px] font-semibold bg-warn-soft text-warn rounded">
          Rejeitado
        </div>
      )}
    </div>
  )
}

export default function DealPipelinePanel({ analiseId }: { analiseId: string }) {
  const [stage,    setStage]    = useState<PipelineStage>('originacao')
  const [events,   setEvents]   = useState<PipelineEvent[]>([])
  const [members,  setMembers]  = useState<DealMember[]>([])
  const [loading,  setLoading]  = useState(true)
  const [comment,  setComment]  = useState('')
  const [posting,  setPosting]  = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addRole,  setAddRole]  = useState('analista')
  const [addingMember, setAddingMember] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [showConfirmAdvance, setShowConfirmAdvance] = useState(false)
  const [advanceComment, setAdvanceComment] = useState('')
  const logRef = useRef<HTMLDivElement>(null)

  async function loadData() {
    const res  = await fetch(`/api/analise/pipeline?id=${analiseId}`)
    const data = await res.json()
    setStage(data.stage ?? 'originacao')
    setEvents(data.events ?? [])
    setMembers(data.members ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [analiseId])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [events])

  async function postAction(action: 'advance' | 'reject' | 'comment', extra: Record<string, string> = {}) {
    setPosting(true)
    try {
      await fetch('/api/analise/pipeline', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ analise_id: analiseId, action, ...extra }),
      })
      await loadData()
      setComment('')
      setAdvanceComment('')
      setShowConfirmAdvance(false)
    } finally {
      setPosting(false)
    }
  }

  async function addMember() {
    if (!addEmail.trim()) return
    setAddingMember(true)
    try {
      const res  = await fetch('/api/analise/members', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ analise_id: analiseId, email: addEmail.trim(), role: addRole }),
      })
      const data = await res.json()
      if (data.error) { alert(data.error); return }
      setAddEmail('')
      setShowAddMember(false)
      await loadData()
    } finally {
      setAddingMember(false)
    }
  }

  async function removeMember(userId: string) {
    await fetch('/api/analise/members', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ analise_id: analiseId, user_id: userId }),
    })
    await loadData()
  }

  const isFinal   = stage === 'aprovado' || stage === 'rejeitado'
  const canAdvance = ADVANCE_LABEL[stage] !== undefined

  if (loading) return <div className="text-[12px] text-ink-3 p-4">Carregando pipeline...</div>

  return (
    <div className="flex flex-col gap-5">

      {/* Stage bar */}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-2">Estágio do Deal</div>
        <StageBar stage={stage}/>
      </div>

      {/* Ações de avanço */}
      {!isFinal && (
        <div className="flex gap-2 flex-wrap">
          {canAdvance && !showConfirmAdvance && (
            <button
              onClick={() => setShowConfirmAdvance(true)}
              className="px-3.5 py-2 rounded-[10px] bg-accent-strong text-white text-[13px] font-semibold hover:opacity-90 transition"
            >
              {ADVANCE_LABEL[stage]} →
            </button>
          )}
          {!showConfirmAdvance && (
            <button
              onClick={() => postAction('reject', { comentario: 'Rejeitado pelo operador' })}
              disabled={posting}
              className="px-3.5 py-2 rounded-[10px] border border-border text-ink-2 text-[13px] font-medium hover:bg-warn-soft hover:text-warn hover:border-warn transition disabled:opacity-40"
            >
              Rejeitar deal
            </button>
          )}

          {showConfirmAdvance && (
            <div className="w-full flex flex-col gap-2">
              <textarea
                value={advanceComment}
                onChange={(e) => setAdvanceComment(e.target.value)}
                placeholder="Comentário opcional para este avanço..."
                className="w-full border border-border rounded-[10px] px-3 py-2 text-[13px] text-ink bg-surface resize-none focus:outline-none focus:border-accent-strong"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => postAction('advance', { comentario: advanceComment })}
                  disabled={posting}
                  className="px-3.5 py-2 rounded-[10px] bg-accent-strong text-white text-[13px] font-semibold hover:opacity-90 transition disabled:opacity-40"
                >
                  {posting ? 'Avançando...' : 'Confirmar'}
                </button>
                <button
                  onClick={() => setShowConfirmAdvance(false)}
                  className="px-3.5 py-2 rounded-[10px] border border-border text-ink-2 text-[13px] font-medium hover:bg-surface-2 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Timeline de eventos */}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-2">Histórico</div>
        <div
          ref={logRef}
          className="bg-bg-tint border border-border rounded-[10px] p-3 flex flex-col gap-2.5 max-h-[240px] overflow-y-auto"
        >
          {events.length === 0 && (
            <div className="text-[12px] text-ink-3">Nenhum evento registrado ainda.</div>
          )}
          {events.map((ev) => (
            <div key={ev.id} className="flex gap-2.5 text-[12px]">
              <span className="text-ink-3 whitespace-nowrap font-mono text-[11px] pt-px">{fmtDate(ev.criado_em)}</span>
              <div className="flex-1">
                <span className="text-ink-3">{ev.user_email ?? 'Sistema'}</span>
                {ev.tipo === 'stage_change' && (
                  <span className="text-ink-2"> → <span className="font-medium text-ink">{ev.stage_para}</span></span>
                )}
                {ev.tipo === 'aprovacao' && (
                  <span className="text-ok font-semibold"> ✓ Aprovado</span>
                )}
                {ev.tipo === 'rejeicao' && (
                  <span className="text-warn font-semibold"> ✗ Rejeitado</span>
                )}
                {ev.comentario && (
                  <div className="text-ink mt-0.5">{ev.comentario}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Campo de comentário */}
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && comment.trim()) postAction('comment', { comentario: comment }) }}
            placeholder="Adicionar comentário..."
            className="flex-1 border border-border rounded-[10px] px-3 py-2 text-[13px] text-ink bg-surface focus:outline-none focus:border-accent-strong"
          />
          <button
            onClick={() => comment.trim() && postAction('comment', { comentario: comment })}
            disabled={posting || !comment.trim()}
            className="px-3 py-2 rounded-[10px] border border-border text-ink-2 text-[13px] font-medium hover:bg-surface-2 transition disabled:opacity-40"
          >
            {posting ? '...' : 'Enviar'}
          </button>
        </div>
      </div>

      {/* Equipe do deal */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Equipe do Deal</div>
          <button
            onClick={() => setShowAddMember((v) => !v)}
            className="text-[11px] text-accent-strong hover:underline font-medium"
          >
            + Adicionar
          </button>
        </div>

        {showAddMember && (
          <div className="bg-bg-tint border border-border rounded-[10px] p-3 mb-3 flex flex-col gap-2">
            <input
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              placeholder="Email do usuário na plataforma"
              className="border border-border rounded-[8px] px-3 py-1.5 text-[13px] text-ink bg-surface focus:outline-none focus:border-accent-strong"
            />
            <div className="flex gap-2">
              <select
                value={addRole}
                onChange={(e) => setAddRole(e.target.value)}
                className="flex-1 border border-border rounded-[8px] px-2 py-1.5 text-[13px] text-ink bg-surface focus:outline-none"
              >
                {Object.entries(ROLE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <button
                onClick={addMember}
                disabled={addingMember || !addEmail.trim()}
                className="px-3 py-1.5 rounded-[8px] bg-accent-strong text-white text-[13px] font-semibold disabled:opacity-40"
              >
                {addingMember ? '...' : 'Adicionar'}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          {members.length === 0 && (
            <div className="text-[12px] text-ink-3">Nenhum membro adicionado.</div>
          )}
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between text-[12px]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-surface-2 border border-border flex items-center justify-center text-[10px] font-bold text-ink-2">
                  {m.role[0].toUpperCase()}
                </div>
                <span className="text-ink">{ROLE_LABEL[m.role] ?? m.role}</span>
              </div>
              <button
                onClick={() => removeMember(m.user_id)}
                className="text-ink-3 hover:text-warn transition text-[11px]"
              >
                remover
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
