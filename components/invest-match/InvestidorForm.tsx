'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Investidor } from '@/lib/invest-match/types'

// Form de cadastro/edição de investidor.
// Funciona tanto em modo 'create' (POST) quanto 'edit' (PATCH).
// Não é reativo a mudanças externas — recebe `initial` na montagem.

export type InvestidorFormMode = 'create' | 'edit'

interface Props {
  mode:     InvestidorFormMode
  initial?: Partial<Investidor>
}

// === Vocabulários (espelham schemas.ts) ===
const TIPOS = [
  { v: 'pessoa_fisica',              l: 'Pessoa física' },
  { v: 'holding_familiar',           l: 'Holding familiar' },
  { v: 'family_office',              l: 'Family office' },
  { v: 'fundo',                      l: 'Fundo' },
  { v: 'financeira',                 l: 'Financeira' },
  { v: 'pj',                         l: 'Pessoa jurídica' },
  { v: 'estrategico_corporativo',    l: 'Estratégico corporativo' },
  { v: 'gestora',                    l: 'Gestora' },
  { v: 'clube_investimento',         l: 'Clube de investimento' },
  { v: 'securitizadora',             l: 'Securitizadora (CRI / CRA)' },
  { v: 'administradora_fiduciaria',  l: 'Administradora fiduciária (FIDC)' },
] as const

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
  { v: 'equity',              l: 'Equity' },
  { v: 'debt',                l: 'Dívida' },
  { v: 'credito_estruturado', l: 'Crédito estruturado (FIDC / CRI / CRA)' },
  { v: 'convertible',         l: 'Conversível' },
  { v: 'm_and_a_sale',        l: 'M&A: Venda' },
  { v: 'm_and_a_acquisition', l: 'M&A: Aquisição' },
  { v: 'earn_out',            l: 'Earn-out' },
  { v: 'growth_equity',       l: 'Growth equity' },
  { v: 'special_situations',  l: 'Special situations' },
] as const

const CONTROLES = [
  { v: 'minority', l: 'Minoritário' },
  { v: 'majority', l: 'Majoritário' },
  { v: 'full',     l: 'Total' },
] as const


const INPUT_CLS = 'w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-surface outline-none transition-shadow focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)] placeholder:text-ink-3 disabled:opacity-50'
const LABEL_CLS = 'text-[11px] font-semibold uppercase tracking-wider text-ink-3 block mb-1.5'


