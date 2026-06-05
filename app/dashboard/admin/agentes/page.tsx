'use client'

import { useState, useEffect } from 'react'
import { formatDateBR } from '@/lib/format-date'

type Agente = { id: string; nome: string; descricao: string; system_prompt: string; atualizado_em: string; ordem: number }

function diffSummary(original: string, current: string): string | null {
  if (original === current) return null
  const oLines = original.split('\n')
  const cLines = current.split('\n')
  const added   = cLines.filter(l => !oLines.includes(l)).length
  const removed = oLines.filter(l => !cLines.includes(l)).length
  const parts = []
  if (added   > 0) parts.push(`+${added} linha${added   !== 1 ? 's' : ''}`)
  if (removed > 0) parts.push(`−${removed} linha${removed !== 1 ? 's' : ''}`)
  return parts.join(' · ')
}

export default function AgentesPage() {
  const [agentes,     setAgentes]     = useState<Agente[]>([])
  const [selecionado, setSelecionado] = useState<Agente | null>(null)
  const [prompt,      setPrompt]      = useState('')
  const [saved,       setSaved]       = useState('')   // last-saved version
  const [loading,     setLoading]     = useState(false)
  const [msg,         setMsg]         = useState('')
  const [erro,        setErro]        = useState('')
  const [showOriginal, setShowOriginal] = useState(false)

  useEffect(() => {
    fetch('/api/admin/agentes').then(r => r.json()).then(d => setAgentes(d.agentes ?? []))
  }, [])

  function selecionar(a: Agente) {
    setSelecionado(a)
    setPrompt(a.system_prompt)
    setSaved(a.system_prompt)
    setMsg('')
    setErro('')
    setShowOriginal(false)
  }

  async function salvar() {
    if (!selecionado) return
    setLoading(true)
    setMsg('')
    const res = await fetch('/api/admin/agentes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selecionado.id, system_prompt: prompt }),
    })
    setLoading(false)
    if (res.ok) {
      setMsg('Prompt salvo! Próximas análises já usarão este prompt.')
      setSaved(prompt)
      setAgentes(prev => prev.map(a => a.id === selecionado.id ? { ...a, system_prompt: prompt, atualizado_em: new Date().toISOString() } : a))
      setSelecionado(prev => prev ? { ...prev, system_prompt: prompt } : null)
      setShowOriginal(false)
    } else {
      setErro('Erro ao salvar')
    }
  }

  function descartar() {
    setPrompt(saved)
    setShowOriginal(false)
  }

  const isModified = prompt !== saved
  const diff       = isModified ? diffSummary(saved, prompt) : null

  return (
    <div className="flex h-full">
      {/* Lista */}
      <aside className="w-64 border-r border-border overflow-y-auto p-4 space-y-1 shrink-0">
        <p className="text-[10px] text-ink-3 uppercase tracking-wider font-semibold mb-3">{agentes.length} agentes</p>
        {agentes.map(a => (
          <button
            key={a.id}
            onClick={() => selecionar(a)}
            className={`w-full text-left px-3 py-2.5 rounded-[10px] transition-colors ${
              selecionado?.id === a.id
                ? 'bg-accent-soft border border-accent text-ink'
                : 'hover:bg-surface-hover text-ink-2 hover:text-ink'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-accent-strong w-5 shrink-0">{a.ordem}.</span>
              <div className="min-w-0">
                <div className="font-medium text-[13px] flex items-center gap-1.5">
                  {a.nome}
                  {selecionado?.id === a.id && isModified && (
                    <span className="w-1.5 h-1.5 rounded-full bg-warn shrink-0"/>
                  )}
                </div>
                <div className="text-[11px] text-ink-3 mt-0.5 truncate">{a.descricao}</div>
              </div>
            </div>
          </button>
        ))}
      </aside>

      {/* Editor */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        {selecionado ? (
          <>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2.5 mb-0.5">
                  <h2 className="font-display text-[20px] font-medium tracking-tight">{selecionado.nome}</h2>
                  {isModified && (
                    <span className="text-[11px] font-semibold text-warn bg-warn/10 border border-warn/20 px-2 py-0.5 rounded-full">
                      Modificado{diff ? ` · ${diff}` : ''}
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-ink-2">{selecionado.descricao}</p>
                <p className="text-[11px] text-ink-3 mt-1">
                  Salvo em {formatDateBR(selecionado.atualizado_em, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isModified && (
                  <>
                    <button
                      onClick={() => setShowOriginal(v => !v)}
                      className="text-[12px] px-3 py-1.5 rounded-[8px] border border-border hover:border-border-strong text-ink-2 hover:text-ink transition-colors"
                    >
                      {showOriginal ? 'Ocultar original' : 'Ver original'}
                    </button>
                    <button
                      onClick={descartar}
                      className="text-[12px] px-3 py-1.5 rounded-[8px] border border-border hover:border-border-strong text-ink-2 hover:text-ink transition-colors"
                    >
                      Descartar
                    </button>
                  </>
                )}
                <button
                  onClick={salvar}
                  disabled={loading || !isModified}
                  className="bg-accent-strong hover:opacity-90 text-white font-semibold px-5 py-2 rounded-[10px] text-[13px] transition disabled:opacity-40"
                >
                  {loading ? 'Salvando...' : 'Salvar prompt'}
                </button>
              </div>
            </div>

            {msg  && <p className="text-ok text-[13px] mb-3">{msg}</p>}
            {erro && <p className="text-warn text-[13px] mb-3">{erro}</p>}

            {showOriginal ? (
              <div className="flex-1 grid grid-cols-2 gap-3 overflow-hidden">
                <div className="flex flex-col">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3 mb-2">Original (salvo)</p>
                  <pre className="flex-1 bg-bg-tint border border-border rounded-[10px] p-4 text-[12px] font-mono text-ink-2 overflow-y-auto whitespace-pre-wrap leading-relaxed">{saved}</pre>
                </div>
                <div className="flex flex-col">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-warn mb-2">Versão atual (não salva)</p>
                  <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    className="flex-1 bg-surface border border-warn/40 rounded-[10px] p-4 text-[13px] text-ink font-mono resize-none outline-none focus:border-warn leading-relaxed transition-colors"
                  />
                </div>
              </div>
            ) : (
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                className={`flex-1 bg-surface border rounded-[10px] p-4 text-[13px] text-ink font-mono resize-none outline-none leading-relaxed transition-colors
                  ${isModified
                    ? 'border-warn/40 focus:border-warn focus:shadow-[0_0_0_3px_oklch(0.95_0.05_80)]'
                    : 'border-border focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)]'
                  }`}
              />
            )}

            <p className="text-[11px] text-ink-3 mt-2">
              Alterações entram em vigor imediatamente na próxima análise — sem deploy.
            </p>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-ink-3 text-[13px]">
            Selecione um agente para editar o prompt
          </div>
        )}
      </div>
    </div>
  )
}
