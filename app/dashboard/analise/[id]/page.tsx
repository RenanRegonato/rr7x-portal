'use client'

import { useEffect, useState, useRef, Fragment } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

const AGENT_STEPS = [
  { key: 'drive_intake', label: '📂 Ingestão de Dados (Drive)' },
  { key: 'orchestration', label: '🎛️ Diagnóstico (Otto Orquestra)' },
  { key: 'pesquisa', label: '🔍 Pesquisa Mercadológica (Pedro Panorama)' },
  { key: 'diagnostico', label: '💊 Diagnóstico Financeiro (Davi Diagnóstico)' },
  { key: 'analise_ma', label: '🏛️ Análise de M&A (Arthur Aquisição)' },
  { key: 'contratos', label: '📋 Análise Contratual (Clara Cláusula)' },
  { key: 'originacao', label: '🎯 Venda & Originação (Victor Valor)' },
  { key: 'estruturacao', label: '🗺️ Estruturação Operacional (Estela Estrutura)' },
  { key: 'maturidade', label: '🏗️ Veredicto de Maturidade (Paulo Preparo)' },
  { key: 'revisao', label: '✅ Revisão Final (Rodrigo Relatório)' },
  { key: 'blind_teaser', label: '📄 Blind Teaser' },
  { key: 'sell_side_pitchbook', label: '📊 Sell-Side Pitchbook' },
]

const STEPS = [
  { key: 'relatorio_consolidado', label: '📑 Relatório Consolidado' },
  ...AGENT_STEPS,
]

