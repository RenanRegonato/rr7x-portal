'use client'

import { useEffect, useState } from 'react'

// Card "Custo desta análise" — COGS de LLM acumulado do deal, agregado do
// llm_usage_log. Auto-gated: o endpoint /custo responde 403 para não-admin,
// e neste caso o card simplesmente não renderiza (esconde de clientes).

interface ByStep { context: string; step: string; cost_usd: number; calls: number }
interface CustoData {
  has_data:           boolean
  cost_usd:           number
  cost_brl:           number
  usd_brl_rate:       number
  calls:              number
  cache_hit_rate_pct: number
  by_step:            ByStep[]
}

// Nomenclatura de mercado dos agentes/steps (espelha coverage-check/step route).
const STEP_LABELS: Record<string, string> = {
  drive_intake:         'Ingestão de Documentos',
  orchestration:        'Orquestração do Mandato',
  pesquisa:             'Inteligência de Mercado',
  diagnostico:          'Diagnóstico Financeiro',
  analise_ma:           'Estruturação de M&A',
  kyc:                  'KYC & Compliance',
  contratos:            'Due Diligence Jurídica',
  originacao:           'Originação',
  estruturacao:         'Estruturação de Crédito',
  maturidade:           'Validação de Oportunidades',
  revisao:              'Auditoria de Qualidade',
  relatorio_consolidado:'Resumo Executivo',
  coverage_check:       'Cobertura',
  consistency_check:    'Consistência',
  risk_correlation:     'Correlação de Riscos',
  mesa_revisao:         'Mesa de Revisão',
  chunk_fact_extract:   'Extração de Fatos',
  consolidate_fact_bank:'Consolidação de Fatos',
}

const CONTEXT_LABELS: Record<string, string> = {
  analise_pipeline: 'Pipeline',
  ingestion:        'Ingestão',
  validators:       'Validadores',
  invest_match:     'Invest Match',
}

function fmtUSD(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function AnaliseCustoCard({ analiseId }: { analiseId: string }) {
  const [data, setData] = useState<CustoData | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let alive = true
    fetch(`/api/analise/${analiseId}/custo`)
      .then(async (r) => {
        if (r.status === 403) { if (alive) setForbidden(true); return null }
        if (!r.ok) return null
        return r.json()
      })
      .then((d) => { if (alive && d) setData(d as CustoData) })
      .catch(() => {})
    return () => { alive = false }
  }, [analiseId])

  // Não-admin, erro, ou deal sem nenhuma chamada registrada: não mostra nada.
  if (forbidden || !data || !data.has_data) return null

  const stepLabel = (s: ByStep) =>
    STEP_LABELS[s.step] ?? s.step.replace(/_/g, ' ')

  return (
    <div className="mb-6 bg-surface border border-border rounded-[14px] shadow-soft-sm p-[18px]">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
          Custo desta análise
          <span className="ml-2 text-ink-3/70 normal-case font-normal tracking-normal">· somente admin (COGS)</span>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-[12px] text-ink-3 hover:text-ink transition"
        >
          {open ? 'Ocultar detalhe' : 'Ver por agente'}
        </button>
      </div>

      <div className="flex items-baseline gap-3 mt-2.5">
        <span className="font-display text-[26px] font-medium tracking-tight">{fmtUSD(data.cost_usd)}</span>
        <span className="text-[13px] text-ink-2">≈ {fmtBRL(data.cost_brl)}</span>
      </div>
      <div className="text-[12px] text-ink-3 mt-1">
        {data.calls} chamada(s) de LLM · cache hit {data.cache_hit_rate_pct.toFixed(0)}% · câmbio ref. R$ {data.usd_brl_rate.toFixed(2)}/US$
      </div>

      {open && (
        <div className="mt-3.5 border-t border-border pt-3 flex flex-col gap-1.5">
          {data.by_step.map((s) => (
            <div key={`${s.context}::${s.step}`} className="flex items-center justify-between text-[12px]">
              <span className="text-ink-2">
                {stepLabel(s)}
                <span className="text-ink-3/70 ml-1.5">{CONTEXT_LABELS[s.context] ?? s.context}</span>
              </span>
              <span className="font-mono text-ink-3">{fmtUSD(s.cost_usd)} · {s.calls}x</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
