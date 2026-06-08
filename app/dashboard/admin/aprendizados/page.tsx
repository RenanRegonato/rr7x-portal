'use client'

import { useState, useEffect } from 'react'
import { formatDateBR } from '@/lib/format-date'

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
      showMsg('✓ Aprendizado salvo. Já válido para a próxima análise.')
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
      <div>
        <h1 className="font-display text-[22px] font-medium tracking-tight">Aprendizados Globais</h1>
        <p className="text-[13px] text-ink-2 mt-1 leading-relaxed">
          Aprendizados registrados aqui são injetados em <strong>todos os escritórios</strong> e afetam o comportamento
          dos agentes em toda a plataforma. Use para melhorias sistêmicas, padrões de análise e ajustes de qualidade global.
          Cada escritório pode registrar seus próprios aprendizados complementares (restritos ao seu ambiente).
        </p>
      </div>

      <div className="bg-surface border border-border rounded-[14px] p-5 flex flex-col gap-3 shadow-soft-sm">
        <p className="text-[10px] text-ink-3 uppercase tracking-wider font-semibold">Novo aprendizado</p>
        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder='Ex: "No deal Resort Campo Alegre, o Davi subestimou passivo trabalhista rural. Sempre questionar sazonalidade de mão de obra em ativos rurais antes de fechar diagnóstico."'
          className="border border-border rounded-[10px] p-3.5 text-[13px] text-ink resize-none outline-none focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)] leading-relaxed min-h-[100px] bg-bg transition-shadow placeholder:text-ink-3"
        />
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-ok">{msg}</span>
          <button
            onClick={salvar}
            disabled={saving || !texto.trim()}
            className="bg-accent-strong hover:opacity-90 text-white font-semibold px-5 py-2 rounded-[10px] text-[13px] transition disabled:opacity-40"
          >
            {saving ? 'Salvando...' : 'Salvar Aprendizado'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-[13px] text-ink-3">
        <span>{feedbacks.length} aprendizado{feedbacks.length !== 1 ? 's' : ''} registrado{feedbacks.length !== 1 ? 's' : ''}</span>
        <span>·</span>
        <span className="text-ok">{ativos} ativo{ativos !== 1 ? 's' : ''}</span>
        <span>·</span>
        <span>{feedbacks.length - ativos} pausado{feedbacks.length - ativos !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <p className="text-[13px] text-ink-3">Carregando...</p>
      ) : feedbacks.length === 0 ? (
        <div className="text-center py-12 text-ink-3 text-[13px] border border-dashed border-border rounded-[14px]">
          Nenhum aprendizado registrado ainda.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {feedbacks.map(fb => (
            <div
              key={fb.id}
              className={`bg-surface border border-border rounded-[14px] p-4 transition-opacity shadow-soft-sm ${!fb.ativo ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className="text-[11px] text-ink-3 font-mono">
                  {formatDateBR(fb.criado_em, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleAtivo(fb)}
                    className={`text-[11px] px-2.5 py-1 rounded-md font-semibold transition ${
                      fb.ativo
                        ? 'bg-ok/10 text-ok hover:bg-ok/20 border border-ok/20'
                        : 'bg-surface-2 text-ink-3 hover:bg-surface-hover border border-border'
                    }`}
                  >
                    {fb.ativo ? 'Ativo' : 'Pausado'}
                  </button>
                  <button
                    onClick={() => deletar(fb.id)}
                    className="text-ink-3 hover:text-warn text-[13px] transition px-1"
                    title="Remover"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <p className="text-[13px] text-ink leading-relaxed whitespace-pre-wrap">{fb.texto}</p>
            </div>
          ))}
        </div>
      )}

      {feedbacks.length > 0 && (
        <div className="bg-accent-soft border border-accent rounded-[14px] p-4 text-[13px] text-ink-2 leading-relaxed">
          <strong className="text-ink block mb-1">Como os aprendizados chegam aos agentes</strong>
          Cada análise carrega os aprendizados globais <span className="text-ok font-semibold">ativos</span> + os aprendizados específicos do escritório responsável pelo deal,
          injetando ambos no contexto de cada agente antes da execução.
          Aprendizados <span className="text-ink-3 font-semibold">pausados</span> são ignorados sem precisar deletar.
          As regras individuais de cada agente prevalecem sempre: os aprendizados informam, não sobrescrevem.
        </div>
      )}
    </div>
  )
}
