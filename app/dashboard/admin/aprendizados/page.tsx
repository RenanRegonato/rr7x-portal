'use client'

import { useState, useEffect } from 'react'

type Feedback = { id: string; texto: string; ativo: boolean; criado_em: string }

export default function AprendizadosPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [texto, setTexto] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/admin/aprendizados')
      .then(r => r.json())
      .then(d => setFeedbacks(d.feedbacks ?? []))
      .finally(() => setLoading(false))
  }, [])

  function showMsg(text: string) {
    setMsg(text)
    setTimeout(() => setMsg(''), 3000)
  }

  async function salvar() {
    if (!texto.trim()) return
    setSaving(true)
    const res = await fetch('/api/admin/aprendizados', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto }),
    })
    setSaving(false)
    if (res.ok) {
      const { feedback } = await res.json()
      setFeedbacks(prev => [feedback, ...prev])
      setTexto('')
      showMsg('✓ Aprendizado salvo — já válido para a próxima análise.')
    }
  }

  async function toggleAtivo(fb: Feedback) {
    const novoAtivo = !fb.ativo
    setFeedbacks(prev => prev.map(f => f.id === fb.id ? { ...f, ativo: novoAtivo } : f))
    await fetch('/api/admin/aprendizados', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: fb.id, ativo: novoAtivo }),
    })
  }

  async function deletar(id: string) {
    setFeedbacks(prev => prev.filter(f => f.id !== id))
    await fetch('/api/admin/aprendizados', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  }

  const ativos = feedbacks.filter(f => f.ativo).length

  return (
    <div className="p-6 max-w-3xl mx-auto flex flex-col gap-6">

      {/* Header */}
      <div>
        <h1 className="text-lg font-bold">Aprendizados</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Feedbacks registrados aqui são injetados automaticamente no contexto de todos os agentes em cada análise.
          As regras individuais de cada agente nunca são substituídas — os aprendizados ampliam o contexto.
        </p>
      </div>

      {/* New feedback */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Novo aprendizado</p>
        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder='Ex: "No deal Resort Campo Alegre, o Davi subestimou passivo trabalhista rural. Sempre questionar sazonalidade de mão de obra em ativos rurais antes de fechar diagnóstico."'
          className="bg-gray-950 border border-gray-700 rounded-lg p-3.5 text-sm text-gray-200 resize-none focus:outline-none focus:border-cyan-500 leading-relaxed min-h-[100px]"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-green-400">{msg}</span>
          <button
            onClick={salvar}
            disabled={saving || !texto.trim()}
            className="bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold px-5 py-2 rounded-lg text-sm transition disabled:opacity-40"
          >
            {saving ? 'Salvando...' : 'Salvar Aprendizado'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <span>{feedbacks.length} aprendizado{feedbacks.length !== 1 ? 's' : ''} registrado{feedbacks.length !== 1 ? 's' : ''}</span>
        <span>·</span>
        <span className="text-green-400">{ativos} ativo{ativos !== 1 ? 's' : ''}</span>
        <span>·</span>
        <span>{feedbacks.length - ativos} pausado{feedbacks.length - ativos !== 1 ? 's' : ''}</span>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-gray-600">Carregando...</p>
      ) : feedbacks.length === 0 ? (
        <div className="text-center py-12 text-gray-600 text-sm border border-dashed border-gray-800 rounded-xl">
          Nenhum aprendizado registrado ainda.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {feedbacks.map(fb => (
            <div
              key={fb.id}
              className={`bg-gray-900 border rounded-xl p-4 transition ${fb.ativo ? 'border-gray-800' : 'border-gray-800/50 opacity-50'}`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className="text-xs text-gray-600 font-mono">
                  {new Date(fb.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleAtivo(fb)}
                    className={`text-xs px-2.5 py-1 rounded-md font-semibold transition ${fb.ativo ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'}`}
                  >
                    {fb.ativo ? 'Ativo' : 'Pausado'}
                  </button>
                  <button
                    onClick={() => deletar(fb.id)}
                    className="text-gray-700 hover:text-red-400 text-sm transition px-1"
                    title="Remover"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{fb.texto}</p>
            </div>
          ))}
        </div>
      )}

      {/* Info box */}
      {feedbacks.length > 0 && (
        <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-xl p-4 text-sm text-indigo-300 leading-relaxed">
          <strong className="text-indigo-200 block mb-1">Como os aprendizados chegam aos agentes</strong>
          Cada análise carrega todos os aprendizados <span className="text-green-400 font-semibold">ativos</span> e os injeta no contexto de cada agente antes da execução.
          Aprendizados <span className="text-gray-400 font-semibold">pausados</span> são ignorados sem precisar deletar.
          As regras individuais de cada agente prevalecem sempre — os aprendizados informam, não sobrescrevem.
        </div>
      )}

    </div>
  )
}
