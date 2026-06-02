'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

// ── Types ────────────────────────────────────────────────────────────────────

type Bucket = {
  cost_usd:           number
  input_tokens:       number
  output_tokens:      number
  cache_read_tokens:  number
  cache_write_tokens: number
  calls:              number
}

interface UsoLlm {
  window_days:         number
  totals:              { hoje: Bucket; sete_d: Bucket; trinta_d: Bucket }
  cache_hit_rate_pct:  number
  daily_30d:           { date: string; cost_usd: number; calls: number }[]
  top_analises: {
    analise_id:         string
    nome_ativo:         string | null
    status:             string | null
    cost_usd:           number
    input_tokens:       number
    output_tokens:      number
    cache_read_tokens:  number
    cache_write_tokens: number
    calls:              number
  }[]
  by_step: {
    context:           string
    step:              string
    model:             string
    cost_usd:          number
    calls:             number
    input_tokens:      number
    output_tokens:     number
    cache_read_tokens: number
    avg_latency_ms:    number | null
  }[]
  by_model: {
    model:         string
    cost_usd:      number
    calls:         number
    input_tokens:  number
    output_tokens: number
  }[]
  sample_size:  number
  truncated:    boolean
}

// ── Format helpers ───────────────────────────────────────────────────────────

function fmtUSD(n: number): string {
  if (n === 0) return '$0,00'
  if (n < 0.01) return `$${n.toFixed(4)}`
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'USD' })
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return n.toLocaleString('pt-BR')
}

function fmtInt(n: number): string {
  return n.toLocaleString('pt-BR')
}

const CONTEXT_LABEL: Record<string, string> = {
  analise_pipeline: 'Análise',
  ingestion:        'Ingestão',
  validators:       'Validadores',
  invest_match:     'Invest Match',
}

const CONTEXT_CLS: Record<string, string> = {
  analise_pipeline: 'text-accent-strong bg-accent-soft border-accent/30',
  ingestion:        'text-sky-700 bg-sky-50 border-sky-200',
  validators:       'text-warn bg-warn/10 border-warn/30',
  invest_match:     'text-ok bg-ok/10 border-ok/30',
}

// ── Components ───────────────────────────────────────────────────────────────

function Card({
  label, valor, sub, accent,
}: { label: string; valor: string | number; sub?: string; accent?: 'ok' | 'warn' | 'sky' | null }) {
  const valueCls =
    accent === 'ok'   ? 'text-ok'   :
    accent === 'warn' ? 'text-warn' :
    accent === 'sky'  ? 'text-sky-700' :
    'text-ink'
  return (
    <div className="bg-surface border border-border rounded-[14px] p-5 shadow-soft-sm">
      <p className="text-[11px] text-ink-3 mb-1 uppercase tracking-wide font-medium">{label}</p>
      <p className={`font-display text-[32px] font-medium ${valueCls}`}>{valor}</p>
      {sub && <p className="text-[12px] text-ink-3 mt-1">{sub}</p>}
    </div>
  )
}

