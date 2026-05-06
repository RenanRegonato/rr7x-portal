'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Topbar from '@/components/Topbar'
import AgentRow, { type AgentDef } from '@/components/AgentRow'
import AgentMark from '@/components/AgentMark'
import PhaseLabel from '@/components/PhaseLabel'
import LiveLog, { type LogLine } from '@/components/LiveLog'
import Pill from '@/components/Pill'
import { IconDownload, IconCheck, IconClock, IconArrowRight } from '@/components/Icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// ─── Agent definitions ────────────────────────────────────────────────────────

const AGENTS: AgentDef[] = [
  { key: 'orchestration', name: 'Otto Orquestra',   role: 'Deal Orchestrator',           color: 'peach', initial: 'O', deliverable: 'Deal Readiness Score + ativação dos especialistas' },
  { key: 'pesquisa',      name: 'Pedro Panorama',   role: 'Market Researcher',            color: 'sky',   initial: 'P', deliverable: 'Pesquisa mercadológica e benchmarks' },
  { key: 'diagnostico',   name: 'Davi Diagnóstico', role: 'Financial Diagnostician',      color: 'sage',  initial: 'D', deliverable: 'DRE, fluxo de caixa, valuation, EBITDA normalizado' },
  { key: 'analise_ma',    name: 'Arthur Aquisição', role: 'M&A Architect',                color: 'sand',  initial: 'A', deliverable: 'Tese de M&A e estrutura da transação' },
  { key: 'contratos',     name: 'Clara Cláusula',   role: 'Contractualist',               color: 'lilac', initial: 'C', deliverable: 'NDA, SHA, LOI, passivos jurídicos' },
  { key: 'originacao',    name: 'Victor Valor',      role: 'Deal Originator',              color: 'cream', initial: 'V', deliverable: 'Teaser, IM, pitch deck e pipeline de compradores' },
  { key: 'estruturacao',  name: 'Estela Estrutura',  role: 'Operation Structure Advisor',  color: 'sage',  initial: 'E', deliverable: 'Ranking de operações de crédito estruturado' },
  { key: 'maturidade',    name: 'Paulo Preparo',     role: 'Deal Preparator',              color: 'sand',  initial: 'P', deliverable: 'Veredicto de Maturidade + roadmap de preparação' },
  { key: 'revisao',       name: 'Rodrigo Relatório', role: 'Quality Reviewer',             color: 'sky',   initial: 'R', deliverable: 'Revisão cruzada e consistência entre relatórios' },
]

const INTAKE_AGENT: AgentDef = {
  key: 'drive_intake', name: 'Ingestão de Dados', role: 'Document Processor',
  color: 'sand', initial: 'I', deliverable: 'Leitura e diagnóstico dos documentos enviados',
}

