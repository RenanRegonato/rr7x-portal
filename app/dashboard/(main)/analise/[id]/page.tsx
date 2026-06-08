'use client'

import { useEffect, useState, useRef, useMemo, type ReactNode } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Topbar from '@/components/Topbar'
import AgentRow, { type AgentDef } from '@/components/AgentRow'
import AgentMark from '@/components/AgentMark'
import PhaseLabel from '@/components/PhaseLabel'
import LiveLog, { type LogLine } from '@/components/LiveLog'
import Pill from '@/components/Pill'
import { IconDownload, IconCheck, IconClock, IconArrowRight } from '@/components/Icons'
import { formatDateTimeBR } from '@/lib/format-date'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import DealPipelinePanel from '@/components/DealPipelinePanel'
import RegenerarModal from '@/components/RegenerarModal'
import CascadeImpactoModal from '@/components/CascadeImpactoModal'
import FatosPanel from '@/components/FatosPanel'
import ClaimsSection from '@/components/ClaimsSection'
import ConsistencyPanel from '@/components/ConsistencyPanel'
import MesaVerdictBanner from '@/components/MesaVerdictBanner'
import AnaliseCustoCard from '@/components/AnaliseCustoCard'
import DealAlertas from '@/components/DealAlertas'
import CoveragePanel from '@/components/CoveragePanel'
import { FERRANTE_PENDING_NOTE, parseFerranteResult, type FerranteResult, type Severidade } from '@/lib/reforma-tributaria/result'

const MAX_REGENERACOES = 3

const STEP_LABELS_MAP: Record<string, string> = {
  orchestration:         'Orquestração do Mandato',
  pesquisa:              'Inteligência de Mercado',
  diagnostico:           'Diagnóstico Financeiro',
  analise_ma:            'Estruturação de M&A',
  kyc:                   'KYC & Compliance',
  contratos:             'Due Diligence Jurídica',
  originacao:            'Originação',
  estruturacao:          'Estruturação de Crédito',
  maturidade:            'Validação de Oportunidades',
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
  { key: 'orchestration', name: 'Orquestração do Mandato',   role: 'Deal Orchestrator',           color: 'peach', initial: 'OM', deliverable: 'Deal Readiness Score + ativação dos especialistas' },
  { key: 'pesquisa',      name: 'Inteligência de Mercado',   role: 'Market Intelligence',          color: 'sky',   initial: 'IM', deliverable: 'Pesquisa mercadológica e benchmarks' },
  { key: 'diagnostico',   name: 'Diagnóstico Financeiro',    role: 'Financial Diligence',          color: 'sage',  initial: 'DF', deliverable: 'DRE, fluxo de caixa, valuation, EBITDA normalizado' },
  { key: 'analise_ma',    name: 'Estruturação de M&A',       role: 'M&A Advisory',                 color: 'sand',  initial: 'MA', deliverable: 'Tese de M&A e estrutura da transação' },
  { key: 'contratos',     name: 'Due Diligence Jurídica',    role: 'Legal & Contracts',            color: 'lilac', initial: 'DD', deliverable: 'NDA, SHA, LOI, passivos jurídicos' },
  { key: 'originacao',    name: 'Originação',                role: 'Deal Origination',             color: 'cream', initial: 'OR', deliverable: 'Estratégia de posicionamento, perfil de compradores e pipeline de originação' },
  { key: 'estruturacao',  name: 'Estruturação de Crédito',   role: 'Structured Credit',            color: 'sage',  initial: 'EC', deliverable: 'Ranking de operações de crédito estruturado' },
  { key: 'kyc',           name: 'KYC & Compliance',          role: 'KYC & Compliance',             color: 'peach', initial: 'KC', deliverable: 'Screening KYC, PEP, red flags regulatórios e compliance documental' },
  { key: 'maturidade',    name: 'Validação de Oportunidades', role: 'Deal Readiness',              color: 'sand',  initial: 'VO', deliverable: 'Veredicto de Maturidade único + roadmap de preparação' },
]

const INTAKE_AGENT: AgentDef = {
  key: 'drive_intake', name: 'Ingestão & Triagem Documental', role: 'Document Intake',
  color: 'sand', initial: 'IT', deliverable: 'Leitura e diagnóstico dos documentos enviados',
}

