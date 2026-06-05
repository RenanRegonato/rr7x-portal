'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatDateTimeBR } from '@/lib/format-date'

type Status = 'coberto' | 'parcial' | 'nao_coberto' | 'nao_aplicavel'

interface CoverageItem {
  key:                  string
  label:                string
  status:               Status
  evidencia:            string
  justificativa:        string
  agentes_responsaveis: string[]
}

interface CoverageData {
  tipo_operacao: string
  early_stage?:  boolean
  items:         CoverageItem[]
  resumo:        { coberto: number; parcial: number; nao_coberto: number; nao_aplicavel?: number }
}

const STATUS_CFG: Record<Status, { label: string; icon: string; cls: string }> = {
  coberto:       { label: 'Coberto',        icon: '✓', cls: 'text-ok bg-ok/10 border-ok/30' },
  parcial:       { label: 'Parcial',        icon: '◐', cls: 'text-accent-strong bg-accent-soft border-accent/30' },
  nao_coberto:   { label: 'Não coberto',    icon: '✗', cls: 'text-warn bg-warn/10 border-warn/30' },
  nao_aplicavel: { label: 'Não aplicável',  icon: '–', cls: 'text-ink-3 bg-surface-2 border-border' },
}

const STEP_LABELS: Record<string, string> = {
  orchestration: 'Orquestração do Mandato',
  pesquisa:      'Inteligência de Mercado',
  diagnostico:   'Diagnóstico Financeiro',
  analise_ma:    'Estruturação de M&A',
  kyc:           'KYC & Compliance',
  contratos:     'Due Diligence Jurídica',
  originacao:    'Originação',
  estruturacao:  'Estruturação de Crédito',
  maturidade:    'Validação de Oportunidades',
}

interface CoveragePanelProps {
  analiseId:  string
  onSolicitarAgente: (step: string, briefing: string) => void
}

export default function CoveragePanel({ analiseId, onSolicitarAgente }: CoveragePanelProps) {
  const [data,      setData]      = useState<CoverageData | null>(null)
  const [checkedAt, setCheckedAt] = useState<string | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [rerunning, setRerunning] = useState(false)
  const [erro,      setErro]      = useState('')

  const load = useCallback(async () => {
    setLoading(true); setErro('')
    try {
      const r = await fetch(`/api/analise/${analiseId}/coverage-check`, { cache: 'no-store' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Erro')
      setData(d.coverage_check ?? null)
      setCheckedAt(d.coverage_checked_at ?? null)
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [analiseId])

  useEffect(() => { void load() }, [load])

  async function rerun() {
    setRerunning(true)
    try {
      const r = await fetch(`/api/analise/${analiseId}/coverage-check`, { method: 'POST' })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        alert(d.error || 'Erro')
        return
      }
      await load()
    } finally {
      setRerunning(false)
    }
  }

  if (loading) return <div className="text-ink-3 text-[13px] py-10 text-center">Carregando cobertura...</div>
  if (erro)    return <div className="rounded-[10px] bg-warn/10 text-warn text-[13px] p-4">{erro}</div>

  if (!data) {
    return (
      <div className="bg-surface border border-border rounded-[14px] p-8 text-center">
        <p className="text-[13px] text-ink-3">Validação de cobertura ainda não rodou para esta análise.</p>
        <button
          onClick={rerun}
          disabled={rerunning}
          className="mt-3 bg-ink text-bg px-4 py-2 rounded-[8px] text-[13px] font-semibold disabled:opacity-50"
        >
          {rerunning ? 'Validando...' : 'Validar cobertura agora'}
        </button>
      </div>
    )
  }

  const { items, resumo, tipo_operacao, early_stage } = data
  const total = items.length
  const naoAplicavel = resumo.nao_aplicavel ?? 0

  return (
    <div className="bg-surface border border-border rounded-[14px] shadow-soft-sm overflow-hidden">
      <div className="flex items-center justify-between px-7 py-4 border-b border-border">
        <div>
          <h2 className="font-display text-[18px] font-medium">Cobertura da análise</h2>
          <p className="text-[11px] text-ink-3 mt-0.5">
            Tipo: <span className="font-mono">{tipo_operacao}</span> ·
            {' '}<span className="text-ok">{resumo.coberto} cobertos</span>
            {' '}/ <span className="text-accent-strong">{resumo.parcial} parciais</span>
            {' '}/ <span className="text-warn">{resumo.nao_coberto} não cobertos</span>
            {naoAplicavel > 0 && <>{' '}/ <span className="text-ink-3">{naoAplicavel} não aplicáveis</span></>}
            {' '}de {total}
            {checkedAt && ` · ${formatDateTimeBR(checkedAt, { second: '2-digit' })}`}
          </p>
        </div>
        <button
          onClick={rerun}
          disabled={rerunning}
          className="text-[12px] text-ink-3 hover:text-ink disabled:opacity-40"
        >
          {rerunning ? 'Validando...' : '↺ Re-validar'}
        </button>
      </div>

      {early_stage && (
        <div className="mx-7 mt-5 rounded-[10px] border border-border bg-surface-2 px-4 py-3">
          <p className="text-[12px] text-ink-2 leading-relaxed">
            <span className="font-semibold text-ink">Operação em estágio inicial.</span>{' '}
            Por se tratar de um projeto pré-operacional, sem histórico operacional consolidado,
            os itens de demonstrativos financeiros históricos (DRE, balancete, DFRE, EBITDA histórico)
            estão marcados como <span className="text-ink">não aplicáveis</span> e não penalizam a cobertura.
            A avaliação prioriza estrutura proposta, projeções e potencial econômico.
          </p>
        </div>
      )}

      <div className="p-7 space-y-2">
        {items.map((it) => {
          const cfg = STATUS_CFG[it.status]
          return (
            <div key={it.key} className="rounded-[10px] border border-border bg-bg p-4">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${cfg.cls}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                    <span className="font-medium text-[14px]">{it.label}</span>
                  </div>
                  {it.evidencia && (
                    <div className="text-[12px] text-ink-2 mt-1.5">
                      <span className="text-ink-3 font-medium uppercase tracking-wider text-[10px]">Evidência: </span>
                      {it.evidencia}
                    </div>
                  )}
                  {it.justificativa && (
                    <div className="text-[12px] text-ink-3 mt-1">{it.justificativa}</div>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {it.agentes_responsaveis.map(s => (
                      <span key={s} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-2 text-ink-2 border border-border">
                        {STEP_LABELS[s] ?? s}
                      </span>
                    ))}
                  </div>
                </div>
                {(it.status === 'nao_coberto' || it.status === 'parcial') && it.agentes_responsaveis.length > 0 && (
                  <button
                    onClick={() => onSolicitarAgente(
                      it.agentes_responsaveis[0],
                      `Cobertura insuficiente para o item "${it.label}". ${it.justificativa} Por favor, aprofunde esse ponto com dados concretos.`
                    )}
                    className="text-[11px] text-accent-strong hover:underline shrink-0"
                  >
                    ✦ Solicitar regeneração
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
