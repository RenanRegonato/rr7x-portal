'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'

// Tela de triagem de documentos com falha (gate de documentos críticos).
// Aparece quando a ingestão termina com algum documento que falhou ou veio
// ilegível. O usuário decide a relevância de cada um; documentos relevantes
// precisam ser remediados (reenvio, texto colado ou justificativa) antes de a
// análise prosseguir. Quando nada mais bloqueia, o gate libera o pipeline e este
// componente chama onLiberado().

interface DocFalha {
  id:               string
  file_name:        string
  status:           string
  error_message:    string | null
  relevancia:       'relevante' | 'nao_relevante' | null
  resolucao:        string | null
  justificativa:    string | null
  provavel_critico: boolean
  critico_rotulo:   string | null
}

interface Auditoria {
  total_enviados:        number
  total_sucesso:         number
  total_falha:           number
  nao_processados:       DocFalha[]
  essenciais_total:      number
  essenciais_resolvidos: number
  todos_essenciais_ok:   boolean
}

interface StatusPayload {
  triagem_status: 'pendente' | 'liberada' | null
  auditoria:      Auditoria
}

export default function TriagemDocumentos({ analiseId, onLiberado }: { analiseId: string; onLiberado: () => void }) {
  const supabase = createClient()
  const [data, setData]   = useState<StatusPayload | null>(null)
  const [busy, setBusy]   = useState<string | null>(null)
  const [erro, setErro]   = useState('')
  const [aberto, setAberto] = useState<Record<string, 'texto' | 'justificar' | null>>({})
  const [rascunho, setRascunho] = useState<Record<string, string>>({})
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({})

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`/api/analise/${analiseId}/ingest/status`)
      if (!r.ok) return
      const stat = await r.json() as StatusPayload
      setData(stat)
      if (stat.triagem_status !== 'pendente') onLiberado()
    } catch (e) {
      console.error('[triagem] status', e)
    }
  }, [analiseId, onLiberado])

  useEffect(() => { void carregar() }, [carregar])

  async function decidir(documentId: string, relevancia: 'relevante' | 'nao_relevante', justificativa?: string) {
    setBusy(documentId); setErro('')
    try {
      const r = await fetch(`/api/analise/${analiseId}/documentos/triagem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisoes: [{ documentId, relevancia, justificativa }] }),
      })
      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error || 'Falha ao registrar a decisão.')
      await carregar()
    } catch (e) { setErro((e as Error).message) }
    finally { setBusy(null) }
  }

  async function colarTexto(documentId: string) {
    const conteudo = (rascunho[documentId] ?? '').trim()
    if (conteudo.length < 10) { setErro('Cole um texto com pelo menos algumas linhas.'); return }
    setBusy(documentId); setErro('')
    try {
      const r = await fetch(`/api/analise/${analiseId}/documentos/texto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldDocId: documentId, conteudo }),
      })
      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error || 'Falha ao enviar o texto.')
      await carregar()
    } catch (e) { setErro((e as Error).message) }
    finally { setBusy(null) }
  }

  async function reenviar(documentId: string, file: File) {
    setBusy(documentId); setErro('')
    try {
      const urlRes = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analiseId, files: [{ name: file.name }] }),
      })
      if (!urlRes.ok) throw new Error('Falha ao preparar o envio.')
      const { urls } = await urlRes.json()
      const u = urls?.[0]
      if (!u?.token) throw new Error(u?.error || 'Formato não suportado para reenvio.')
      const { error: upErr } = await supabase.storage.from('analises').uploadToSignedUrl(u.path, u.token, file)
      if (upErr) throw new Error(`Falha ao enviar "${file.name}".`)
      const r = await fetch(`/api/analise/${analiseId}/documentos/reingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldDocId: documentId, filePath: u.path, fileName: u.name, fileSizeBytes: file.size }),
      })
      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error || 'Falha ao registrar o reenvio.')
      await carregar()
    } catch (e) { setErro((e as Error).message) }
    finally { setBusy(null) }
  }

  if (!data) {
    return <div className="flex-1 flex items-center justify-center text-ink-3 font-display text-[18px]">Carregando documentos...</div>
  }

  const a = data.auditoria
  const pendentes = a.nao_processados.filter(d => !(d.relevancia === 'nao_relevante' || d.resolucao))
  const resolvidos = a.nao_processados.filter(d => d.relevancia === 'nao_relevante' || d.resolucao)

  return (
    <div className="flex-1 overflow-auto p-6 md:p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-[24px] font-medium text-ink mb-1">Revisão de documentos</h1>
        <p className="text-[13px] text-ink-3 mb-6">
          A ingestão terminou, mas alguns documentos não puderam ser lidos. Para não gerar um parecer com
          informação essencial faltando, a análise está pausada até você revisar cada um abaixo.
        </p>

        {/* Resumo de auditoria */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-surface border border-border rounded-[12px] p-4 text-center">
            <div className="text-[22px] font-display text-ink tabular-nums">{a.total_enviados}</div>
            <div className="text-[11px] text-ink-3">enviados</div>
          </div>
          <div className="bg-surface border border-border rounded-[12px] p-4 text-center">
            <div className="text-[22px] font-display text-ink tabular-nums">{a.total_sucesso}</div>
            <div className="text-[11px] text-ink-3">lidos com sucesso</div>
          </div>
          <div className="bg-warn-soft border border-[oklch(0.85_0.06_75)] rounded-[12px] p-4 text-center">
            <div className="text-[22px] font-display text-[oklch(0.45_0.1_65)] tabular-nums">{a.total_falha}</div>
            <div className="text-[11px] text-[oklch(0.45_0.1_65)]">com falha</div>
          </div>
        </div>

        {erro && (
          <div className="bg-warn-soft border border-[oklch(0.85_0.06_75)] text-[oklch(0.45_0.1_65)] text-[13px] px-4 py-3 rounded-[10px] mb-4">{erro}</div>
        )}

        {/* Pendentes de decisão */}
        <div className="space-y-3">
          {pendentes.map(d => (
            <div key={d.id} className="bg-surface border border-border rounded-[12px] p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold text-ink truncate">{d.file_name}</span>
                    {d.provavel_critico && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent-soft text-accent-strong">
                        Provável crítico{d.critico_rotulo ? `: ${d.critico_rotulo}` : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-ink-3 mt-0.5">
                    {d.status === 'failed' ? 'Não foi possível processar' : 'Subiu mas não gerou conteúdo legível'}
                    {d.error_message ? ` — ${d.error_message}` : ''}
                  </p>
                </div>
              </div>

              <p className="text-[12px] text-ink-2 font-medium mb-2">Este documento é importante para a análise?</p>
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={busy === d.id}
                  onClick={() => decidir(d.id, 'nao_relevante')}
                  className="text-[12px] px-3 py-1.5 rounded-[8px] border border-border hover:bg-bg-tint disabled:opacity-50"
                >
                  Não, seguir sem ele
                </button>
                <button
                  disabled={busy === d.id}
                  onClick={() => fileInputs.current[d.id]?.click()}
                  className="text-[12px] px-3 py-1.5 rounded-[8px] bg-accent-strong text-white hover:opacity-90 disabled:opacity-50"
                >
                  Sim, reenviar arquivo
                </button>
                <input
                  ref={el => { fileInputs.current[d.id] = el }}
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.xls,.xlsx,.csv,.tsv,.txt,.md,.json,.png,.jpg,.jpeg,.webp,.gif"
                  onChange={e => { const f = e.target.files?.[0]; if (f) void reenviar(d.id, f); e.target.value = '' }}
                />
                <button
                  disabled={busy === d.id}
                  onClick={() => setAberto(p => ({ ...p, [d.id]: p[d.id] === 'texto' ? null : 'texto' }))}
                  className="text-[12px] px-3 py-1.5 rounded-[8px] border border-border hover:bg-bg-tint disabled:opacity-50"
                >
                  Colar o conteúdo
                </button>
                <button
                  disabled={busy === d.id}
                  onClick={() => setAberto(p => ({ ...p, [d.id]: p[d.id] === 'justificar' ? null : 'justificar' }))}
                  className="text-[12px] px-3 py-1.5 rounded-[8px] border border-border hover:bg-bg-tint disabled:opacity-50"
                >
                  Justificar ausência
                </button>
              </div>

              {aberto[d.id] === 'texto' && (
                <div className="mt-3">
                  <textarea
                    rows={6}
                    value={rascunho[d.id] ?? ''}
                    onChange={e => setRascunho(p => ({ ...p, [d.id]: e.target.value }))}
                    placeholder="Cole aqui o conteúdo do documento (texto)."
                    className="w-full border border-border rounded-[10px] px-3 py-2 text-[13px] bg-surface outline-none focus:border-accent-strong"
                  />
                  <button
                    disabled={busy === d.id}
                    onClick={() => colarTexto(d.id)}
                    className="mt-2 text-[12px] px-3 py-1.5 rounded-[8px] bg-accent-strong text-white hover:opacity-90 disabled:opacity-50"
                  >
                    Enviar texto
                  </button>
                </div>
              )}

              {aberto[d.id] === 'justificar' && (
                <div className="mt-3">
                  <textarea
                    rows={3}
                    value={rascunho[d.id] ?? ''}
                    onChange={e => setRascunho(p => ({ ...p, [d.id]: e.target.value }))}
                    placeholder="Explique por que este documento pode faltar nesta etapa. A análise seguirá com essa ressalva registrada."
                    className="w-full border border-border rounded-[10px] px-3 py-2 text-[13px] bg-surface outline-none focus:border-accent-strong"
                  />
                  <button
                    disabled={busy === d.id}
                    onClick={() => decidir(d.id, 'relevante', rascunho[d.id])}
                    className="mt-2 text-[12px] px-3 py-1.5 rounded-[8px] bg-accent-strong text-white hover:opacity-90 disabled:opacity-50"
                  >
                    Justificar e seguir
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Já decididos (trilha de auditoria) */}
        {resolvidos.length > 0 && (
          <div className="mt-6">
            <h2 className="text-[12px] font-semibold text-ink-2 mb-2">Já resolvidos</h2>
            <div className="space-y-1.5">
              {resolvidos.map(d => (
                <div key={d.id} className="flex items-center justify-between text-[12px] bg-bg-tint border border-border rounded-[8px] px-3 py-2">
                  <span className="text-ink truncate">{d.file_name}</span>
                  <span className="text-ink-3">
                    {d.relevancia === 'nao_relevante' ? 'não relevante'
                      : d.resolucao === 'reenviado' || d.resolucao === 'substituido' ? 'reenviado'
                      : d.resolucao === 'texto_colado' ? 'texto colado'
                      : d.resolucao === 'justificado' ? 'ausência justificada'
                      : 'resolvido'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {pendentes.length === 0 && (
          <div className="mt-6 bg-surface border border-border rounded-[12px] p-5 text-center">
            <p className="text-[13px] text-ink-2">Tudo resolvido. Iniciando a análise...</p>
          </div>
        )}
      </div>
    </div>
  )
}
