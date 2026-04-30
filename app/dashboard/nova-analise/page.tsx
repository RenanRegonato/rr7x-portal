'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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

export default function NovaAnalisePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [objetivos, setObjetivos] = useState<string[]>([])
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
    linkDocumentos: '',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleObjetivo(o: string) {
    setObjetivos(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (objetivos.length === 0) {
      setError('Selecione ao menos um objetivo da operação.')
      setLoading(false)
      return
    }

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
      setError(data.error ?? 'Erro ao iniciar análise.')
      setLoading(false)
      return
    }

    router.push(`/dashboard/analise/${data.analiseId}`)
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
              help="Descreva o ativo, o momento atual e o que está buscando (venda, captação, crédito, etc.). Inclua diferenciais, histórico, tentativas anteriores, urgência, estrutura societária e qualquer informação relevante. Quanto mais detalhe, mais precisa será a análise."
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
                placeholder="Ex: Empresa familiar, 2ª geração, sócios alinhados. Nunca foi ao mercado. Urgência moderada — sócio majoritário quer liquidez nos próximos 18 meses. Tese clara de consolidação no setor. Sem conflitos societários. Primeiro contato formal com compradores estratégicos..."
              />
            </Field>
          </section>

          {/* BLOCO 4 — Base de Dados */}
          <section>
            <h2 className="text-xs font-semibold text-cyan-400 uppercase tracking-widest mb-4">4 · Base de Dados</h2>
            <Field
              label="Link dos Documentos *"
              help="Insira um link (Google Drive, Dropbox, etc.) com todos os documentos disponíveis: financeiros, contratos, apresentações, cap table, entre outros. O squad realizará a análise completa com base nesses dados."
            >
              <input
                type="url"
                value={form.linkDocumentos}
                onChange={e => set('linkDocumentos', e.target.value)}
                required
                className="input"
                placeholder="https://drive.google.com/drive/folders/..."
              />
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
            {loading ? 'Iniciando pipeline de análise...' : 'Iniciar Análise Completa'}
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
