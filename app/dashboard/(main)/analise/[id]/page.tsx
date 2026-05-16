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
import DealPipelinePanel from '@/components/DealPipelinePanel'
import RegenerarModal from '@/components/RegenerarModal'
import CascadeImpactoModal from '@/components/CascadeImpactoModal'
import FatosPanel from '@/components/FatosPanel'
import ClaimsSection from '@/components/ClaimsSection'
import ConsistencyPanel from '@/components/ConsistencyPanel'

const MAX_REGENERACOES = 3

const STEP_LABELS_MAP: Record<string, string> = {
  orchestration:         'Mandor Orquestra',
  pesquisa:              'Pedro Panorama',
  diagnostico:           'Davi Diagnóstico',
  analise_ma:            'Arthur Aquisição',
  kyc:                   'Carmen Compliance',
  contratos:             'Clara Cláusula',
  originacao:            'Victor Valor',
  estruturacao:          'Estela Estrutura',
  maturidade:            'Paulo Preparo',
  relatorio_consolidado: 'Relatório Consolidado',
  blind_teaser:          'Blind Teaser',
  sell_side_pitchbook:   'Sell-Side Pitchbook',
}

// ─── Conditional agent logic ──────────────────────────────────────────────────

const MA_OBJECTIVES        = ['Vender 100%', 'Vender participação', 'Captar investimento']
const ESTRUTURA_OBJECTIVES = ['Estruturar crédito']

function isMAActive(objetivo?: string)        { return MA_OBJECTIVES.some((o)        => (objetivo ?? '').includes(o)) }
function isEstruturaActive(objetivo?: string) { return ESTRUTURA_OBJECTIVES.some((o) => (objetivo ?? '').includes(o)) }

// ─── Agent definitions ────────────────────────────────────────────────────────

const AGENTS: AgentDef[] = [
  { key: 'orchestration', name: 'Mandor Orquestra', role: 'Deal Orchestrator',           color: 'peach', initial: 'M', deliverable: 'Deal Readiness Score + ativação dos especialistas' },
  { key: 'pesquisa',      name: 'Pedro Panorama',   role: 'Market Researcher',            color: 'sky',   initial: 'P', deliverable: 'Pesquisa mercadológica e benchmarks' },
  { key: 'diagnostico',   name: 'Davi Diagnóstico', role: 'Financial Diagnostician',      color: 'sage',  initial: 'D', deliverable: 'DRE, fluxo de caixa, valuation, EBITDA normalizado' },
  { key: 'analise_ma',    name: 'Arthur Aquisição', role: 'M&A Architect',                color: 'sand',  initial: 'A', deliverable: 'Tese de M&A e estrutura da transação' },
  { key: 'contratos',     name: 'Clara Cláusula',   role: 'Contractualist',               color: 'lilac', initial: 'C', deliverable: 'NDA, SHA, LOI, passivos jurídicos' },
  { key: 'originacao',    name: 'Victor Valor',      role: 'Deal Originator',              color: 'cream', initial: 'V', deliverable: 'Estratégia de posicionamento, perfil de compradores e pipeline de originação' },
  { key: 'estruturacao',  name: 'Estela Estrutura',  role: 'Operation Structure Advisor',  color: 'sage',  initial: 'E', deliverable: 'Ranking de operações de crédito estruturado' },
  { key: 'kyc',           name: 'Carmen Compliance', role: 'KYC & Compliance Analyst',     color: 'peach', initial: 'K', deliverable: 'Screening KYC, PEP, red flags regulatórios e compliance documental' },
  { key: 'maturidade',    name: 'Paulo Preparo',     role: 'Deal Readiness Coach',         color: 'sand',  initial: 'P', deliverable: 'Veredicto de Maturidade único + roadmap de preparação' },
]

const INTAKE_AGENT: AgentDef = {
  key: 'drive_intake', name: 'Ingestão de Dados', role: 'Document Processor',
  color: 'sand', initial: 'I', deliverable: 'Leitura e diagnóstico dos documentos enviados',
}

