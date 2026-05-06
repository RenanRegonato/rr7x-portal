'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Topbar from '@/components/Topbar'
import PipelineCard, { type AnaliseCard } from '@/components/PipelineCard'
import { OttoSelect, Segmented, Field } from '@/components/form-primitives'
import { IconPlus, IconSearch, IconX } from '@/components/Icons'

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPOS_ATIVO = [
  'Empresa (M&A)',
  'Startup / Scale-up',
  'Agronegócio',
  'Imóvel / Real Estate',
  'Portfólio de Crédito',
  'Franquia',
  'Outro',
]

const TIPOS_OPERACAO = [
  'Vender 100%',
  'Vender participação',
  'Captar investimento',
  'Estruturar crédito',
  'Preparar para o mercado',
  'Diagnóstico / Due Diligence',
]

const THUMB_COLORS: Record<string, string> = {
  'Empresa (M&A)':        'bg-peach',
  'Startup / Scale-up':   'bg-sky',
  'Agronegócio':          'bg-sage',
  'Imóvel / Real Estate': 'bg-sand',
  'Portfólio de Crédito': 'bg-lilac',
  'Franquia':             'bg-cream',
  'Outro':                'bg-peach',
}

const PAGE_SIZE = 12

// ─── Onboarding empty state ───────────────────────────────────────────────────

const HOW_IT_WORKS = [
  { n: '1', title: 'Deal Intake', desc: 'Preencha o formulário com os dados do ativo — nome, tipo, ticket, documentos.' },
  { n: '2', title: '9 especialistas em paralelo', desc: 'Otto aciona o squad: diagnóstico financeiro, M&A, crédito, contratos, originação e mais.' },
  { n: '3', title: 'Relatório em 45–90 min', desc: 'DRS, Blind Teaser, Pitchbook e Relatório Consolidado prontos para apresentar.' },
]

