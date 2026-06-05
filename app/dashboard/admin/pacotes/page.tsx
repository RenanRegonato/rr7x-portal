'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { formatDateBR } from '@/lib/format-date'
import { useSearchParams } from 'next/navigation'

// ── Types ────────────────────────────────────────────────────────────────────

type TipoPacote = 'pontual' | 'institucional' | 'corporativo'
type StatusPacote = 'ativo' | 'pausado' | 'encerrado'

type Escritorio = {
  id:   string
  nome: string | null
  cnpj: string | null
}

type Pacote = {
  id:                  string
  escritorio_id:       string
  tipo:                TipoPacote
  analises_total:      number
  analises_consumidas: number
  status:              StatusPacote
  observacoes:         string | null
  criado_em:           string
  atualizado_em:       string
  escritorios:         Escritorio | null
}

// ── Constants ────────────────────────────────────────────────────────────────

const TIPO_LABEL: Record<TipoPacote, string> = {
  pontual:       'Pontual',
  institucional: 'Institucional',
  corporativo:   'Corporativo',
}

const STATUS_CLS: Record<StatusPacote, string> = {
  ativo:     'text-ok bg-ok/10 border-ok/30',
  pausado:   'text-warn bg-warn/10 border-warn/30',
  encerrado: 'text-ink-3 bg-surface-2 border-border',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (d: string) =>
  formatDateBR(d, { day: '2-digit', month: '2-digit', year: '2-digit' })

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PacotesAdminPage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-8 py-8 text-ink-3 text-[13px]">Carregando...</div>}>
      <PacotesAdminInner />
    </Suspense>
  )
}