const DETAIL_TABS = [
  { key: 'relatorio_consolidado', label: 'Resumo Executivo' },
  { key: 'consistencia',          label: 'Consistência'     },
  { key: 'drive_intake',          label: 'Ingestão'         },
  { key: 'fatos',                 label: 'Fatos'            },
  { key: 'orchestration',         label: 'Orquestração'     },
  { key: 'pesquisa',              label: 'Mercado'          },
  { key: 'diagnostico',           label: 'Diagnóstico'      },
  { key: 'analise_ma',            label: 'M&A'              },
  { key: 'kyc',                   label: 'Compliance'       },
  { key: 'contratos',             label: 'Contratos'        },
  { key: 'originacao',            label: 'Originação'       },
  { key: 'estruturacao',          label: 'Estruturação'     },
  { key: 'maturidade',            label: 'Maturidade'       },
  { key: 'blind_teaser',          label: 'Blind Teaser'     },
  { key: 'sell_side_pitchbook',   label: 'Pitchbook'        },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAgentPct(key: string, outputs: Record<string, string>, runningSteps: Set<string>) {
  if (outputs[key]) return 100
  if (runningSteps.has(key)) return 50
  return 0
}

function fmtTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalisePage() {
  const { id }   = useParams() as { id: string }
  const router   = useRouter()

  const [analise,      setAnalise]      = useState<any>(null)
  const [outputs,      setOutputs]      = useState<Record<string, string>>({})
  const [status,       setStatus]       = useState('processando')
  const [runningSteps, setRunningSteps] = useState<Set<string>>(new Set())
  const [activeAgent,  setActiveAgent]  = useState('orchestration')
  const [activeTab,    setActiveTab]    = useState('relatorio_consolidado')
  const [logLines,     setLogLines]     = useState<LogLine[]>([])
  const [elapsed,      setElapsed]      = useState(0)

  // Regenerar com briefing
  const [regenStep,    setRegenStep]    = useState<string | null>(null)
  const [regenCount,   setRegenCount]   = useState(0)

  // Cascade após regenerar
  const [cascadeModalOpen,   setCascadeModalOpen]   = useState(false)
  const [cascadeLoading,     setCascadeLoading]     = useState(false)
  const [cascadeImpactos,    setCascadeImpactos]    = useState<{ step_key: string; severidade: 'alta'|'media'|'baixa'; justificativa: string }[]>([])
  const [cascadeStepOrigem,  setCascadeStepOrigem]  = useState<string>('')

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

  async function runConsistencyCheck(): Promise<void> {
    addLog('Consistency Engine', 'Validando coerência entre agentes...')
    try {
      const r = await fetch(`/api/analise/${id}/consistency-check`, { method: 'POST' })
      if (!r.ok) {
        addLog('Consistency Engine', '⚠ Falha na checagem (prosseguindo)')
        return
      }
      const d = await r.json()
      const { bloqueante = 0, alerta = 0, info = 0 } = d.por_severidade ?? {}
      if (bloqueante + alerta + info === 0) {
        addLog('Consistency Engine', '✓ Nenhuma inconsistência detectada')
      } else {
        const parts = []
        if (bloqueante > 0) parts.push(`${bloqueante} bloqueante${bloqueante === 1 ? '' : 's'}`)
        if (alerta     > 0) parts.push(`${alerta} alerta${alerta === 1 ? '' : 's'}`)
        if (info       > 0) parts.push(`${info} info`)
        addLog('Consistency Engine', `⚠ ${parts.join(', ')} detectado${d.total === 1 ? '' : 's'} — ver aba Consistência`)
      }
    } catch (err) {
      console.error('[consistency]', err)
      addLog('Consistency Engine', '⚠ Erro na checagem')
    }
  }

  async function runFactExtraction(): Promise<void> {
    addLog('Fact Extractor', 'Extraindo fatos consolidados da ingestão...')
    try {
      const r = await fetch(`/api/analise/${id}/fact-extract`, { method: 'POST' })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        addLog('Fact Extractor', `⚠ Falhou: ${d.error ?? 'erro desconhecido'} (prosseguindo)`)
        return
      }
      const d = await r.json()
      if (d.ja_extraido) {
        addLog('Fact Extractor', '↩ Fatos já extraídos previamente')
      } else {
        addLog('Fact Extractor', `✓ ${d.facts_count ?? 0} fato${d.facts_count === 1 ? '' : 's'} consolidados`)
      }
    } catch (err) {
      console.error('[fact-extract]', err)
      addLog('Fact Extractor', '⚠ Erro ao extrair fatos (prosseguindo sem truth layer)')
    }
  }

  async function runStep(step: string, regeneracaoId?: string): Promise<string> {
    setRunningSteps((prev) => new Set([...prev, step]))
    const agent = [...AGENTS, INTAKE_AGENT].find((a) => a.key === step)
    addLog(agent?.name ?? step, regeneracaoId ? 'Regenerando com briefing...' : 'Iniciando análise...')

    try {
      const res = await fetch(`/api/analise/${id}/step`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ step, regeneracao_id: regeneracaoId }),
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
        const chunk = decoder.decode(value, { stream: true })
        result += chunk
        if (result.includes('\x00ERROR:')) {
          const msg = result.split('\x00ERROR:')[1] ?? 'Erro interno no agente'
          throw new Error(msg.trim())
        }
        setOutputs((prev) => ({ ...prev, [step]: result }))
      }

      addLog(agent?.name ?? step, '✓ Entregável concluído')
      setActiveAgent(step)
      return result
    } finally {
      setRunningSteps((prev) => { const s = new Set(prev); s.delete(step); return s })
    }
  }

  async function runPipeline(startingOutputs: Record<string, string> = {}, objetivo?: string) {
    if (pipelineStarted.current) return
    pipelineStarted.current = true

    const runMA        = isMAActive(objetivo)
    const runEstrutura = isEstruturaActive(objetivo)

    async function maybeRun(step: string): Promise<string> {
      if (startingOutputs[step]) {
        const agent = [...AGENTS, INTAKE_AGENT].find((a) => a.key === step)
        addLog(agent?.name ?? step, '↩ Retomando output anterior')
        setActiveAgent(step)
        return startingOutputs[step]
      }
      return runStep(step)
    }

    try {
      await maybeRun('drive_intake')
      // Truth Layer (Fase 6): após ingestão, extrai fatos estruturados
      // para que todos os agentes downstream consultem antes de afirmar
      // disponibilidade documental ou citar números.
      await runFactExtraction()
      await maybeRun('orchestration')

      // Wave 1 (Fase 9): agentes que NÃO dependem uns dos outros — rodam
      // paralelos vendo apenas drive_intake + orchestration + truth_layer.
      await Promise.all([
        maybeRun('pesquisa'),
        maybeRun('diagnostico'),
        maybeRun('kyc'),
        maybeRun('contratos'),
      ])

      // Wave 2: agentes que precisam ver outputs da Wave 1 para evitar
      // contradições (cross-reading via CROSS_READING_DEPS no /step).
      // Roda paralelo entre si, mas após Wave 1 completar.
      await Promise.all([
        ...(runMA        ? [maybeRun('analise_ma')]    : []),
        ...(runEstrutura ? [maybeRun('estruturacao')]  : []),
        maybeRun('originacao'),
      ])

      await maybeRun('maturidade')

      // Consistency Engine (Fase 9): checa contradições entre claims/facts/benchmarks
      // antes dos documentos finais. Não-bloqueante: relatório segue, mas com aviso.
      await runConsistencyCheck()

      await Promise.all([
        maybeRun('blind_teaser'),
        maybeRun('sell_side_pitchbook'),
      ])

      await maybeRun('relatorio_consolidado')

      await fetch(`/api/analise-status?id=${id}&concluir=1`)
      setStatus('concluido')
      setActiveTab('relatorio_consolidado')
    } catch (err) {
      console.error(err)
      await fetch(`/api/analise-status?id=${id}&erro=1`)
      setStatus('erro')
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
    runPipeline({}, analise?.deal_intake?.objetivo)
  }

  async function continuar() {
    const currentOutputs = outputs
    pipelineStarted.current = false
    setLogLines([])
    setElapsed(0)
    setStatus('processando')
    await fetch(`/api/analise-status?id=${id}&continuar=1`)
    startTime.current = Date.now()
    runPipeline(currentOutputs, analise?.deal_intake?.objetivo)
  }

  async function reprocessStep(step: string) {
    try {
      await runStep(step)
    } catch (err) {
      console.error('[reprocess step]', err)
    }
  }

  useEffect(() => {
    async function init() {
      const res  = await fetch(`/api/analise-status?id=${id}`)
      const data = await res.json()
      setAnalise(data)
      setStatus(data.status)
      setRegenCount(Number(data.regeneracoes_count ?? 0))
      const existing = (data.outputs ?? {}) as Record<string, string>
      setOutputs(existing)

      if (existing.relatorio_consolidado) setActiveTab('relatorio_consolidado')

      if (data.status === 'processando') {
        startTime.current = Date.now()
        runPipeline(existing, data.deal_intake?.objetivo)
      }
    }
    init()
  }, [id])

  async function onRegenerarConfirmado(step: string, regeneracaoId: string) {
    // Bumpa contador local imediatamente (o backend já incrementou ao executar)
    setRegenCount((c) => c + 1)
    try {
      await runStep(step, regeneracaoId)
    } catch (err) {
      console.error('[regenerar/runStep]', err)
      return
    }

    // Após regenerar o step principal, dispara o Detetive Dependência
    // para avaliar impacto nos demais agentes (cascade).
    setCascadeStepOrigem(step)
    setCascadeImpactos([])
    setCascadeModalOpen(true)
    setCascadeLoading(true)
    try {
      const r = await fetch(`/api/analise/${id}/regenerar/cascade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regeneracao_id: regeneracaoId }),
      })
      const d = await r.json()
      if (r.ok) {
        setCascadeImpactos(d.impactos ?? [])
      } else {
        console.error('[cascade]', d.error)
      }
    } catch (err) {
      console.error('[cascade]', err)
    } finally {
      setCascadeLoading(false)
    }
  }

  async function reprocessarCascade(stepKeys: string[]) {
    setCascadeModalOpen(false)
    // Reprocessa em série pra não saturar a Anthropic API
    for (const sk of stepKeys) {
      try {
        await runStep(sk)
      } catch (err) {
        console.error('[cascade/runStep]', sk, err)
      }
    }
  }

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
    const objetivo        = analise?.deal_intake?.objetivo
    const activeAgentList = [INTAKE_AGENT, ...AGENTS].filter((a) => {
      if (a.key === 'analise_ma')   return isMAActive(objetivo)
      if (a.key === 'estruturacao') return isEstruturaActive(objetivo)
      return true
    })
    const completedSteps  = activeAgentList.filter((a) => outputs[a.key])
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
                  ? ` ${completedSteps.length} de ${activeAgentList.length} especialistas concluíram antes da interrupção.`
                  : ' Nenhum step foi concluído.'}
              </p>

              {hasPartialData && (
                <div className="text-left bg-bg-tint border border-border rounded-[10px] p-4 mb-6">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3 mb-3">Concluídos antes do erro</p>
                  <div className="space-y-1.5">
                    {activeAgentList.map((a) => (
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
                {hasPartialData && (
                  <button
                    onClick={continuar}
                    className="w-full bg-accent-strong hover:opacity-90 text-white font-semibold py-2.5 rounded-[10px] text-[13px] transition flex items-center justify-center gap-1.5"
                  >
                    ↩ Continuar do ponto anterior
                  </button>
                )}
                <button
                  onClick={reprocessar}
                  className="w-full border border-border hover:bg-surface-2 text-ink font-semibold py-2.5 rounded-[10px] text-[13px] transition"
                >
                  Reprocessar do zero
                </button>
                {hasPartialData && (
                  <button
                    onClick={() => setStatus('concluido')}
                    className="w-full border border-border hover:bg-surface-2 text-ink-2 font-medium py-2.5 rounded-[10px] text-[13px] transition flex items-center justify-center gap-1.5"
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
      runningSteps={runningSteps}
      activeAgent={activeAgent}
      setActiveAgent={setActiveAgent}
      logLines={logLines}
      elapsed={elapsed}
      objetivo={analise?.deal_intake?.objetivo}
      onBack={() => router.push('/dashboard')}
      onReprocess={reprocessar}
    />
  }

  const regenStepLabel = regenStep
    ? (DETAIL_TABS.find(t => t.key === regenStep)?.label ?? regenStep)
    : ''

  return (
    <>
      <DealDetail
        analise={analise}
        outputs={outputs}
        status={status}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onBack={() => router.push('/dashboard')}
        onRegenerate={async () => {
          try {
            await runStep('relatorio_consolidado')
            setStatus('concluido')
          } catch {}
        }}
        runningSteps={runningSteps}
        onReprocessStep={(step) => setRegenStep(step)}
        regenCount={regenCount}
      />
      {regenStep && (
        <RegenerarModal
          analiseId={id}
          step={regenStep}
          stepLabel={regenStepLabel}
          regeneracoesCount={regenCount}
          maxRegeneracoes={MAX_REGENERACOES}
          open={true}
          onClose={() => setRegenStep(null)}
          onConfirmed={(regeneracaoId) => {
            const stepToRun = regenStep
            setRegenStep(null)
            if (stepToRun) void onRegenerarConfirmado(stepToRun, regeneracaoId)
          }}
        />
      )}
      <CascadeImpactoModal
        open={cascadeModalOpen}
        loading={cascadeLoading}
        impactos={cascadeImpactos}
        stepLabels={STEP_LABELS_MAP}
        stepOrigemKey={cascadeStepOrigem}
        stepOrigemLabel={STEP_LABELS_MAP[cascadeStepOrigem] ?? cascadeStepOrigem}
        onClose={() => setCascadeModalOpen(false)}
        onReprocessar={(stepKeys) => void reprocessarCascade(stepKeys)}
      />
    </>
  )
}

// ─── SquadView ────────────────────────────────────────────────────────────────

function SquadView({
  analise, agents, intakeAgent, outputs, runningSteps,
  activeAgent, setActiveAgent, logLines, elapsed, objetivo, onBack, onReprocess,
}: {
  analise:        any
  agents:         AgentDef[]
  intakeAgent:    AgentDef
  outputs:        Record<string, string>
  runningSteps:   Set<string>
  activeAgent:    string
  setActiveAgent: (k: string) => void
  logLines:       LogLine[]
  elapsed:        number
  objetivo?:      string
  onBack:         () => void
  onReprocess?:   () => void
}) {
  const orchAgent      = agents.find((a) => a.key === 'orchestration')!
  const maturAgent     = agents.find((a) => a.key === 'maturidade')!
  const parallelAgents = agents.filter((a) => {
    if (a.key === 'orchestration' || a.key === 'maturidade') return false
    if (a.key === 'analise_ma')   return isMAActive(objetivo)
    if (a.key === 'estruturacao') return isEstruturaActive(objetivo)
    return true  // kyc e demais sempre ativos
  })

  const allAgents = [intakeAgent, orchAgent, ...parallelAgents, maturAgent]
  const done      = allAgents.filter((a) => outputs[a.key]).length
  const total     = allAgents.length
  const overall   = Math.round((done / total) * 100)

  const avgSecsPerStep = done > 0 ? Math.round(elapsed / done) : 30
  const eta            = Math.max(0, (total - done) * avgSecsPerStep)

  const p0 = getAgentPct(intakeAgent.key, outputs, runningSteps)
  const p1 = getAgentPct('orchestration', outputs, runningSteps)
  const p8 = getAgentPct('maturidade', outputs, runningSteps)

  const phase0Status = p0 >= 100 ? 'done' : p0 > 0 ? 'running' : 'pending'
  const phase1Status = p1 >= 100 ? 'done' : p1 > 0 ? 'running' : 'pending'
  const phase2Status = parallelAgents.every((a) => outputs[a.key]) ? 'done'
    : parallelAgents.some((a) => runningSteps.has(a.key) || outputs[a.key]) ? 'running' : 'pending'
  const phase3Status = p8 >= 100 ? 'done' : p8 > 0 ? 'running' : 'pending'

  const focusedAgent = allAgents.find((a) => a.key === activeAgent) ?? orchAgent

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
              {overall}% · ETA {fmtTime(eta)}
            </div>
          </header>

          <PhaseLabel n={0} label="Ingestão de Documentos" status={phase0Status}/>
          <div className="grid grid-cols-1 gap-2.5 mb-5">
            <AgentRow agent={intakeAgent} pct={p0} active={activeAgent === intakeAgent.key} onClick={() => setActiveAgent(intakeAgent.key)}/>
          </div>

          <PhaseLabel n={1} label="Orquestração" status={phase1Status}/>
          <div className="grid grid-cols-1 gap-2.5 mb-5">
            <AgentRow agent={orchAgent} pct={p1} active={activeAgent === orchAgent.key} onClick={() => setActiveAgent(orchAgent.key)}/>
          </div>

          <PhaseLabel n={2} label="Análises em paralelo" status={phase2Status}/>
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            {parallelAgents.map((a) => (
              <AgentRow key={a.key} agent={a} pct={getAgentPct(a.key, outputs, runningSteps)} active={activeAgent === a.key} onClick={() => setActiveAgent(a.key)}/>
            ))}
          </div>

          <PhaseLabel n={3} label="Veredicto de Maturidade" status={phase3Status}/>
          <div className="grid grid-cols-1 gap-2.5">
            <AgentRow agent={maturAgent} pct={p8} active={activeAgent === maturAgent.key} onClick={() => setActiveAgent(maturAgent.key)}/>
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

          {onReprocess && (
            <button
              onClick={onReprocess}
              className="w-full border border-border hover:bg-surface-2 text-ink-3 hover:text-ink font-medium py-2 rounded-[10px] text-[12px] transition"
            >
              Reprocessar do zero
            </button>
          )}
        </aside>
      </div>
    </div>
  )
}

// ─── DealDetail ───────────────────────────────────────────────────────────────

function DealDetail({
  analise, outputs, status, activeTab, setActiveTab,
  onBack, onRegenerate, runningSteps,
  onReprocessStep, regenCount,
}: {
  analise:          any
  outputs:          Record<string, string>
  status:           string
  activeTab:        string
  setActiveTab:     (k: string) => void
  onBack:           () => void
  onRegenerate:     () => void
  runningSteps:     Set<string>
  onReprocessStep:  (step: string) => void
  regenCount:       number
}) {
  const runningConsolidado = runningSteps.has('relatorio_consolidado')
  const [showPipeline,   setShowPipeline]   = useState(false)
  const [pdfAllLoading,  setPdfAllLoading]  = useState(false)
  const [xlsxLoading,    setXlsxLoading]    = useState(false)
  const [pptxLoading,    setPptxLoading]    = useState(false)
  const [shareUrl,       setShareUrl]       = useState<string | null>(null)
  const [shareCopied,    setShareCopied]    = useState(false)
  const [shareLoading,   setShareLoading]   = useState(false)
  const visibleTabs = DETAIL_TABS.filter((t) => {
    if (t.key === 'fatos')        return !!analise.facts_extracted_at
    if (t.key === 'consistencia') return !!analise.consistency_checked_at
    return !!outputs[t.key]
  })
  const slug = analise.nome_ativo?.replace(/\s+/g, '-') ?? 'analise'

  async function createShareLink() {
    setShareLoading(true)
    try {
      const res  = await fetch('/api/analise/share', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ analiseId: analise.id }),
      })
      const { url } = await res.json()
      setShareUrl(url)
      await navigator.clipboard.writeText(url)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 3000)
    } catch (err) {
      console.error('[share]', err)
    } finally {
      setShareLoading(false)
    }
  }

  async function exportExcel() {
    setXlsxLoading(true)
    try {
      const res  = await fetch(`/api/analise/export-excel?id=${analise.id}`)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${slug}-rr7x.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[export excel]', err)
    } finally {
      setXlsxLoading(false)
    }
  }

  async function exportPptx() {
    setPptxLoading(true)
    try {
      const res  = await fetch(`/api/analise/export-pptx?id=${analise.id}`)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${slug}-rr7x.pptx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[export pptx]', err)
    } finally {
      setPptxLoading(false)
    }
  }

  function downloadAll() {
    const parts = DETAIL_TABS.filter((t) => outputs[t.key])
      .map((t) => `## ${t.label}\n\n${outputs[t.key]}`)
    const blob  = new Blob([parts.join('\n\n---\n\n')], { type: 'text/markdown' })
    const url   = URL.createObjectURL(blob)
    const a     = document.createElement('a')
    a.href      = url
    a.download  = `${slug}-rr7x.md`
    a.click()
  }

  async function exportAllPdf() {
    setPdfAllLoading(true)
    try {
      const { downloadAllPdf } = await import('@/lib/pdf-document')
      const sections = DETAIL_TABS
        .filter((t) => outputs[t.key])
        .map((t) => ({ label: t.label, content: outputs[t.key] }))
      await downloadAllPdf({
        title:    analise.nome_ativo ?? 'Análise',
        tipo:     analise.deal_intake?.tipoAtivo,
        sections,
        filename: `${slug}-rr7x`,
      })
    } catch (err) {
      console.error('[export pdf]', err)
    } finally {
      setPdfAllLoading(false)
    }
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
            <button
              onClick={() => setShowPipeline((v) => !v)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] border text-[13px] font-medium transition
                ${showPipeline ? 'border-accent-strong bg-accent-strong text-white' : 'border-border-strong bg-surface hover:bg-surface-2'}`}
            >
              ⬡ Pipeline
            </button>
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
              <>
                <button
                  onClick={createShareLink}
                  disabled={shareLoading}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] border border-border-strong bg-surface text-[13px] font-medium hover:bg-surface-2 disabled:opacity-50"
                >
                  {shareLoading ? 'Gerando...' : shareCopied ? '✓ Link copiado!' : '↗ Compartilhar'}
                </button>
                <button
                  onClick={exportAllPdf}
                  disabled={pdfAllLoading}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] border border-border-strong bg-surface text-[13px] font-medium hover:bg-surface-2 disabled:opacity-50"
                >
                  {pdfAllLoading ? 'Gerando PDF...' : <><IconDownload size={13}/> PDF completo</>}
                </button>
                <button
                  onClick={exportExcel}
                  disabled={xlsxLoading}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] border border-border-strong bg-surface text-[13px] font-medium hover:bg-surface-2 disabled:opacity-50"
                >
                  {xlsxLoading ? 'Gerando...' : <><IconDownload size={13}/> Excel</>}
                </button>
                <button
                  onClick={exportPptx}
                  disabled={pptxLoading}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] border border-border-strong bg-surface text-[13px] font-medium hover:bg-surface-2 disabled:opacity-50"
                >
                  {pptxLoading ? 'Gerando...' : <><IconDownload size={13}/> PowerPoint</>}
                </button>
                <button
                  onClick={downloadAll}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] bg-accent-strong text-white text-[13px] font-semibold hover:opacity-90"
                >
                  <IconDownload size={13}/> Exportar .md
                </button>
              </>
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

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'fatos' ? (
          <FatosPanel
            analiseId={analise.id}
            factsExtractedAt={analise.facts_extracted_at ?? null}
            onReextract={() => { /* o painel já recarrega internamente */ }}
          />
        ) : activeTab === 'consistencia' ? (
          <ConsistencyPanel analiseId={analise.id}/>
        ) : activeTab && outputs[activeTab] ? (
          <OutputPanel
            label={DETAIL_TABS.find((t) => t.key === activeTab)?.label ?? activeTab}
            content={outputs[activeTab]}
            stepKey={activeTab}
            analiseId={analise.id}
            analiseTitle={analise.nome_ativo ?? 'Análise'}
            analiseTipo={analise.deal_intake?.tipoAtivo}
            onReprocess={() => onReprocessStep(activeTab)}
            isReprocessing={runningSteps.has(activeTab)}
            regenLabel={`Regenerar (${regenCount}/${MAX_REGENERACOES})`}
            regenDisabled={regenCount >= MAX_REGENERACOES || runningSteps.has(activeTab)}
          />
        ) : (
          <div className="bg-surface border border-border rounded-[14px] p-16 text-center shadow-soft-sm">
            <div className="text-ink-3 text-[13px]">Selecione uma aba acima para ver o conteúdo.</div>
          </div>
        )}
        </div>

        {/* Painel lateral de pipeline */}
        <aside className={`border-l border-border bg-surface transition-all duration-200 overflow-hidden ${showPipeline ? 'w-[320px]' : 'w-0'}`}>
          {showPipeline && (
            <div className="p-5 w-[320px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-medium text-[16px]">Pipeline do Deal</h3>
                <button onClick={() => setShowPipeline(false)} className="text-ink-3 hover:text-ink text-[18px] leading-none">×</button>
              </div>
              <DealPipelinePanel analiseId={analise.id}/>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

function OutputPanel({
  label, content, stepKey, analiseId,
  analiseTitle, analiseTipo,
  onReprocess, isReprocessing,
  regenLabel, regenDisabled,
}: {
  label:           string
  content:         string
  stepKey:         string
  analiseId?:      string
  analiseTitle?:   string
  analiseTipo?:    string
  onReprocess?:    () => void
  isReprocessing?: boolean
  regenLabel?:     string
  regenDisabled?:  boolean
}) {
  const FINANCIAL_STEPS = new Set(['diagnostico', 'analise_ma', 'estruturacao'])
  const hasUnverifiedWarning = FINANCIAL_STEPS.has(stepKey) && (
    content.includes('AVISO DE LIMITAÇÃO') ||
    content.includes('AVISO:') ||
    content.includes('Intake declarado') ||
    content.includes('não verificado')
  )

  const [pdfLoading,         setPdfLoading]         = useState(false)
  const [showHistory,        setShowHistory]        = useState(false)
  const [versions,           setVersions]           = useState<{ id: string; version_num: number; criado_em: string }[]>([])
  const [versionsLoading,    setVersionsLoading]    = useState(false)
  const [restoringVersion,   setRestoringVersion]   = useState<string | null>(null)
  const [showNdaModal,       setShowNdaModal]       = useState(false)
  const [ndaEmail,           setNdaEmail]           = useState('')
  const [ndaName,            setNdaName]            = useState('')
  const [ndaSending,         setNdaSending]         = useState(false)
  const [ndaSent,            setNdaSent]            = useState(false)
  // Atestado
  const [showAttest,         setShowAttest]         = useState(false)
  const [attestData,         setAttestData]         = useState<{
    attestation: { version_num: number; attested_email: string; attested_at: string; statement: string } | null
    auditLogs:   { id: string; model_id: string; input_tokens: number; output_tokens: number; context_steps: string[]; external_data: Record<string, boolean>; ran_at: string; duration_ms: number }[]
    statement:   string
  } | null>(null)
  const [attestLoading,      setAttestLoading]      = useState(false)
  const [attesting,          setAttesting]          = useState(false)

  async function loadVersions() {
    if (!analiseId) return
    setVersionsLoading(true)
    try {
      const res  = await fetch(`/api/analise/versions?analiseId=${analiseId}&stepKey=${stepKey}`)
      const data = await res.json()
      setVersions(data.versions ?? [])
    } catch {}
    finally { setVersionsLoading(false) }
  }

  function toggleHistory() {
    if (!showHistory) loadVersions()
    setShowHistory((v) => !v)
  }

  async function loadAttestData() {
    if (!analiseId) return
    setAttestLoading(true)
    try {
      const res  = await fetch(`/api/analise/attest?analiseId=${analiseId}&stepKey=${stepKey}`)
      const data = await res.json()
      setAttestData(data)
    } catch {}
    finally { setAttestLoading(false) }
  }

  function toggleAttest() {
    if (!showAttest) loadAttestData()
    setShowAttest((v) => !v)
  }

  async function createAttestation() {
    if (!analiseId) return
    setAttesting(true)
    try {
      // Usa a versão mais recente disponível (versions já carregadas ou 1)
      const versionNum = versions[0]?.version_num ?? 1
      await fetch('/api/analise/attest', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ analiseId, stepKey, versionNum }),
      })
      await loadAttestData()
    } finally {
      setAttesting(false)
    }
  }

  function downloadMd() {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${stepKey}-rr7x.md`
    a.click()
  }

  async function downloadPdf() {
    setPdfLoading(true)
    try {
      const { downloadStepPdf } = await import('@/lib/pdf-document')
      await downloadStepPdf({
        label,
        content,
        title:    analiseTitle ?? label,
        tipo:     analiseTipo,
        filename: `${stepKey}-rr7x`,
      })
    } catch (err) {
      console.error('[pdf step]', err)
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="bg-surface border border-border rounded-[14px] shadow-soft-sm overflow-hidden">
      <div className="flex items-center justify-between px-7 py-4 border-b border-border">
        <h2 className="font-display text-[18px] font-medium">{label}</h2>
        <div className="flex items-center gap-3">
          {analiseId && (
            <button
              onClick={toggleAttest}
              className={`text-[12px] flex items-center gap-1.5 transition-colors font-medium ${showAttest ? 'text-accent-strong' : attestData?.attestation ? 'text-ok' : 'text-ink-3 hover:text-ink'}`}
            >
              {attestData?.attestation ? '✓ Atestado' : '✍ Atestar revisão'}
            </button>
          )}
          {analiseId && (
            <button
              onClick={toggleHistory}
              className={`text-[12px] flex items-center gap-1.5 transition-colors ${showHistory ? 'text-accent-strong' : 'text-ink-3 hover:text-ink'}`}
            >
              ⏱ Versões
            </button>
          )}
          {onReprocess && (
            <button
              onClick={onReprocess}
              disabled={regenDisabled ?? isReprocessing}
              title={regenDisabled && !isReprocessing ? 'Limite de regenerações atingido. Suba o Deal novamente para uma nova análise.' : undefined}
              className="text-[12px] text-accent-strong hover:opacity-80 flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:text-ink-3 disabled:hover:opacity-100 font-medium"
            >
              {isReprocessing
                ? <span className="animate-pulse">Regenerando...</span>
                : <>✦ {regenLabel ?? 'Regenerar Resumo'}</>}
            </button>
          )}
          <button
            onClick={downloadPdf}
            disabled={pdfLoading}
            className="text-[12px] text-ink-3 hover:text-ink flex items-center gap-1.5 transition-colors disabled:opacity-40"
          >
            <IconDownload size={13}/> {pdfLoading ? 'PDF...' : 'PDF'}
          </button>
          {stepKey === 'contratos' && analiseId && (
            <button
              onClick={() => { setShowNdaModal(true); setNdaSent(false) }}
              className="text-[12px] text-accent-strong hover:opacity-80 flex items-center gap-1.5 transition-colors font-medium"
            >
              ✉ Enviar NDA
            </button>
          )}
          <button
            onClick={downloadMd}
            className="text-[12px] text-ink-3 hover:text-ink flex items-center gap-1.5 transition-colors"
          >
            <IconDownload size={13}/> .md
          </button>
        </div>
      </div>

      {/* Modal de envio de NDA */}
      {showNdaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-surface border border-border rounded-[14px] shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-medium text-[16px]">Enviar NDA por email</h3>
              <button onClick={() => setShowNdaModal(false)} className="text-ink-3 hover:text-ink text-[18px] leading-none">×</button>
            </div>
            {ndaSent ? (
              <div className="text-center py-6">
                <div className="text-ok text-[32px] mb-2">✓</div>
                <p className="font-medium text-[14px]">NDA enviado com sucesso!</p>
                <p className="text-[12px] text-ink-3 mt-1">Email enviado para {ndaEmail}</p>
                <button onClick={() => setShowNdaModal(false)} className="mt-4 px-4 py-2 bg-accent-strong text-white rounded-[8px] text-[13px] font-medium">Fechar</button>
              </div>
            ) : (
              <>
                <p className="text-[13px] text-ink-2 mb-4">O NDA extraído da análise da Clara Cláusula será enviado ao destinatário abaixo.</p>
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-1.5">Email do destinatário *</label>
                    <input
                      type="email"
                      value={ndaEmail}
                      onChange={(e) => setNdaEmail(e.target.value)}
                      placeholder="nome@empresa.com.br"
                      className="w-full px-3 py-2 text-[13px] border border-border rounded-[8px] bg-bg focus:outline-none focus:ring-2 focus:ring-accent-strong/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-1.5">Nome do destinatário</label>
                    <input
                      type="text"
                      value={ndaName}
                      onChange={(e) => setNdaName(e.target.value)}
                      placeholder="Dr. João Silva"
                      className="w-full px-3 py-2 text-[13px] border border-border rounded-[8px] bg-bg focus:outline-none focus:ring-2 focus:ring-accent-strong/30"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowNdaModal(false)}
                    className="flex-1 px-4 py-2 border border-border rounded-[8px] text-[13px] font-medium hover:bg-surface-2"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={!ndaEmail || ndaSending}
                    onClick={async () => {
                      if (!ndaEmail || !analiseId) return
                      setNdaSending(true)
                      try {
                        await fetch('/api/analise/nda-email', {
                          method:  'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body:    JSON.stringify({ analiseId, recipientEmail: ndaEmail, recipientName: ndaName }),
                        })
                        setNdaSent(true)
                      } finally {
                        setNdaSending(false)
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-accent-strong text-white rounded-[8px] text-[13px] font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    {ndaSending ? 'Enviando...' : 'Enviar NDA'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Banner de dados não verificados */}
      {hasUnverifiedWarning && (
        <div className="flex items-start gap-3 px-7 py-3 bg-amber-50 border-b border-amber-200">
          <span className="text-amber-500 text-[15px] mt-0.5 flex-shrink-0">⚠</span>
          <div>
            <p className="text-[12px] font-semibold text-amber-800 leading-none mb-1">Dados financeiros não verificados</p>
            <p className="text-[11.5px] text-amber-700 leading-relaxed">
              Esta análise foi elaborada com base nos dados declarados no intake. Nenhuma verificação independente foi realizada.
              O assessor deve revisar os demonstrativos financeiros reais antes de apresentar números a compradores ou investidores.
            </p>
          </div>
        </div>
      )}

      {/* Painel de atestado / audit trail */}
      {showAttest && (
        <div className="border-b border-border bg-slate-50 px-7 py-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Rastreabilidade — ICVM 598/2018</p>
            {attestLoading && <span className="text-[11px] text-ink-3 animate-pulse">Carregando...</span>}
          </div>

          {attestData && (
            <>
              {/* Atestado existente */}
              {attestData.attestation ? (
                <div className="flex items-start gap-3 bg-ok/5 border border-ok/20 rounded-[8px] p-3 mb-4">
                  <span className="text-ok text-[16px] flex-shrink-0 mt-0.5">✓</span>
                  <div>
                    <p className="text-[12px] font-semibold text-ok">Revisão atestada</p>
                    <p className="text-[11.5px] text-ink-2 mt-0.5">{attestData.attestation.statement}</p>
                    <p className="text-[11px] text-ink-3 mt-1.5">
                      Por <strong>{attestData.attestation.attested_email}</strong> em{' '}
                      {new Date(attestData.attestation.attested_at).toLocaleString('pt-BR')}
                      {' '} · v{attestData.attestation.version_num}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <p className="text-[12px] text-ink-2 mb-3 leading-relaxed">
                    Ao atestar, você declara que leu e revisou este relatório e assume responsabilidade pelo seu uso.
                    Este registro é armazenado com timestamp e IP para fins regulatórios.
                  </p>
                  <div className="bg-surface border border-border rounded-[8px] p-3 mb-3">
                    <p className="text-[11.5px] text-ink-2 italic">&quot;{attestData.statement}&quot;</p>
                  </div>
                  <button
                    onClick={createAttestation}
                    disabled={attesting}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-accent-strong text-white rounded-[8px] text-[12px] font-semibold hover:opacity-90 disabled:opacity-50 transition"
                  >
                    {attesting ? 'Registrando...' : '✍ Assinar e atestar revisão'}
                  </button>
                </div>
              )}

              {/* Audit trail */}
              {attestData.auditLogs.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3 mb-2">Histórico de execuções da IA</p>
                  <div className="space-y-2">
                    {attestData.auditLogs.map((log) => (
                      <div key={log.id} className="bg-surface border border-border rounded-[8px] px-3 py-2.5 text-[11px] text-ink-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-[10px] text-ink-3">{log.model_id}</span>
                          <span className="text-ink-3">{new Date(log.ran_at).toLocaleString('pt-BR')}</span>
                        </div>
                        <div className="flex gap-4 text-[11px]">
                          <span>Entrada: <strong>{(log.input_tokens ?? 0).toLocaleString()}</strong> tokens</span>
                          <span>Saída: <strong>{(log.output_tokens ?? 0).toLocaleString()}</strong> tokens</span>
                          {log.duration_ms && <span>Duração: <strong>{(log.duration_ms / 1000).toFixed(1)}s</strong></span>}
                        </div>
                        {log.context_steps?.length > 0 && (
                          <div className="mt-1 text-[10.5px] text-ink-3">
                            Contexto: {log.context_steps.join(', ')}
                          </div>
                        )}
                        {(log.external_data?.bcb || log.external_data?.cvmCapital || log.external_data?.cvmComps) && (
                          <div className="mt-1 text-[10.5px] text-indigo-500">
                            Dados externos:{' '}
                            {[
                              log.external_data.bcb        && 'BCB',
                              log.external_data.cvmCapital && 'CVM Mercado de Capitais',
                              log.external_data.cvmComps   && 'CVM Comparáveis',
                            ].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Painel de histórico de versões */}
      {showHistory && (
        <div className="border-b border-border bg-bg-tint px-7 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-3">Histórico de versões</p>
          {versionsLoading && <p className="text-[12px] text-ink-3">Carregando...</p>}
          {!versionsLoading && versions.length === 0 && (
            <p className="text-[12px] text-ink-3">Nenhuma versão anterior registrada.</p>
          )}
          {!versionsLoading && versions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {versions.map((v) => (
                <button
                  key={v.id}
                  disabled={restoringVersion === v.id}
                  onClick={async () => {
                    if (!analiseId) return
                    setRestoringVersion(v.id)
                    try {
                      await fetch('/api/analise/versions', {
                        method:  'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body:    JSON.stringify({ analiseId, versionId: v.id }),
                      })
                      window.location.reload()
                    } finally {
                      setRestoringVersion(null)
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-[8px] text-[12px] text-ink-2 hover:bg-surface-2 hover:text-ink transition disabled:opacity-40"
                >
                  v{v.version_num} — {new Date(v.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  {restoringVersion === v.id && ' (restaurando...)'}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
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
      {analiseId && (
        <ClaimsSection analiseId={analiseId} stepKey={stepKey}/>
      )}
    </div>
  )
}
