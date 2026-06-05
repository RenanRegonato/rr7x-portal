'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatDateTimeBR, brDateToInstantISO } from '@/lib/format-date'

// ── Types ────────────────────────────────────────────────────────────────────

interface AuditLog {
  id:          string
  event:       string
  user_id:     string | null
  user_email:  string | null
  target_id:   string | null
  metadata:    Record<string, unknown> | null
  ip:          string | null
  user_agent:  string | null
  created_at:  string
}

// ── Constants ────────────────────────────────────────────────────────────────

const EVENT_CATEGORIES = [
  { value: '',                label: 'Todos os eventos',  desc: '' },
  { value: 'regeneracao.*',   label: 'Regenerações',      desc: 'Solicitações, avaliações, execuções e cascade' },
  { value: 'pacote.*',        label: 'Pacotes',           desc: 'Criação, edição, encerramento, consumo' },
  { value: 'analise.*',       label: 'Análises',          desc: 'Criação e deleção' },
  { value: 'admin.*',         label: 'Ações admin',       desc: 'Ativação/cancelamento de planos, buscas' },
  { value: 'share.*',         label: 'Compartilhamentos', desc: 'Criação, revogação, acessos' },
  { value: 'invite.*',        label: 'Convites',          desc: '' },
]

const EVENT_LABELS: Record<string, string> = {
  'analise.created':                  'Análise criada',
  'analise.deleted':                  'Análise deletada',
  'share.created':                    'Share criado',
  'share.revoked':                    'Share revogado',
  'share.accessed':                   'Share acessado',
  'admin.plan_activated':             'Plano ativado',
  'admin.plan_cancelled':             'Plano cancelado',
  'admin.user_searched':              'Usuário pesquisado',
  'invite.sent':                      'Convite enviado',
  'pacote.created':                   'Pacote criado',
  'pacote.updated':                   'Pacote atualizado',
  'pacote.deleted':                   'Pacote encerrado',
  'pacote.consumed':                  'Pacote consumido (–1 análise)',
  'regeneracao.solicitada':           'Regeneração solicitada',
  'regeneracao.avaliada':             'Revisor IA avaliou',
  'regeneracao.executada':            'Regeneração executada',
  'regeneracao.cancelada':            'Regeneração cancelada',
  'regeneracao.cascade_avaliada':     'Análise de Impacto avaliou cascade',
  'regeneracao.cascade_step_executado': 'Step recalculado via cascade',
}

