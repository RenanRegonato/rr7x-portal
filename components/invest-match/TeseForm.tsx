'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

// Form de cadastro MANUAL de tese (origem='manual').
// Essenciais sempre visíveis + bloco "avançado" recolhível com os campos
// estruturados (scores, financeiro, governança, geografia). POST em
// /api/invest-match/teses → redireciona pro detalhe da tese criada.

const SETORES = [
  'Saúde', 'Imobiliário', 'Agronegócio', 'Energia', 'Startups', 'Tecnologia',
  'Indústria', 'Varejo', 'Serviços', 'Educação', 'Financeiro', 'Infraestrutura',
  'Logística', 'Mineração',
]

const ESTAGIOS = [
  { v: 'ideia',         l: 'Ideia' },
  { v: 'mvp',           l: 'MVP' },
  { v: 'early_revenue', l: 'Receita inicial' },
  { v: 'growth',        l: 'Growth' },
  { v: 'mature',        l: 'Madura' },
  { v: 'turnaround',    l: 'Turnaround' },
] as const

const TIPOS_DEAL = [
  { v: '',                    l: '— não definido —' },
  { v: 'equity',              l: 'Equity' },
  { v: 'debt',                l: 'Dívida' },
  { v: 'convertible',         l: 'Conversível' },
  { v: 'm_and_a_sale',        l: 'M&A — Venda' },
  { v: 'm_and_a_acquisition', l: 'M&A — Aquisição' },
  { v: 'earn_out',            l: 'Earn-out' },
  { v: 'growth_equity',       l: 'Growth equity' },
  { v: 'special_situations',  l: 'Special situations' },
] as const

const CONTROLES = [
  { v: '',         l: '— não definido —' },
  { v: 'minority', l: 'Minoritário' },
  { v: 'majority', l: 'Majoritário' },
  { v: 'full',     l: 'Total' },
] as const

const URGENCIAS = [
  { v: 'baixa', l: 'Baixa' },
  { v: 'media', l: 'Média' },
  { v: 'alta',  l: 'Alta' },
] as const

const NIVEIS_COMPLIANCE = [
  { v: '',             l: '— não definido —' },
  { v: 'basico',       l: 'Básico' },
  { v: 'intermediario', l: 'Intermediário' },
  { v: 'avancado',     l: 'Avançado' },
] as const

const INPUT_CLS = 'w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-surface outline-none transition-shadow focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)] placeholder:text-ink-3 disabled:opacity-50'
const LABEL_CLS = 'text-[11px] font-semibold uppercase tracking-wider text-ink-3 block mb-1.5'


