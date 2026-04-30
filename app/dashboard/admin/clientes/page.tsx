'use client'

import { useEffect, useState } from 'react'

type Assinatura = { plano: string; status: string; analises_restantes: number | null } | null
type Cliente = {
  id: string
  email: string
  criado_em: string
  ultimo_login: string | null
  assinatura: Assinatura
  total_analises: number
  ultima_analise: string | null
}

const PLANOS = ['avulso', 'recorrente', 'enterprise']
const STATUS_COR: Record<string, string> = {
  ativo: 'text-green-400 bg-green-400/10 border-green-400/20',
  cancelado: 'text-red-400 bg-red-400/10 border-red-400/20',
  pendente: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [selecionado, setSelecionado] = useState<Cliente | null>(null)
  const [msg, setMsg] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    fetch('/api/admin/clientes').then(r => r.json()).then(d => {
      setClientes(d.clientes ?? [])
      setLoading(false)
    })
  }, [])

  async function ativar(user_id: string, plano: string) {
    setSalvando(true)
    setMsg('')
    const res = await fetch('/api/admin/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, plano }),
    })
    setSalvando(false)
    if (res.ok) {
      setMsg(`Plano "${plano}" ativado!`)
      const nova: Assinatura = { plano, status: 'ativo', analises_restantes: plano === 'avulso' ? 1 : null }
      setClientes(prev => prev.map(c => c.id === user_id ? { ...c, assinatura: nova } : c))
      setSelecionado(prev => prev?.id === user_id ? { ...prev, assinatura: nova } : prev)
    }
  }

  async function cancelar(user_id: string) {
    setSalvando(true)
    setMsg('')
    await fetch('/api/admin/clientes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id }),
    })
    setSalvando(false)
    setMsg('Plano cancelado.')
    setClientes(prev => prev.map(c => c.id === user_id && c.assinatura ? { ...c, assinatura: { ...c.assinatura, status: 'cancelado' } } : c))
    setSelecionado(prev => prev?.id === user_id && prev.assinatura ? { ...prev, assinatura: { ...prev.assinatura, status: 'cancelado' } } : prev)
  }

  const filtrados = clientes.filter(c => c.email?.toLowerCase().includes(busca.toLowerCase()))

  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'

  return (
    <div className="flex h-full">
      {/* Lista */}
      <div className="flex-1 p-6 overflow-y-auto border-r border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">Clientes</h1>
            <p className="text-gray-500 text-sm">{clientes.length} cadastrados</p>
          </div>
        </div>

        <input
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por email..."
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm mb-4 focus:outline-none focus:border-cyan-500 text-white placeholder-gray-600"
        />

        {loading ? (
          <p className="text-gray-500 text-sm">Carregando...</p>
        ) : (
          <div className="space-y-1.5">
            {filtrados.map(c => (
              <button
                key={c.id}
                onClick={() => { setSelecionado(c); setMsg('') }}
                className={`w-full text-left px-4 py-3 rounded-lg border transition ${selecionado?.id === c.id ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-gray-900 border-gray-800 hover:border-gray-600'}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{c.email}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Cadastro: {fmt(c.criado_em)} · {c.total_analises} análise(s)
                    </p>
                  </div>
                  <div className="text-right">
                    {c.assinatura ? (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${STATUS_COR[c.assinatura.status] ?? 'text-gray-400 bg-gray-800 border-gray-700'}`}>
                        {c.assinatura.plano} · {c.assinatura.status}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-600 border border-gray-800 px-2 py-0.5 rounded-full">sem plano</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
            {filtrados.length === 0 && <p className="text-gray-600 text-sm text-center py-8">Nenhum cliente encontrado</p>}
          </div>
        )}
      </div>

      {/* Painel de detalhes */}
      <div className="w-80 p-6 shrink-0 overflow-y-auto">
        {selecionado ? (
          <div className="space-y-5">
            <div>
              <h2 className="font-bold text-white break-all">{selecionado.email}</h2>
              <p className="text-xs text-gray-500 mt-1">ID: {selecionado.id.slice(0, 8)}...</p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Cadastro</span><span>{fmt(selecionado.criado_em)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Último login</span><span>{fmt(selecionado.ultimo_login)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Análises</span><span>{selecionado.total_analises}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Última análise</span><span>{fmt(selecionado.ultima_analise)}</span></div>
            </div>

            {selecionado.assinatura && (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-sm space-y-2">
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-2">Plano atual</p>
                <div className="flex justify-between"><span className="text-gray-500">Plano</span><span className="capitalize font-semibold">{selecionado.assinatura.plano}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Status</span>
                  <span className={`capitalize font-semibold ${selecionado.assinatura.status === 'ativo' ? 'text-green-400' : selecionado.assinatura.status === 'cancelado' ? 'text-red-400' : 'text-yellow-400'}`}>
                    {selecionado.assinatura.status}
                  </span>
                </div>
                {selecionado.assinatura.analises_restantes !== null && (
                  <div className="flex justify-between"><span className="text-gray-500">Restantes</span><span>{selecionado.assinatura.analises_restantes}</span></div>
                )}
              </div>
            )}

            {msg && <p className="text-green-400 text-sm">{msg}</p>}

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Ativar plano</p>
              <div className="space-y-2">
                {PLANOS.map(p => (
                  <button
                    key={p}
                    onClick={() => ativar(selecionado.id, p)}
                    disabled={salvando}
                    className={`w-full py-2 px-3 rounded-lg text-sm border transition text-left capitalize disabled:opacity-40 ${selecionado.assinatura?.plano === p && selecionado.assinatura?.status === 'ativo' ? 'border-cyan-500/50 bg-cyan-500/5 text-cyan-300' : 'border-gray-700 hover:border-gray-500 text-gray-300'}`}
                  >
                    {p === 'avulso' ? 'Avulso — 1 análise' : p === 'recorrente' ? 'Recorrente — ilimitado' : 'Enterprise'}
                    {selecionado.assinatura?.plano === p && selecionado.assinatura?.status === 'ativo' && <span className="text-xs ml-2 text-cyan-500">✓ ativo</span>}
                  </button>
                ))}
              </div>
            </div>

            {selecionado.assinatura?.status === 'ativo' && (
              <button
                onClick={() => cancelar(selecionado.id)}
                disabled={salvando}
                className="w-full py-2 rounded-lg text-sm text-red-400 border border-red-900 hover:border-red-700 transition disabled:opacity-40"
              >
                Cancelar plano
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-600 text-sm">
            Selecione um cliente
          </div>
        )}
      </div>
    </div>
  )
}