export default function InvestidorForm({ mode, initial = {} }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // === State controlado ===
  const [nome,     setNome]     = useState(initial.nome ?? '')
  const [tipo,     setTipo]     = useState(initial.tipo ?? 'fundo')
  const [email,    setEmail]    = useState(initial.email ?? '')
  const [telefone, setTelefone] = useState(initial.telefone ?? '')
  const [cidade,   setCidade]   = useState(initial.cidade ?? '')
  const [estado,   setEstado]   = useState(initial.estado ?? '')

  const [setoresAlvo,      setSetoresAlvo]      = useState<string[]>(initial.setores_alvo ?? [])
  const [subSetores,       setSubSetores]       = useState<string[]>(initial.sub_setores ?? [])
  const [modelosNegocio,   setModelosNegocio]   = useState<string[]>(initial.modelos_negocio ?? [])
  const [verticalTags,     setVerticalTags]     = useState<string[]>(initial.vertical_tags ?? [])

  const [estagiosAceitos,  setEstagiosAceitos]  = useState<string[]>(initial.estagios_aceitos ?? [])
  const [maturityMin,      setMaturityMin]      = useState<string>(numToStr(initial.maturity_min_score))
  const [governanceMin,    setGovernanceMin]    = useState<string>(numToStr(initial.governance_min_score))
  const [documentacaoMin,  setDocumentacaoMin]  = useState<string>(numToStr(initial.documentacao_min_score))
  const [riskMax,          setRiskMax]          = useState<string>(numToStr(initial.risk_max_score))

  const [ticketMin, setTicketMin] = useState<string>(numToStr(initial.ticket_min_brl))
  const [ticketMax, setTicketMax] = useState<string>(numToStr(initial.ticket_max_brl))
  const [receitaMin, setReceitaMin] = useState<string>(numToStr(initial.receita_min_brl))
  const [receitaMax, setReceitaMax] = useState<string>(numToStr(initial.receita_max_brl))

  const [tiposDealAceitos, setTiposDealAceitos] = useState<string[]>(initial.tipos_deal_aceitos ?? [])
  const [controleAceito,   setControleAceito]   = useState<string[]>(initial.controle_aceito ?? [])
  const [horizonteMin, setHorizonteMin] = useState<string>(numToStr(initial.horizonte_saida_min_anos))
  const [horizonteMax, setHorizonteMax] = useState<string>(numToStr(initial.horizonte_saida_max_anos))

  const [geografiasAceitas,    setGeografiasAceitas]    = useState<string[]>(initial.geografias_aceitas ?? [])
  const [geografiasExcluidas,  setGeografiasExcluidas]  = useState<string[]>(initial.geografias_excluidas ?? [])
  const [setoresExcluidos,     setSetoresExcluidos]     = useState<string[]>(initial.setores_excluidos ?? [])

  const [requerEsg,         setRequerEsg]         = useState<boolean>(initial.requer_esg ?? false)
  const [requerAudited,     setRequerAudited]     = useState<boolean>(initial.requer_audited_financials ?? false)
  const [requerProntoPDd,   setRequerProntoPDd]   = useState<boolean>(initial.requer_pronto_para_dd ?? false)

  const [teseResumo,       setTeseResumo]       = useState(initial.tese_resumo ?? '')
  const [teseCompleta,     setTeseCompleta]     = useState(initial.tese_completa ?? '')
  const [dealsAnteriores,  setDealsAnteriores]  = useState(initial.exemplos_deals_passados ?? '')
  const [observacoes,      setObservacoes]      = useState(initial.observacoes ?? '')


  // === Submit ===
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!nome.trim() || nome.trim().length < 2) {
      setError('Nome obrigatório')
      return
    }

    const payload: Record<string, unknown> = {
      nome:                        nome.trim(),
      tipo,
      email:                       email.trim() || null,
      telefone:                    telefone.trim() || null,
      cidade:                      cidade.trim() || null,
      estado:                      estado.trim().toUpperCase() || null,

      setores_alvo:                setoresAlvo,
      sub_setores:                 subSetores,
      modelos_negocio:             modelosNegocio,
      vertical_tags:               verticalTags,

      estagios_aceitos:            estagiosAceitos,
      maturity_min_score:          strToNum(maturityMin),
      governance_min_score:        strToNum(governanceMin),
      documentacao_min_score:      strToNum(documentacaoMin),
      risk_max_score:              strToNum(riskMax),

      ticket_min_brl:              strToNum(ticketMin),
      ticket_max_brl:              strToNum(ticketMax),
      receita_min_brl:             strToNum(receitaMin),
      receita_max_brl:             strToNum(receitaMax),

      tipos_deal_aceitos:          tiposDealAceitos,
      controle_aceito:             controleAceito,
      horizonte_saida_min_anos:    strToNum(horizonteMin),
      horizonte_saida_max_anos:    strToNum(horizonteMax),

      geografias_aceitas:          geografiasAceitas,
      geografias_excluidas:        geografiasExcluidas,
      setores_excluidos:           setoresExcluidos,

      requer_esg:                  requerEsg,
      requer_audited_financials:   requerAudited,
      requer_pronto_para_dd:       requerProntoPDd,

      tese_resumo:                 teseResumo.trim() || null,
      tese_completa:               teseCompleta.trim() || null,
      exemplos_deals_passados:     dealsAnteriores.trim() || null,
      observacoes:                 observacoes.trim() || null,
    }

    startTransition(async () => {
      try {
        const url = mode === 'create'
          ? '/api/invest-match/investidores'
          : `/api/invest-match/investidores/${initial.id}`
        const res = await fetch(url, {
          method:  mode === 'create' ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error ?? 'Falha ao salvar')
          return
        }
        const targetId = mode === 'create' ? data.id : initial.id
        router.push(`/dashboard/invest-match/investidores/${targetId}`)
        router.refresh()
      } catch (e) {
        setError((e as Error).message)
      }
    })
  }


  // === Render ===
  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
      {error && (
        <div className="bg-warn/10 border border-warn/30 text-warn rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* === Identidade === */}
      <Section title="Identidade">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Nome *</label>
            <input className={INPUT_CLS} value={nome} onChange={e => setNome(e.target.value)} required minLength={2}/>
          </div>
          <div>
            <label className={LABEL_CLS}>Tipo</label>
            <select className={INPUT_CLS} value={tipo} onChange={e => setTipo(e.target.value)}>
              {TIPOS.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>E-mail</label>
            <input className={INPUT_CLS} type="email" value={email} onChange={e => setEmail(e.target.value)}/>
          </div>
          <div>
            <label className={LABEL_CLS}>Telefone</label>
            <input className={INPUT_CLS} value={telefone} onChange={e => setTelefone(e.target.value)}/>
          </div>
          <div>
            <label className={LABEL_CLS}>Cidade</label>
            <input className={INPUT_CLS} value={cidade} onChange={e => setCidade(e.target.value)}/>
          </div>
          <div>
            <label className={LABEL_CLS}>UF</label>
            <input className={INPUT_CLS} maxLength={2} value={estado} onChange={e => setEstado(e.target.value.toUpperCase())} placeholder="SP"/>
          </div>
        </div>
      </Section>

      {/* === Tese setorial === */}
      <Section title="Tese setorial" hint="Setores principais que o investidor aceita. Sub-setores e tags refinam o matching semântico.">
        <CheckGroup label="Setores alvo" options={SETORES.map(s => ({ v: s, l: s }))} values={setoresAlvo} onChange={setSetoresAlvo}/>
        <TagInput label="Sub-setores" hint="ex: AgriTech, Healthtech B2B, Real Estate Multifamily" values={subSetores} onChange={setSubSetores}/>
        <TagInput label="Modelos de negócio" hint="ex: SaaS B2B, Marketplace, Indústria, Franquia" values={modelosNegocio} onChange={setModelosNegocio}/>
        <TagInput label="Tags livres" hint="ex: ESG, IoT, GenAI, exporta, regulado" values={verticalTags} onChange={setVerticalTags}/>
      </Section>

      {/* === Estágio e maturidade === */}
      <Section title="Estágio e qualidade do alvo">
        <CheckGroup label="Estágios aceitos" options={ESTAGIOS.map(e => ({ v: e.v, l: e.l }))} values={estagiosAceitos} onChange={setEstagiosAceitos}/>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <NumScore label="Maturidade mín."     value={maturityMin}     onChange={setMaturityMin}/>
          <NumScore label="Governança mín."     value={governanceMin}   onChange={setGovernanceMin}/>
          <NumScore label="Documentação mín."   value={documentacaoMin} onChange={setDocumentacaoMin}/>
          <NumScore label="Risco máx."          value={riskMax}         onChange={setRiskMax}/>
        </div>
      </Section>

      {/* === Financeiro === */}
      <Section title="Financeiro" hint="Faixas de ticket e de receita/EBITDA do alvo. Tickets fora do range bloqueiam o match (filtro rígido).">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Money label="Ticket mínimo (BRL)" value={ticketMin} onChange={setTicketMin}/>
          <Money label="Ticket máximo (BRL)" value={ticketMax} onChange={setTicketMax}/>
          <Money label="Receita alvo: mín. (BRL)" value={receitaMin} onChange={setReceitaMin}/>
          <Money label="Receita alvo: máx. (BRL)" value={receitaMax} onChange={setReceitaMax}/>
        </div>
      </Section>

      {/* === Deal === */}
      <Section title="Estrutura de deal">
        <CheckGroup label="Tipos de deal aceitos" options={TIPOS_DEAL.map(t => ({ v: t.v, l: t.l }))} values={tiposDealAceitos} onChange={setTiposDealAceitos}/>
        <CheckGroup label="Controle aceito" options={CONTROLES.map(c => ({ v: c.v, l: c.l }))} values={controleAceito} onChange={setControleAceito}/>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLS}>Horizonte de saída mín. (anos)</label>
            <input className={INPUT_CLS} type="number" min={0} max={30} value={horizonteMin} onChange={e => setHorizonteMin(e.target.value)}/>
          </div>
          <div>
            <label className={LABEL_CLS}>Horizonte de saída máx. (anos)</label>
            <input className={INPUT_CLS} type="number" min={0} max={30} value={horizonteMax} onChange={e => setHorizonteMax(e.target.value)}/>
          </div>
        </div>
      </Section>

      {/* === Geografia === */}
      <Section title="Geografia" hint='Use siglas de UF ("SP","RJ"). "NACIONAL" aceita qualquer estado.'>
        <TagInput label="Geografias aceitas" hint="ex: SP, RJ, MG ou NACIONAL" values={geografiasAceitas} onChange={setGeografiasAceitas}/>
        <TagInput label="Geografias excluídas" hint="opcional: bloqueia matches dessas regiões" values={geografiasExcluidas} onChange={setGeografiasExcluidas}/>
      </Section>

      {/* === Exclusões / requisitos === */}
      <Section title="Requisitos e exclusões">
        <TagInput label="Setores excluídos" hint="match é bloqueado se o setor primário do alvo cair aqui" values={setoresExcluidos} onChange={setSetoresExcluidos}/>
        <div className="flex flex-wrap gap-4 pt-1">
          <Toggle label="Requer ESG"                  checked={requerEsg}       onChange={setRequerEsg}/>
          <Toggle label="Requer balanço auditado"     checked={requerAudited}   onChange={setRequerAudited}/>
          <Toggle label="Requer pronto para DD"       checked={requerProntoPDd} onChange={setRequerProntoPDd}/>
        </div>
      </Section>

      {/* === Tese narrativa (vai pro embedding) === */}
      <Section title="Tese narrativa" hint="Esses campos alimentam o matching semântico. Quanto mais detalhe, melhor a precisão das sinergias detectadas.">
        <div>
          <label className={LABEL_CLS}>Resumo da tese (1–2 parágrafos)</label>
          <textarea className={INPUT_CLS} rows={3} value={teseResumo} onChange={e => setTeseResumo(e.target.value)}
            placeholder="Ex: Investimos em empresas de saúde digital com tração comprovada de receita recorrente e foco em mercado brasileiro..."/>
        </div>
        <div>
          <label className={LABEL_CLS}>Tese completa</label>
          <textarea className={INPUT_CLS} rows={6} value={teseCompleta} onChange={e => setTeseCompleta(e.target.value)}
            placeholder="Tese expandida: drivers macro, perfil ideal de fundador, métricas de gating, processos de DD, deal breakers..."/>
        </div>
        <div>
          <label className={LABEL_CLS}>Exemplos de deals anteriores</label>
          <textarea className={INPUT_CLS} rows={3} value={dealsAnteriores} onChange={e => setDealsAnteriores(e.target.value)}
            placeholder="Ex: Liderou Series A da X (healthtech, ticket R$ 20M, 2024)..."/>
        </div>
      </Section>

      {/* === Observações === */}
      <Section title="Observações internas">
        <textarea className={INPUT_CLS} rows={3} value={observacoes} onChange={e => setObservacoes(e.target.value)}
          placeholder="Notas internas sobre o investidor (não usado no matching)"/>
      </Section>

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
          {isPending ? 'Salvando…' : (mode === 'create' ? 'Cadastrar investidor' : 'Salvar alterações')}
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

function CheckGroup({
  label, options, values, onChange,
}: {
  label:    string
  options:  Array<{ v: string; l: string }>
  values:   string[]
  onChange: (v: string[]) => void
}) {
  function toggle(v: string) {
    onChange(values.includes(v) ? values.filter(x => x !== v) : [...values, v])
  }
  return (
    <div>
      <label className={LABEL_CLS}>{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(o => {
          const active = values.includes(o.v)
          return (
            <button
              key={o.v}
              type="button"
              onClick={() => toggle(o.v)}
              className={`px-3 py-1.5 rounded-full text-xs border transition
                ${active
                  ? 'bg-accent-strong text-white border-accent-strong'
                  : 'bg-surface text-ink-2 border-border hover:border-accent-strong/40'}`}
            >
              {o.l}
            </button>
          )
        })}
      </div>
    </div>
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
            <button
              type="button"
              onClick={() => onChange(values.filter((_, i) => i !== idx))}
              className="text-ink-3 hover:text-warn ml-0.5"
              aria-label={`remover ${v}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="flex-1 min-w-[140px] outline-none text-[13px] bg-transparent placeholder:text-ink-3"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              commit()
            } else if (e.key === 'Backspace' && draft === '' && values.length > 0) {
              onChange(values.slice(0, -1))
            }
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
  return (
    <div>
      <label className={LABEL_CLS}>{label}</label>
      <input
        className={INPUT_CLS}
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="0–100"
      />
    </div>
  )
}

function Money({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className={LABEL_CLS}>{label}</label>
      <input
        className={INPUT_CLS}
        type="number"
        min={0}
        step={1000}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="0"
      />
    </div>
  )
}


// ============================================================
// Helpers
// ============================================================
function numToStr(v: number | null | undefined): string {
  return v == null ? '' : String(v)
}
function strToNum(v: string): number | null {
  if (!v.trim()) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