function PacotesAdminInner() {
  const searchParams = useSearchParams()
  const initialEscritorio = searchParams.get('escritorio_id') ?? ''

  const [pacotes, setPacotes]         = useState<Pacote[]>([])
  const [escritorios, setEscritorios] = useState<Escritorio[]>([])
  const [loading, setLoading]         = useState(true)
  const [erro, setErro]               = useState('')
  const [filtroEscritorio, setFiltroEscritorio] = useState(initialEscritorio)
  const [filtroStatus, setFiltroStatus]         = useState<'todos' | StatusPacote>('todos')

  // Modal de criação
  const [showCriar, setShowCriar]   = useState(false)
  const [novoEsc,   setNovoEsc]     = useState('')
  const [novoTipo,  setNovoTipo]    = useState<TipoPacote>('pontual')
  const [novoTotal, setNovoTotal]   = useState(5)
  const [novoObs,   setNovoObs]     = useState('')
  const [salvando,  setSalvando]    = useState(false)
  const [erroCriar, setErroCriar]   = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro('')
    try {
      const [r1, r2] = await Promise.all([
        fetch('/api/admin/pacotes', { cache: 'no-store' }),
        fetch('/api/admin/escritorios', { cache: 'no-store' }),
      ])
      const d1 = await r1.json()
      const d2 = await r2.json()
      if (!r1.ok) throw new Error(d1.error || 'Erro ao listar pacotes')
      if (!r2.ok) throw new Error(d2.error || 'Erro ao listar escritórios')
      setPacotes(d1.pacotes ?? [])
      setEscritorios((d2.escritorios ?? []).map((e: { id: string; nome: string | null; cnpj?: string | null }) => ({
        id: e.id, nome: e.nome, cnpj: e.cnpj ?? null,
      })))
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  // Ajusta automaticamente o total quando o tipo muda
  useEffect(() => {
    if (novoTipo === 'institucional') setNovoTotal(20)
    if (novoTipo === 'pontual') setNovoTotal(5)
    if (novoTipo === 'corporativo') setNovoTotal(50)
  }, [novoTipo])

  async function criar() {
    setErroCriar('')
    if (!novoEsc) { setErroCriar('Selecione um escritório'); return }
    if (novoTotal <= 0) { setErroCriar('Total de análises precisa ser maior que zero'); return }
    if (novoTipo === 'institucional' && novoTotal > 20) {
      setErroCriar('Pacote Institucional permite no máximo 20 análises'); return
    }
    setSalvando(true)
    try {
      const r = await fetch('/api/admin/pacotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          escritorio_id:  novoEsc,
          tipo:           novoTipo,
          analises_total: novoTotal,
          observacoes:    novoObs || undefined,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Erro ao criar')
      setShowCriar(false)
      setNovoEsc('')
      setNovoObs('')
      void carregar()
    } catch (e) {
      setErroCriar((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  async function alterarStatus(id: string, status: StatusPacote) {
    const r = await fetch(`/api/admin/pacotes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!r.ok) {
      const d = await r.json().catch(() => ({}))
      alert(d.error || 'Erro ao alterar status')
      return
    }
    void carregar()
  }

  async function alterarTotal(id: string, atual: number) {
    const novo = prompt('Novo total de análises:', String(atual))
    if (novo === null) return
    const n = parseInt(novo, 10)
    if (!Number.isFinite(n) || n <= 0) {
      alert('Valor inválido')
      return
    }
    const r = await fetch(`/api/admin/pacotes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analises_total: n }),
    })
    if (!r.ok) {
      const d = await r.json().catch(() => ({}))
      alert(d.error || 'Erro ao atualizar')
      return
    }
    void carregar()
  }

  async function encerrar(id: string) {
    if (!confirm('Encerrar este pacote? As análises já consumidas serão preservadas no histórico.')) return
    const r = await fetch(`/api/admin/pacotes/${id}`, { method: 'DELETE' })
    if (!r.ok) {
      const d = await r.json().catch(() => ({}))
      alert(d.error || 'Erro ao encerrar')
      return
    }
    void carregar()
  }

  const filtrados = pacotes.filter(p => {
    if (filtroEscritorio && p.escritorio_id !== filtroEscritorio) return false
    if (filtroStatus !== 'todos' && p.status !== filtroStatus) return false
    return true
  })

  return (
    <div className="max-w-6xl mx-auto px-8 py-8 w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-[28px] font-medium tracking-tight">Pacotes de análises</h1>
          <p className="text-ink-3 text-[13px] mt-1">Gestão de pacotes contratados por escritório.</p>
        </div>
        <button
          onClick={() => setShowCriar(true)}
          className="bg-ink text-bg px-4 py-2 rounded-[8px] text-[13px] font-semibold hover:opacity-90 transition"
        >
          + Criar pacote
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-5">
        <select
          value={filtroEscritorio}
          onChange={(e) => setFiltroEscritorio(e.target.value)}
          className="bg-surface border border-border rounded-[8px] px-3 py-2 text-[13px]"
        >
          <option value="">Todos os escritórios</option>
          {escritorios.map(e => (
            <option key={e.id} value={e.id}>{e.nome || '(sem nome)'}</option>
          ))}
        </select>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as 'todos' | StatusPacote)}
          className="bg-surface border border-border rounded-[8px] px-3 py-2 text-[13px]"
        >
          <option value="todos">Todos os status</option>
          <option value="ativo">Ativos</option>
          <option value="pausado">Pausados</option>
          <option value="encerrado">Encerrados</option>
        </select>
      </div>

      {erro && (
        <div className="mb-4 p-3 rounded-[8px] bg-warn/10 text-warn text-[13px]">{erro}</div>
      )}

      {loading ? (
        <div className="text-ink-3 text-[13px]">Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div className="text-ink-3 text-[13px] py-10 text-center border border-dashed border-border rounded-[10px]">
          Nenhum pacote encontrado.
        </div>
      ) : (
        <div className="grid gap-3">
          {filtrados.map(p => {
            const restantes = p.analises_total - p.analises_consumidas
            const pct = Math.round((p.analises_consumidas / p.analises_total) * 100)
            return (
              <div
                key={p.id}
                className="rounded-[12px] border border-border bg-surface p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-[15px]">{p.escritorios?.nome || '(escritório sem nome)'}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border ${STATUS_CLS[p.status]}`}>
                        {p.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[12px] text-ink-3">
                      <span className="font-medium text-ink-2">{TIPO_LABEL[p.tipo]}</span>
                      <span>·</span>
                      <span>criado em {fmt(p.criado_em)}</span>
                      {p.escritorios?.cnpj && <><span>·</span><span>CNPJ {p.escritorios.cnpj}</span></>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {p.status === 'ativo' && (
                      <button
                        onClick={() => alterarStatus(p.id, 'pausado')}
                        className="text-[12px] text-warn hover:underline"
                      >Pausar</button>
                    )}
                    {p.status === 'pausado' && (
                      <button
                        onClick={() => alterarStatus(p.id, 'ativo')}
                        className="text-[12px] text-ok hover:underline"
                      >Reativar</button>
                    )}
                    <button
                      onClick={() => alterarTotal(p.id, p.analises_total)}
                      className="text-[12px] text-ink-2 hover:text-ink"
                    >Editar total</button>
                    {p.status !== 'encerrado' && (
                      <button
                        onClick={() => encerrar(p.id)}
                        className="text-[12px] text-warn hover:underline"
                      >Encerrar</button>
                    )}
                  </div>
                </div>

                {/* Barra de consumo */}
                <div>
                  <div className="flex items-baseline justify-between text-[12px] mb-1.5">
                    <span className="text-ink-2">
                      <span className="font-medium text-ink">{p.analises_consumidas}</span>
                      <span className="text-ink-3"> / {p.analises_total} análises consumidas</span>
                    </span>
                    <span className={restantes === 0 ? 'text-warn font-medium' : 'text-ink-3'}>
                      {restantes} restante{restantes === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct >= 100 ? 'bg-warn' : pct >= 80 ? 'bg-warn/60' : 'bg-accent'
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>

                {p.observacoes && (
                  <div className="text-[12px] text-ink-3 border-t border-border pt-3">
                    {p.observacoes}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de criação */}
      {showCriar && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 p-4" onClick={() => setShowCriar(false)}>
          <div
            className="bg-bg rounded-[14px] border border-border p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-[20px] font-medium mb-4">Criar pacote</h2>

            <div className="space-y-3">
              <div>
                <label className="text-[12px] font-medium text-ink-2 block mb-1">Escritório</label>
                <select
                  value={novoEsc}
                  onChange={(e) => setNovoEsc(e.target.value)}
                  className="w-full bg-surface border border-border rounded-[8px] px-3 py-2 text-[13px]"
                >
                  <option value="">Selecione...</option>
                  {escritorios.map(e => (
                    <option key={e.id} value={e.id}>{e.nome || '(sem nome)'}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[12px] font-medium text-ink-2 block mb-1">Tipo de pacote</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['pontual', 'institucional', 'corporativo'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setNovoTipo(t)}
                      className={`px-3 py-2 rounded-[8px] text-[12px] font-medium border transition ${
                        novoTipo === t
                          ? 'border-accent-strong bg-accent-soft/50 text-accent-strong'
                          : 'border-border bg-surface text-ink-2 hover:border-border-strong'
                      }`}
                    >{TIPO_LABEL[t]}</button>
                  ))}
                </div>
                <p className="text-[11px] text-ink-3 mt-1.5">
                  {novoTipo === 'pontual'       && 'Análises avulsas. Gestor define a quantidade.'}
                  {novoTipo === 'institucional' && 'Até 20 análises (máximo do tipo).'}
                  {novoTipo === 'corporativo'   && 'Quantidade livre, definida por negociação.'}
                </p>
              </div>

              <div>
                <label className="text-[12px] font-medium text-ink-2 block mb-1">Total de análises</label>
                <input
                  type="number"
                  min={1}
                  max={novoTipo === 'institucional' ? 20 : 1000}
                  value={novoTotal}
                  onChange={(e) => setNovoTotal(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-surface border border-border rounded-[8px] px-3 py-2 text-[13px]"
                />
              </div>

              <div>
                <label className="text-[12px] font-medium text-ink-2 block mb-1">Observações (opcional)</label>
                <textarea
                  rows={2}
                  value={novoObs}
                  onChange={(e) => setNovoObs(e.target.value)}
                  placeholder="Ex: contrato comercial #1234, válido até 12/2026..."
                  className="w-full bg-surface border border-border rounded-[8px] px-3 py-2 text-[13px] resize-none"
                />
              </div>
            </div>

            {erroCriar && (
              <div className="mt-3 p-2.5 rounded-[6px] bg-warn/10 text-warn text-[12px]">{erroCriar}</div>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowCriar(false)}
                className="px-4 py-2 rounded-[8px] text-[13px] text-ink-2 hover:text-ink transition"
                disabled={salvando}
              >Cancelar</button>
              <button
                onClick={criar}
                disabled={salvando}
                className="bg-ink text-bg px-4 py-2 rounded-[8px] text-[13px] font-semibold hover:opacity-90 disabled:opacity-50 transition"
              >{salvando ? 'Criando...' : 'Criar pacote'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
