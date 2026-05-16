'use client'

import { useCallback, useEffect, useState } from 'react'
import Topbar from '@/components/Topbar'

// Types

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
  ativo:         boolean
  escritorio_id: string | null
  version:       number
}

const UNIT_LABEL: Record<Unit, string> = {
  BRL: 'R$', pct: '%', multiplo: 'x', meses: 'meses', qtd: 'qtd', pct_cdi: '% CDI',
}

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

interface MergedRow {
  instrument:   string
  parameter:    string
  unit:         Unit
  global:       Benchmark | null
  override:     Benchmark | null
}

// Page

export default function EscritorioBenchmarksPage() {
  const [globals,    setGlobals]    = useState<Benchmark[]>([])
  const [overrides,  setOverrides]  = useState<Benchmark[]>([])
  const [podeEditar, setPodeEditar] = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [erro,       setErro]       = useState('')
  const [filtro,     setFiltro]     = useState('')

  // Edição inline
  const [editKey, setEditKey] = useState<string | null>(null)   // instrument|parameter
  const [editMin, setEditMin] = useState(0)
  const [editMax, setEditMax] = useState(0)
  const [editDesc, setEditDesc] = useState('')
  const [editExpectedVersion, setEditExpectedVersion] = useState<number | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erroEdit, setErroEdit] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true); setErro('')
    try {
      const r = await fetch('/api/escritorio/benchmarks', { cache: 'no-store' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Erro')
      setGlobals(d.globals ?? [])
      setOverrides(d.overrides ?? [])
      setPodeEditar(!!d.pode_editar)
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  // Merge: para cada (instrument, parameter), retorna global + override (se houver)
  const merged: MergedRow[] = []
  const keysSet = new Set<string>()
  for (const g of globals) keysSet.add(`${g.instrument}|${g.parameter}`)
  for (const o of overrides) keysSet.add(`${o.instrument}|${o.parameter}`)

  for (const key of Array.from(keysSet).sort()) {
    const [instrument, parameter] = key.split('|')
    const global   = globals.find(g => g.instrument === instrument && g.parameter === parameter)   ?? null
    const override = overrides.find(o => o.instrument === instrument && o.parameter === parameter) ?? null
    const unit = (override?.unit ?? global?.unit ?? 'BRL') as Unit
    merged.push({ instrument, parameter, unit, global, override })
  }

  const filtrados = filtro
    ? merged.filter(m => m.instrument === filtro)
    : merged

  // Agrupa por instrument
  const grupos = new Map<string, MergedRow[]>()
  for (const m of filtrados) {
    const arr = grupos.get(m.instrument) ?? []
    arr.push(m)
    grupos.set(m.instrument, arr)
  }
  const instruments = Array.from(grupos.keys()).sort()

  function startEdit(row: MergedRow) {
    setEditKey(`${row.instrument}|${row.parameter}`)
    setErroEdit('')
    const ativo = row.override ?? row.global
    if (!ativo) return
    setEditMin(ativo.value_min)
    setEditMax(ativo.value_max)
    setEditDesc(ativo.descricao ?? '')
    setEditExpectedVersion(row.override?.version ?? null)  // null = ainda não há override
  }

  function cancelEdit() {
    setEditKey(null); setErroEdit('')
  }

  async function saveEdit(row: MergedRow) {
    setErroEdit('')
    if (editMax < editMin) { setErroEdit('value_max precisa ser ≥ value_min'); return }
    setSalvando(true)
    try {
      if (row.override && editExpectedVersion !== null) {
        // PATCH override existente
        const r = await fetch(`/api/escritorio/benchmarks/${row.override.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            value_min: editMin, value_max: editMax, descricao: editDesc,
            expected_version: editExpectedVersion,
          }),
        })
        const d = await r.json()
        if (!r.ok) {
          if (d.conflict) {
            setErroEdit(`Outro usuário editou (versão servidor: ${d.server_version}). Recarregue.`)
          } else {
            setErroEdit(d.error || 'Erro')
          }
          return
        }
      } else {
        // POST cria override
        const r = await fetch('/api/escritorio/benchmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instrument: row.instrument,
            parameter:  row.parameter,
            value_min:  editMin,
            value_max:  editMax,
            unit:       row.unit,
            descricao:  editDesc || row.global?.descricao || undefined,
            source:     `Override do escritório — ajustado em ${new Date().toLocaleDateString('pt-BR')}`,
          }),
        })
        const d = await r.json()
        if (!r.ok) { setErroEdit(d.error || 'Erro'); return }
      }
      setEditKey(null)
      void carregar()
    } finally {
      setSalvando(false)
    }
  }

  async function removeOverride(override: Benchmark) {
    if (!confirm('Remover override do escritório? O pipeline volta a usar o valor global da Mandor.')) return
    const r = await fetch(`/api/escritorio/benchmarks/${override.id}`, { method: 'DELETE' })
    if (!r.ok) {
      const d = await r.json().catch(() => ({}))
      alert(d.error || 'Erro')
      return
    }
    void carregar()
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Topbar variant="context" title="Benchmarks do escritório"/>
      <main className="max-w-5xl mx-auto px-8 py-8 w-full">

        {/* Disclaimer obrigatório */}
        <div className="rounded-[12px] border-2 border-warn/40 bg-warn/5 p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-warn text-[18px] leading-none mt-0.5">⚠</span>
            <div className="text-[13px] text-ink-2 leading-relaxed">
              <p className="font-semibold text-warn mb-1">Valide internamente antes de usar</p>
              <p>
                Os parâmetros abaixo (globais ou do seu escritório) servem apenas como{' '}
                <strong>referência inicial</strong>. Cada operação tem características próprias —
                múltiplos, ticket, prazos e spreads variam por setor, contraparte e contexto regulatório.
                <strong> A responsabilidade pela validação final de cada operação é do escritório.</strong>
                {' '}A plataforma não substitui o julgamento técnico do gestor responsável.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[13px] text-ink-2">
              Personalize os parâmetros de mercado que sua mesa usa.
              <span className="text-ink-3"> Globais herdam da Mandor. Overrides são exclusivos do seu escritório.</span>
            </p>
          </div>
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="bg-surface border border-border rounded-[8px] px-3 py-2 text-[13px]"
          >
            <option value="">Todos os instrumentos</option>
            {Array.from(new Set(merged.map(m => m.instrument))).sort().map(i => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>

        {erro && <div className="mb-4 p-3 rounded-[8px] bg-warn/10 text-warn text-[13px]">{erro}</div>}

        {loading ? (
          <div className="text-ink-3 text-[13px]">Carregando...</div>
        ) : merged.length === 0 ? (
          <div className="text-ink-3 text-[13px] py-10 text-center border border-dashed border-border rounded-[10px]">
            Nenhum benchmark global cadastrado.
          </div>
        ) : (
          <div className="space-y-6">
            {instruments.map(inst => (
              <div key={inst}>
                <h2 className="font-display text-[16px] font-medium mb-2">{inst}</h2>
                <div className="border border-border rounded-[12px] overflow-hidden bg-surface">
                  {(grupos.get(inst) ?? []).map((row, idx) => {
                    const key = `${row.instrument}|${row.parameter}`
                    const ativo = row.override ?? row.global
                    if (!ativo) return null
                    const isEditing = editKey === key
                    const isOverride = !!row.override

                    return (
                      <div key={key} className={`px-4 py-3 ${idx > 0 ? 'border-t border-border' : ''}`}>
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[12px] text-ink-3 min-w-[180px]">{row.parameter}</span>
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
                              <span className="text-[12px] text-ink-3">{UNIT_LABEL[row.unit]}</span>
                            </div>
                            <input
                              type="text"
                              value={editDesc}
                              onChange={(e) => setEditDesc(e.target.value)}
                              placeholder="Descrição do override"
                              className="w-full bg-bg border border-border rounded-[6px] px-2 py-1 text-[12px]"
                            />
                            {erroEdit && <div className="text-[11px] text-warn">{erroEdit}</div>}
                            <div className="flex gap-2">
                              <button onClick={() => saveEdit(row)} disabled={salvando} className="text-[12px] bg-ink text-bg px-3 py-1 rounded-[6px] disabled:opacity-50">
                                {salvando ? 'Salvando...' : (isOverride ? 'Atualizar override' : 'Criar override')}
                              </button>
                              <button onClick={cancelEdit} className="text-[12px] text-ink-2 px-3 py-1">Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-3 flex-wrap">
                                <span className="font-mono text-[12px] text-ink-3">{row.parameter}</span>
                                <span className="font-medium text-[14px]">
                                  {ativo.value_min === ativo.value_max
                                    ? fmt(ativo.value_min, row.unit)
                                    : `${fmt(ativo.value_min, row.unit)} → ${fmt(ativo.value_max, row.unit)}`}
                                </span>
                                {isOverride ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-soft text-accent-strong border border-accent/30">
                                    customizado
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-2 text-ink-3 border border-border">
                                    global Mandor
                                  </span>
                                )}
                                {isOverride && row.global && (
                                  <span className="text-[10px] text-ink-3">
                                    (global: {row.global.value_min === row.global.value_max
                                      ? fmt(row.global.value_min, row.unit)
                                      : `${fmt(row.global.value_min, row.unit)} → ${fmt(row.global.value_max, row.unit)}`})
                                  </span>
                                )}
                              </div>
                              {ativo.descricao && <div className="text-[12px] text-ink-2 mt-0.5">{ativo.descricao}</div>}
                              {ativo.source    && <div className="text-[11px] text-ink-3 mt-0.5">fonte: {ativo.source}</div>}
                            </div>
                            {podeEditar && (
                              <div className="flex gap-2 text-[12px] shrink-0">
                                <button onClick={() => startEdit(row)} className="text-ink-2 hover:text-ink">
                                  {isOverride ? 'Editar override' : 'Customizar'}
                                </button>
                                {isOverride && row.override && (
                                  <button onClick={() => removeOverride(row.override!)} className="text-warn hover:underline">
                                    Reverter ao global
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
