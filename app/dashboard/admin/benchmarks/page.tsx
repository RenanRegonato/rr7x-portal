'use client'

import { useCallback, useEffect, useState } from 'react'

// ── Types ────────────────────────────────────────────────────────────────────

type Unit = 'BRL' | 'pct' | 'multiplo' | 'meses' | 'qtd' | 'pct_cdi'

interface Benchmark {
  id:            string
  instrument:    string
  parameter:     string
  value_min:     number
  value_max:     number
  unit:          Unit
  descricao:     string | null
  notes:         string | null
  source:        string | null
  valid_from:    string
  valid_to:      string | null
  ativo:         boolean
  criado_em:     string
  atualizado_em: string
}

const UNIT_LABEL: Record<Unit, string> = {
  BRL:      'R$',
  pct:      '%',
  multiplo: 'x',
  meses:    'meses',
  qtd:      'qtd',
  pct_cdi:  '% CDI',
}

const INSTRUMENT_PRESETS = [
  'FIDC', 'CRI', 'CRA', 'CCB', 'DEBENTURE', 'DEBENTURE_INCENTIVADA',
  'M_A_PME', 'M_A_MEDIO', 'M_A_TECH', 'CREDITO_BANCARIO',
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number, unit: Unit): string {
  switch (unit) {
    case 'BRL':
      return v >= 1_000_000
        ? `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`
        : `R$ ${v.toLocaleString('pt-BR')}`
    case 'pct':      return `${v}%`
    case 'pct_cdi':  return `CDI+${v}%`
    case 'multiplo': return `${v}x`
    case 'meses':    return `${v}m`
    case 'qtd':      return String(v)
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BenchmarksAdminPage() {
  const [list, setList]       = useState<Benchmark[]>([])
  const [loading, setLoading] = useState(true)
  const [erro,    setErro]    = useState('')
  const [filtro,  setFiltro]  = useState('')   // instrument filter
  const [showInativos, setShowInativos] = useState(false)

  // Form de criação
  const [showCriar,  setShowCriar]   = useState(false)
  const [novoInst,   setNovoInst]    = useState('FIDC')
  const [novoParam,  setNovoParam]   = useState('')
  const [novoMin,    setNovoMin]     = useState(0)
  const [novoMax,    setNovoMax]     = useState(0)
  const [novoUnit,   setNovoUnit]    = useState<Unit>('BRL')
  const [novoDesc,   setNovoDesc]    = useState('')
  const [novoSource, setNovoSource]  = useState('')
  const [salvando,   setSalvando]    = useState(false)
  const [erroCriar,  setErroCriar]   = useState('')

  // Edição inline
  const [editId, setEditId]       = useState<string | null>(null)
  const [editMin, setEditMin]     = useState(0)
  const [editMax, setEditMax]     = useState(0)
  const [editDesc, setEditDesc]   = useState('')

  const carregar = useCallback(async () => {
    setLoading(true); setErro('')
    try {
      const r = await fetch(`/api/admin/benchmarks?ativo=${showInativos ? 'false' : 'true'}`, { cache: 'no-store' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Erro')
      setList(d.benchmarks ?? [])
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [showInativos])

  useEffect(() => { void carregar() }, [carregar])

  async function criar() {
    setErroCriar('')
    if (!novoInst || !novoParam) { setErroCriar('Preencha instrumento e parâmetro'); return }
    if (novoMax < novoMin)      { setErroCriar('value_max precisa ser ≥ value_min'); return }
    setSalvando(true)
    try {
      const r = await fetch('/api/admin/benchmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instrument: novoInst.trim().toUpperCase(),
          parameter:  novoParam.trim(),
          value_min:  novoMin,
          value_max:  novoMax,
          unit:       novoUnit,
          descricao:  novoDesc || undefined,
          source:     novoSource || undefined,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Erro')
      setShowCriar(false)
      setNovoParam(''); setNovoDesc(''); setNovoSource(''); setNovoMin(0); setNovoMax(0)
      void carregar()
    } catch (e) {
      setErroCriar((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  function startEdit(b: Benchmark) {
    setEditId(b.id)
    setEditMin(b.value_min)
    setEditMax(b.value_max)
    setEditDesc(b.descricao ?? '')
  }

  async function saveEdit(id: string) {
    if (editMax < editMin) { alert('value_max precisa ser ≥ value_min'); return }
    const r = await fetch(`/api/admin/benchmarks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        value_min:  editMin,
        value_max:  editMax,
        descricao:  editDesc,
      }),
    })
    if (!r.ok) {
      const d = await r.json().catch(() => ({}))
      alert(d.error || 'Erro')
      return
    }
    setEditId(null)
    void carregar()
  }

  async function arquivar(id: string) {
    if (!confirm('Arquivar este benchmark? Ele para de ser usado pelos agentes mas fica no histórico.')) return
    const r = await fetch(`/api/admin/benchmarks/${id}`, { method: 'DELETE' })
    if (!r.ok) {
      const d = await r.json().catch(() => ({}))
      alert(d.error || 'Erro')
      return
    }
    void carregar()
  }

  const filtrados = filtro
    ? list.filter(b => b.instrument === filtro)
    : list

  // Agrupa por instrument
  const grupos = new Map<string, Benchmark[]>()
  for (const b of filtrados) {
    const arr = grupos.get(b.instrument) ?? []
    arr.push(b)
    grupos.set(b.instrument, arr)
  }
  const instruments = Array.from(grupos.keys()).sort()

  return (
    <div className="max-w-6xl mx-auto px-8 py-8 w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-[28px] font-medium tracking-tight">Benchmarks de mercado</h1>
          <p className="text-ink-3 text-[13px] mt-1">
            Parâmetros de mercado consultados pelos agentes para validação quantitativa de elegibilidade.
          </p>
        </div>
        <button
          onClick={() => setShowCriar(true)}
          className="bg-ink text-bg px-4 py-2 rounded-[8px] text-[13px] font-semibold hover:opacity-90 transition"
        >
          + Novo benchmark
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-5 items-center">
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="bg-surface border border-border rounded-[8px] px-3 py-2 text-[13px]"
        >
          <option value="">Todos os instrumentos</option>
          {Array.from(new Set(list.map(b => b.instrument))).sort().map(inst => (
            <option key={inst} value={inst}>{inst}</option>
          ))}
        </select>
        <label className="text-[12px] text-ink-3 flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showInativos}
            onChange={(e) => setShowInativos(e.target.checked)}
          />
          Mostrar arquivados
        </label>
      </div>

      {erro && <div className="mb-4 p-3 rounded-[8px] bg-warn/10 text-warn text-[13px]">{erro}</div>}

      {loading ? (
        <div className="text-ink-3 text-[13px]">Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div className="text-ink-3 text-[13px] py-10 text-center border border-dashed border-border rounded-[10px]">
          Nenhum benchmark encontrado.
        </div>
      ) : (
        <div className="space-y-6">
          {instruments.map(inst => (
            <div key={inst}>
              <h2 className="font-display text-[16px] font-medium mb-2">{inst}</h2>
              <div className="border border-border rounded-[12px] overflow-hidden bg-surface">
                {(grupos.get(inst) ?? []).map((b, idx) => (
                  <div key={b.id} className={`px-4 py-3 ${idx > 0 ? 'border-t border-border' : ''} ${!b.ativo ? 'opacity-50' : ''}`}>
                    {editId === b.id ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[12px] text-ink-3 min-w-[180px]">{b.parameter}</span>
                          <input
                            type="number"
                            value={editMin}
                            onChange={(e) => setEditMin(parseFloat(e.target.value) || 0)}
                            className="w-32 bg-bg border border-border rounded-[6px] px-2 py-1 text-[13px]"
                          />
                          <span className="text-ink-3">→</span>
                          <input
                            type="number"
                            value={editMax}
                            onChange={(e) => setEditMax(parseFloat(e.target.value) || 0)}
                            className="w-32 bg-bg border border-border rounded-[6px] px-2 py-1 text-[13px]"
                          />
                          <span className="text-[12px] text-ink-3">{UNIT_LABEL[b.unit]}</span>
                        </div>
                        <input
                          type="text"
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          placeholder="Descrição"
                          className="w-full bg-bg border border-border rounded-[6px] px-2 py-1 text-[12px]"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(b.id)} className="text-[12px] bg-ink text-bg px-3 py-1 rounded-[6px]">Salvar</button>
                          <button onClick={() => setEditId(null)} className="text-[12px] text-ink-2 px-3 py-1">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-3">
                            <span className="font-mono text-[12px] text-ink-3">{b.parameter}</span>
                            <span className="font-medium text-[14px]">
                              {b.value_min === b.value_max
                                ? fmt(b.value_min, b.unit)
                                : `${fmt(b.value_min, b.unit)} → ${fmt(b.value_max, b.unit)}`}
                            </span>
                          </div>
                          {b.descricao && <div className="text-[12px] text-ink-2 mt-0.5">{b.descricao}</div>}
                          {b.source    && <div className="text-[11px] text-ink-3 mt-0.5">fonte: {b.source}</div>}
                        </div>
                        <div className="flex gap-2 text-[12px] shrink-0">
                          {b.ativo && (
                            <button onClick={() => startEdit(b)} className="text-ink-2 hover:text-ink">Editar</button>
                          )}
                          {b.ativo && (
                            <button onClick={() => arquivar(b.id)} className="text-warn hover:underline">Arquivar</button>
                          )}
                          {!b.ativo && (
                            <span className="text-ink-3">arquivado em {b.valid_to ? new Date(b.valid_to).toLocaleDateString('pt-BR') : '—'}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de criação */}
      {showCriar && (
        <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4" onClick={() => setShowCriar(false)}>
          <div className="bg-bg border border-border rounded-[14px] shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-[20px] font-medium mb-4">Novo benchmark</h2>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-ink-3 block mb-1">Instrumento</label>
                <input
                  list="instrument-list"
                  type="text"
                  value={novoInst}
                  onChange={(e) => setNovoInst(e.target.value)}
                  className="w-full bg-surface border border-border rounded-[8px] px-3 py-2 text-[13px]"
                />
                <datalist id="instrument-list">
                  {INSTRUMENT_PRESETS.map(i => <option key={i} value={i}/>)}
                </datalist>
              </div>
              <div>
                <label className="text-[11px] text-ink-3 block mb-1">Parâmetro (ex: ticket_minimo, prazo_tipico_meses)</label>
                <input
                  type="text"
                  value={novoParam}
                  onChange={(e) => setNovoParam(e.target.value)}
                  className="w-full bg-surface border border-border rounded-[8px] px-3 py-2 text-[13px] font-mono"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-ink-3 block mb-1">Min</label>
                  <input type="number" value={novoMin} onChange={(e) => setNovoMin(parseFloat(e.target.value) || 0)} className="w-full bg-surface border border-border rounded-[8px] px-2 py-2 text-[13px]"/>
                </div>
                <div>
                  <label className="text-[11px] text-ink-3 block mb-1">Max</label>
                  <input type="number" value={novoMax} onChange={(e) => setNovoMax(parseFloat(e.target.value) || 0)} className="w-full bg-surface border border-border rounded-[8px] px-2 py-2 text-[13px]"/>
                </div>
                <div>
                  <label className="text-[11px] text-ink-3 block mb-1">Unidade</label>
                  <select value={novoUnit} onChange={(e) => setNovoUnit(e.target.value as Unit)} className="w-full bg-surface border border-border rounded-[8px] px-2 py-2 text-[13px]">
                    {Object.entries(UNIT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-ink-3 block mb-1">Descrição</label>
                <input type="text" value={novoDesc} onChange={(e) => setNovoDesc(e.target.value)} className="w-full bg-surface border border-border rounded-[8px] px-3 py-2 text-[13px]"/>
              </div>
              <div>
                <label className="text-[11px] text-ink-3 block mb-1">Fonte (URL ou referência)</label>
                <input type="text" value={novoSource} onChange={(e) => setNovoSource(e.target.value)} className="w-full bg-surface border border-border rounded-[8px] px-3 py-2 text-[13px]"/>
              </div>
            </div>
            {erroCriar && <div className="mt-3 p-2 rounded-[6px] bg-warn/10 text-warn text-[12px]">{erroCriar}</div>}
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowCriar(false)} className="px-4 py-2 rounded-[8px] text-[13px] text-ink-2">Cancelar</button>
              <button onClick={criar} disabled={salvando} className="bg-ink text-bg px-4 py-2 rounded-[8px] text-[13px] font-semibold disabled:opacity-50">
                {salvando ? 'Salvando...' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
