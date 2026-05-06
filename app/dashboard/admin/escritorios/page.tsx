'use client'

import { useEffect, useState } from 'react'

type Escritorio = {
  id:            string
  nome:          string
  criado_em:     string
  gerente_id:    string | null
  gerente_email: string | null
}

export default function EscritoriosPage() {
  const [escritorios, setEscritorios] = useState<Escritorio[]>([])
  const [loading,     setLoading]     = useState(true)
  const [selecionado, setSelecionado] = useState<Escritorio | null>(null)
  const [editNome,    setEditNome]    = useState('')
  const [novoNome,    setNovoNome]    = useState('') // kept for API compatibility
  const [salvando,    setSalvando]    = useState(false)
  const [criando,     setCriando]     = useState(false)
  const [msg,         setMsg]         = useState('')
  const [confirmarId, setConfirmarId] = useState<string | null>(null)

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    setLoading(true)
    const r = await fetch('/api/admin/escritorios')
    const d = await r.json()
    setEscritorios(d.escritorios ?? [])
    setLoading(false)
  }

  function selecionar(e: Escritorio) {
    setSelecionado(e)
    setEditNome(e.nome)
    setMsg('')
    setConfirmarId(null)
  }

  async function salvar() {
    if (!selecionado || !editNome.trim()) return
    setSalvando(true)
    setMsg('')
    const res = await fetch('/api/admin/escritorios', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: selecionado.id, nome: editNome }),
    })
    setSalvando(false)
    if (res.ok) {
      setMsg('Salvo.')
      setEscritorios(prev => prev.map(e => e.id === selecionado.id ? { ...e, nome: editNome } : e))
      setSelecionado(prev => prev ? { ...prev, nome: editNome } : null)
    }
  }

  async function criar() {
    if (!novoNome.trim()) return
    setCriando(true)
    const res = await fetch('/api/admin/escritorios', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ nome: novoNome }),
    })
    setCriando(false)
    if (res.ok) {
      setNovoNome('')
      carregar()
    }
  }

  async function excluir(id: string) {
    const res = await fetch('/api/admin/escritorios', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    })
    if (res.ok) {
      setEscritorios(prev => prev.filter(e => e.id !== id))
      if (selecionado?.id === id) setSelecionado(null)
      setConfirmarId(null)
    }
  }

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })

  return (
    <div className="flex h-full">
      {/* Lista */}
      <div className="flex-1 p-6 overflow-y-auto border-r border-border flex flex-col gap-4">
        <div>
          <h1 className="font-display text-[22px] font-medium tracking-tight">Escritórios</h1>
          <p className="text-[13px] text-ink-3">{escritorios.length} cadastrados</p>
        </div>

        {loading ? (
          <p className="text-ink-3 text-[13px]">Carregando...</p>
        ) : (
          <div className="space-y-1.5">
            {escritorios.map(e => (
              <button
                key={e.id}
                onClick={() => selecionar(e)}
                className={`w-full text-left px-4 py-3 rounded-[10px] border transition-colors ${
                  selecionado?.id === e.id
                    ? 'bg-accent-soft border-accent'
                    : 'bg-surface border-border hover:border-border-strong'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-medium text-ink">{e.nome}</p>
                    <p className="text-[11px] text-ink-3 mt-0.5">
                      Gerente: {e.gerente_email ?? '—'} · Criado: {fmt(e.criado_em)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
            {escritorios.length === 0 && (
              <p className="text-ink-3 text-[13px] text-center py-8">Nenhum escritório cadastrado</p>
            )}
          </div>
        )}
      </div>

      {/* Painel de edição */}
      <div className="w-80 p-6 shrink-0 overflow-y-auto">
        {selecionado ? (
          <div className="space-y-5">
            <div>
              <h2 className="font-semibold text-ink">{selecionado.nome}</h2>
              <p className="text-[11px] text-ink-3 mt-1">ID: {selecionado.id.slice(0, 8)}...</p>
            </div>

            <div className="bg-surface border border-border rounded-[10px] p-4 space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-ink-3">Gerente</span>
                <span className="text-ink text-right break-all max-w-[160px]">
                  {selecionado.gerente_email ?? '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-3">Criado em</span>
                <span className="text-ink">{fmt(selecionado.criado_em)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">
                Editar nome
              </p>
              <input
                type="text"
                value={editNome}
                onChange={e => setEditNome(e.target.value)}
                className="w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-surface outline-none focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)] transition-shadow"
              />
              {msg && <p className="text-ok text-[13px]">{msg}</p>}
              <button
                onClick={salvar}
                disabled={salvando || !editNome.trim()}
                className="w-full py-2.5 rounded-[10px] bg-accent-strong text-white font-semibold text-[13px] hover:opacity-90 disabled:opacity-50 transition"
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">Zona de risco</p>
              {confirmarId === selecionado.id ? (
                <div className="space-y-2">
                  <p className="text-[12px] text-warn">Confirmar exclusão? Esta ação é irreversível.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => excluir(selecionado.id)}
                      className="flex-1 py-2 rounded-[10px] bg-warn text-white text-[12px] font-semibold hover:opacity-90 transition"
                    >
                      Excluir
                    </button>
                    <button
                      onClick={() => setConfirmarId(null)}
                      className="flex-1 py-2 rounded-[10px] border border-border text-ink-2 text-[12px] hover:border-border-strong transition"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmarId(selecionado.id)}
                  className="w-full py-2 rounded-[10px] border border-warn/40 text-warn text-[12px] font-medium hover:bg-warn/5 transition"
                >
                  Excluir escritório
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-ink-3 text-[13px]">
            Selecione um escritório
          </div>
        )}
      </div>
    </div>
  )
}