const CATEGORY_CLS: Record<string, string> = {
  regeneracao: 'text-accent-strong bg-accent-soft border-accent/30',
  pacote:      'text-ok bg-ok/10 border-ok/30',
  analise:     'text-sky-700 bg-sky-50 border-sky-200',
  admin:       'text-warn bg-warn/10 border-warn/30',
  share:       'text-ink-2 bg-surface-2 border-border',
  invite:      'text-ink-2 bg-surface-2 border-border',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtTs(s: string): string {
  return formatDateTimeBR(s, { year: '2-digit', second: '2-digit' })
}

function categoria(event: string): string {
  return event.split('.')[0] ?? 'outro'
}

function eventoLabel(event: string): string {
  return EVENT_LABELS[event] ?? event
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AuditoriaPage() {
  const [logs,    setLogs]    = useState<AuditLog[]>([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [erro,    setErro]    = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Filtros
  const [filtroEvento,   setFiltroEvento]   = useState('')
  const [filtroFrom,     setFiltroFrom]     = useState('')
  const [filtroTo,       setFiltroTo]       = useState('')
  const [filtroTargetId, setFiltroTargetId] = useState('')

  // Paginação
  const limit = 50
  const [offset, setOffset] = useState(0)

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro('')
    try {
      const sp = new URLSearchParams()
      if (filtroEvento)   sp.set('event',     filtroEvento)
      if (filtroFrom)     sp.set('from',      brDateToInstantISO(filtroFrom))
      if (filtroTo)       sp.set('to',        brDateToInstantISO(filtroTo, true))
      if (filtroTargetId) sp.set('target_id', filtroTargetId)
      sp.set('limit',  String(limit))
      sp.set('offset', String(offset))

      const r = await fetch(`/api/admin/auditoria?${sp.toString()}`, { cache: 'no-store' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Erro ao listar')
      setLogs(d.logs ?? [])
      setTotal(d.total ?? 0)
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [filtroEvento, filtroFrom, filtroTo, filtroTargetId, offset])

  useEffect(() => { void carregar() }, [carregar])

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function resetFilters() {
    setFiltroEvento('')
    setFiltroFrom('')
    setFiltroTo('')
    setFiltroTargetId('')
    setOffset(0)
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const currentPage = Math.floor(offset / limit) + 1

  return (
    <div className="max-w-6xl mx-auto px-8 py-8 w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-[28px] font-medium tracking-tight">Auditoria</h1>
          <p className="text-ink-3 text-[13px] mt-1">
            Trilha completa de eventos do sistema: regenerações, pacotes, análises, admin, compartilhamentos.
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-surface border border-border rounded-[12px] p-4 mb-5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-ink-3 block mb-1">Categoria</label>
            <select
              value={filtroEvento}
              onChange={(e) => { setOffset(0); setFiltroEvento(e.target.value) }}
              className="w-full bg-bg border border-border rounded-[8px] px-3 py-2 text-[13px]"
            >
              {EVENT_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-ink-3 block mb-1">Target ID (opcional)</label>
            <input
              type="text"
              value={filtroTargetId}
              onChange={(e) => setFiltroTargetId(e.target.value)}
              onBlur={() => setOffset(0)}
              placeholder="UUID da análise / pacote / regeneração"
              className="w-full bg-bg border border-border rounded-[8px] px-3 py-2 text-[13px] font-mono"
            />
          </div>
          <div>
            <label className="text-[11px] text-ink-3 block mb-1">De</label>
            <input
              type="date"
              value={filtroFrom}
              onChange={(e) => { setOffset(0); setFiltroFrom(e.target.value) }}
              className="w-full bg-bg border border-border rounded-[8px] px-3 py-2 text-[13px]"
            />
          </div>
          <div>
            <label className="text-[11px] text-ink-3 block mb-1">Até</label>
            <input
              type="date"
              value={filtroTo}
              onChange={(e) => { setOffset(0); setFiltroTo(e.target.value) }}
              className="w-full bg-bg border border-border rounded-[8px] px-3 py-2 text-[13px]"
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-[12px] text-ink-3">
          <span>
            {loading ? 'Carregando...' : `${total} evento${total === 1 ? '' : 's'} encontrado${total === 1 ? '' : 's'}`}
          </span>
          <button
            onClick={resetFilters}
            className="text-[12px] text-ink-2 hover:text-ink underline"
          >
            Limpar filtros
          </button>
        </div>
      </div>

      {erro && (
        <div className="mb-4 p-3 rounded-[8px] bg-warn/10 text-warn text-[13px]">{erro}</div>
      )}

      {/* Lista */}
      {!loading && logs.length === 0 ? (
        <div className="text-ink-3 text-[13px] py-10 text-center border border-dashed border-border rounded-[10px]">
          Nenhum evento encontrado com os filtros aplicados.
        </div>
      ) : (
        <div className="border border-border rounded-[12px] overflow-hidden bg-surface">
          {logs.map((log, idx) => {
            const cat = categoria(log.event)
            const cls = CATEGORY_CLS[cat] ?? 'text-ink-2 bg-surface-2 border-border'
            const isExpanded = expanded.has(log.id)
            return (
              <div key={log.id} className={idx > 0 ? 'border-t border-border' : ''}>
                <button
                  onClick={() => toggleExpand(log.id)}
                  className="w-full px-4 py-3 hover:bg-surface-2 transition flex items-start gap-3 text-left"
                >
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border shrink-0 mt-0.5 ${cls}`}>
                    {cat}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-medium text-[13px]">{eventoLabel(log.event)}</span>
                      <span className="text-[11px] text-ink-3 shrink-0">{fmtTs(log.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-ink-3 mt-0.5">
                      <span>{log.user_email ?? '(sistema)'}</span>
                      {log.target_id && (
                        <>
                          <span>·</span>
                          <span className="font-mono">{log.target_id.slice(0, 8)}...</span>
                        </>
                      )}
                      {log.ip && <><span>·</span><span>{log.ip}</span></>}
                    </div>
                  </div>
                  <span className={`text-ink-3 shrink-0 transition ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 bg-bg border-t border-border">
                    <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-1.5 text-[12px]">
                      <dt className="text-ink-3">Evento</dt>
                      <dd className="font-mono">{log.event}</dd>
                      <dt className="text-ink-3">Quando</dt>
                      <dd>{fmtTs(log.created_at)}</dd>
                      <dt className="text-ink-3">Usuário</dt>
                      <dd>{log.user_email ?? '—'} {log.user_id && <span className="text-ink-3 font-mono ml-1">({log.user_id.slice(0, 8)}...)</span>}</dd>
                      {log.target_id && <>
                        <dt className="text-ink-3">Target ID</dt>
                        <dd className="font-mono">{log.target_id}</dd>
                      </>}
                      {log.ip && <>
                        <dt className="text-ink-3">IP</dt>
                        <dd>{log.ip}</dd>
                      </>}
                      {log.user_agent && <>
                        <dt className="text-ink-3">User-Agent</dt>
                        <dd className="text-[11px] text-ink-2 break-all">{log.user_agent}</dd>
                      </>}
                      {log.metadata && Object.keys(log.metadata).length > 0 && <>
                        <dt className="text-ink-3 self-start">Metadata</dt>
                        <dd>
                          <pre className="bg-surface border border-border rounded-[6px] p-2 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap break-all">
{JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </dd>
                      </>}
                    </dl>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Paginação */}
      {total > limit && (
        <div className="mt-4 flex items-center justify-between text-[13px]">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0 || loading}
            className="px-3 py-1.5 rounded-[8px] border border-border text-ink-2 hover:bg-surface disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span className="text-ink-3">
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total || loading}
            className="px-3 py-1.5 rounded-[8px] border border-border text-ink-2 hover:bg-surface disabled:opacity-40"
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  )
}
