'use client'

import { useState, useEffect } from 'react'
import { formatDateBR } from '@/lib/format-date'
import Link from 'next/link'

type Agente = { id: string; nome: string; descricao: string; system_prompt: string; atualizado_em: string }

export default function AgentesPage() {
  const [agentes, setAgentes] = useState<Agente[]>([])
  const [selecionado, setSelecionado] = useState<Agente | null>(null)
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    fetch('/api/admin/agentes')
      .then(r => r.json())
      .then(d => setAgentes(d.agentes ?? []))
  }, [])

  function selecionar(a: Agente) {
    setSelecionado(a)
    setPrompt(a.system_prompt)
    setMsg('')
    setErro('')
  }

  async function salvar() {
    if (!selecionado) return
    setLoading(true)
    setMsg('')
    setErro('')
    const res = await fetch('/api/admin/agentes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selecionado.id, system_prompt: prompt }),
    })
    setLoading(false)
    if (res.ok) {
      setMsg('Prompt salvo! Próximas análises já usarão este prompt.')
      setAgentes(prev => prev.map(a => a.id === selecionado.id ? { ...a, system_prompt: prompt, atualizado_em: new Date().toISOString() } : a))
      setSelecionado(prev => prev ? { ...prev, system_prompt: prompt } : null)
    } else {
      setErro('Erro ao salvar')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/admin" className="text-gray-500 hover:text-white text-sm">← Admin</Link>
        <span className="text-gray-600">/</span>
        <span className="text-white font-semibold text-sm">Agentes</span>
      </header>

      <div className="flex h-[calc(100vh-57px)]">
        {/* Lista de agentes */}
        <aside className="w-72 border-r border-gray-800 overflow-y-auto p-4 space-y-1 shrink-0">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">11 agentes</p>
          {agentes.map(a => (
            <button
              key={a.id}
              onClick={() => selecionar(a)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition ${selecionado?.id === a.id ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-300' : 'hover:bg-gray-900 text-gray-300'}`}
            >
              <div className="font-medium text-sm">{a.nome}</div>
              <div className="text-xs text-gray-500 mt-0.5 truncate">{a.descricao}</div>
            </button>
          ))}
        </aside>

        {/* Editor */}
        <main className="flex-1 flex flex-col p-6 overflow-hidden">
          {selecionado ? (
            <>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold">{selecionado.nome}</h2>
                  <p className="text-sm text-gray-400">{selecionado.descricao}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Atualizado em {formatDateBR(selecionado.atualizado_em, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button
                  onClick={salvar}
                  disabled={loading || prompt === selecionado.system_prompt}
                  className="bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold px-5 py-2 rounded-lg text-sm transition disabled:opacity-40"
                >
                  {loading ? 'Salvando...' : 'Salvar prompt'}
                </button>
              </div>

              {msg && <p className="text-green-400 text-sm mb-3">{msg}</p>}
              {erro && <p className="text-red-400 text-sm mb-3">{erro}</p>}

              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg p-4 text-sm text-gray-200 font-mono resize-none focus:outline-none focus:border-cyan-500 leading-relaxed"
              />

              <p className="text-xs text-gray-600 mt-2">
                Alterações entram em vigor imediatamente na próxima análise — sem necessidade de deploy.
              </p>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
              Selecione um agente na lista para editar o prompt
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