const DETAIL_TABS = [
  { key: 'relatorio_consolidado', label: 'Resumo Executivo' },
  { key: 'consistencia',          label: 'Consistência'     },
  { key: 'cobertura',             label: 'Cobertura'        },
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
  { key: 'reforma_tributaria',    label: 'Adequação Tributária' },
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

// ─── Branding / meta do PDF ─────────────────────────────────────────────────────

type Branding = { nome: string; logoUrl: string | null; tagline: string | null; site: string | null; cidadeUf: string | null }

function clip(s: string, n: number) {
  const t = s.trim()
  return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t
}

function stripMd(s: string) {
  return s
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[.*?\]\(.*?\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_`|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Resumo executivo da capa: primeiros parágrafos do relatório consolidado
// (já humanizado pela diretriz de escrita), com fallback para o intake.
function deriveResumo(outputs: Record<string, string>, di: Record<string, string>): string | undefined {
  let base = ''
  const consolidated = outputs?.relatorio_consolidado
  if (consolidated) {
    const out: string[] = []
    for (const raw of consolidated.split('\n')) {
      const t = raw.trim()
      if (!t || /^#{1,6}\s/.test(t)) { if (out.length) break; else continue }
      if (/^[|>\-*+]/.test(t) || /^\d+\.\s/.test(t)) { if (out.length) break; else continue }
      out.push(t)
      if (out.join(' ').length > 340) break
    }
    base = out.join(' ')
  }
  if (!base) base = di?.resumoAtivo ?? ''
  if (!base) base = di?.objetivo ?? ''
  base = stripMd(base)
  if (!base) return undefined
  const LIMIT = 300
  if (base.length > LIMIT) {
    const cut     = base.slice(0, LIMIT)
    const lastDot = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '))
    base = lastDot > 140 ? cut.slice(0, lastDot + 1) : cut.trimEnd() + '…'
  }
  return base
}

function buildPdfMeta(branding: Branding | null, di: Record<string, string>, outputs: Record<string, string>) {
  return {
    escritorio:  branding,
    objetivo:    di?.objetivo        ? clip(di.objetivo, 48)    : undefined,
    ticket:      di?.ticketEstimado  || undefined,
    estagio:     di?.estagio         || undefined,
    localizacao: di?.localizacao     ? clip(di.localizacao, 36) : undefined,
    resumo:      deriveResumo(outputs, di ?? {}),
  }
}

// ─── Navegação por seção (menu lateral / âncoras) ───────────────────────────────

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Extrai texto puro dos filhos renderizados pelo ReactMarkdown (para gerar o id da âncora).
function nodeText(node: unknown): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join('')
  if (typeof node === 'object' && 'props' in node) {
    return nodeText((node as { props?: { children?: unknown } }).props?.children)
  }
  return ''
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
  const pollRef          = useRef<ReturnType<typeof setInterval> | null>(null)

  // Ingestão assíncrona (Fase 13): pipeline só inicia quando fact_bank está pronto.
  // Se a análise foi criada antes da Fase 13 (sem ingest disparado), status fica 'idle'
  // e o fluxo legado roda transparentemente — drive_intake lê PDFs do Storage.
  const [ingestStatus, setIngestStatus] = useState<'unknown' | 'idle' | 'in_progress' | 'completed' | 'failed'>('unknown')
  const [ingestProgress, setIngestProgress] = useState<{ total: number; completed: number; failed: number; percent: number }>({ total: 0, completed: 0, failed: 0, percent: 0 })

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

  // ── Pipeline agora roda 100% server-side (Inngest) ──────────────────────────
  // Esta página apenas (a) garante que o pipeline server-side está rodando
  // disparando /run UMA vez, e (b) faz polling de analise-status pra refletir
  // status + outputs conforme cada agente conclui no servidor. Não dirige mais
  // a sequência no navegador (não é mais frágil a F5/troca de aba), e o gestor
  // também consegue acompanhar (sem 403).

  // Garante o pipeline server-side rodando — dispara /run só uma vez por montagem.
  async function ensureServerPipeline(mode: 'continuar' | 'reprocessar' = 'continuar') {
    if (pipelineStarted.current && mode === 'continuar') return
    pipelineStarted.current = true
    try {
      await fetch(`/api/analise/${id}/run`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mode }),
      })
      addLog('Orquestrador', mode === 'reprocessar' ? 'Pipeline reiniciado no servidor...' : 'Pipeline em execução no servidor...')
    } catch (err) {
      console.error('[run pipeline]', err)
    }
  }

  // Polling: refaz analise-status periodicamente enquanto 'processando'.
  // Atualiza status + outputs pra re-renderizar o progresso. Para quando concluir/erro.
  function startPolling() {
    if (pollRef.current) return
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/analise-status?id=${id}`)
        if (!r.ok) return
        const d = await r.json()
        if (!d) return
        setAnalise(d)
        const nextOutputs = (d.outputs ?? {}) as Record<string, string>
        setOutputs(nextOutputs)
        if (d.status && d.status !== 'processando') {
          setStatus(d.status)
          if (d.status === 'concluido') setActiveTab('relatorio_consolidado')
          stopPolling()
        }
      } catch (err) {
        console.error('[poll status]', err)
      }
    }, 5000)
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  useEffect(() => () => stopPolling(), [])

  async function reprocessar() {
    pipelineStarted.current = false
    setOutputs({})
    setLogLines([])
    setElapsed(0)
    setStatus('processando')
    startTime.current = Date.now()
    await ensureServerPipeline('reprocessar')
    startPolling()
  }

  async function continuar() {
    pipelineStarted.current = false
    setLogLines([])
    setElapsed(0)
    setStatus('processando')
    startTime.current = Date.now()
    await ensureServerPipeline('continuar')
    startPolling()
  }

  async function reprocessStep(step: string) {
    try {
      await runStep(step)
    } catch (err) {
      console.error('[reprocess step]', err)
    }
  }

  useEffect(() => {
    let cancelled = false
    let pollTimer: ReturnType<typeof setTimeout> | null = null

    async function checkIngestionAndMaybeRun(data: { status: string; deal_intake?: { objetivo?: string }; outputs?: Record<string, string> }) {
      // O pipeline roda 100% server-side (Inngest). Ao abrir a página:
      // - 'processando': garante que o pipeline server-side está rodando (dispara
      //   /run UMA vez — idempotente: o orquestrador pula steps já concluídos) e
      //   começa o polling de status pra refletir o progresso. Resiliente a
      //   F5/troca de aba e visível pro gestor (sem 403).
      // - 'erro': NÃO auto-dispara; a tela de erro oferece os botões
      //   Continuar/Reprocessar (que chamam /run explicitamente).
      function maybeResume() {
        if (data.status === 'processando') {
          startTime.current = Date.now()
          void ensureServerPipeline('continuar')
          startPolling()
        }
      }

      try {
        const r = await fetch(`/api/analise/${id}/ingest/status`)
        if (!r.ok) {
          // Endpoint pode não existir em ambientes antigos — fallback ao fluxo legado
          setIngestStatus('idle')
          maybeResume()
          return
        }
        const stat = await r.json() as {
          status: 'idle' | 'in_progress' | 'completed' | 'failed'
          fact_bank_ready: boolean
          progress: { total: number; completed: number; failed: number; percent: number }
        }
        if (cancelled) return
        setIngestStatus(stat.status)
        setIngestProgress(stat.progress)

        if (stat.status === 'in_progress') {
          // Aguarda — não inicia pipeline ainda
          pollTimer = setTimeout(() => checkIngestionAndMaybeRun(data), 5000)
          return
        }

        // idle (sem ingestão registrada — análise antiga) OU completed OU failed:
        // pipeline pode rodar. Se idle/failed: drive_intake usa fluxo legado (re-lê PDFs).
        maybeResume()
      } catch (e) {
        console.error('[ingest status]', e)
        setIngestStatus('idle')
        maybeResume()
      }
    }

    async function init() {
      const res  = await fetch(`/api/analise-status?id=${id}`)
      const data = await res.json()
      if (cancelled) return
      setAnalise(data)
      setStatus(data.status)
      setRegenCount(Number(data.regeneracoes_count ?? 0))
      const existing = (data.outputs ?? {}) as Record<string, string>
      setOutputs(existing)

      if (existing.relatorio_consolidado) setActiveTab('relatorio_consolidado')

      await checkIngestionAndMaybeRun(data)
    }
    init()

    return () => {
      cancelled = true
      if (pollTimer) clearTimeout(pollTimer)
    }
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

  // Bloqueia a UI principal enquanto a ingestão assíncrona está rodando.
  // O pipeline só inicia quando fact_bank está pronto — economiza tokens em long-context.
  if (ingestStatus === 'in_progress') {
    return (
      <div className="flex-1 flex flex-col">
        <Topbar
          variant="context"
          title={analise.nome_ativo}
          badge={{ label: 'Processando documentos', kind: 'live' }}
        />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-surface border border-border rounded-[14px] p-8 shadow-soft-sm text-center">
            <div className="w-12 h-12 rounded-full bg-accent-soft flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📄</span>
            </div>
            <h2 className="font-display text-[20px] mb-2 text-ink">Lendo os documentos</h2>
            <p className="text-[14px] text-ink-3 leading-relaxed mb-6">
              O sistema está extraindo e estruturando o conteúdo de cada arquivo. Isso garante que 100% dos documentos sejam lidos, sem cortar nada, antes do pipeline de análise começar.
            </p>
            <div className="bg-bg-tint border border-border rounded-[10px] p-4 text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] text-ink-2 font-semibold">Progresso</span>
                <span className="text-[12px] text-ink-2 tabular-nums">{ingestProgress.completed + ingestProgress.failed} / {ingestProgress.total}</span>
              </div>
              <div className="h-2 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-accent transition-all" style={{ width: `${ingestProgress.percent}%` }} />
              </div>
              {ingestProgress.failed > 0 && (
                <p className="mt-3 text-[11px] text-warn">{ingestProgress.failed} arquivo(s) com erro. A análise segue mesmo assim.</p>
              )}
            </div>
            <p className="mt-6 text-[11px] text-ink-3">
              Você pode fechar essa aba. Vamos te avisar por email quando estiver pronto.
            </p>
          </div>
        </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5">
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
  const [branding,       setBranding]       = useState<Branding | null>(null)

  useEffect(() => {
    let active = true
    fetch(`/api/analise/branding?id=${analise.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (active && d) setBranding(d.escritorio ?? null) })
      .catch(() => {})
    return () => { active = false }
  }, [analise.id])

  const pdfMeta = buildPdfMeta(branding, analise.deal_intake ?? {}, outputs)

  const visibleTabs = DETAIL_TABS.filter((t) => {
    if (t.key === 'fatos')        return !!analise.facts_extracted_at
    if (t.key === 'consistencia') return !!analise.consistency_checked_at
    if (t.key === 'cobertura')    return !!analise.coverage_checked_at
    // Adequação Tributária (Ferrante): aba visível só se o módulo foi ativado na
    // abertura (opt-in), mesmo antes de existir output (mostra status/pendente).
    if (t.key === 'reforma_tributaria') {
      const rt = analise.deal_intake?.reformaTributaria
      return rt === 'diagnosticar' || rt === 'possui'
    }
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
      const res = await fetch(`/api/analise/export-excel?id=${analise.id}`)
      if (!res.ok) throw new Error(`status ${res.status}`)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${slug}-rr7x.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[export excel]', err)
      alert('Não foi possível gerar o Excel. Tente novamente em alguns instantes.')
    } finally {
      setXlsxLoading(false)
    }
  }

  async function exportPptx() {
    setPptxLoading(true)
    try {
      const res = await fetch(`/api/analise/export-pptx?id=${analise.id}`)
      if (!res.ok) throw new Error(`status ${res.status}`)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${slug}-rr7x.pptx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[export pptx]', err)
      alert('Não foi possível gerar o PowerPoint. Tente novamente em alguns instantes.')
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
      const sections = DETAIL_TABS
        .filter((t) => outputs[t.key])
        .map((t) => ({ label: t.label, content: outputs[t.key] }))
      if (sections.length === 0) {
        alert('Ainda não há seções concluídas para exportar. Aguarde o processamento das análises.')
        return
      }
      const { downloadAllPdf } = await import('@/lib/pdf-document')
      await downloadAllPdf({
        title:    analise.nome_ativo ?? 'Análise',
        tipo:     analise.deal_intake?.tipoAtivo,
        sections,
        meta:     pdfMeta,
        filename: `${slug}-mandor`,
      })
    } catch (err) {
      console.error('[export pdf]', err)
      alert('Não foi possível gerar o PDF. Tente novamente em alguns instantes.')
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
        <DealAlertas analiseId={analise.id}/>
        <AnaliseCustoCard analiseId={analise.id}/>
        {activeTab === 'fatos' ? (
          <FatosPanel
            analiseId={analise.id}
            factsExtractedAt={analise.facts_extracted_at ?? null}
            onReextract={() => { /* o painel já recarrega internamente */ }}
          />
        ) : activeTab === 'consistencia' ? (
          <ConsistencyPanel analiseId={analise.id}/>
        ) : activeTab === 'cobertura' ? (
          <CoveragePanel
            analiseId={analise.id}
            onSolicitarAgente={(step) => {
              setActiveTab(step)
              onReprocessStep(step)
            }}
          />
        ) : activeTab === 'reforma_tributaria' ? (
          <ReformaTributariaTab
            estado={analise.deal_intake?.reformaTributaria}
            output={outputs.reforma_tributaria}
          />
        ) : activeTab && outputs[activeTab] ? (
          <>
            {activeTab === 'relatorio_consolidado' && analise.mesa_revisao && (
              <MesaVerdictBanner mesa={analise.mesa_revisao} checkedAt={analise.mesa_revisao_at}/>
            )}
          <OutputPanel
            label={DETAIL_TABS.find((t) => t.key === activeTab)?.label ?? activeTab}
            content={outputs[activeTab]}
            stepKey={activeTab}
            analiseId={analise.id}
            analiseTitle={analise.nome_ativo ?? 'Análise'}
            analiseTipo={analise.deal_intake?.tipoAtivo}
            pdfMeta={pdfMeta}
            onReprocess={() => onReprocessStep(activeTab)}
            isReprocessing={runningSteps.has(activeTab)}
            regenLabel={`Regenerar (${regenCount}/${MAX_REGENERACOES})`}
            regenDisabled={regenCount >= MAX_REGENERACOES || runningSteps.has(activeTab)}
          />
          </>
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

// ─── Adequação à Reforma Tributária (Ferrante) ──────────────────────────────────

function rtSevCls(sev: Severidade): string {
  if (sev === 'critico' || sev === 'alto') return 'text-warn border-warn/40 bg-warn/5'
  if (sev === 'medio')                      return 'text-accent-strong border-accent-strong/30 bg-accent-soft'
  return 'text-ink-3 border-border bg-surface-2'
}
const RT_SEV_LABEL: Record<Severidade, string> = { critico: 'Crítico', alto: 'Alto', medio: 'Médio', baixo: 'Baixo' }
function rtScoreCls(score: number): string {
  if (score >= 70) return 'text-ok'
  if (score >= 40) return 'text-accent-strong'
  return 'text-warn'
}

function RtBadge({ sev }: { sev: Severidade }) {
  return <span className={`text-[10px] font-semibold uppercase tracking-wide border rounded px-1.5 py-0.5 shrink-0 ${rtSevCls(sev)}`}>{RT_SEV_LABEL[sev] ?? sev}</span>
}
function RtSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-[14px] p-6 shadow-soft-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3 mb-3">{title}</p>
      {children}
    </div>
  )
}

function ReformaTributariaTab({ estado, output }: { estado?: string; output?: string }) {
  const header = (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-[15px] font-display font-medium text-ink">Adequação à Reforma Tributária</span>
      <span className="text-[9px] font-semibold uppercase tracking-wide text-accent-strong border border-accent-strong/40 rounded px-1.5 py-0.5">Premium</span>
    </div>
  )

  if (estado === 'possui') return (
    <div className="bg-surface border border-border rounded-[14px] p-8 shadow-soft-sm">
      {header}
      <p className="text-[13px] text-ink-2 leading-relaxed">
        Este ativo foi marcado como <strong>já adequado</strong> à Reforma Tributária na abertura da análise. Nenhum diagnóstico foi gerado.
      </p>
    </div>
  )

  if (!output) return (
    <div className="bg-surface border border-border rounded-[14px] p-8 shadow-soft-sm">
      {header}
      <p className="text-[13px] text-ink-3 leading-relaxed">{FERRANTE_PENDING_NOTE}</p>
    </div>
  )

  const r = parseFerranteResult(output)
  if (!r) return (
    <div className="bg-surface border border-border rounded-[14px] p-8 shadow-soft-sm">
      {header}
      <p className="text-[13px] text-warn mb-3">Não foi possível estruturar o diagnóstico. Conteúdo bruto abaixo.</p>
      <pre className="text-[12px] text-ink-2 whitespace-pre-wrap bg-surface-2 rounded-[10px] p-4 overflow-auto">{output}</pre>
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="bg-surface border border-border rounded-[14px] p-8 shadow-soft-sm">
        {header}
        <div className="flex items-baseline gap-3 mb-4">
          <span className={`text-[40px] font-display font-semibold leading-none ${rtScoreCls(r.conformidade_score)}`}>{r.conformidade_score}</span>
          <span className="text-[13px] text-ink-3">/ 100 · conformidade tributária (preliminar)</span>
        </div>
        {r.resumo_executivo && <p className="text-[13px] text-ink-2 leading-relaxed">{r.resumo_executivo}</p>}
      </div>

      {r.riscos.length > 0 && (
        <RtSection title="Riscos fiscais">
          <ul className="space-y-2.5">
            {r.riscos.map((risco, i) => (
              <li key={i} className="border border-border rounded-[10px] p-3.5">
                <div className="flex items-center gap-2 mb-1">
                  <RtBadge sev={risco.severidade}/>
                  <span className="text-[13px] font-medium text-ink">{risco.titulo}</span>
                </div>
                <p className="text-[12px] text-ink-2 leading-relaxed">{risco.descricao}</p>
                {risco.fundamento && <p className="text-[11px] text-ink-3 mt-1">Fundamento: {risco.fundamento}</p>}
              </li>
            ))}
          </ul>
        </RtSection>
      )}

      {r.pontos_criticos_captacao.length > 0 && (
        <RtSection title="Pontos críticos para captação / M&A / crédito">
          <ul className="list-disc pl-5 space-y-1.5">
            {r.pontos_criticos_captacao.map((p, i) => <li key={i} className="text-[13px] text-ink-2 leading-relaxed">{p}</li>)}
          </ul>
        </RtSection>
      )}

      {r.impactos_operacionais.length > 0 && (
        <RtSection title="Impactos no modelo operacional">
          <ul className="list-disc pl-5 space-y-1.5">
            {r.impactos_operacionais.map((p, i) => <li key={i} className="text-[13px] text-ink-2 leading-relaxed">{p}</li>)}
          </ul>
        </RtSection>
      )}

      {r.oportunidades.length > 0 && (
        <RtSection title="Oportunidades">
          <ul className="list-disc pl-5 space-y-1.5">
            {r.oportunidades.map((p, i) => <li key={i} className="text-[13px] text-ink-2 leading-relaxed">{p}</li>)}
          </ul>
        </RtSection>
      )}

      {r.recomendacoes.length > 0 && (
        <RtSection title="Recomendações">
          <ul className="space-y-2">
            {r.recomendacoes.map((rec, i) => (
              <li key={i} className="flex items-start gap-2">
                <RtBadge sev={rec.prioridade}/>
                <span className="text-[13px] text-ink-2 leading-relaxed"><strong className="text-ink">{rec.titulo}.</strong> {rec.acao}</span>
              </li>
            ))}
          </ul>
        </RtSection>
      )}

      {r.checklist_adequacao.length > 0 && (
        <RtSection title="Checklist de adequação">
          <ul className="space-y-1.5">
            {r.checklist_adequacao.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px]">
                <span className="shrink-0">{c.status === 'ok' ? '✅' : c.status === 'pendente' ? '⛔' : '➖'}</span>
                <span className="text-ink-2 leading-relaxed">{c.item}{c.observacao ? <span className="text-ink-3"> — {c.observacao}</span> : null}</span>
              </li>
            ))}
          </ul>
        </RtSection>
      )}

      <p className="text-[11px] text-ink-3 leading-relaxed border-t border-border pt-3">
        Diagnóstico preliminar gerado por IA com base na EC 132/2023. A Reforma depende de leis complementares ainda em regulamentação; não constitui parecer jurídico-tributário.
      </p>
    </div>
  )
}

function OutputPanel({
  label, content, stepKey, analiseId,
  analiseTitle, analiseTipo, pdfMeta,
  onReprocess, isReprocessing,
  regenLabel, regenDisabled,
}: {
  label:           string
  content:         string
  stepKey:         string
  analiseId?:      string
  analiseTitle?:   string
  analiseTipo?:    string
  pdfMeta?:        ReturnType<typeof buildPdfMeta>
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

  // Sumário navegável da seção: extrai headings (## e ###) do markdown para o menu lateral.
  const headings = useMemo(() => {
    const out: { level: number; text: string; slug: string }[] = []
    for (const line of content.split('\n')) {
      const m = line.match(/^(#{2,3})\s+(.+)/)
      if (!m) continue
      const text = m[2].replace(/[*_`]/g, '').trim()
      if (text) out.push({ level: m[1].length, text, slug: slugify(text) })
    }
    return out
  }, [content])

  const [activeHeading, setActiveHeading] = useState('')
  useEffect(() => {
    if (headings.length < 3) return
    const els = headings
      .map((h) => document.getElementById(h.slug))
      .filter((el): el is HTMLElement => !!el)
    if (!els.length) return
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (vis[0]) setActiveHeading(vis[0].target.id)
      },
      { rootMargin: '-90px 0px -70% 0px', threshold: 0 },
    )
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [headings])

  function jumpTo(slug: string) {
    document.getElementById(slug)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveHeading(slug)
  }

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
        meta:     pdfMeta,
        filename: `${stepKey}-mandor`,
      })
    } catch (err) {
      console.error('[pdf step]', err)
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="flex gap-6 items-start">
      <div className="flex-1 min-w-0 bg-surface border border-border rounded-[14px] shadow-soft-sm overflow-hidden">
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
                <p className="text-[13px] text-ink-2 mb-4">O NDA extraído da análise da Due Diligence Jurídica será enviado ao destinatário abaixo.</p>
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
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Rastreabilidade (ICVM 598/2018)</p>
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
                      {formatDateTimeBR(attestData.attestation.attested_at, { second: '2-digit' })}
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
                          <span className="text-ink-3">{formatDateTimeBR(log.ran_at, { second: '2-digit' })}</span>
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
                  v{v.version_num} — {formatDateTimeBR(v.criado_em, { year: undefined, hour: '2-digit', minute: '2-digit' })}
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
            h1: ({ children }) => <h1 id={slugify(nodeText(children))} className="scroll-mt-6 font-display text-[24px] font-medium tracking-tight mt-6 mb-3 text-ink">{children}</h1>,
            h2: ({ children }) => <h2 id={slugify(nodeText(children))} className="scroll-mt-6 font-display text-[20px] font-medium tracking-tight mt-5 mb-2.5 text-ink">{children}</h2>,
            h3: ({ children }) => <h3 id={slugify(nodeText(children))} className="scroll-mt-6 text-[15px] font-semibold mt-4 mb-2 text-ink">{children}</h3>,
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
      {headings.length >= 3 && (
        <nav className="hidden xl:block w-60 shrink-0 sticky top-4 self-start max-h-[calc(100vh-110px)] overflow-y-auto pb-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3 mb-2.5 px-3">Nesta seção</p>
          <ul className="border-l border-border">
            {headings.map((h) => (
              <li key={h.slug}>
                <button
                  type="button"
                  onClick={() => jumpTo(h.slug)}
                  className={`block w-full text-left py-1.5 leading-snug border-l-2 -ml-px transition-colors ${h.level === 3 ? 'pl-6 text-[11.5px]' : 'pl-3 text-[12px]'} ${activeHeading === h.slug ? 'border-accent-strong text-accent-strong font-medium' : 'border-transparent text-ink-3 hover:text-ink hover:border-border-strong'}`}
                >
                  {h.text}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}
