'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Topbar from '@/components/Topbar'
import { OttoInput, OttoTextarea, OttoSelect, Field } from '@/components/form-primitives'
import { IconArrowRight, IconSparkle } from '@/components/Icons'

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPOS_ATIVO = ['Empresa (M&A)', 'Imóvel / Real Estate', 'Startup / Scale-up', 'Portfólio de Crédito', 'Franquia', 'Agronegócio', 'Outro']
const ESTAGIOS   = ['Cru / Não validado', 'Estruturando', 'Estruturado', 'Em comercialização', 'Em negociação / Closing']
const OBJETIVOS  = ['Vender 100%', 'Vender participação', 'Captar investimento', 'Estruturar crédito', 'Preparar para o mercado', 'Diagnóstico / Due Diligence']
const NIVEIS_INFO = ['Baixo (poucos dados formais)', 'Médio (dados parciais)', 'Alto (DRE, balanço e documentos disponíveis)']
const MICRO_HINTS = [
  'O ativo já foi apresentado ao mercado anteriormente?',
  'Qual é o nível de urgência da operação?',
  'A tese de valor é clara ou ainda está sendo estruturada?',
  'Existem conflitos societários entre sócios?',
  'Já houve contato com investidores ou compradores?',
]
const ACCEPTED   = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg'
const MAX_FILE_MB = 20
const DRAFT_KEY     = 'otto-intake-draft'
const DRAFT_VERSION = 2

// ─── Section & step definitions ───────────────────────────────────────────────

const STEPS = [
  { label: 'Proprietário',           section: 0 },
  { label: 'Mandato',                section: 1 },
  { label: 'Identificação do Ativo', section: 2 },
  { label: 'Localização & Estágio',  section: 2 },
  { label: 'Objetivo da Operação',   section: 2 },
  { label: 'Dados Financeiros',      section: 2 },
  { label: 'Tese do Ativo',          section: 2 },
  { label: 'Documentos',             section: 2 },
]

const SECTIONS = [
  { label: 'Proprietário', start: 0, end: 0 },
  { label: 'Mandato',      start: 1, end: 1 },
  { label: 'Ativo',        start: 2, end: 7 },
]

// ─── Page (inner — needs useSearchParams) ────────────────────────────────────

function NovaAnaliseInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step,          setStep]          = useState(0)
  const [loading,       setLoading]       = useState(false)
  const [loadingLabel,  setLoadingLabel]  = useState('')
  const [error,         setError]         = useState('')
  const [objetivos,     setObjetivos]     = useState<string[]>([])
  const [files,         setFiles]         = useState<File[]>([])
  const [dragging,      setDragging]      = useState(false)
  const [draftRestored,  setDraftRestored]  = useState(false)
  const [draftAvailable, setDraftAvailable] = useState(false)

  const [form, setForm] = useState({
    // ── Ativo ──────────────────────────────────────────────────────────────
    nomeAtivo:            searchParams.get('nomeAtivo') ?? '',
    tipoAtivo:            searchParams.get('tipoAtivo') ?? '',
    cidade:               '',
    estado:               '',
    pais:                 'Brasil',
    estagio:              '',
    nivelInformacao:      '',
    ticketEstimado:       '',
    resumoAtivo:          '',
    // ── Proprietário ───────────────────────────────────────────────────────
    nomeProprietario:     searchParams.get('nomeProprietario') ?? '',
    cpfCnpjProprietario:  '',
    telefoneProprietario: searchParams.get('telefoneProprietario') ?? '',
    emailProprietario:    '',
    obsProprietario:      '',
    // ── Mandato ────────────────────────────────────────────────────────────
    assessorNome:         searchParams.get('assessorNome') ?? '',
    assessorTelefone:     '',
    assessorEmail:        '',
    parceiroNome:         searchParams.get('parceiroNome') ?? '',
    parceiroTelefone:     '',
    parceiroEmail:        '',
    obsMandato:           '',
  })

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const d = JSON.parse(raw)
        if (d.version !== DRAFT_VERSION) { localStorage.removeItem(DRAFT_KEY); return }
        if (d.form?.nomeAtivo) setDraftAvailable(true)
      }
    } catch {}
  }, [])

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const d = JSON.parse(raw)
      if (d.form)     setForm(prev => ({ ...prev, ...d.form }))
      if (d.objetivos) setObjetivos(d.objetivos)
      if (d.step != null) setStep(d.step)
      setDraftRestored(true)
      setDraftAvailable(false)
    } catch {}
  }

  function discardDraft() {
    localStorage.removeItem(DRAFT_KEY)
    setDraftAvailable(false)
  }

  useEffect(() => {
    if (!form.nomeAtivo) return
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: DRAFT_VERSION, form, objetivos, step }))
  }, [form, objetivos, step])

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleObjetivo(o: string) {
    setObjetivos(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o])
  }

  function addFiles(incoming: FileList | File[]) {
    const arr   = Array.from(incoming)
    const valid = arr.filter(f => {
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        setError(`"${f.name}" excede ${MAX_FILE_MB}MB e foi ignorado.`)
        return false
      }
      return true
    })
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name))
      return [...prev, ...valid.filter(f => !names.has(f.name))]
    })
  }

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  }

  function fileIcon(name: string) {
    const ext = name.split('.').pop()?.toLowerCase()
    if (ext === 'pdf')                               return '📄'
    if (['doc', 'docx'].includes(ext ?? ''))         return '📝'
    if (['xls', 'xlsx', 'csv'].includes(ext ?? ''))  return '📊'
    if (['png', 'jpg', 'jpeg'].includes(ext ?? ''))  return '🖼️'
    return '📎'
  }

  function validateStep(): string | null {
    // step 0 = Proprietário — all optional
    if (step === 1) {
      if (!form.assessorNome.trim()) return 'Informe o nome do assessor responsável.'
    }
    if (step === 2) {
      if (!form.nomeAtivo.trim()) return 'Informe o nome do ativo.'
      if (!form.tipoAtivo)        return 'Selecione o tipo de ativo.'
    }
    if (step === 3) {
      if (!form.cidade.trim()) return 'Informe a cidade.'
      if (!form.estado.trim()) return 'Informe o estado.'
      if (!form.estagio)       return 'Selecione o estágio atual.'
    }
    if (step === 4) {
      if (objetivos.length === 0) return 'Selecione ao menos um objetivo.'
    }
    if (step === 5) {
      if (!form.ticketEstimado.trim()) return 'Informe o ticket estimado.'
      if (!form.nivelInformacao)       return 'Selecione o nível de informação.'
    }
    if (step === 6) {
      if (!form.resumoAtivo.trim()) return 'Descreva o ativo e objetivo.'
    }
    if (step === 7) {
      if (files.length === 0) return 'Adicione ao menos um documento.'
    }
    return null
  }

  function handleNext() {
    const err = validateStep()
    if (err) { setError(err); return }
    setError('')
    setStep(s => s + 1)
  }

  function handleBack() {
    setError('')
    setStep(s => s - 1)
  }

  async function handleSubmit() {
    const err = validateStep()
    if (err) { setError(err); return }
    setError('')
    setLoading(true)

    setLoadingLabel('Criando análise...')
    const payload = {
      ...form,
      objetivo:              objetivos.join(', '),
      localizacao:           `${form.cidade} – ${form.estado}, ${form.pais}`,
      informacoesAdicionais: form.resumoAtivo,
    }

    const res  = await fetch('/api/analise', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Erro ao criar análise.')
      setLoading(false)
      setLoadingLabel('')
      return
    }

    const { analiseId } = data

    setLoadingLabel('Preparando envio dos documentos...')
    const urlRes  = await fetch('/api/upload-url', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ analiseId, files: files.map(f => ({ name: f.name })) }),
    })
    const { urls } = await urlRes.json()

    const supabase = createClient()
    for (let i = 0; i < files.length; i++) {
      const file    = files[i]
      const urlInfo = urls?.find((u: { originalName: string; token: string; path: string }) => u.originalName === file.name)
      if (!urlInfo?.token) continue
      setLoadingLabel(`Enviando documentos... (${i + 1}/${files.length}) ${file.name}`)
      await supabase.storage.from('analises').uploadToSignedUrl(urlInfo.path, urlInfo.token, file)
    }

    localStorage.removeItem(DRAFT_KEY)
    router.push(`/dashboard/analise/${analiseId}`)
  }

  const isLast         = step === STEPS.length - 1
  const current        = STEPS[step]
  const currentSection = SECTIONS[current.section]

  return (
    <div className="flex flex-col min-h-screen">
      <Topbar
        variant="context"
        title="Deal Intake"
        onBack={step === 0 ? () => router.push('/dashboard') : handleBack}
        right={<span className="text-[12px] text-ink-3">Etapa {step + 1} de {STEPS.length}</span>}
      />

      {draftAvailable && !draftRestored && (
        <div className="bg-accent-soft border-b border-accent px-10 py-3 flex items-center justify-between">
          <p className="text-[13px] text-ink-2">Você tem um rascunho salvo para este formulário.</p>
          <div className="flex items-center gap-3">
            <button onClick={restoreDraft} className="text-[13px] font-semibold text-accent-strong hover:underline">Restaurar rascunho</button>
            <button onClick={discardDraft} className="text-[12px] text-ink-3 hover:text-ink">Descartar</button>
          </div>
        </div>
      )}

      <div className="px-10 py-10 max-w-[880px] mx-auto w-full flex-1">

        {/* ── Section progress bar ──────────────────────────────────────── */}
        <div className="flex gap-5 mb-8">
          {SECTIONS.map((sec, si) => {
            const isActive = step >= sec.start && step <= sec.end
            const isDone   = step > sec.end
            const count    = sec.end - sec.start + 1
            return (
              <div key={si} className={si === 2 ? 'flex-[6]' : 'flex-1'}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  {isDone && <span className="text-[10px] text-ok font-bold leading-none">✓</span>}
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                    isDone ? 'text-ok' : isActive ? 'text-accent-strong' : 'text-ink-3'
                  }`}>{sec.label}</span>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: count }, (_, j) => (
                    <div
                      key={j}
                      className={`flex-1 h-[3px] rounded-sm transition-colors ${
                        step > sec.start + j ? 'bg-accent-strong' :
                        step === sec.start + j ? 'bg-accent' : 'bg-border'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Form card ─────────────────────────────────────────────────── */}
        <div className="bg-surface border border-border rounded-[14px] shadow-soft-sm p-9">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-2">
            {currentSection.label} · Parâmetro {step + 1}
          </div>
          <h1 className="font-display text-[32px] font-medium tracking-tight mb-7">{current.label}</h1>

          <StepContent
            step={step}
            form={form}
            set={set}
            objetivos={objetivos}
            toggleObjetivo={toggleObjetivo}
            files={files}
            dragging={dragging}
            setDragging={setDragging}
            addFiles={addFiles}
            removeFile={removeFile}
            formatBytes={formatBytes}
            fileIcon={fileIcon}
            fileInputRef={fileInputRef}
            accepted={ACCEPTED}
          />

          {error && (
            <div className="mt-5 bg-warn-soft border border-[oklch(0.85_0.06_75)] text-[oklch(0.45_0.1_65)] text-[13px] px-4 py-3 rounded-[10px]">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-8 justify-end">
            {step > 0 && !loading && (
              <button
                onClick={handleBack}
                className="px-3.5 py-2 rounded-[10px] border border-border-strong bg-surface text-[13px] font-medium hover:bg-surface-2"
              >
                Voltar
              </button>
            )}

            {isLast ? (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-accent-strong text-white font-semibold text-[13px] hover:opacity-90 disabled:opacity-50"
              >
                {loading ? <>{loadingLabel || 'Processando...'}</> : <><IconSparkle size={14}/> Ativar squad</>}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-accent-strong text-white font-semibold text-[13px] hover:opacity-90"
              >
                Próximo <IconArrowRight size={14}/>
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-[12px] text-ink-3 mt-4">
          Otto valida o preenchimento e ativa os 9 especialistas automaticamente. Entrega em 45–90 minutos.
        </p>
      </div>
    </div>
  )
}

// ─── Export with Suspense (useSearchParams requirement) ───────────────────────

export default function NovaAnalisePage() {
  return (
    <Suspense>
      <NovaAnaliseInner/>
    </Suspense>
  )
}

// ─── Step Content ─────────────────────────────────────────────────────────────

function StepContent({
  step, form, set, objetivos, toggleObjetivo,
  files, dragging, setDragging, addFiles, removeFile,
  formatBytes, fileIcon, fileInputRef, accepted,
}: {
  step:           number
  form:           Record<string, string>
  set:            (field: string, value: string) => void
  objetivos:      string[]
  toggleObjetivo: (o: string) => void
  files:          File[]
  dragging:       boolean
  setDragging:    (v: boolean) => void
  addFiles:       (f: FileList | File[]) => void
  removeFile:     (i: number) => void
  formatBytes:    (b: number) => string
  fileIcon:       (name: string) => string
  fileInputRef:   React.RefObject<HTMLInputElement | null>
  accepted:       string
}) {

  // ── Step 0: Proprietário ─────────────────────────────────────────────────
  if (step === 0) return (
    <div className="space-y-5">
      <p className="text-[13px] text-ink-2 -mt-2">
        Dados do detentor do ativo — aparece nos documentos de captação e no relatório.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nome completo">
          <OttoInput
            value={form.nomeProprietario}
            onChange={e => set('nomeProprietario', e.target.value)}
            placeholder="Ex.: João Rodrigues da Silva"
          />
        </Field>
        <Field label="CPF / CNPJ">
          <OttoInput
            value={form.cpfCnpjProprietario}
            onChange={e => set('cpfCnpjProprietario', e.target.value)}
            placeholder="000.000.000-00"
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Telefone / WhatsApp">
          <OttoInput
            type="tel"
            value={form.telefoneProprietario}
            onChange={e => set('telefoneProprietario', e.target.value)}
            placeholder="(11) 99999-9999"
          />
        </Field>
        <Field label="Email">
          <OttoInput
            type="email"
            value={form.emailProprietario}
            onChange={e => set('emailProprietario', e.target.value)}
            placeholder="joao@empresa.com"
          />
        </Field>
      </div>
      <Field
        label="Informações complementares"
        help="Perfil, expectativas, contexto familiar, restrições, histórico relevante"
      >
        <OttoTextarea
          value={form.obsProprietario}
          onChange={e => set('obsProprietario', e.target.value)}
          rows={4}
          placeholder="Ex.: Proprietário de 2ª geração, busca liquidez parcial. Prefere não expor a identidade do ativo inicialmente. Tem sócio minoritário que não está alinhado..."
        />
      </Field>
    </div>
  )

  // ── Step 1: Mandato ───────────────────────────────────────────────────────
  if (step === 1) return (
    <div className="space-y-6">
      <p className="text-[13px] text-ink-2 -mt-2">
        Formaliza a origem e a responsabilidade comercial do deal dentro do escritório.
      </p>

      {/* Assessor */}
      <div>
        <h3 className="text-[12px] font-semibold text-ink uppercase tracking-wider mb-3">Assessor responsável pela captação *</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nome completo *">
              <OttoInput
                value={form.assessorNome}
                onChange={e => set('assessorNome', e.target.value)}
                placeholder="Ex.: Maria Costa"
              />
            </Field>
            <Field label="Telefone / WhatsApp">
              <OttoInput
                type="tel"
                value={form.assessorTelefone}
                onChange={e => set('assessorTelefone', e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </Field>
          </div>
          <Field label="Email">
            <OttoInput
              type="email"
              value={form.assessorEmail}
              onChange={e => set('assessorEmail', e.target.value)}
              placeholder="assessor@escritorio.com.br"
            />
          </Field>
        </div>
      </div>

      {/* Parceiro intermediário */}
      <div className="border-t border-border pt-5">
        <div className="flex items-baseline gap-2 mb-3">
          <h3 className="text-[12px] font-semibold text-ink uppercase tracking-wider">Parceiro intermediário</h3>
          <span className="text-[11px] text-ink-3">opcional</span>
        </div>
        <p className="text-[12px] text-ink-3 mb-4">
          Quem originou ou indicou este ativo ao escritório. Inclua apenas se houver vínculo comercial formal.
        </p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nome do parceiro">
              <OttoInput
                value={form.parceiroNome}
                onChange={e => set('parceiroNome', e.target.value)}
                placeholder="Ex.: Carlos Intermediador"
              />
            </Field>
            <Field label="Telefone / WhatsApp">
              <OttoInput
                type="tel"
                value={form.parceiroTelefone}
                onChange={e => set('parceiroTelefone', e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </Field>
          </div>
          <Field label="Email">
            <OttoInput
              type="email"
              value={form.parceiroEmail}
              onChange={e => set('parceiroEmail', e.target.value)}
              placeholder="parceiro@email.com"
            />
          </Field>
          <Field label="Observações do mandato" help="Condições acordadas, comissão, restrições de divulgação">
            <OttoTextarea
              value={form.obsMandato}
              onChange={e => set('obsMandato', e.target.value)}
              rows={3}
              placeholder="Ex.: Deal originado via rede de parceiros XYZ. Comissão acordada: 1,5% sobre o transaction value..."
            />
          </Field>
        </div>
      </div>
    </div>
  )

  // ── Step 2: Identificação do Ativo ───────────────────────────────────────
  if (step === 2) return (
    <div className="space-y-5">
      <Field label="Nome do Ativo *" help="Como você identifica este deal internamente">
        <OttoInput
          value={form.nomeAtivo}
          onChange={e => set('nomeAtivo', e.target.value)}
          placeholder="Ex: Rede de Franquias ABC / Imóvel Lapa SP"
        />
      </Field>
      <Field label="Tipo de Ativo *">
        <OttoSelect value={form.tipoAtivo} onChange={e => set('tipoAtivo', e.target.value)}>
          <option value="">Selecione...</option>
          {TIPOS_ATIVO.map(o => <option key={o}>{o}</option>)}
        </OttoSelect>
      </Field>
    </div>
  )

  // ── Step 3: Localização & Estágio ─────────────────────────────────────────
  if (step === 3) return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <Field label="Cidade *">
          <OttoInput value={form.cidade} onChange={e => set('cidade', e.target.value)} placeholder="São Paulo"/>
        </Field>
        <Field label="Estado *">
          <OttoInput value={form.estado} onChange={e => set('estado', e.target.value)} placeholder="SP"/>
        </Field>
        <Field label="País *">
          <OttoInput value={form.pais} onChange={e => set('pais', e.target.value)} placeholder="Brasil"/>
        </Field>
      </div>
      <Field label="Estágio Atual *">
        <OttoSelect value={form.estagio} onChange={e => set('estagio', e.target.value)}>
          <option value="">Selecione...</option>
          {ESTAGIOS.map(o => <option key={o}>{o}</option>)}
        </OttoSelect>
      </Field>
    </div>
  )

  // ── Step 4: Objetivo da Operação ──────────────────────────────────────────
  if (step === 4) return (
    <div>
      <p className="text-[13px] text-ink-3 mb-4">Selecione um ou mais objetivos para este mandato.</p>
      <div className="grid grid-cols-2 gap-2">
        {OBJETIVOS.map(o => (
          <button
            key={o}
            type="button"
            onClick={() => toggleObjetivo(o)}
            className={`text-left px-3.5 py-3 rounded-[10px] border text-[13px] transition-all ${
              objetivos.includes(o)
                ? 'border-accent-strong bg-accent-soft text-accent-ink font-medium'
                : 'border-border bg-surface text-ink-2 hover:border-border-strong'
            }`}
          >
            {objetivos.includes(o) && <span className="text-accent-strong mr-1.5 font-bold">✓</span>}
            {o}
          </button>
        ))}
      </div>
      {objetivos.length > 0 && (
        <p className="text-[12px] text-accent-ink mt-3">
          {objetivos.length} selecionado(s): {objetivos.join(' · ')}
        </p>
      )}
    </div>
  )

  // ── Step 5: Dados Financeiros ─────────────────────────────────────────────
  if (step === 5) return (
    <div className="space-y-5">
      <Field label="Ticket Estimado *" help="Valor esperado da transação ou captação">
        <OttoInput
          value={form.ticketEstimado}
          onChange={e => set('ticketEstimado', e.target.value)}
          placeholder="Ex: R$ 20M a R$ 30M"
        />
      </Field>
      <Field label="Nível de Informação Disponível *">
        <OttoSelect value={form.nivelInformacao} onChange={e => set('nivelInformacao', e.target.value)}>
          <option value="">Selecione...</option>
          {NIVEIS_INFO.map(o => <option key={o}>{o}</option>)}
        </OttoSelect>
      </Field>
    </div>
  )

  // ── Step 6: Tese do Ativo ─────────────────────────────────────────────────
  if (step === 6) return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {MICRO_HINTS.map(h => (
          <span key={h} className="text-[11px] text-ink-3 bg-bg-tint border border-border rounded px-2 py-1">{h}</span>
        ))}
      </div>
      <OttoTextarea
        value={form.resumoAtivo}
        onChange={e => set('resumoAtivo', e.target.value)}
        rows={8}
        placeholder="Ex: Empresa familiar, 2ª geração, sócios alinhados. Nunca foi ao mercado. Urgência moderada — sócio majoritário quer liquidez nos próximos 18 meses..."
      />
    </div>
  )

  // ── Step 7: Documentos ────────────────────────────────────────────────────
  if (step === 7) return (
    <div>
      <p className="text-[13px] text-ink-3 mb-4">
        Suba todos os documentos disponíveis: balanços, DRE, contratos, laudos, apresentações, cap table.
        Aceita PDF, Word, Excel, CSV, PNG, JPG. Quanto mais completa a documentação, mais precisa a análise.
      </p>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-[14px] p-10 text-center cursor-pointer transition-all ${
          dragging ? 'border-accent-strong bg-accent-soft/30' : 'border-border hover:border-border-strong hover:bg-surface-hover'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accepted}
          className="hidden"
          onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }}
        />
        <div className="text-3xl mb-2">📂</div>
        <p className="text-ink-2 text-[13px] font-medium">Clique para selecionar ou arraste os arquivos</p>
        <p className="text-ink-3 text-[11px] mt-1">PDF · Word · Excel · CSV · PNG · JPG — máx. {MAX_FILE_MB}MB por arquivo</p>
      </div>
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-3 bg-surface border border-border rounded-[10px] px-3 py-2.5">
              <span className="text-base flex-none">{fileIcon(file.name)}</span>
              <span className="text-[13px] text-ink-2 truncate flex-1">{file.name}</span>
              <span className="text-[11px] text-ink-3 flex-none">{formatBytes(file.size)}</span>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); removeFile(i) }}
                className="text-ink-3 hover:text-[oklch(0.6_0.16_25)] transition-colors text-[13px] flex-none"
              >✕</button>
            </div>
          ))}
          <p className="text-[12px] text-accent-ink pt-1">{files.length} arquivo(s) selecionado(s)</p>
        </div>
      )}
    </div>
  )

  return null
}
