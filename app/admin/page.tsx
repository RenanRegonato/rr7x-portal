'use client'

import { useState } from 'react'
import Link from 'next/link'

type Usuario = { id: string; email: string; criado_em: string }
type Assinatura = { plano: string; status: string; analises_restantes: number | null; atualizado_em: string } | null

export default function AdminPage() {
  const [email, setEmail] = useState('')
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [assinatura, setAssinatura] = useState<Assinatura>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')

  async function buscar() {
    setLoading(true)
    setMsg('')
    setErro('')
    setUsuario(null)
    setAssinatura(null)
    const res = await fetch(`/api/admin?email=${encodeURIComponent(email)}`)
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setErro(data.error); return }
    setUsuario(data.usuario)
    setAssinatura(data.assinatura)
  }

  async function ativar(plano: string) {
    if (!usuario) return
    setLoading(true)
    setMsg('')
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: usuario.id, plano }),
    })
    setLoading(false)
    if (res.ok) {
      setMsg(`Plano "${plano}" ativado com sucesso!`)
      setAssinatura({ plano, status: 'ativo', analises_restantes: plano === 'avulso' ? 1 : null, atualizado_em: new Date().toISOString() })
    } else {
      setErro('Erro ao ativar plano')
    }
  }

  async function cancelar() {
    if (!usuario) return
    setLoading(true)
    setMsg('')
    await fetch('/api/admin', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: usuario.id }),
    })
    setLoading(false)
    setMsg('Plano cancelado.')
    setAssinatura(prev => prev ? { ...prev, status: 'cancelado' } : null)
  }

  const statusCor: Record<string, string> = {
    ativo: 'text-green-400',
    cancelado: 'text-red-400',
    pendente: 'text-yellow-400',
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold">Painel Admin</h1>
          <Link href="/admin/agentes" className="text-sm text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 px-3 py-1.5 rounded-lg transition">
            Editar Agentes →
          </Link>
        </div>
        <p className="text-gray-400 text-sm mb-8">Gerenciar planos de clientes</p>

        <div className="flex gap-2 mb-6">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && buscar()}
            placeholder="Email do cliente"
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={buscar}
            disabled={loading || !email}
            className="bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold px-5 py-2.5 rounded-lg text-sm disabled:opacity-50"
          >
            Buscar
          </button>
        </div>

        {erro && <p className="text-red-400 text-sm mb-4">{erro}</p>}
        {msg && <p className="text-green-400 text-sm mb-4">{msg}</p>}

        {usuario && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
            <div>
              <p className="text-xs text-gray-500 mb-1">Cliente</p>
              <p className="font-semibold">{usuario.email}</p>
              <p className="text-xs text-gray-500 mt-0.5">Cadastrado em {new Date(usuario.criado_em).toLocaleDateString('pt-BR')}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Plano atual</p>
              {assinatura ? (
                <div className="flex items-center gap-3">
                  <span className="font-semibold capitalize">{assinatura.plano}</span>
                  <span className={`text-xs font-medium ${statusCor[assinatura.status] ?? 'text-gray-400'}`}>
                    {assinatura.status}
                  </span>
                  {assinatura.analises_restantes !== null && (
                    <span className="text-xs text-gray-400">{assinatura.analises_restantes} análise(s) restante(s)</span>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Sem plano ativo</p>
              )}
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-2">Ativar plano</p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => ativar('avulso')}
                  disabled={loading}
                  className="border border-gray-600 hover:border-cyan-500 hover:text-cyan-400 px-4 py-2 rounded-lg text-sm transition disabled:opacity-50"
                >
                  Avulso — 1 análise
                </button>
                <button
                  onClick={() => ativar('recorrente')}
                  disabled={loading}
                  className="border border-gray-600 hover:border-cyan-500 hover:text-cyan-400 px-4 py-2 rounded-lg text-sm transition disabled:opacity-50"
                >
                  Recorrente — ilimitado
                </button>
                <button
                  onClick={() => ativar('enterprise')}
                  disabled={loading}
                  className="border border-gray-600 hover:border-cyan-500 hover:text-cyan-400 px-4 py-2 rounded-lg text-sm transition disabled:opacity-50"
                >
                  Enterprise
                </button>
              </div>
            </div>

            {assinatura?.status === 'ativo' && (
              <button
                onClick={cancelar}
                disabled={loading}
                className="text-red-400 hover:text-red-300 text-sm border border-red-900 hover:border-red-700 px-4 py-2 rounded-lg transition disabled:opacity-50"
              >
                Cancelar plano
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
