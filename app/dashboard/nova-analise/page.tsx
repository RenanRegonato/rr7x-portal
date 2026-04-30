'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const TIPOS_ATIVO = ['Empresa (M&A)', 'Imóvel / Real Estate', 'Startup / Scale-up', 'Portfólio de Crédito', 'Franquia', 'Agronegócio', 'Outro']
const ESTAGIOS = ['Cru / Não validado', 'Estruturando', 'Estruturado', 'Em comercialização', 'Em negociação / Closing']
const OBJETIVOS = ['Vender 100%', 'Vender participação', 'Captar investimento', 'Estruturar crédito', 'Preparar para o mercado', 'Diagnóstico / Due Diligence']
const NIVEIS_INFO = ['Baixo (poucos dados formais)', 'Médio (dados parciais)', 'Alto (DRE, balanço e documentos disponíveis)']

const MICRO_ORIENTACOES = [
  'O ativo já foi apresentado ao mercado anteriormente?',
  'Qual é o nível de urgência da operação?',
  'A tese de valor é clara ou ainda está sendo estruturada?',
  'Existem conflitos societários ou pendências entre sócios?',
  'Já houve contato com investidores ou compradores?',
]

const ACCEPTED = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg'
const MAX_FILE_MB = 20

export default function NovaAnalisePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [loadingLabel, setLoadingLabel] = useState('')
  const [error, setError] = useState('')
  const [objetivos, setObjetivos] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [form, setForm] = useState({
    nomeAtivo: '',
    tipoAtivo: '',
    cidade: '',
    estado: '',
    pais: 'Brasil',
    estagio: '',
    nivelInformacao: '',
    ticketEstimado: '',
    resumoAtivo: '',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleObjetivo(o: string) {
    setObjetivos(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o])
  }

  function addFiles(incoming: FileList | File[]) {
    const arr = Array.from(incoming)
    const valid = arr.filter(f => {
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        setError(`"${f.name}" excede ${MAX_FILE_MB}MB e foi ignorado.`)
        return false
      }
      return true
    })
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name))
      return [...prev, ...valid.filter(f => !names.has(f.name))]
    })
  }

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  }

  function fileIcon(name: string) {
    const ext = name.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') return '📄'
    if (['doc', 'docx'].includes(ext ?? '')) return '📝'
    if (['xls', 'xlsx', 'csv'].includes(ext ?? '')) return '📊'
    if (['png', 'jpg', 'jpeg'].includes(ext ?? '')) return '🖼️'
    return '📎'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (objetivos.length === 0) {
      setError('Selecione ao menos um objetivo da operação.')
      return
    }
    if (files.length === 0) {
      setError('Adicione ao menos um documento para iniciar a análise.')
      return
    }

    setLoading(true)

    setLoadingLabel('Criando análise...')
    const payload = {
      ...form,
      objetivo: objetivos.join(', '),
      localizacao: `${form.cidade} – ${form.estado}, ${form.pais}`,
      informacoesAdicionais: form.resumoAtivo,
    }

    const res = await fetch('/api/analise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Erro ao criar análise.')
      setLoading(false)
      setLoadingLabel('')
      return
    }

    const { analiseId } = data
    const supabase = createClient()

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setLoadingLabel(`Enviando documentos... (${i + 1}/${files.length}) ${file.name}`)
      const { error: uploadErr } = await supabase.storage
        .from('analises')
        .upload(`${analiseId}/${file.name}`, file, { upsert: true })
      if (uploadErr) {
        console.warn(`Upload falhou para ${file.name}:`, uploadErr.message)
      }
    }

    router.push(`/dashboard/analise/${analiseId}`)
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-4 max-w-4xl mx-auto">
        <Link href="/dashboard" className="text-gray-500 hover:text-white text-sm transition">← Dashboard</Link>
        <span className="text-gray-600">/</span>
        <span className="text-white font-semibold text-sm">Nova Análise</span>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-2">Pré-Briefing do Ativo</h1>
        <p className="text-gray-400 text-sm mb-8">Contexto estratégico para o pipeline de análise. Quanto mais detalhe, mais precisa será a entrega.</p>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* BLOCO 1 — Identificação */}
          <section>
            <h2 className="text-xs font-semibold text-cyan-400 uppercase tracking-widest mb-4">1 · Identificação do Ativo</h2>
            <div className="space-y-4">
              <Field label="Nome do Ativo *" help="Como você identifica este deal internamente">
                <input
                  type="text"
                  value={form.nomeAtivo}
                  onChange={e => set('nomeAtivo', e.target.value)}
                  required
                  className="input"
                  placeholder="Ex: Rede de Franquias ABC / Imóvel Lapa SP"
                />
              </Field>

              <Field label="Tipo de Ativo *">
                <Select value={form.tipoAtivo} onChange={v => set('tipoAtivo', v)} options={TIPOS_ATIVO} />
              </Field>

              <Field label="Localização *">
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={form.cidade}
                    onChange={e => set('cidade', e.target.value)}
                    required
                    className="input"
                    placeholder="Cidade"
                  />
                  <input
                    type="text"
                    value={form.estado}
                    onChange={e => set('estado', e.target.value)}
                    required
                    className="input"
                    placeholder="Estado"
                  />
                  <input
                    type="text"
                    value={form.pais}
                    onChange={e => set('pais', e.target.value)}
                    required
                    className="input"
                    placeholder="País"
                  />
                </div>
              </Field>
            </div>
          </section>

          {/* BLOCO 2 — Contexto da Operação */}
          <section>
            <h2 className="text-xs font-semibold text-cyan-400 uppercase tracking-widest mb-4">2 · Contexto da Operação</h2>
            <div className="space-y-4">
              <Field label="Estágio Atual *">
                <Select value={form.estagio} onChange={v => set('estagio', v)} options={ESTAGIOS} />
              </Field>

              <Field label="Objetivo da Operação *" help="Selecione um ou mais objetivos">
                <div className="grid grid-cols-2 gap-2">
                  {OBJETIVOS.map(o => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => toggleObjetivo(o)}
                      className={`text-left px-3 py-2.5 rounded-lg border text-sm transition ${objetivos.includes(o) ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300' : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500'}`}
                    >
                      {objetivos.includes(o) && <span className="text-cyan-500 mr-1.5">✓</span>}
                      {o}
                    </button>
                  ))}
                </div>
                {objetivos.length > 0 && (
                  <p className="text-xs text-cyan-600 mt-1.5">{objetivos.length} selecionado(s): {objetivos.join(' · ')}</p>
                )}
              </Field>

              <Field label="Nível de Informação Disponível *">
                <Select value={form.nivelInformacao} onChange={v => set('nivelInformacao', v)} options={NIVEIS_INFO} />
              </Field>

              <Field label="Ticket Estimado *" help="Valor esperado da transação ou captação">
                <input
                  type="text"
                  value={form.ticketEstimado}
                  onChange={e => set('ticketEstimado', e.target.value)}
                  required
                  className="input"
                  placeholder="Ex: R$ 20M a R$ 30M"
                />
              </Field>
            </div>
          </section>

          {/* BLOCO 3 — Tese do Ativo */}
          <section>
            <h2 className="text-xs font-semibold text-cyan-400 uppercase tracking-widest mb-4">3 · Tese do Ativo</h2>
            <Field
              label="Resumo do Ativo e Objetivo *"
              help="Descreva o ativo, o momento atual e o que está buscando. Inclua diferenciais, histórico, tentativas anteriores, urgência, estrutura societária e qualquer informação relevante."
            >
              <div className="mb-2 flex flex-wrap gap-1.5">
                {MICRO_ORIENTACOES.map(o => (
                  <span key={o} className="text-xs text-gray-500 bg-gray-900 border border-gray-800 rounded px-2 py-1">{o}</span>
                ))}
              </div>
              <textarea
                value={form.resumoAtivo}
                onChange={e => set('resumoAtivo', e.target.value)}
                required
                rows={7}
                className="input resize-none"
                placeholder="Ex: Empresa familiar, 2ª geração, sócios alinhados. Nunca foi ao mercado. Urgência moderada — sócio majoritário quer liquidez nos próximos 18 meses..."
              />
            </Field>
          </section>

          {/* BLOCO 4 — Documentos */}
          <section>
            <h2 className="text-xs font-semibold text-cyan-400 uppercase tracking-widest mb-4">4 · Documentos</h2>
            <Field
              label="Documentos do Ativo *"
              help="Suba todos os documentos disponíveis: balanços, DRE, contratos, laudos, apresentações, cap table. Aceita PDF, Word, Excel, CSV, PNG, JPG. Quanto mais completa a documentação, mais precisa a análise."
            >
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => {
                  e.preventDefault()
                  setDragging(false)
                  addFiles(e.dataTransfer.files)
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${dragging ? 'border-cyan-500 bg-cyan-500/5' : 'border-gray-700 hover:border-gray-500 hover:bg-gray-900/50'}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ACCEPTED}
                  className="hidden"
                  onChange={e => {
                    if (e.target.files) addFiles(e.target.files)
                    e.target.value = ''
                  }}
                />
                <div className="text-3xl mb-2">📂</div>
                <p className="text-gray-300 text-sm font-medium">Clique para selecionar ou arraste os arquivos</p>
                <p className="text-gray-600 text-xs mt-1">PDF · Word · Excel · CSV · PNG · JPG — máx. {MAX_FILE_MB}MB por arquivo</p>
              </div>

              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
                      <span className="text-base shrink-0">{fileIcon(file.name)}</span>
                      <span className="text-sm text-gray-300 truncate flex-1">{file.name}</span>
                      <span className="text-xs text-gray-500 shrink-0">{formatBytes(file.size)}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                        className="text-gray-600 hover:text-red-400 transition text-sm shrink-0"
                      >✕</button>
                    </div>
                  ))}
                  <p className="text-xs text-cyan-600 pt-1">{files.length} arquivo(s) selecionado(s)</p>
                </div>
              )}
            </Field>
          </section>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold py-3 rounded-lg transition disabled:opacity-50 text-sm"
          >
            {loading ? loadingLabel || 'Processando...' : 'Iniciar Análise Completa'}
          </button>

          <p className="text-center text-gray-500 text-xs">
            O pipeline com 9 agentes será ativado automaticamente. Entrega em 45–90 minutos.
          </p>
        </form>
      </main>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          background: rgb(17 24 39);
          border: 1px solid rgb(55 65 81);
          border-radius: 0.5rem;
          padding: 0.625rem 1rem;
          color: white;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s;
        }
        :global(.input:focus) {
          border-color: rgb(6 182 212);
        }
        :global(.input::placeholder) {
          color: rgb(75 85 99);
        }
      `}</style>
    </div>
  )
}

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      {help && <p className="text-xs text-gray-500 mb-1.5">{help}</p>}
      {children}
    </div>
  )
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      required
      className="input"
      style={{ cursor: 'pointer' }}
    >
      <option value="">Selecione...</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}