const DETAIL_TABS = [
  { key: 'relatorio_consolidado', label: 'Resumo Executivo' },
  { key: 'drive_intake',          label: 'Ingestão'         },
  { key: 'orchestration',         label: 'Orquestração'     },
  { key: 'pesquisa',              label: 'Mercado'          },
  { key: 'diagnostico',           label: 'Diagnóstico'      },
  { key: 'analise_ma',            label: 'M&A'              },
  { key: 'contratos',             label: 'Contratos'        },
  { key: 'originacao',            label: 'Originação'       },
  { key: 'estruturacao',          label: 'Estruturação'     },
  { key: 'maturidade',            label: 'Maturidade'       },
  { key: 'revisao',               label: 'Revisão'          },
  { key: 'blind_teaser',          label: 'Blind Teaser'     },
  { key: 'sell_side_pitchbook',   label: 'Pitchbook'        },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAgentPct(key: string, outputs: Record<string, string>, runningStep: string | null) {
  if (outputs[key]) return 100
  if (runningStep === key) return 50
  return 0
}

function fmtTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalisePage() {
  const { id }   = useParams() as { id: string }
  const router   = useRouter()

  const [analise,     setAnalise]     = useState<any>(null)
  const [outputs,     setOutputs]     = useState<Record<string, string>>({})
  const [status,      setStatus]      = useState('processando')
  const [runningStep, setRunningStep] = useState<string | null>(null)
  const [activeAgent, setActiveAgent] = useState('orchestration')
  const [activeTab,   setActiveTab]   = useState('relatorio_consolidado')
  const [logLines,    setLogLines]    = useState<LogLine[]>([])
  const [elapsed,     setElapsed]     = useState(0)

  const pipelineStarted  = useRef(false)
  const startTime        = useRef(Date.now())

  function addLog(agent: string, msg: string) {
    const secs = Math.floor((Date.now() - startTime.current) / 1000)
    setLogLines((prev) => [...prev, { time: fmtTime(secs), agent, msg }])
  }

  // Elapsed timer
  useEffect(() => {
    if (status !== 'processando') return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [status])

  async function runStep(step: string): Promise<string> {
    setRunningStep(step)
    const agent = [...AGENTS, INTAKE_AGENT].find((a) => a.key === step)
    addLog(agent?.name ?? step, 'Iniciando análise...')

    const res = await fetch(`/api/analise/${id}/step`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ step }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error ?? 'Erro no step ' + step)
    }

    const reader  = res.body!.getReader()
    const decoder = new TextDecoder()
    let result    = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      result += decoder.decode(value, { stream: true })
      setOutputs((prev) => ({ ...prev, [step]: result }))
    }

    addLog(agent?.name ?? step, '✓ Entregável concluído')
    setActiveAgent(step)
    return result
  }

  async function runPipeline() {
    if (pipelineStarted.current) return
    pipelineStarted.current = true

    try {
      await runStep('drive_intake')
      await runStep('orchestration')

      await Promise.all([
        runStep('pesquisa'),
        runStep('diagnostico'),
        runStep('analise_ma'),
        runStep('contratos'),
        runStep('originacao'),
        runStep('estruturacao'),
      ])

      await runStep('maturidade')
      await runStep('revisao')

      await Promise.all([
        runStep('blind_teaser'),
        runStep('sell_side_pitchbook'),
      ])

      await runStep('relatorio_consolidado')

      await fetch(`/api/analise-status?id=${id}&concluir=1`)
      setStatus('concluido')
      setRunningStep(null)
      setActiveTab('relatorio_consolidado')
    } catch (err) {
      console.error(err)
      await fetch(`/api/analise-status?id=${id}&erro=1`)
      setStatus('erro')
      setRunningStep(null)
    }
  }

  async function reprocessar() {
    pipelineStarted.current = false
    setOutputs({})
    setLogLines([])
    setElapsed(0)
    setStatus('processando')
    await fetch(`/api/analise-status?id=${id}&reprocessar=1`)
    startTime.current = Date.now()
    runPipeline()
  }

  useEffect(() => {
    async function init() {
      const res  = await fetch(`/api/analise-status?id=${id}`)
      const data = await res.json()
      setAnalise(data)
      setStatus(data.status)
      const existing = (data.outputs ?? {}) as Record<string, string>
      setOutputs(existing)

      if (existing.relatorio_consolidado) setActiveTab('relatorio_consolidado')

      if (data.status === 'processando') {
        startTime.current = Date.now()
        runPipeline()
      }
    }
    init()
  }, [id])

  if (!analise) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-ink-3 font-display text-[18px]">Carregando análise...</div>
      </div>
    )
  }

  const isProcessing = status === 'processando'
  const isDone       = status === 'concluido'
  const isError      = status === 'erro'

  if (isError) {
    const completedSteps  = [...AGENTS, INTAKE_AGENT].filter((a) => outputs[a.key])
    const hasPartialData  = completedSteps.length > 0

    return (
      <div className="flex-1 flex flex-col">
        <Topbar
          variant="context"
          title={analise.nome_ativo}
          badge={{ label: 'Erro', kind: 'warn' }}
          onBack={() => router.push('/dashboard')}
        />
        <div className="flex-1 flex items-start justify-center p-8">
          <div className="max-w-lg w-full">
            <div className="bg-surface border border-border rounded-[14px] p-8 shadow-soft-sm text-center">
              <div className="w-12 h-12 rounded-full bg-warn-soft flex items-center justify-center mx-auto mb-4">
                <span className="text-warn text-[22px] font-display">!</span>
              </div>
              <h2 className="font-display text-[20px] font-medium mb-2">Análise interrompida</h2>
              <p className="text-[13px] text-ink-2 leading-relaxed mb-6">
                O pipeline encontrou um erro durante a execução.
                {hasPartialData
                  ? ` ${completedSteps.length} de ${AGENTS.length + 1} especialistas concluíram antes da interrupção.`
                  : ' Nenhum step foi concluído.'}
              </p>

              {hasPartialData && (
                <div className="text-left bg-bg-tint border border-border rounded-[10px] p-4 mb-6">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3 mb-3">Concluídos antes do erro</p>
                  <div className="space-y-1.5">
                    {[INTAKE_AGENT, ...AGENTS].map((a) => (
                      <div key={a.key} className="flex items-center gap-2 text-[13px]">
                        <span className={outputs[a.key] ? 'text-ok' : 'text-ink-3'}>
                          {outputs[a.key] ? '✓' : '○'}
                        </span>
                        <span className={outputs[a.key] ? 'text-ink' : 'text-ink-3'}>{a.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <button
                  onClick={reprocessar}
                  className="w-full bg-accent-strong hover:opacity-90 text-white font-semibold py-2.5 rounded-[10px] text-[13px] transition"
                >
                  Reprocessar do zero
                </button>
                {hasPartialData && (
                  <button
                    onClick={() => setStatus('concluido')}
                    className="w-full border border-border hover:bg-surface-2 text-ink font-medium py-2.5 rounded-[10px] text-[13px] transition flex items-center justify-center gap-1.5"
                  >
                    Ver resultados parciais <IconArrowRight size={13}/>
                  </button>
                )}
                <button
                  onClick={() => router.push('/dashboard')}
                  className="text-[12px] text-ink-3 hover:text-ink transition mt-1"
                >
                  Voltar ao dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isProcessing) {
    return <SquadView
      analise={analise}
      agents={AGENTS}
      intakeAgent={INTAKE_AGENT}
      outputs={outputs}
      runningStep={runningStep}
      activeAgent={activeAgent}
      setActiveAgent={setActiveAgent}
      logLines={logLines}
      elapsed={elapsed}
      onBack={() => router.push('/dashboard')}
    />
  }

  return <DealDetail
    analise={analise}
    outputs={outputs}
    status={status}
    activeTab={activeTab}
    setActiveTab={setActiveTab}
    onBack={() => router.push('/dashboard')}
    onRegenerate={async () => {
      try {
        setRunningStep('relatorio_consolidado')
        await runStep('relatorio_consolidado')
        setStatus('concluido')
      } catch {}
      finally { setRunningStep(null) }
    }}
    runningConsolidado={runningStep === 'relatorio_consolidado'}
  />
}

// ─── SquadView ────────────────────────────────────────────────────────────────

function SquadView({
  analise, agents, intakeAgent, outputs, runningStep,
  activeAgent, setActiveAgent, logLines, elapsed, onBack,
}: {
  analise:       any
  agents:        AgentDef[]
  intakeAgent:   AgentDef
  outputs:       Record<string, string>
  runningStep:   string | null
  activeAgent:   string
  setActiveAgent: (k: string) => void
  logLines:      LogLine[]
  elapsed:       number
  onBack:        () => void
}) {
  const allAgents  = [intakeAgent, ...agents]
  const done       = allAgents.filter((a) => outputs[a.key]).length
  const total      = allAgents.length
  const overall    = Math.round((done / total) * 100)

  const p0 = getAgentPct(intakeAgent.key, outputs, runningStep)
  const p1 = getAgentPct('orchestration', outputs, runningStep)
  const parallel = ['pesquisa','diagnostico','analise_ma','contratos','originacao','estruturacao']
  const p8 = getAgentPct('maturidade', outputs, runningStep)
  const p9 = getAgentPct('revisao', outputs, runningStep)

  const phase0Status = p0 >= 100 ? 'done' : p0 > 0 ? 'running' : 'pending'
  const phase1Status = p1 >= 100 ? 'done' : p1 > 0 ? 'running' : 'pending'
  const phase2Status = parallel.every((k) => outputs[k]) ? 'done'
    : parallel.some((k) => runningStep === k || outputs[k]) ? 'running' : 'pending'
  const phase3Status = p8 >= 100 ? 'done' : p8 > 0 ? 'running' : 'pending'
  const phase4Status = p9 >= 100 ? 'done' : p9 > 0 ? 'running' : 'pending'

  const focusedAgent = [...allAgents].find((a) => a.key === activeAgent) ?? agents[0]

  return (
    <div className="flex flex-col min-h-screen">
      <Topbar
        variant="context"
        title={analise.nome_ativo}
        badge={{ label: 'Squad ativo', kind: 'live' }}
        onBack={onBack}
        right={
          <span className="font-mono text-[12px] text-ink-2 flex items-center gap-1.5">
            <IconClock size={12}/> {fmtTime(elapsed)}
          </span>
        }
      />

      <div className="grid grid-cols-[1fr_360px] gap-7 p-[28px_32px] items-start">
        <section>
          <header className="flex items-baseline justify-between mb-5">
            <h2 className="font-display font-medium text-[24px] tracking-tight m-0">Squad em execução</h2>
            <div className="text-[12px] text-ink-3">
              {overall}% · ETA {fmtTime(Math.max(0, Math.round((100 - overall) * 5)))}
            </div>
          </header>

          <PhaseLabel n={0} label="Ingestão de Documentos" status={phase0Status}/>
          <div className="grid grid-cols-1 gap-2.5 mb-5">
            <AgentRow agent={intakeAgent} pct={p0} active={activeAgent === intakeAgent.key} onClick={() => setActiveAgent(intakeAgent.key)}/>
          </div>

          <PhaseLabel n={1} label="Orquestração" status={phase1Status}/>
          <div className="grid grid-cols-1 gap-2.5 mb-5">
            <AgentRow agent={agents[0]} pct={p1} active={activeAgent === agents[0].key} onClick={() => setActiveAgent(agents[0].key)}/>
          </div>

          <PhaseLabel n={2} label="Análises em paralelo" status={phase2Status}/>
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            {agents.slice(1, 7).map((a) => (
              <AgentRow key={a.key} agent={a} pct={getAgentPct(a.key, outputs, runningStep)} active={activeAgent === a.key} onClick={() => setActiveAgent(a.key)}/>
            ))}
          </div>

          <PhaseLabel n={3} label="Veredicto de Maturidade" status={phase3Status}/>
          <div className="grid grid-cols-1 gap-2.5 mb-5">
            <AgentRow agent={agents[7]} pct={p8} active={activeAgent === agents[7].key} onClick={() => setActiveAgent(agents[7].key)}/>
          </div>

          <PhaseLabel n={4} label="Revisão cruzada" status={phase4Status}/>
          <div className="grid grid-cols-1 gap-2.5">
            <AgentRow agent={agents[8]} pct={p9} active={activeAgent === agents[8].key} onClick={() => setActiveAgent(agents[8].key)}/>
          </div>
        </section>

        <aside className="flex flex-col gap-4 sticky top-20">
          {/* Active agent panel */}
          <div className="bg-surface border border-border rounded-[14px] shadow-soft-sm p-[18px]">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Especialista</div>
            <div className="flex items-center gap-2.5 mt-2.5">
              <AgentMark color={focusedAgent.color} initial={focusedAgent.initial}/>
              <div>
                <div className="font-display text-[18px] font-medium tracking-tight">{focusedAgent.name}</div>
                <div className="text-[12px] text-ink-3">{focusedAgent.role}</div>
              </div>
            </div>
            <p className="text-[13px] text-ink-2 mt-3.5 leading-relaxed">{focusedAgent.deliverable}</p>
            {outputs[focusedAgent.key] && (
              <div className="mt-3 text-[11px] text-ok font-medium flex items-center gap-1.5">
                <IconCheck size={12} sw={2.5}/> Entregável disponível
              </div>
            )}
          </div>

          <LiveLog lines={logLines} isLive/>
        </aside>
      </div>
    </div>
  )
}

// ─── DealDetail ───────────────────────────────────────────────────────────────

function DealDetail({
  analise, outputs, status, activeTab, setActiveTab,
  onBack, onRegenerate, runningConsolidado,
}: {
  analise:             any
  outputs:             Record<string, string>
  status:              string
  activeTab:           string
  setActiveTab:        (k: string) => void
  onBack:              () => void
  onRegenerate:        () => void
  runningConsolidado:  boolean
}) {
  const visibleTabs = DETAIL_TABS.filter((t) => outputs[t.key])

  function downloadAll() {
    const slug  = analise.nome_ativo?.replace(/\s+/g, '-') ?? 'analise'
    const parts = DETAIL_TABS.filter((t) => outputs[t.key])
      .map((t) => `## ${t.label}\n\n${outputs[t.key]}`)
    const blob  = new Blob([parts.join('\n\n---\n\n')], { type: 'text/markdown' })
    const url   = URL.createObjectURL(blob)
    const a     = document.createElement('a')
    a.href      = url
    a.download  = `${slug}-rr7x.md`
    a.click()
  }

  const statusBadge = status === 'concluido'
    ? { label: 'Pronto', kind: 'live' as const }
    : { label: 'Erro', kind: 'warn' as const }

  return (
    <div className="flex flex-col min-h-screen">
      <Topbar
        variant="context"
        title={analise.nome_ativo}
        badge={statusBadge}
        subtitle={`· ${analise.deal_intake?.tipoAtivo ?? ''}`}
        onBack={onBack}
        right={
          <div className="flex items-center gap-2">
            {!runningConsolidado && Object.keys(outputs).filter((k) => k !== 'relatorio_consolidado').length > 0 && (
              <button
                onClick={onRegenerate}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] border border-border-strong bg-surface text-[13px] font-medium hover:bg-surface-2"
              >
                {outputs.relatorio_consolidado ? '↺ Regenerar resumo' : '✦ Gerar resumo executivo'}
              </button>
            )}
            {runningConsolidado && (
              <span className="text-[12px] text-ink-3 animate-pulse">Gerando resumo...</span>
            )}
            {Object.keys(outputs).length > 0 && (
              <button
                onClick={downloadAll}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] bg-accent-strong text-white text-[13px] font-semibold hover:opacity-90"
              >
                <IconDownload size={13}/> Exportar tudo
              </button>
            )}
          </div>
        }
      />

      {/* Tab nav */}
      <nav className="px-8 border-b border-border flex gap-1 bg-bg sticky top-[61px] z-[5] overflow-x-auto">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3.5 py-3 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap
              ${activeTab === t.key ? 'text-ink border-accent-strong' : 'text-ink-2 border-transparent hover:text-ink'}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="p-8 flex-1">
        {activeTab && outputs[activeTab] ? (
          <OutputPanel
            label={DETAIL_TABS.find((t) => t.key === activeTab)?.label ?? activeTab}
            content={outputs[activeTab]}
            stepKey={activeTab}
          />
        ) : (
          <div className="bg-surface border border-border rounded-[14px] p-16 text-center shadow-soft-sm">
            <div className="text-ink-3 text-[13px]">Selecione uma aba acima para ver o conteúdo.</div>
          </div>
        )}
      </div>
    </div>
  )
}

function OutputPanel({ label, content, stepKey }: { label: string; content: string; stepKey: string }) {
  function download() {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${stepKey}-rr7x.md`
    a.click()
  }

  return (
    <div className="bg-surface border border-border rounded-[14px] shadow-soft-sm overflow-hidden">
      <div className="flex items-center justify-between px-7 py-4 border-b border-border">
        <h2 className="font-display text-[18px] font-medium">{label}</h2>
        <button
          onClick={download}
          className="text-[12px] text-ink-3 hover:text-ink flex items-center gap-1.5 transition-colors"
        >
          <IconDownload size={13}/> Baixar
        </button>
      </div>
      <div className="px-7 py-6 prose-otto max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => <h1 className="font-display text-[24px] font-medium tracking-tight mt-6 mb-3 text-ink">{children}</h1>,
            h2: ({ children }) => <h2 className="font-display text-[20px] font-medium tracking-tight mt-5 mb-2.5 text-ink">{children}</h2>,
            h3: ({ children }) => <h3 className="text-[15px] font-semibold mt-4 mb-2 text-ink">{children}</h3>,
            h4: ({ children }) => <h4 className="text-[13px] font-semibold mt-3 mb-1.5 text-ink">{children}</h4>,
            p:  ({ children }) => <p className="text-[13px] text-ink-2 leading-[1.7] mb-3">{children}</p>,
            ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1 text-[13px] text-ink-2">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-[13px] text-ink-2">{children}</ol>,
            li: ({ children }) => <li className="leading-[1.7]">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
            code: ({ children }) => <code className="font-mono text-[12px] bg-bg-tint px-1.5 py-0.5 rounded text-accent-ink">{children}</code>,
            pre: ({ children }) => <pre className="bg-bg-tint rounded-[10px] p-4 overflow-x-auto font-mono text-[12px] mb-3">{children}</pre>,
            table: ({ children }) => <div className="overflow-x-auto mb-4"><table className="w-full text-[13px] border-collapse">{children}</table></div>,
            thead: ({ children }) => <thead className="border-b border-border">{children}</thead>,
            th: ({ children }) => <th className="text-left py-2 pr-4 font-semibold text-ink">{children}</th>,
            td: ({ children }) => <td className="py-2 pr-4 text-ink-2 border-b border-border">{children}</td>,
            blockquote: ({ children }) => <blockquote className="border-l-2 border-accent pl-4 text-ink-2 italic my-3">{children}</blockquote>,
            hr: () => <hr className="border-border my-5"/>,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}