function EmptyPipeline({ onStart }: { onStart: () => void }) {
  return (
    <div className="bg-surface border border-border rounded-[14px] shadow-soft-sm overflow-hidden">
      <div className="px-10 py-10 text-center border-b border-border">
        <div className="w-12 h-12 rounded-[14px] bg-accent-soft border border-accent flex items-center justify-center mx-auto mb-4 font-display italic text-[22px] text-accent-strong">o</div>
        <h2 className="font-display text-[22px] font-medium tracking-tight mb-2">Bem-vindo ao Otto</h2>
        <p className="text-[13px] text-ink-2 max-w-sm mx-auto leading-relaxed">
          Análise completa de ativo em 90 minutos. Ative o squad no seu primeiro deal abaixo.
        </p>
      </div>
      <div className="grid grid-cols-3 divide-x divide-border">
        {HOW_IT_WORKS.map((s) => (
          <div key={s.n} className="px-7 py-6">
            <div className="w-6 h-6 rounded-full bg-accent-soft text-accent-strong text-[11px] font-bold flex items-center justify-center mb-3">{s.n}</div>
            <p className="text-[13px] font-semibold text-ink mb-1">{s.title}</p>
            <p className="text-[12px] text-ink-3 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
      <div className="px-10 py-6 flex justify-center border-t border-border">
        <button
          onClick={onStart}
          className="flex items-center gap-2 px-6 py-2.5 rounded-[10px] bg-accent-strong text-white font-semibold text-[13px] hover:opacity-90 transition"
        >
          <IconPlus size={14}/> Iniciar primeiro deal
        </button>
      </div>
    </div>
  )
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

function FilterBar({
  busca, setBusca,
  filtroTipo, setFiltroTipo,
  filtroOp, setFiltroOp,
  activeCount, onClear,
}: {
  busca: string; setBusca: (v: string) => void
  filtroTipo: string; setFiltroTipo: (v: string) => void
  filtroOp:   string; setFiltroOp:   (v: string) => void
  activeCount: number; onClear: () => void
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px]">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none">
          <IconSearch size={13}/>
        </span>
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome..."
          className="w-full pl-8 pr-3 py-[7px] border border-border rounded-[10px] text-[13px] bg-surface outline-none focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)] placeholder:text-ink-3 transition-shadow"
        />
        {busca && (
          <button onClick={() => setBusca('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink">
            <IconX size={12}/>
          </button>
        )}
      </div>

      {/* Tipo de Ativo */}
      <select
        value={filtroTipo}
        onChange={e => setFiltroTipo(e.target.value)}
        className={`border rounded-[10px] px-3 py-[7px] text-[13px] outline-none transition-colors cursor-pointer
          ${filtroTipo
            ? 'border-accent bg-accent-soft text-accent-strong'
            : 'border-border bg-surface text-ink-2 hover:border-border-strong'
          }`}
      >
        <option value="">Tipo de ativo</option>
        {TIPOS_ATIVO.map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      {/* Tipo de Operação */}
      <select
        value={filtroOp}
        onChange={e => setFiltroOp(e.target.value)}
        className={`border rounded-[10px] px-3 py-[7px] text-[13px] outline-none transition-colors cursor-pointer
          ${filtroOp
            ? 'border-accent bg-accent-soft text-accent-strong'
            : 'border-border bg-surface text-ink-2 hover:border-border-strong'
          }`}
      >
        <option value="">Tipo de operação</option>
        {TIPOS_OPERACAO.map(o => <option key={o} value={o}>{o}</option>)}
      </select>

      {/* Clear */}
      {activeCount > 0 && (
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 px-3 py-[7px] rounded-[10px] text-[12px] text-ink-2 border border-border hover:border-border-strong hover:text-ink transition-colors"
        >
          <IconX size={11}/> Limpar ({activeCount})
        </button>
      )}
    </div>
  )
}

// ─── Card grid ────────────────────────────────────────────────────────────────

function CardGrid({ items, onOpen, onDelete }: {
  items:    AnaliseCard[]
  onOpen:   (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
      {items.map(a => (
        <PipelineCard
          key={a.id}
          analise={a}
          onClick={() => onOpen(a.id)}
          onDelete={() => onDelete(a.id)}
        />
      ))}
    </div>
  )
}

// ─── Pagination bar ───────────────────────────────────────────────────────────

function Pagination({ page, total, pageSize, onChange }: {
  page: number; total: number; pageSize: number; onChange: (p: number) => void
}) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  const from = page * pageSize + 1
  const to   = Math.min((page + 1) * pageSize, total)
  return (
    <div className="flex items-center justify-between mt-5 pt-5 border-t border-border">
      <span className="text-[12px] text-ink-3">{from}–{to} de {total} deals</span>
      <div className="flex gap-2">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 0}
          className="text-[12px] px-3 py-1.5 rounded-md border border-border hover:border-border-strong disabled:opacity-40 transition-colors"
        >
          ← Anterior
        </button>
        <span className="text-[12px] text-ink-3 px-2 py-1.5">{page + 1} / {totalPages}</span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages - 1}
          className="text-[12px] px-3 py-1.5 rounded-md border border-border hover:border-border-strong disabled:opacity-40 transition-colors"
        >
          Próxima →
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Sub { plano: string; analises_restantes: number | null }

export default function DashboardClient({
  analises: initialAnalises,
  sub,
  userInitials,
}: {
  analises:     AnaliseCard[]
  sub:          Sub | null
  userInitials: string
}) {
  const router = useRouter()

  const [analises,    setAnalises]    = useState(initialAnalises)
  const [busca,       setBusca]       = useState('')
  const [filtroTipo,  setFiltroTipo]  = useState('')
  const [filtroOp,    setFiltroOp]    = useState('')
  const [viewMode,    setViewMode]    = useState<'lista' | 'tipo'>('lista')
  const [page,        setPage]        = useState(0)
  const [topTab,      setTopTab]      = useState('Deals')
  const [mode,        setMode]        = useState('Ativo')
  const [nomeAtivo,   setNomeAtivo]   = useState('')
  const [tipoAtivo,   setTipoAtivo]   = useState('')
  const [extra,       setExtra]       = useState('')  // proprietário / assessor field

  // Reset extra field when mode changes
  useEffect(() => { setExtra('') }, [mode])

  // Reset page on any filter change
  useEffect(() => { setPage(0) }, [busca, filtroTipo, filtroOp])

  async function deleteAnalise(id: string) {
    setAnalises(prev => prev.filter(a => a.id !== id))
    await fetch(`/api/analise/${id}`, { method: 'DELETE' })
  }

  function clearFilters() {
    setBusca(''); setFiltroTipo(''); setFiltroOp('')
  }

  // ─── Filter + sort ────────────────────────────────────────────────────────

  const filtradas = useMemo(() => {
    return [...analises]
      .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
      .filter(a => {
        if (busca && !a.nome_ativo.toLowerCase().includes(busca.toLowerCase())) return false
        if (filtroTipo && a.deal_intake?.tipoAtivo !== filtroTipo) return false
        if (filtroOp && !a.deal_intake?.objetivo?.includes(filtroOp)) return false
        return true
      })
  }, [analises, busca, filtroTipo, filtroOp])

  const paginated = filtradas.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Group by Tipo de Ativo (maintain TIPOS_ATIVO order, append "Outros" at end)
  const grouped = useMemo(() => {
    const groups: { tipo: string; color: string; items: AnaliseCard[] }[] = []
    const seen = new Set<string>()
    for (const tipo of TIPOS_ATIVO) {
      const items = filtradas.filter(a => a.deal_intake?.tipoAtivo === tipo)
      if (items.length > 0) { groups.push({ tipo, color: THUMB_COLORS[tipo] ?? 'bg-surface-2', items }); seen.add(tipo) }
    }
    const outros = filtradas.filter(a => !a.deal_intake?.tipoAtivo || !seen.has(a.deal_intake.tipoAtivo))
    if (outros.length > 0) groups.push({ tipo: 'Sem categoria', color: 'bg-surface-2', items: outros })
    return groups
  }, [filtradas])

  const activeFilterCount = [busca, filtroTipo, filtroOp].filter(Boolean).length

  const tabs = [
    { id: 'Deals',     label: 'Deals'     },
    { id: 'Templates', label: 'Templates' },
  ]

  return (
    <>
      <Topbar tabs={tabs} tab={topTab} onTab={setTopTab} userInitials={userInitials}/>

      <div className="grid grid-cols-[300px_1fr] gap-7 p-8 items-start">
        {/* ── New Deal Panel ──────────────────────────────────────────────── */}
        <section className="bg-surface border border-border rounded-[14px] shadow-soft-sm p-[22px] sticky top-[61px]">
          <h3 className="font-display text-[18px] font-medium tracking-tight m-0">Novo deal</h3>
          <p className="text-[12px] text-ink-3 mt-1 mb-[18px]">
            Otto orquestra os 9 especialistas em até 90 min.
          </p>

          <Segmented value={mode} onChange={setMode} options={['Ativo', 'Proprietário', 'Mandato']} fullWidth/>

          {/* ── Ativo mode ─────────────────────────────── */}
          {mode === 'Ativo' && (
            <>
              <Field label="Nome do ativo">
                <input
                  value={nomeAtivo}
                  onChange={e => setNomeAtivo(e.target.value)}
                  placeholder="Ex.: Projeto Aurora"
                  className="w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-surface outline-none transition-shadow focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)] placeholder:text-ink-3"
                />
              </Field>
              <Field label="Tipo de ativo">
                <OttoSelect value={tipoAtivo} onChange={e => setTipoAtivo(e.target.value)}>
                  <option value="">Selecione...</option>
                  {TIPOS_ATIVO.map(t => <option key={t}>{t}</option>)}
                </OttoSelect>
              </Field>
            </>
          )}

          {/* ── Proprietário mode ──────────────────────── */}
          {mode === 'Proprietário' && (
            <>
              <Field label="Nome do ativo">
                <input
                  value={nomeAtivo}
                  onChange={e => setNomeAtivo(e.target.value)}
                  placeholder="Ex.: Projeto Aurora"
                  className="w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-surface outline-none transition-shadow focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)] placeholder:text-ink-3"
                />
              </Field>
              <Field label="Nome do proprietário">
                <input
                  value={extra}
                  onChange={e => setExtra(e.target.value)}
                  placeholder="Ex.: João Rodrigues da Silva"
                  className="w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-surface outline-none transition-shadow focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)] placeholder:text-ink-3"
                />
              </Field>
            </>
          )}

          {/* ── Mandato mode ───────────────────────────── */}
          {mode === 'Mandato' && (
            <>
              <Field label="Nome do ativo">
                <input
                  value={nomeAtivo}
                  onChange={e => setNomeAtivo(e.target.value)}
                  placeholder="Ex.: Projeto Aurora"
                  className="w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-surface outline-none transition-shadow focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)] placeholder:text-ink-3"
                />
              </Field>
              <Field label="Assessor responsável">
                <input
                  value={extra}
                  onChange={e => setExtra(e.target.value)}
                  placeholder="Ex.: Maria Costa"
                  className="w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-surface outline-none transition-shadow focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)] placeholder:text-ink-3"
                />
              </Field>
            </>
          )}

          <button
            onClick={() => {
              const params = new URLSearchParams()
              if (nomeAtivo) params.set('nomeAtivo', nomeAtivo)
              if (mode === 'Ativo' && tipoAtivo) params.set('tipoAtivo', tipoAtivo)
              if (mode === 'Proprietário' && extra) params.set('nomeProprietario', extra)
              if (mode === 'Mandato' && extra) params.set('assessorNome', extra)
              const qs = params.toString()
              router.push(`/dashboard/nova-analise${qs ? `?${qs}` : ''}`)
            }}
            className="mt-[18px] w-full flex items-center justify-center gap-2 px-4 py-[11px] rounded-[10px] bg-accent-strong text-white font-semibold text-[13px] hover:opacity-90 active:translate-y-px transition-all"
          >
            <IconPlus size={14}/> Iniciar Deal Intake
          </button>

          {sub ? (
            <p className="text-center text-[11px] text-ink-3 mt-3.5">
              Plano {sub.plano} · {sub.analises_restantes !== null ? `${sub.analises_restantes} análise(s) restante(s)` : 'ilimitado'}
            </p>
          ) : (
            <p className="text-center text-[11px] mt-3.5">
              <Link href="/dashboard/planos" className="text-accent-strong hover:underline">Adquirir plano →</Link>
            </p>
          )}
        </section>

        {/* ── Pipeline ────────────────────────────────────────────────────── */}
        <section>
          {/* Header */}
          <header className="flex items-center justify-between mb-4">
            <div className="flex items-baseline gap-3">
              <h2 className="font-display font-medium text-[24px] tracking-tight m-0">Pipeline de deals</h2>
              {filtradas.length !== analises.length && (
                <span className="text-[13px] text-ink-3">{filtradas.length} de {analises.length}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Segmented
                value={viewMode}
                onChange={v => setViewMode(v as 'lista' | 'tipo')}
                options={['lista', 'tipo']}
              />
            </div>
          </header>

          {analises.length === 0 ? (
            <EmptyPipeline onStart={() => router.push('/dashboard/nova-analise')}/>
          ) : (
            <>
              {/* Filter bar */}
              <div className="mb-5">
                <FilterBar
                  busca={busca} setBusca={setBusca}
                  filtroTipo={filtroTipo} setFiltroTipo={setFiltroTipo}
                  filtroOp={filtroOp} setFiltroOp={setFiltroOp}
                  activeCount={activeFilterCount} onClear={clearFilters}
                />
              </div>

              {filtradas.length === 0 ? (
                <div className="bg-surface border border-border rounded-[14px] p-12 text-center shadow-soft-sm">
                  <p className="font-display text-[18px] text-ink-3 mb-2">Nenhum resultado</p>
                  <p className="text-[13px] text-ink-3 mb-4">Nenhum deal corresponde aos filtros aplicados.</p>
                  <button onClick={clearFilters} className="text-[13px] text-accent-strong hover:underline">
                    Limpar filtros
                  </button>
                </div>
              ) : viewMode === 'tipo' ? (
                /* ── Grouped by tipo ── */
                <div className="space-y-8">
                  {grouped.map(g => (
                    <div key={g.tipo}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-3 h-3 rounded-sm ${g.color}`}/>
                        <h3 className="text-[14px] font-semibold text-ink">{g.tipo}</h3>
                        <span className="text-[12px] text-ink-3">{g.items.length} deal{g.items.length !== 1 ? 's' : ''}</span>
                        <div className="flex-1 h-px bg-border"/>
                      </div>
                      <CardGrid items={g.items} onOpen={id => router.push(`/dashboard/analise/${id}`)} onDelete={deleteAnalise}/>
                    </div>
                  ))}
                </div>
              ) : (
                /* ── Flat list with pagination ── */
                <>
                  <CardGrid items={paginated} onOpen={id => router.push(`/dashboard/analise/${id}`)} onDelete={deleteAnalise}/>
                  <Pagination page={page} total={filtradas.length} pageSize={PAGE_SIZE} onChange={setPage}/>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </>
  )
}