export default function AnalisePage() {
  const { id } = useParams()
  const [analise, setAnalise] = useState<any>(null)
  const [outputs, setOutputs] = useState<Record<string, string>>({})
  const [status, setStatus] = useState('processando')
  const [activeTab, setActiveTab] = useState('orchestration')
  const [runningStep, setRunningStep] = useState<string | null>(null)
  const pipelineStarted = useRef(false)

  async function runStep(step: string): Promise<string> {
    setRunningStep(step)
    const res = await fetch(`/api/analise/${id}/step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error ?? 'Erro no step ' + step)
    }

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let result = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      result += decoder.decode(value, { stream: true })
      setOutputs(prev => ({ ...prev, [step]: result }))
    }

    setActiveTab(step)
    return result
  }

  async function runPipeline() {
    if (pipelineStarted.current) return
    pipelineStarted.current = true

    try {
      // Step 0: Ingestão de dados — leitura real do Drive
      await runStep('drive_intake')

      // Step 1: Otto Orquestra
      await runStep('orchestration')

      // Steps 2-7: em paralelo
      await Promise.all([
        runStep('pesquisa'),
        runStep('diagnostico'),
        runStep('analise_ma'),
        runStep('contratos'),
        runStep('originacao'),
        runStep('estruturacao'),
      ])

      // Step 8: Paulo Preparo
      await runStep('maturidade')

      // Step 9: Rodrigo Relatório
      await runStep('revisao')

      // Steps 10-11: em paralelo
      await Promise.all([
        runStep('blind_teaser'),
        runStep('sell_side_pitchbook'),
      ])

      // Step 12: Relatório Consolidado
      await runStep('relatorio_consolidado')

      // Marca como concluído
      await fetch(`/api/analise-status?id=${id}&concluir=1`)
      setStatus('concluido')
      setRunningStep(null)
    } catch (err) {
      console.error(err)
      await fetch(`/api/analise-status?id=${id}&erro=1`)
      setStatus('erro')
      setRunningStep(null)
    }
  }

  useEffect(() => {
    async function init() {
      const res = await fetch(`/api/analise-status?id=${id}`)
      const data = await res.json()
      setAnalise(data)
      setStatus(data.status)
      const existingOutputs = data.outputs ?? {}
      setOutputs(existingOutputs)

      const completedKeys = Object.keys(existingOutputs)
      if (existingOutputs.relatorio_consolidado) {
        setActiveTab('relatorio_consolidado')
      } else if (existingOutputs.drive_intake) {
        setActiveTab('drive_intake')
      } else if (completedKeys.length > 0) {
        setActiveTab(completedKeys[completedKeys.length - 1])
      }

      if (data.status === 'processando') {
        runPipeline()
      }
    }
    init()
  }, [id])

  if (!analise) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-400">Carregando análise...</div>
    </div>
  )

  const completedAgentSteps = AGENT_STEPS.filter(s => outputs[s.key])
  const isDone = status === 'concluido'
  const isProcessing = status === 'processando'

  function downloadAll() {
    const slug = analise.nome_ativo?.replace(/\s+/g, '-') ?? 'analise'
    const parts: string[] = []

    if (outputs.relatorio_consolidado) {
      parts.push(`# 📑 RELATÓRIO CONSOLIDADO — ${analise.nome_ativo}\n*RR7x Deal Intelligence · ${new Date().toLocaleDateString('pt-BR')}*\n\n${outputs.relatorio_consolidado}`)
      parts.push('---')
    }

    const agentParts = AGENT_STEPS
      .filter(s => outputs[s.key])
      .map(s => `## ${s.label}\n\n${outputs[s.key]}`)
    if (agentParts.length > 0) {
      parts.push(`# 📂 ANÁLISES INDIVIDUAIS\n\n${agentParts.join('\n\n---\n\n')}`)
    }

    const blob = new Blob([parts.join('\n\n---\n\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug}-rr7x.md`
    a.click()
  }

  async function handleGenerateConsolidado() {
    try {
      await runStep('relatorio_consolidado')
    } catch (err) {
      console.error('Erro ao gerar relatório consolidado:', err)
    } finally {
      setRunningStep(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-500 hover:text-white text-sm transition">← Dashboard</Link>
          <span className="text-gray-600">/</span>
          <span className="text-white font-semibold text-sm truncate max-w-xs">{analise.nome_ativo}</span>
        </div>
        <div className="flex items-center gap-3">
          {!isProcessing && Object.keys(outputs).filter(k => k !== 'relatorio_consolidado').length > 0 && (
            <button
              onClick={handleGenerateConsolidado}
              disabled={runningStep === 'relatorio_consolidado'}
              className={`text-sm px-4 py-2 rounded-lg transition font-medium ${
                runningStep === 'relatorio_consolidado'
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : outputs.relatorio_consolidado
                  ? 'bg-gray-800 hover:bg-gray-700 text-cyan-400 border border-cyan-500/20'
                  : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              }`}
            >
              {runningStep === 'relatorio_consolidado'
                ? '⟳ Gerando consolidado...'
                : outputs.relatorio_consolidado
                ? '📑 Regenerar Consolidado'
                : '📑 Gerar Relatório Consolidado'}
            </button>
          )}
          {Object.keys(outputs).length > 0 && (
            <button onClick={downloadAll} className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition font-medium">
              Baixar tudo (.md)
            </button>
          )}
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${isDone ? 'text-green-400 bg-green-400/10' : status === 'erro' ? 'text-red-400 bg-red-400/10' : 'text-yellow-400 bg-yellow-400/10'}`}>
            {isDone ? 'Concluído' : isProcessing ? 'Processando...' : 'Erro'}
          </span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 flex gap-6">
        <aside className="w-64 shrink-0">
          <div className="mb-4">
            <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Progresso</div>
            <div className="w-full bg-gray-800 rounded-full h-1.5 mb-1">
              <div className="bg-cyan-500 h-1.5 rounded-full transition-all" style={{ width: `${(completedAgentSteps.length / AGENT_STEPS.length) * 100}%` }} />
            </div>
            <div className="text-xs text-gray-500">{completedAgentSteps.length} / {AGENT_STEPS.length} etapas</div>
          </div>

          <nav className="space-y-1">
            {/* Relatório Consolidado — destaque no topo */}
            {(() => {
              const s = { key: 'relatorio_consolidado', label: '📑 Relatório Consolidado' }
              const done = !!outputs[s.key]
              const running = runningStep === s.key
              return (
                <button
                  key={s.key}
                  onClick={() => done && setActiveTab(s.key)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-center gap-2 border ${
                    activeTab === s.key
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                      : done
                      ? 'text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/10'
                      : running
                      ? 'text-yellow-400 border-yellow-400/20'
                      : 'text-gray-600 border-transparent cursor-not-allowed'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${done ? 'bg-cyan-400' : running ? 'bg-yellow-400 animate-pulse' : 'bg-gray-700'}`} />
                  <span className="leading-tight font-medium">{s.label}{running ? ' ⟳' : ''}</span>
                </button>
              )
            })()}

            <div className="mx-1 my-2 border-t border-gray-800" />
            <div className="px-2 pb-1 text-xs text-gray-600 uppercase tracking-wider">Agentes</div>

            {AGENT_STEPS.map((s) => {
              const done = !!outputs[s.key]
              const running = runningStep === s.key
              const isDriveIntake = s.key === 'drive_intake'
              return (
                <Fragment key={s.key}>
                  <button
                    onClick={() => done && setActiveTab(s.key)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-center gap-2 ${
                      isDriveIntake
                        ? activeTab === s.key
                          ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                          : done
                          ? 'text-amber-400 border border-amber-500/20 hover:bg-amber-500/10'
                          : running
                          ? 'text-yellow-400 border border-yellow-400/20'
                          : 'text-gray-600 border border-transparent cursor-not-allowed'
                        : activeTab === s.key
                        ? 'bg-gray-800 text-white'
                        : done
                        ? 'text-gray-300 hover:bg-gray-900'
                        : 'text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${done ? (isDriveIntake ? 'bg-amber-400' : 'bg-cyan-400') : running ? 'bg-yellow-400 animate-pulse' : 'bg-gray-700'}`} />
                    <span className="leading-tight font-medium">{s.label}{running ? ' ⟳' : ''}</span>
                  </button>
                  {isDriveIntake && <div className="mx-1 my-1.5 border-t border-gray-800" />}
                </Fragment>
              )
            })}
          </nav>

          {isProcessing && (
            <div className="mt-4 text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-3 py-2">
              {runningStep ? `Rodando: ${STEPS.find(s => s.key === runningStep)?.label.split('(')[0].trim()}...` : 'Iniciando agentes...'}
            </div>
          )}
        </aside>

        <main className="flex-1 min-w-0">
          {outputs[activeTab] ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-sm">{STEPS.find(s => s.key === activeTab)?.label}</h2>
                <button
                  onClick={() => {
                    const blob = new Blob([outputs[activeTab]], { type: 'text/plain' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${activeTab}-rr7x.txt`
                    a.click()
                  }}
                  className="text-xs text-gray-500 hover:text-white transition"
                >
                  Baixar esta seção
                </button>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono leading-relaxed">
                {outputs[activeTab]}
              </pre>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-center justify-center h-40">
              <p className="text-gray-500 text-sm">
                {isProcessing ? 'Esta etapa está sendo processada...' : 'Selecione uma etapa concluída no menu lateral.'}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
