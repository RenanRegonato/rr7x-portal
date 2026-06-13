'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  PRESETS, PLANO_LABEL, MODULO_KEYS, LIMITE_KEYS, MODULO_LABEL, LIMITE_LABEL,
  resolveEntitlements, type Plano, type ModuloKey, type LimiteKey, type Suporte,
} from '@/lib/entitlements-presets'

interface EscritorioLista { id: string; nome: string | null; plano: string | null }

const PLANOS: Plano[] = ['essential', 'professional', 'enterprise']
const SUPORTES: Suporte[] = ['padrao', 'prioritario', 'dedicado']
const SUPORTE_LABEL: Record<Suporte, string> = { padrao: 'Padrão', prioritario: 'Prioritário', dedicado: 'Dedicado' }

export default function ConfiguracaoPlanosPage() {
  const [lista, setLista]         = useState<EscritorioLista[]>([])
  const [sel, setSel]             = useState<string>('')
  const [nome, setNome]           = useState<string>('')
  const [plano, setPlano]         = useState<Plano>('essential')
  const [preco, setPreco]         = useState<string>('')
  const [modulos, setModulos]     = useState<Record<ModuloKey, boolean>>(PRESETS.essential.modulos)
  const [limites, setLimites]     = useState<Record<LimiteKey, number | null>>(PRESETS.essential.limites)
  const [suporte, setSuporte]     = useState<Suporte>('padrao')
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando]   = useState(false)
  const [msg, setMsg]             = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/escritorios').then(r => r.json()).then(d => setLista(d.escritorios ?? [])).catch(() => {})
  }, [])

  const carregar = useCallback(async (id: string) => {
    setCarregando(true); setMsg(null)
    try {
      const d = await fetch(`/api/admin/escritorios?id=${id}`).then(r => r.json())
      const e = d.escritorio ?? {}
      const ent = resolveEntitlements(e)
      setNome(e.nome ?? '')
      setPlano(ent.plano)
      setPreco(ent.preco_mensal_brl != null ? String(ent.preco_mensal_brl) : '')
      setModulos({ ...ent.modulos })
      setLimites({ ...ent.limites })
      setSuporte(ent.suporte)
    } finally { setCarregando(false) }
  }, [])

  function selecionar(id: string) { setSel(id); if (id) carregar(id) }

  function aplicarPreset(p: Plano) {
    const preset = PRESETS[p]
    setPlano(p)
    setModulos({ ...preset.modulos })
    setLimites({ ...preset.limites })
    setSuporte(preset.suporte)
    setPreco(preset.preco_mensal_brl != null ? String(preset.preco_mensal_brl) : '')
    setMsg('Preset aplicado. Ajuste o que precisar e salve.')
  }

  async function salvar() {
    if (!sel) return
    setSalvando(true); setMsg(null)
    try {
      const res = await fetch('/api/admin/escritorios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sel,
          plano,
          preco_mensal_brl: preco !== '' ? Number(preco) : null,
          entitlements: { modulos, limites, suporte },
        }),
      })
      const d = await res.json()
      if (res.ok) {
        setMsg('Configuração salva.')
        setLista(prev => prev.map(e => e.id === sel ? { ...e, plano } : e))
      } else setMsg(d.error ?? 'Erro ao salvar.')
    } finally { setSalvando(false) }
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mb-1">Gestor Geral</div>
        <h1 className="text-2xl font-semibold text-ink">Planos e acessos por escritório</h1>
        <p className="text-ink-2 text-sm mt-1 max-w-2xl">
          O plano é um preset. Aplique-o e ajuste livremente os módulos, limites e o preço de cada escritório.
          As mudanças refletem nos acessos (Invest Match, Reforma, Mapa) imediatamente.
        </p>
      </header>

      {/* Seletor de escritório */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <label className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold block mb-2">Escritório</label>
        <select
          value={sel}
          onChange={e => selecionar(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-surface outline-none focus:border-accent-strong"
        >
          <option value="">Selecione um escritório…</option>
          {lista.map(e => (
            <option key={e.id} value={e.id}>{e.nome || '(sem nome)'} · {PLANO_LABEL[(e.plano as Plano)] ?? e.plano ?? '—'}</option>
          ))}
        </select>
      </div>

      {sel && !carregando && (
        <>
          {/* Plano + preço */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-ink mb-4">Plano de {nome || 'escritório'}</h2>
            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              {PLANOS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => aplicarPreset(p)}
                  className={`text-left border rounded-lg p-3 transition ${plano === p ? 'border-accent-strong bg-accent-soft/40' : 'border-border hover:border-accent-strong/40'}`}
                >
                  <div className="text-sm font-semibold text-ink">{PLANO_LABEL[p]}</div>
                  <div className="text-[11px] text-ink-3 mt-0.5">
                    {PRESETS[p].preco_mensal_brl != null ? `R$ ${PRESETS[p].preco_mensal_brl!.toLocaleString('pt-BR')}/mês` : 'sob proposta'}
                  </div>
                </button>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold block mb-1.5">Preço mensal (R$)</label>
                <input type="number" value={preco} onChange={e => setPreco(e.target.value)} placeholder="ex.: 3900"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-surface outline-none focus:border-accent-strong"/>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold block mb-1.5">Suporte</label>
                <select value={suporte} onChange={e => setSuporte(e.target.value as Suporte)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-surface outline-none focus:border-accent-strong">
                  {SUPORTES.map(s => <option key={s} value={s}>{SUPORTE_LABEL[s]}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Módulos */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-ink mb-3">Módulos</h2>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
              {MODULO_KEYS.map(k => (
                <label key={k} className="flex items-center gap-2.5 text-sm text-ink-2 cursor-pointer">
                  <input type="checkbox" checked={modulos[k]} onChange={e => setModulos(m => ({ ...m, [k]: e.target.checked }))}
                    className="accent-[var(--color-accent-strong)] w-4 h-4"/>
                  {MODULO_LABEL[k]}
                </label>
              ))}
            </div>
          </div>

          {/* Limites */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-ink mb-1">Limites</h2>
            <p className="text-[11px] text-ink-3 mb-3">Deixe em branco para ilimitado.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {LIMITE_KEYS.map(k => (
                <div key={k}>
                  <label className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold block mb-1.5">{LIMITE_LABEL[k]}</label>
                  <input type="number" value={limites[k] ?? ''} placeholder="ilimitado"
                    onChange={e => setLimites(l => ({ ...l, [k]: e.target.value === '' ? null : Number(e.target.value) }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-surface outline-none focus:border-accent-strong"/>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={salvar} disabled={salvando}
              className="px-5 py-2.5 rounded-lg bg-accent-strong text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {salvando ? 'Salvando…' : 'Salvar configuração'}
            </button>
            {msg && <span className="text-sm text-ink-2">{msg}</span>}
          </div>
        </>
      )}

      {sel && carregando && <p className="text-ink-3 text-sm">Carregando…</p>}
    </div>
  )
}