function DailyCostChart({ data }: { data: { date: string; cost_usd: number; calls: number }[] }) {
  const max = Math.max(...data.map(d => d.cost_usd), 0.0001)
  const W   = 720
  const H   = 100
  const pad = 4
  const bw  = Math.floor((W - pad * (data.length + 1)) / data.length)
  const todayIso = new Date().toISOString().slice(0, 10)

  return (
    <div className="bg-surface border border-border rounded-[14px] p-5 shadow-soft-sm">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-[13px] font-semibold text-ink">Custo diário — últimos 30 dias</h2>
        <span className="text-[11px] text-ink-3">pico: {fmtUSD(max)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H + 22}`} className="w-full" style={{ maxHeight: 140 }}>
        {data.map((d, i) => {
          const barH = Math.max(1, Math.round((d.cost_usd / max) * H))
          const x    = pad + i * (bw + pad)
          const y    = H - barH
          const isToday = d.date === todayIso
          const label = d.date.slice(5) // MM-DD
          return (
            <g key={d.date}>
              <title>{`${d.date} — ${fmtUSD(d.cost_usd)} (${d.calls} chamadas)`}</title>
              <rect
                x={x} y={y} width={bw} height={barH}
                rx={3}
                fill={isToday ? '#c04a2a' : '#e8e2d8'}
              />
              {(i === 0 || i === 14 || i === 29 || isToday) && (
                <text
                  x={x + bw / 2} y={H + 16}
                  textAnchor="middle"
                  fontSize={8}
                  fill={isToday ? '#c04a2a' : '#8a7a68'}
                  fontWeight={isToday ? 'bold' : 'normal'}
                >
                  {label}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function UsoLlmPage() {
  const [data,    setData]    = useState<UsoLlm | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro,    setErro]    = useState('')
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro('')
    try {
      const r = await fetch('/api/admin/uso-llm', { cache: 'no-store' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Erro ao carregar')
      setData(d)
      setUpdatedAt(new Date())
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  const fmtTime = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  if (loading && !data) return <div className="p-8 text-ink-3 text-[13px]">Carregando...</div>

  return (
    <div className="max-w-6xl mx-auto px-8 py-8 w-full">
      <div className="flex items-baseline justify-between mb-1">
        <h1 className="font-display text-[28px] font-medium tracking-tight">Uso LLM</h1>
        {updatedAt && (
          <button onClick={carregar} className="text-[11px] text-ink-3 hover:text-ink transition">
            Atualizado às {fmtTime(updatedAt)} · Atualizar
          </button>
        )}
      </div>
      <p className="text-ink-3 text-[13px] mb-8">
        Consumo e custo das chamadas Claude API. Janela: 30 dias.
        {data?.truncated && <span className="text-warn ml-2">⚠ resultados truncados em 50.000 linhas</span>}
      </p>

      {erro && (
        <div className="mb-4 p-3 rounded-[8px] bg-warn/10 text-warn text-[13px]">{erro}</div>
      )}

      {data && (
        <>
          {/* Cards de totais */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card
              label="Custo hoje"
              valor={fmtUSD(data.totals.hoje.cost_usd)}
              sub={`${fmtInt(data.totals.hoje.calls)} chamadas`}
            />
            <Card
              label="Custo 7 dias"
              valor={fmtUSD(data.totals.sete_d.cost_usd)}
              sub={`${fmtInt(data.totals.sete_d.calls)} chamadas`}
            />
            <Card
              label="Custo 30 dias"
              valor={fmtUSD(data.totals.trinta_d.cost_usd)}
              sub={`${fmtInt(data.totals.trinta_d.calls)} chamadas`}
            />
            <Card
              label="Cache hit rate"
              valor={`${data.cache_hit_rate_pct.toFixed(1)}%`}
              sub={`${fmtTokens(data.totals.trinta_d.cache_read_tokens)} lidos do cache`}
              accent={data.cache_hit_rate_pct >= 30 ? 'ok' : data.cache_hit_rate_pct >= 10 ? 'sky' : 'warn'}
            />
          </div>

          {/* Tokens 30d (detalhe) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card label="Input tokens (30d)"  valor={fmtTokens(data.totals.trinta_d.input_tokens)} />
            <Card label="Output tokens (30d)" valor={fmtTokens(data.totals.trinta_d.output_tokens)} />
            <Card label="Cache read (30d)"    valor={fmtTokens(data.totals.trinta_d.cache_read_tokens)} />
            <Card label="Cache write (30d)"   valor={fmtTokens(data.totals.trinta_d.cache_write_tokens)} />
          </div>

          {/* Chart diário */}
          <div className="mb-8">
            <DailyCostChart data={data.daily_30d}/>
          </div>

          {/* Top análises */}
          <div className="bg-surface border border-border rounded-[14px] p-5 shadow-soft-sm mb-6">
            <h2 className="text-[13px] font-semibold mb-4 text-ink">Top 20 análises mais caras (30 dias)</h2>
            {data.top_analises.length === 0 ? (
              <p className="text-ink-3 text-[13px]">Nenhuma análise com custo registrado na janela.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-ink-3 text-left border-b border-border">
                      <th className="py-2 pr-3 font-medium">Ativo</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 pr-3 font-medium text-right">Custo</th>
                      <th className="py-2 pr-3 font-medium text-right">Chamadas</th>
                      <th className="py-2 pr-3 font-medium text-right">In/Out</th>
                      <th className="py-2 pr-3 font-medium text-right">Cache R</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_analises.map(a => (
                      <tr key={a.analise_id} className="border-b border-border/60 hover:bg-surface-2">
                        <td className="py-2 pr-3">
                          <Link
                            href={`/dashboard/analise/${a.analise_id}`}
                            className="text-ink hover:underline"
                          >
                            {a.nome_ativo ?? <span className="font-mono text-ink-3">{a.analise_id.slice(0, 8)}...</span>}
                          </Link>
                        </td>
                        <td className="py-2 pr-3 text-ink-2">{a.status ?? '—'}</td>
                        <td className="py-2 pr-3 text-right font-medium">{fmtUSD(a.cost_usd)}</td>
                        <td className="py-2 pr-3 text-right text-ink-2">{fmtInt(a.calls)}</td>
                        <td className="py-2 pr-3 text-right text-ink-2 font-mono">
                          {fmtTokens(a.input_tokens)}/{fmtTokens(a.output_tokens)}
                        </td>
                        <td className="py-2 pr-3 text-right text-ink-2 font-mono">{fmtTokens(a.cache_read_tokens)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Breakdown por step */}
          <div className="bg-surface border border-border rounded-[14px] p-5 shadow-soft-sm mb-6">
            <h2 className="text-[13px] font-semibold mb-4 text-ink">Custo por step / agente (30 dias)</h2>
            {data.by_step.length === 0 ? (
              <p className="text-ink-3 text-[13px]">Sem dados na janela.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-ink-3 text-left border-b border-border">
                      <th className="py-2 pr-3 font-medium">Contexto</th>
                      <th className="py-2 pr-3 font-medium">Step</th>
                      <th className="py-2 pr-3 font-medium">Modelo</th>
                      <th className="py-2 pr-3 font-medium text-right">Custo</th>
                      <th className="py-2 pr-3 font-medium text-right">Chamadas</th>
                      <th className="py-2 pr-3 font-medium text-right">In/Out</th>
                      <th className="py-2 pr-3 font-medium text-right">Cache R</th>
                      <th className="py-2 pr-3 font-medium text-right">Latência média</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_step.map(s => {
                      const ctxLabel = CONTEXT_LABEL[s.context] ?? s.context
                      const ctxCls   = CONTEXT_CLS[s.context] ?? 'text-ink-2 bg-surface-2 border-border'
                      return (
                        <tr key={`${s.context}::${s.step}`} className="border-b border-border/60 hover:bg-surface-2">
                          <td className="py-2 pr-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${ctxCls}`}>
                              {ctxLabel}
                            </span>
                          </td>
                          <td className="py-2 pr-3 font-mono text-ink-2">{s.step}</td>
                          <td className="py-2 pr-3 text-ink-3 text-[11px]">{s.model.replace('claude-', '')}</td>
                          <td className="py-2 pr-3 text-right font-medium">{fmtUSD(s.cost_usd)}</td>
                          <td className="py-2 pr-3 text-right text-ink-2">{fmtInt(s.calls)}</td>
                          <td className="py-2 pr-3 text-right text-ink-2 font-mono">
                            {fmtTokens(s.input_tokens)}/{fmtTokens(s.output_tokens)}
                          </td>
                          <td className="py-2 pr-3 text-right text-ink-2 font-mono">{fmtTokens(s.cache_read_tokens)}</td>
                          <td className="py-2 pr-3 text-right text-ink-3">
                            {s.avg_latency_ms != null ? `${s.avg_latency_ms} ms` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Por modelo */}
          <div className="bg-surface border border-border rounded-[14px] p-5 shadow-soft-sm mb-6">
            <h2 className="text-[13px] font-semibold mb-4 text-ink">Custo por modelo (30 dias)</h2>
            {data.by_model.length === 0 ? (
              <p className="text-ink-3 text-[13px]">Sem dados na janela.</p>
            ) : (
              <div className="space-y-3">
                {data.by_model.map(m => {
                  const totalCost = data.totals.trinta_d.cost_usd || 1
                  const pct = (m.cost_usd / totalCost) * 100
                  return (
                    <div key={m.model}>
                      <div className="flex justify-between text-[13px] mb-1.5">
                        <span className="text-ink-2 font-mono text-[11px]">{m.model}</span>
                        <span className="font-medium text-ink">{fmtUSD(m.cost_usd)} <span className="text-ink-3">· {fmtInt(m.calls)}</span></span>
                      </div>
                      <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent-strong rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <p className="text-[11px] text-ink-3 text-center">
            {fmtInt(data.sample_size)} registros lidos · fonte: tabela <code className="font-mono">llm_usage_log</code>
          </p>
        </>
      )}
    </div>
  )
}