export default function TeseForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // === Essenciais ===
  const [empresaNome, setEmpresaNome] = useState('')
  const [descricao,   setDescricao]   = useState('')
  const [setor,       setSetor]       = useState('')
  const [estagio,     setEstagio]     = useState<string>('early_revenue')
  const [capitalBuscado, setCapitalBuscado] = useState('')
  const [tipoDeal,    setTipoDeal]    = useState('')
  const [urgencia,    setUrgencia]    = useState('media')

  // === Narrativa ===
  const [teseInvestimento, setTeseInvestimento] = useState('')
  const [valueProposition, setValueProposition] = useState('')
  const [competitiveMoat,  setCompetitiveMoat]  = useState('')
  const [riskNarrative,    setRiskNarrative]    = useState('')
  const [exitStory,        setExitStory]        = useState('')

  // === Avançado: setorial ===
  const [subSetores,     setSubSetores]     = useState<string[]>([])
  const [modelosNegocio, setModelosNegocio] = useState<string[]>([])
  const [verticalTags,   setVerticalTags]   = useState<string[]>([])

  // === Avançado: scores ===
  const [maturity,   setMaturity]   = useState('')
  const [governance, setGovernance] = useState('')
  const [operational, setOperational] = useState('')
  const [riskOverall, setRiskOverall] = useState('')
  const [documentacao, setDocumentacao] = useState('')

  // === Avançado: financeiro ===
  const [receita,   setReceita]   = useState('')
  const [ebitda,    setEbitda]    = useState('')
  const [valuation, setValuation] = useState('')
  const [equityPct, setEquityPct] = useState('')
  const [ticketMin, setTicketMin] = useState('')
  const [margemPct, setMargemPct] = useState('')
  const [crescimentoPct, setCrescimentoPct] = useState('')

  // === Avançado: governança / deal ===
  const [temConselho,  setTemConselho]  = useState(false)
  const [temAuditoria, setTemAuditoria] = useState(false)
  const [nivelCompliance, setNivelCompliance] = useState('')
  const [controle,     setControle]     = useState('')
  const [horizonteSaida, setHorizonteSaida] = useState('')
  const [prontoDd,     setProntoDd]     = useState(false)
  const [esg,          setEsg]          = useState(false)

  // === Avançado: geografia ===
  const [hqEstado, setHqEstado] = useState('')
  const [hqCidade, setHqCidade] = useState('')
  const [regioes,  setRegioes]  = useState<string[]>([])

  // === Avançado: risco ===
  const [riskFactors,    setRiskFactors]    = useState<string[]>([])
  const [keyDependencies, setKeyDependencies] = useState<string[]>([])


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!empresaNome.trim() || empresaNome.trim().length < 2) {
      setError('Nome da empresa/projeto é obrigatório'); return
    }
    if (!setor.trim() || setor.trim().length < 2) {
      setError('Setor é obrigatório'); return
    }
    const capital = strToNum(capitalBuscado)
    if (capital == null || capital < 0) {
      setError('Capital buscado é obrigatório (em R$)'); return
    }

    const payload: Record<string, unknown> = {
      empresa_nome:            empresaNome.trim(),
      empresa_descricao_curta: descricao.trim() || null,
      setor_primario:          setor.trim(),
      estagio,
      capital_buscado_brl:     capital,
      tipo_deal:               tipoDeal || null,
      urgencia,

      tese_investimento: teseInvestimento.trim() || null,
      value_proposition: valueProposition.trim() || null,
      competitive_moat:  competitiveMoat.trim() || null,
      risk_narrative:    riskNarrative.trim() || null,
      exit_story:        exitStory.trim() || null,

      sub_setores:      subSetores,
      modelos_negocio:  modelosNegocio,
      vertical_tags:    verticalTags,

      maturity_score:     strToNum(maturity),
      governance_score:   strToNum(governance),
      operational_score:  strToNum(operational),
      risk_overall_score: strToNum(riskOverall),
      documentacao_score: strToNum(documentacao),

      receita_anual_brl:         strToNum(receita),
      ebitda_brl:                strToNum(ebitda),
      valuation_pre_money_brl:   strToNum(valuation),
      equity_oferecido_pct:      strToNum(equityPct),
      capital_minimo_ticket_brl: strToNum(ticketMin),
      margem_ebitda_pct:         strToNum(margemPct),
      crescimento_yoy_pct:       strToNum(crescimentoPct),

      tem_conselho:     temConselho,
      tem_auditoria:    temAuditoria,
      nivel_compliance: nivelCompliance || null,
      controle_oferecido: controle || null,
      horizonte_saida_anos: strToNum(horizonteSaida),
      pronto_para_dd:   prontoDd,
      esg_compliant:    esg,

      hq_estado:        hqEstado.trim().toUpperCase() || null,
      hq_cidade:        hqCidade.trim() || null,
      regioes_operacao: regioes,

      risk_factors:     riskFactors,
      key_dependencies: keyDependencies,
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/invest-match/teses', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Falha ao salvar'); return }
        router.push(`/dashboard/invest-match/teses/${data.id}`)
        router.refresh()
      } catch (err) {
        setError((err as Error).message)
      }
    })
  }


  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
      {error && (
        <div className="bg-warn/10 border border-warn/30 text-warn rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* === Essenciais === */}
      <Section title="Identidade" hint="O mínimo que o motor precisa para cruzar com a base de investidores.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={LABEL_CLS}>Empresa / Projeto *</label>
            <input className={INPUT_CLS} value={empresaNome} onChange={e => setEmpresaNome(e.target.value)} required minLength={2}/>
          </div>
          <div className="md:col-span-2">
            <label className={LABEL_CLS}>Descrição curta</label>
            <input className={INPUT_CLS} value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Uma linha sobre a empresa"/>
          </div>
          <div>
            <label className={LABEL_CLS}>Setor primário *</label>
            <input className={INPUT_CLS} value={setor} onChange={e => setSetor(e.target.value)} list="setores-list" placeholder="ex: Saúde" required/>
            <datalist id="setores-list">
              {SETORES.map(s => <option key={s} value={s}/>)}
            </datalist>
          </div>
          <div>
            <label className={LABEL_CLS}>Estágio *</label>
            <select className={INPUT_CLS} value={estagio} onChange={e => setEstagio(e.target.value)}>
              {ESTAGIOS.map(e => <option key={e.v} value={e.v}>{e.l}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>Capital buscado (BRL) *</label>
            <input className={INPUT_CLS} type="number" min={0} step={1000} value={capitalBuscado} onChange={e => setCapitalBuscado(e.target.value)} placeholder="0" required/>
          </div>
          <div>
            <label className={LABEL_CLS}>Tipo de deal</label>
            <select className={INPUT_CLS} value={tipoDeal} onChange={e => setTipoDeal(e.target.value)}>
              {TIPOS_DEAL.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>Urgência</label>
            <select className={INPUT_CLS} value={urgencia} onChange={e => setUrgencia(e.target.value)}>
              {URGENCIAS.map(u => <option key={u.v} value={u.v}>{u.l}</option>)}
            </select>
          </div>
        </div>
      </Section>

      {/* === Narrativa === */}
      <Section title="Narrativa da tese" hint="Recomendado: alimenta o matching semântico. Quanto mais detalhe, mais precisas as conexões.">
        <div>
          <label className={LABEL_CLS}>Tese de investimento</label>
          <textarea className={INPUT_CLS} rows={4} value={teseInvestimento} onChange={e => setTeseInvestimento(e.target.value)}
            placeholder="Por que esta empresa é uma oportunidade? Drivers, tração, oportunidade de mercado..."/>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Proposta de valor</label>
            <textarea className={INPUT_CLS} rows={3} value={valueProposition} onChange={e => setValueProposition(e.target.value)}/>
          </div>
          <div>
            <label className={LABEL_CLS}>Moat competitivo</label>
            <textarea className={INPUT_CLS} rows={3} value={competitiveMoat} onChange={e => setCompetitiveMoat(e.target.value)}/>
          </div>
          <div>
            <label className={LABEL_CLS}>Riscos</label>
            <textarea className={INPUT_CLS} rows={3} value={riskNarrative} onChange={e => setRiskNarrative(e.target.value)}/>
          </div>
          <div>
            <label className={LABEL_CLS}>Hipótese de saída</label>
            <textarea className={INPUT_CLS} rows={3} value={exitStory} onChange={e => setExitStory(e.target.value)}/>
          </div>
        </div>
      </Section>

      {/* === Avançado (recolhível) === */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(v => !v)}
          className="inline-flex items-center gap-2 text-sm font-medium text-accent-strong hover:underline"
        >
          {showAdvanced ? '− Ocultar campos avançados' : '+ Campos avançados (scores, financeiro, governança, geografia)'}
        </button>
      </div>

      {showAdvanced && (
        <div className="space-y-6">
          <Section title="Setorial" hint="Refinam o matching semântico e setorial.">
            <TagInput label="Sub-setores" hint="ex: AgriTech, Healthtech B2B" values={subSetores} onChange={setSubSetores}/>
            <TagInput label="Modelos de negócio" hint="ex: SaaS B2B, Marketplace, Indústria" values={modelosNegocio} onChange={setModelosNegocio}/>
            <TagInput label="Tags livres" hint="ex: ESG, IoT, GenAI, exporta" values={verticalTags} onChange={setVerticalTags}/>
          </Section>

          <Section title="Scores de qualidade (0–100)" hint="Usados nos filtros do investidor. Deixe em branco se não souber.">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <NumScore label="Maturidade"    value={maturity}     onChange={setMaturity}/>
              <NumScore label="Governança"    value={governance}   onChange={setGovernance}/>
              <NumScore label="Operacional"   value={operational}  onChange={setOperational}/>
              <NumScore label="Risco (menor=melhor)" value={riskOverall} onChange={setRiskOverall}/>
              <NumScore label="Documentação"  value={documentacao} onChange={setDocumentacao}/>
            </div>
          </Section>

          <Section title="Financeiro">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Money label="Receita anual (BRL)" value={receita} onChange={setReceita}/>
              <Money label="EBITDA (BRL)" value={ebitda} onChange={setEbitda}/>
              <Money label="Valuation pré-money (BRL)" value={valuation} onChange={setValuation}/>
              <Money label="Ticket mínimo aceito (BRL)" value={ticketMin} onChange={setTicketMin}/>
              <Num label="Equity oferecido (%)" value={equityPct} onChange={setEquityPct} min={0} max={100}/>
              <Num label="Margem EBITDA (%)" value={margemPct} onChange={setMargemPct} min={-1000} max={1000}/>
              <Num label="Crescimento YoY (%)" value={crescimentoPct} onChange={setCrescimentoPct} min={-1000} max={100000}/>
            </div>
          </Section>

          <Section title="Governança e deal">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLS}>Nível de compliance</label>
                <select className={INPUT_CLS} value={nivelCompliance} onChange={e => setNivelCompliance(e.target.value)}>
                  {NIVEIS_COMPLIANCE.map(n => <option key={n.v} value={n.v}>{n.l}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Controle oferecido</label>
                <select className={INPUT_CLS} value={controle} onChange={e => setControle(e.target.value)}>
                  {CONTROLES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
                </select>
              </div>
              <Num label="Horizonte de saída (anos)" value={horizonteSaida} onChange={setHorizonteSaida} min={0} max={30}/>
            </div>
            <div className="flex flex-wrap gap-4 pt-1">
              <Toggle label="Tem conselho"      checked={temConselho}  onChange={setTemConselho}/>
              <Toggle label="Tem auditoria"     checked={temAuditoria} onChange={setTemAuditoria}/>
              <Toggle label="Pronto para DD"    checked={prontoDd}     onChange={setProntoDd}/>
              <Toggle label="ESG compliant"     checked={esg}          onChange={setEsg}/>
            </div>
          </Section>

          <Section title="Geografia" hint='UF em sigla ("SP"). "NACIONAL" para abrangência nacional.'>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLS}>UF da sede</label>
                <input className={INPUT_CLS} maxLength={2} value={hqEstado} onChange={e => setHqEstado(e.target.value.toUpperCase())} placeholder="SP"/>
              </div>
              <div>
                <label className={LABEL_CLS}>Cidade da sede</label>
                <input className={INPUT_CLS} value={hqCidade} onChange={e => setHqCidade(e.target.value)}/>
              </div>
            </div>
            <TagInput label="Regiões de operação" hint="ex: SP, RJ, Sul" values={regioes} onChange={setRegioes}/>
          </Section>

          <Section title="Riscos e dependências">
            <TagInput label="Fatores de risco" hint="ex: concentração de clientes, regulatório" values={riskFactors} onChange={setRiskFactors}/>
            <TagInput label="Dependências-chave" hint="ex: fundador, fornecedor único" values={keyDependencies} onChange={setKeyDependencies}/>
          </Section>
        </div>
      )}

      {/* === Ações === */}
      <div className="flex items-center justify-between pt-2 pb-8 border-t border-border">
        <button type="button" onClick={() => router.back()} className="text-sm text-ink-2 hover:text-ink">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent-strong text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Salvando…' : 'Cadastrar tese'}
        </button>
      </div>
    </form>
  )
}


// ============================================================
// Subcomponentes
// ============================================================
function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface border border-border rounded-xl p-5 space-y-4">
      <header>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {hint && <p className="text-xs text-ink-3 mt-0.5">{hint}</p>}
      </header>
      {children}
    </section>
  )
}

function TagInput({
  label, hint, values, onChange,
}: {
  label:    string
  hint?:    string
  values:   string[]
  onChange: (v: string[]) => void
}) {
  const [draft, setDraft] = useState('')
  function commit() {
    const trimmed = draft.trim()
    if (!trimmed) return
    if (values.includes(trimmed)) { setDraft(''); return }
    onChange([...values, trimmed])
    setDraft('')
  }
  return (
    <div>
      <label className={LABEL_CLS}>{label}</label>
      {hint && <p className="text-[11px] text-ink-3 mb-1.5">{hint}</p>}
      <div className="flex flex-wrap items-center gap-1.5 border border-border rounded-[10px] px-2.5 py-2 bg-surface min-h-[42px]">
        {values.map((v, idx) => (
          <span key={idx} className="inline-flex items-center gap-1 bg-surface-2 text-ink rounded-full px-2.5 py-0.5 text-xs">
            {v}
            <button type="button" onClick={() => onChange(values.filter((_, i) => i !== idx))} className="text-ink-3 hover:text-warn ml-0.5" aria-label={`remover ${v}`}>×</button>
          </span>
        ))}
        <input
          className="flex-1 min-w-[140px] outline-none text-[13px] bg-transparent placeholder:text-ink-3"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit() }
            else if (e.key === 'Backspace' && draft === '' && values.length > 0) onChange(values.slice(0, -1))
          }}
          onBlur={commit}
          placeholder={values.length === 0 ? 'Digite e pressione Enter…' : ''}
        />
      </div>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-ink">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="accent-accent-strong w-4 h-4"/>
      {label}
    </label>
  )
}

function NumScore({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <Num label={label} value={value} onChange={onChange} min={0} max={100} placeholder="0–100"/>
}

function Num({
  label, value, onChange, min, max, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; min?: number; max?: number; placeholder?: string
}) {
  return (
    <div>
      <label className={LABEL_CLS}>{label}</label>
      <input className={INPUT_CLS} type="number" min={min} max={max} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder ?? ''}/>
    </div>
  )
}

function Money({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className={LABEL_CLS}>{label}</label>
      <input className={INPUT_CLS} type="number" min={0} step={1000} value={value} onChange={e => onChange(e.target.value)} placeholder="0"/>
    </div>
  )
}


// ============================================================
// Helpers
// ============================================================
function strToNum(v: string): number | null {
  if (!v.trim()) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
