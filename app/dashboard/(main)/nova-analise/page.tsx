'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Topbar from '@/components/Topbar'
import { OttoInput, OttoTextarea, OttoSelect, Field } from '@/components/form-primitives'
import { IconArrowRight, IconSparkle } from '@/components/Icons'
import SaldoPacoteAviso from '@/components/SaldoPacoteAviso'
import { AnaliseCreateSchema } from '@/lib/schemas'
import { maskCpfCnpj, maskTelefone } from '@/lib/masks'
import { getDocsCriticos, formatDocsCriticosUI } from '@/lib/documentos/criticidade-cri-cra'
import { z } from 'zod'

// ─── Constants ────────────────────────────────────────────────────────────────

type Pilar = 'ma' | 'fidc' | 'cri_cra' | 'asset_prep'

const PILARES: { value: Pilar; label: string; sub: string }[] = [
  { value: 'ma',         label: 'M&A e Aquisições',    sub: 'Venda de empresa, participação, fusão, due diligence' },
  { value: 'fidc',       label: 'FIDC e Securitização', sub: 'FIDC, FIDC-IE, portfólio de crédito, lastro de recebíveis' },
  { value: 'cri_cra',   label: 'CRI e CRA',            sub: 'Certificados de recebíveis imobiliários e do agronegócio' },
  { value: 'asset_prep', label: 'Preparação de Ativo',  sub: 'Diagnóstico de prontidão e estruturação para o mercado' },
]

const TIPOS_MA = ['Empresa (M&A)', 'Imóvel / Real Estate', 'Startup / Scale-up', 'Franquia', 'Agronegócio', 'Outro']
const TIPOS_FIDC = ['FIDC / Crédito Estruturado', 'FIDC de Infraestrutura (incentivado)', 'Portfólio de Crédito']

const TIPOS_RECEBIVEL = ['Duplicatas / Notas comerciais', 'Cartão de crédito', 'Consignado', 'Cheques', 'Contratos / Prestação de serviços', 'CCB / Crédito bancário', 'Imobiliário', 'Precatórios', 'Outro']
const CATEGORIAS_CRI  = ['Residencial', 'Corporativo', 'Híbrido']
const SEGMENTOS_CRI   = ['Apartamentos ou casas', 'Loteamento', 'Industrial', 'Logístico', 'Comercial / Corporativo', 'Shopping / Lojas', 'Infraestrutura', 'Hotel', 'Outro']
const ATIVIDADES_DEVEDOR = ['Cooperativa', 'Produtor Rural', 'Terceiro Fornecedor', 'Terceiro Comprador']
const SEGMENTOS_AGRO  = ['Grãos', 'Usina', 'Logística', 'Híbrido', 'Outro']
const ESTAGIOS        = ['Projeto Pré-Operacional', 'Estruturando', 'Estruturado', 'Em comercialização', 'Em negociação / Closing']
const NIVEIS_INFO     = ['Baixo (poucos dados formais)', 'Médio (dados parciais)', 'Alto (DRE, balanço e documentos disponíveis)']
const OPERACAO        = ['Sim: já há operação/receita', 'Não: projeto pré-operacional (sem histórico financeiro)']

const SETORES_MA = ['Tecnologia / SaaS', 'Agronegócio', 'Saúde / Pharma', 'Indústria / Manufatura', 'Varejo / Consumo', 'Serviços / Educação', 'Imóveis / Real Estate', 'Energia / Infraestrutura', 'Financeiro / Fintechs', 'Outro']

const TIPOS_TRANSACAO_MA = ['Vender 100%', 'Vender participação', 'Captar investimento', 'Fusão / Incorporação', 'Diagnóstico / Due Diligence']

// Micro-hints da Tese adaptados por pilar
const MICRO_HINTS: Record<Pilar, string[]> = {
  ma: [
    'O ativo já foi ao mercado anteriormente?',
    'Nível de urgência da operação?',
    'Há conflitos societários entre sócios?',
    'Já houve contato com compradores ou investidores?',
    'Há pendências documentais já conhecidas?',
    'Situações excepcionais que não aparecem formalmente?',
  ],
  fidc: [
    'Qual é o histórico de inadimplência do cedente?',
    'Há concentração relevante por sacado?',
    'A estrutura de cotas já foi negociada com o gestor?',
    'Há garantias adicionais além do lastro?',
    'Critérios de elegibilidade dos recebíveis já definidos?',
  ],
  cri_cra: [
    'O imóvel/devedor já tem outros ônus?',
    'Há operação anterior a reabrir ou é nova emissão?',
    'O rating já foi discutido com alguma agência?',
    'Há garantias reais além da securitização?',
    'Prazo previsto de distribuição?',
  ],
  asset_prep: [
    'Principal gap para o mercado de capitais (governança, financeiro, jurídico)?',
    'Já houve tentativa anterior de captação? O que travou?',
    'O horizonte de captação é rígido ou flexível?',
    'Há sócios ou investidores que precisam ser desligados antes?',
    'Alguma reestruturação em andamento?',
  ],
}

const ACCEPTED     = '.pdf,.docx,.xls,.xlsx,.csv,.tsv,.txt,.md,.json,.png,.jpg,.jpeg,.webp,.gif'
const ACCEPTED_EXTS = new Set(['pdf','docx','xls','xlsx','csv','tsv','txt','md','json','png','jpg','jpeg','webp','gif'])
const MAX_FILE_MB  = 20
const DRAFT_KEY    = 'otto-intake-draft'
const DRAFT_VERSION = 5  // v5: novo fluxo por pilar (Originação Estruturada)

// ─── Steps & Sections ─────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Proprietário',               section: 0 },
  { label: 'Mandato',                    section: 1 },
  { label: 'Classificação Estratégica', section: 2 },
  { label: 'Estrutura da Operação',      section: 2 },
  { label: 'Contexto & Estágio',         section: 2 },
  { label: 'Tese da Operação',           section: 2 },
  { label: 'Documentos',                 section: 2 },
]

const SECTIONS = [
  { label: 'Proprietário', start: 0, end: 0 },
  { label: 'Mandato',      start: 1, end: 1 },
  { label: 'Operação',     start: 2, end: 6 },
]

// ─── Field labels for error messages ─────────────────────────────────────────

const FIELD_LABELS: Record<string, { label: string; step: number }> = {
  nomeAtivo:             { label: 'Nome do ativo',                step: 2 },
  tipoAtivo:             { label: 'Tipo de ativo',                step: 2 },
  pilarOperacao:         { label: 'Pilar da operação',            step: 2 },
  cedente:               { label: 'Cedente / Originador',         step: 3 },
  tipoRecebivel:         { label: 'Tipo de recebível',            step: 3 },
  statusRecebivel:       { label: 'Status do recebível',          step: 3 },
  estruturaCedenteSacado:    { label: 'Estrutura cedente × sacado',   step: 3 },
  cedenteCotistaSubordinado: { label: 'Cedente cotista subordinado',   step: 3 },
  tipoOferta:            { label: 'Tipo de oferta',               step: 3 },
  estruturaCotas:        { label: 'Estrutura de cotas',           step: 3 },
  serieEmissao:          { label: 'Série / emissão',              step: 3 },
  categoriaCri:          { label: 'Categoria CRI',                step: 3 },
  concentracaoCri:       { label: 'Concentração CRI',             step: 3 },
  segmentoImobiliario:   { label: 'Segmento imobiliário',         step: 3 },
  atividadeDevedor:      { label: 'Atividade do devedor (CRA)',   step: 3 },
  revolvencia:           { label: 'Revolvência (CRA)',            step: 3 },
  criteriosUnderwriting: { label: 'Critérios de underwriting',    step: 3 },
  segmentoAgro:          { label: 'Segmento agrícola',            step: 3 },
  estagio:               { label: 'Estágio atual',                step: 4 },
  localizacao:           { label: 'Localização (cidade/estado)',  step: 4 },
  objetivo:              { label: 'Objetivo da operação',         step: 4 },
  ticketEstimado:        { label: 'Ticket estimado',              step: 4 },
  nivelInformacao:       { label: 'Nível de informação',          step: 4 },
  operacaoEmAndamento:   { label: 'Operação em andamento',        step: 4 },
  resumoAtivo:           { label: 'Tese da Operação',             step: 5 },
  informacoesAdicionais: { label: 'Tese da Operação',             step: 5 },
  nomeProprietario:      { label: 'Nome do proprietário',         step: 0 },
  cpfCnpjProprietario:   { label: 'CPF / CNPJ do proprietário',   step: 0 },
  telefoneProprietario:  { label: 'Telefone do proprietário',     step: 0 },
  emailProprietario:     { label: 'Email do proprietário',        step: 0 },
  obsProprietario:       { label: 'Observações do proprietário',  step: 0 },
  assessorNome:          { label: 'Nome do assessor',             step: 1 },
  assessorTelefone:      { label: 'Telefone do assessor',         step: 1 },
  assessorEmail:         { label: 'Email do assessor',            step: 1 },
  parceiroNome:          { label: 'Nome do parceiro',             step: 1 },
  parceiroTelefone:      { label: 'Telefone do parceiro',         step: 1 },
  parceiroEmail:         { label: 'Email do parceiro',            step: 1 },
  obsMandato:            { label: 'Observações do mandato',       step: 1 },
}

const EMAIL_FIELDS    = new Set(['emailProprietario', 'assessorEmail', 'parceiroEmail'])
const CPFCNPJ_FIELDS  = new Set(['cpfCnpjProprietario'])
const TELEFONE_FIELDS = new Set(['telefoneProprietario', 'assessorTelefone', 'parceiroTelefone'])

function describeIntakeErrors(error: z.ZodError): string {
  const parts = error.issues.map(iss => {
    const key   = String(iss.path[0] ?? '')
    const info  = FIELD_LABELS[key]
    const label = info?.label ?? key
    let why = iss.message
    if (iss.code === 'too_big' && 'maximum' in iss)   why = `muito longo (máximo ${iss.maximum} caracteres)`
    else if (iss.code === 'too_small')                why = 'obrigatório'
    else if (EMAIL_FIELDS.has(key))                   why = 'e-mail inválido'
    else if (CPFCNPJ_FIELDS.has(key))                 why = 'CPF ou CNPJ inválido'
    else if (TELEFONE_FIELDS.has(key))                why = 'telefone inválido (DDD + número)'
    const where = info ? ` — etapa ${info.step + 1}` : ''
    return `${label}: ${why}${where}`
  })
  const unique = Array.from(new Set(parts))
  return unique.length === 1
    ? `Não foi possível ativar. ${unique[0]}.`
    : `Corrija os campos antes de ativar: ${unique.join('; ')}.`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function NovaAnaliseInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step,          setStep]          = useState(0)
  const [loading,       setLoading]       = useState(false)
  const [loadingLabel,  setLoadingLabel]  = useState('')
  const [error,         setError]         = useState('')
  const [reformaTributaria, setReformaTributaria] = useState<'na' | 'possui' | 'diagnosticar'>('na')
  const [rtUnlocked,    setRtUnlocked]    = useState(false)
  const [files,         setFiles]         = useState<File[]>([])
  const [dragging,      setDragging]      = useState(false)
  const [draftRestored,  setDraftRestored]  = useState(false)
  const [draftAvailable, setDraftAvailable] = useState(false)
  const [lgpdConsent,    setLgpdConsent]    = useState(false)

  const [form, setForm] = useState({
    // ── Classificação ──────────────────────────────────────────────────────
    pilarOperacao:        searchParams.get('pilarOperacao') ?? '' as string,
    nomeAtivo:            searchParams.get('nomeAtivo') ?? '',
    tipoAtivo:            searchParams.get('tipoAtivo') ?? '',
    setorAtivo:           '',
    tipoTransacaoMA:      '',   // M&A: mapeado para objetivo no submit
    criOuCra:             '',   // 'cri' | 'cra' — distingue o sub-tipo dentro do pilar cri_cra
    // ── Estrutura de crédito ────────────────────────────────────────────────
    cedente:                   '',
    tipoRecebivel:             '',
    statusRecebivel:           '',
    estruturaCedenteSacado:    '',
    cedenteCotistaSubordinado: '',
    tipoOferta:                '',
    estruturaCotas:            '',
    cotaSeniorPct:             '',
    cotaMezaninoPct:           '',
    cotaSubordinadaPct:        '',
    serieEmissao:              '',
    // ── Classificação ANBIMA — CRI ──────────────────────────────────────────
    categoriaCri:              '',
    concentracaoCri:           '',
    segmentoImobiliario:       '',
    // ── Classificação ANBIMA — CRA ──────────────────────────────────────────
    atividadeDevedor:          '',
    revolvencia:               '',
    criteriosUnderwriting:     '',
    segmentoAgro:              '',
    // ── Contexto & Estágio ──────────────────────────────────────────────────
    cidade:               '',
    estado:               '',
    pais:                 'Brasil',
    estagio:              '',
    nivelInformacao:      '',
    operacaoEmAndamento:  '',
    ticketEstimado:       '',
    // ── Tese ────────────────────────────────────────────────────────────────
    resumoAtivo:          '',
    // ── Proprietário ────────────────────────────────────────────────────────
    nomeProprietario:     searchParams.get('nomeProprietario') ?? '',
    cpfCnpjProprietario:  '',
    telefoneProprietario: searchParams.get('telefoneProprietario') ?? '',
    emailProprietario:    '',
    obsProprietario:      '',
    // ── Mandato ─────────────────────────────────────────────────────────────
    assessorNome:         searchParams.get('assessorNome') ?? '',
    assessorTelefone:     '',
    assessorEmail:        '',
    parceiroNome:         searchParams.get('parceiroNome') ?? '',
    parceiroTelefone:     '',
    parceiroEmail:        '',
    obsMandato:           '',
    // ── Asset Preparation ───────────────────────────────────────────────────
    assetPrepTipoAtivo:           '',
    assetPrepReceitaAnual:        '',
    assetPrepEbitda:              '',
    assetPrepPatrimonioLiquido:   '',
    assetPrepAlavancagem:         '',
    assetPrepPosicaoMercado:      '',
    assetPrepAtratividade:        '',
    assetPrepMaturidade:          '',
    assetPrepTemGovernanca:       '',
    assetPrepTemBoard:            '',
    assetPrepHistoricoAnosOperacao: '',
    assetPrepObjetivoCapitacao:   '',
    assetPrepVolumeCapitacao:     '',
    assetPrepHorizonteCapitacao:  '',
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

  useEffect(() => {
    fetch('/api/reforma-tributaria/entitlement')
      .then(r => r.json())
      .then(d => setRtUnlocked(d?.enabled === true))
      .catch(() => setRtUnlocked(false))
  }, [])

  // M&A e Preparação de Ativo: Reforma Tributária é relevante por padrão.
  // Ao selecionar esses pilares, desbloqueamos o módulo e pré-selecionamos
  // 'diagnosticar' — o usuário ainda pode mudar para 'na' ou 'possui'.
  const pilarRT = form.pilarOperacao as Pilar | ''
  useEffect(() => {
    if (pilarRT === 'ma' || pilarRT === 'asset_prep') {
      setRtUnlocked(true)
      setReformaTributaria(prev => prev === 'na' ? 'diagnosticar' : prev)
    }
  }, [pilarRT])

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const d = JSON.parse(raw)
      if (d.form) setForm(prev => {
        const known = Object.fromEntries(
          Object.entries(d.form as Record<string, unknown>).filter(([k]) => k in prev)
        )
        return { ...prev, ...known }
      })
      if (d.reformaTributaria) setReformaTributaria(d.reformaTributaria)
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
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: DRAFT_VERSION, form, reformaTributaria, step }))
  }, [form, reformaTributaria, step])

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function addFiles(incoming: FileList | File[]) {
    const arr   = Array.from(incoming)
    const valid = arr.filter(f => {
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        setError(`"${f.name}" excede ${MAX_FILE_MB}MB e foi ignorado.`)
        return false
      }
      const ext = f.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? ''
      if (!ACCEPTED_EXTS.has(ext)) {
        setError(`"${f.name}" está em formato não suportado e foi ignorado. Converta para PDF e tente novamente.`)
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
    if (ext === 'pdf')                               return 'PDF'
    if (['doc', 'docx'].includes(ext ?? ''))         return 'DOC'
    if (['xls', 'xlsx', 'csv'].includes(ext ?? ''))  return 'XLS'
    if (['png', 'jpg', 'jpeg'].includes(ext ?? ''))  return 'IMG'
    return 'ARQ'
  }

  const pilar = form.pilarOperacao as Pilar | ''
  const isCreditPilar = pilar === 'fidc' || pilar === 'cri_cra'

  function validateStep(): string | null {
    if (step === 1) {
      if (!form.assessorNome.trim()) return 'Informe o nome do assessor responsável.'
    }
    if (step === 2) {
      if (!form.pilarOperacao) return 'Selecione o pilar da operação.'
      if (!form.nomeAtivo.trim()) return 'Informe o nome do ativo ou operação.'
      if (!form.tipoAtivo) return 'Selecione o tipo específico da operação.'
    }
    if (step === 3) {
      // Validações específicas de crédito
      if (isCreditPilar) {
        const algumCota = form.cotaSeniorPct || form.cotaMezaninoPct || form.cotaSubordinadaPct
        if (algumCota) {
          const total = (parseFloat(form.cotaSeniorPct || '0') + parseFloat(form.cotaMezaninoPct || '0') + parseFloat(form.cotaSubordinadaPct || '0'))
          if (total !== 100) return `A soma das cotas (${total}%) deve ser exatamente 100%.`
        }
        if (form.revolvencia === 'com_revolvencia' && !form.criteriosUnderwriting.trim()) {
          return 'Carteiras com revolvência exigem critérios de underwriting documentados.'
        }
      }
    }
    if (step === 4) {
      if (!form.cidade.trim())           return 'Informe a cidade.'
      if (!form.estado.trim())           return 'Informe o estado.'
      if (!form.estagio)                 return 'Selecione o estágio atual.'
      if (!form.ticketEstimado.trim())   return 'Informe o ticket estimado.'
      if (!form.nivelInformacao)         return 'Selecione o nível de informação.'
      if (!form.operacaoEmAndamento)     return 'Informe se a operação já está em andamento.'
      // M&A exige nível médio ou alto
      if (pilar === 'ma' && form.nivelInformacao === 'Baixo (poucos dados formais)') {
        return 'Análises de M&A exigem no mínimo nível médio de informação.'
      }
      // M&A exige tipo de transação
      if (pilar === 'ma' && !form.tipoTransacaoMA) {
        return 'Selecione o tipo de transação.'
      }
    }
    if (step === 5) {
      if (!form.resumoAtivo.trim()) return 'A Tese da Operação é obrigatória. Descreva o contexto da operação.'
    }
    if (step === 6) {
      if (files.length === 0) return 'Adicione ao menos um documento.'
      if (!lgpdConsent)       return 'Confirme o consentimento LGPD antes de continuar.'
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

    // Derive objetivo e tipoAtivo final baseado no pilar
    let objetivoFinal = ''
    let tipoAtivoFinal = form.tipoAtivo
    if (pilar === 'ma') {
      objetivoFinal = form.tipoTransacaoMA || 'M&A'
    } else if (pilar === 'fidc') {
      objetivoFinal = 'Estruturar crédito'
    } else if (pilar === 'cri_cra') {
      objetivoFinal = 'Estruturar crédito'
      tipoAtivoFinal = 'Securitização (CRI / CRA)'
    } else if (pilar === 'asset_prep') {
      objetivoFinal = 'Preparar para o mercado'
      // Mapeia assetPrepTipoAtivo → tipoAtivo se não foi selecionado outro
      if (!tipoAtivoFinal && form.assetPrepTipoAtivo) {
        const map: Record<string, string> = {
          imobiliario: 'Imóvel / Real Estate',
          saas: 'Startup / Scale-up',
          recebivel: 'FIDC / Crédito Estruturado',
          agro: 'Agronegócio',
          industrial: 'Empresa (M&A)',
          infraestrutura: 'Empresa (M&A)',
          outro: 'Outro',
        }
        tipoAtivoFinal = map[form.assetPrepTipoAtivo] ?? 'Outro'
      }
    }

    const payload = {
      ...form,
      tipoAtivo:             tipoAtivoFinal || form.tipoAtivo || 'Outro',
      objetivo:              objetivoFinal,
      reformaTributaria:     rtUnlocked ? reformaTributaria : 'na',
      localizacao:           `${form.cidade} – ${form.estado}, ${form.pais}`,
      informacoesAdicionais: form.resumoAtivo,
      lgpdConsentimento:     `Consentimento LGPD registrado em ${new Date().toISOString()} — dados processados por IA para análise de deal conforme LGPD art. 7º, inc. V (execução de contrato).`,
    }

    delete (payload as Record<string, unknown>).linkDocumentos
    // Campos internos de UI que não vão para o schema
    delete (payload as Record<string, unknown>).tipoTransacaoMA
    delete (payload as Record<string, unknown>).criOuCra
    delete (payload as Record<string, unknown>).cidade
    delete (payload as Record<string, unknown>).estado

    const check = AnaliseCreateSchema.safeParse(payload)
    if (!check.success) {
      setError(describeIntakeErrors(check.error))
      return
    }

    setError('')
    setLoading(true)
    setLoadingLabel('Criando análise...')

    const res  = await fetch('/api/analise', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json()

    if (!res.ok) {
      const fieldErrors = data.details as Record<string, string[]> | undefined
      let msg = data.error ?? 'Erro ao criar análise.'
      if (fieldErrors && Object.keys(fieldErrors).length > 0) {
        const parts = Object.entries(fieldErrors).map(([key, errs]) => {
          const info = FIELD_LABELS[key]
          return `${info?.label ?? key}${info ? ` (etapa ${info.step + 1})` : ''}: ${errs[0]}`
        })
        msg = `Corrija os campos: ${parts.join('; ')}.`
      }
      setError(msg)
      setLoading(false)
      setLoadingLabel('')
      return
    }

    const { analiseId } = data

    setLoadingLabel('Preparando envio dos documentos...')
    const supabase = createClient()
    try {
      const urlRes = await fetch('/api/upload-url', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ analiseId, files: files.map(f => ({ name: f.name })) }),
      })
      if (!urlRes.ok) throw new Error('Falha ao preparar o envio dos documentos. Tente novamente.')
      const { urls } = await urlRes.json()

      for (let i = 0; i < files.length; i++) {
        const file    = files[i]
        const urlInfo = urls?.find((u: { originalName: string; token: string; path: string }) => u.originalName === file.name)
        if (!urlInfo?.token) throw new Error(`Não foi possível preparar o envio de "${file.name}". Tente novamente.`)
        setLoadingLabel(`Enviando documentos... (${i + 1}/${files.length}) ${file.name}`)
        const { error: upErr } = await supabase.storage.from('analises').uploadToSignedUrl(urlInfo.path, urlInfo.token, file)
        if (upErr) throw new Error(`Falha ao enviar "${file.name}". Verifique sua conexão e tente novamente.`)
      }
    } catch (e) {
      setError((e as Error).message || 'Falha ao enviar os documentos. Tente novamente.')
      setLoading(false)
      setLoadingLabel('')
      return
    }

    if (files.length > 0) {
      setLoadingLabel('Iniciando processamento dos documentos em background...')
      try {
        await fetch(`/api/analise/${analiseId}/ingest`, { method: 'POST' })
      } catch (e) {
        console.error('[ingest] dispatch failed:', e)
      }
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
        title="Originação Estruturada"
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
              <div key={si} className={si === 2 ? 'flex-[5]' : 'flex-1'}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  {isDone && <span className="text-[10px] text-ok font-bold leading-none">✓</span>}
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                    isDone ? 'text-ok' : isActive ? 'text-accent-strong' : 'text-ink-3'
                  }`}>{sec.label}</span>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: count }, (_, j) => (
                    <div key={j} className={`flex-1 h-[3px] rounded-sm transition-colors ${
                      step > sec.start + j ? 'bg-accent-strong' :
                      step === sec.start + j ? 'bg-accent' : 'bg-border'
                    }`}/>
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
            reformaTributaria={reformaTributaria}
            setReformaTributaria={setReformaTributaria}
            rtUnlocked={rtUnlocked}
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

          {isLast && (
            <div className={`mt-6 rounded-[10px] border p-4 transition-colors ${lgpdConsent ? 'bg-ok/5 border-ok/30' : 'bg-surface border-border'}`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lgpdConsent}
                  onChange={e => setLgpdConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-border accent-accent-strong cursor-pointer flex-shrink-0"
                />
                <div>
                  <p className="text-[12.5px] font-semibold text-ink mb-1">
                    Consentimento para processamento de dados (LGPD)
                  </p>
                  <p className="text-[11.5px] text-ink-2 leading-relaxed">
                    Autorizo o processamento dos dados deste intake e dos documentos enviados por sistemas de inteligência artificial
                    para fins de análise e geração de relatórios de deal, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018),
                    art. 7º, inc. V: execução de contrato ou procedimentos preliminares.
                    Os dados serão armazenados com segurança e não serão utilizados para treinamento de modelos de IA.
                  </p>
                </div>
              </label>
            </div>
          )}

          {error && (
            <div className="mt-5 bg-warn-soft border border-[oklch(0.85_0.06_75)] text-[oklch(0.45_0.1_65)] text-[13px] px-4 py-3 rounded-[10px]">
              {error}
            </div>
          )}

          {isLast && <div className="mt-8"><SaldoPacoteAviso/></div>}

          <div className={`flex gap-3 justify-end ${isLast ? 'mt-4' : 'mt-8'}`}>
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
                {loading ? <>{loadingLabel || 'Processando...'}</> : <><IconSparkle size={14}/> Ativar análise</>}
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
          O Mandor valida o preenchimento e ativa os especialistas automaticamente. Entrega em até 90 minutos.
        </p>
      </div>
    </div>
  )
}

export default function NovaAnalisePage() {
  return (
    <Suspense>
      <NovaAnaliseInner/>
    </Suspense>
  )
}

// ─── Step Content ─────────────────────────────────────────────────────────────

function StepContent({
  step, form, set,
  reformaTributaria, setReformaTributaria, rtUnlocked,
  files, dragging, setDragging, addFiles, removeFile,
  formatBytes, fileIcon, fileInputRef, accepted,
}: {
  step:           number
  form:           Record<string, string>
  set:            (field: string, value: string) => void
  reformaTributaria:    'na' | 'possui' | 'diagnosticar'
  setReformaTributaria: (v: 'na' | 'possui' | 'diagnosticar') => void
  rtUnlocked:           boolean
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
  const pilar = form.pilarOperacao as Pilar | ''

  // ── Step 0: Proprietário ────────────────────────────────────────────────────
  if (step === 0) return (
    <div className="space-y-5">
      <p className="text-[13px] text-ink-2 -mt-2">
        Dados do detentor do ativo: aparecem nos documentos de captação e no relatório.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nome completo">
          <OttoInput value={form.nomeProprietario} onChange={e => set('nomeProprietario', e.target.value)} placeholder="Ex.: João Rodrigues da Silva"/>
        </Field>
        <Field label="CPF / CNPJ">
          <OttoInput value={form.cpfCnpjProprietario} onChange={e => set('cpfCnpjProprietario', maskCpfCnpj(e.target.value))} inputMode="numeric" maxLength={18} placeholder="000.000.000-00"/>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Telefone / WhatsApp">
          <OttoInput type="tel" value={form.telefoneProprietario} onChange={e => set('telefoneProprietario', maskTelefone(e.target.value))} inputMode="numeric" maxLength={15} placeholder="(11) 99999-9999"/>
        </Field>
        <Field label="Email">
          <OttoInput type="email" value={form.emailProprietario} onChange={e => set('emailProprietario', e.target.value)} placeholder="joao@empresa.com"/>
        </Field>
      </div>
      <Field label="Informações complementares" help="Perfil, expectativas, contexto familiar, restrições, histórico relevante">
        <OttoTextarea value={form.obsProprietario} onChange={e => set('obsProprietario', e.target.value)} rows={4} placeholder="Ex.: Proprietário de 2ª geração, busca liquidez parcial. Prefere não expor a identidade do ativo inicialmente..."/>
      </Field>
    </div>
  )

  // ── Step 1: Mandato ─────────────────────────────────────────────────────────
  if (step === 1) return (
    <div className="space-y-6">
      <p className="text-[13px] text-ink-2 -mt-2">
        Formaliza a origem e a responsabilidade comercial do deal dentro do escritório.
      </p>
      <div>
        <h3 className="text-[12px] font-semibold text-ink uppercase tracking-wider mb-3">Assessor responsável pela captação *</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nome completo *">
              <OttoInput value={form.assessorNome} onChange={e => set('assessorNome', e.target.value)} placeholder="Ex.: Maria Costa"/>
            </Field>
            <Field label="Telefone / WhatsApp">
              <OttoInput type="tel" value={form.assessorTelefone} onChange={e => set('assessorTelefone', maskTelefone(e.target.value))} inputMode="numeric" maxLength={15} placeholder="(11) 99999-9999"/>
            </Field>
          </div>
          <Field label="Email">
            <OttoInput type="email" value={form.assessorEmail} onChange={e => set('assessorEmail', e.target.value)} placeholder="assessor@escritorio.com.br"/>
          </Field>
        </div>
      </div>
      <div className="border-t border-border pt-5">
        <div className="flex items-baseline gap-2 mb-3">
          <h3 className="text-[12px] font-semibold text-ink uppercase tracking-wider">Parceiro intermediário</h3>
          <span className="text-[11px] text-ink-3">opcional</span>
        </div>
        <p className="text-[12px] text-ink-3 mb-4">Quem originou ou indicou este ativo ao escritório. Inclua apenas se houver vínculo comercial formal.</p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nome do parceiro">
              <OttoInput value={form.parceiroNome} onChange={e => set('parceiroNome', e.target.value)} placeholder="Ex.: Carlos Intermediador"/>
            </Field>
            <Field label="Telefone / WhatsApp">
              <OttoInput type="tel" value={form.parceiroTelefone} onChange={e => set('parceiroTelefone', maskTelefone(e.target.value))} inputMode="numeric" maxLength={15} placeholder="(11) 99999-9999"/>
            </Field>
          </div>
          <Field label="Email">
            <OttoInput type="email" value={form.parceiroEmail} onChange={e => set('parceiroEmail', e.target.value)} placeholder="parceiro@email.com"/>
          </Field>
          <Field label="Observações do mandato" help="Condições acordadas, comissão, restrições de divulgação">
            <OttoTextarea value={form.obsMandato} onChange={e => set('obsMandato', e.target.value)} rows={3} placeholder="Ex.: Deal originado via rede de parceiros XYZ. Comissão acordada: 1,5% sobre o transaction value..."/>
          </Field>
        </div>
      </div>
    </div>
  )

  // ── Step 2: Classificação Estratégica ──────────────────────────────────────
  if (step === 2) return (
    <div className="space-y-6">
      <p className="text-[13px] text-ink-2 -mt-2">
        Identifica o pilar da operação e roteia toda a análise para o caminho correto.
      </p>

      {/* 4 pillar cards */}
      <div className="grid grid-cols-2 gap-3">
        {PILARES.map(p => (
          <button
            key={p.value}
            type="button"
            onClick={() => {
              set('pilarOperacao', p.value)
              set('tipoAtivo', '')
              if (p.value === 'cri_cra') set('tipoAtivo', 'Securitização (CRI / CRA)')
            }}
            className={`text-left p-4 rounded-[12px] border-2 transition-all ${
              form.pilarOperacao === p.value
                ? 'border-accent-strong bg-accent-soft'
                : 'border-border bg-surface hover:border-border-strong'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              {form.pilarOperacao === p.value && <span className="text-[10px] text-accent-strong font-bold">Selecionado</span>}
            </div>
            <p className={`text-[13px] font-semibold mb-1 ${form.pilarOperacao === p.value ? 'text-accent-ink' : 'text-ink'}`}>{p.label}</p>
            <p className="text-[11px] text-ink-3 leading-snug">{p.sub}</p>
          </button>
        ))}
      </div>

      {/* Nome do ativo — só aparece após selecionar pilar */}
      {form.pilarOperacao && (
        <div className="pt-2 border-t border-border space-y-4">
          <Field label="Nome da operação *" help="Como você identifica este deal internamente">
            <OttoInput
              value={form.nomeAtivo}
              onChange={e => set('nomeAtivo', e.target.value)}
              placeholder={
                pilar === 'ma'         ? 'Ex.: Rede de Franquias ABC' :
                pilar === 'fidc'       ? 'Ex.: FIDC Varejista XYZ' :
                pilar === 'cri_cra'    ? 'Ex.: CRI Residencial Lapa / CRA Grãos GO' :
                'Ex.: Tech Solutions — diagnóstico de prontidão'
              }
            />
          </Field>

          {/* Sub-tipo por pilar */}
          {pilar === 'ma' && (
            <Field label="Tipo de ativo *">
              <OttoSelect value={form.tipoAtivo} onChange={e => set('tipoAtivo', e.target.value)}>
                <option value="">Selecione...</option>
                {TIPOS_MA.map(o => <option key={o}>{o}</option>)}
              </OttoSelect>
            </Field>
          )}
          {pilar === 'fidc' && (
            <Field label="Tipo de estrutura *">
              <OttoSelect value={form.tipoAtivo} onChange={e => set('tipoAtivo', e.target.value)}>
                <option value="">Selecione...</option>
                {TIPOS_FIDC.map(o => <option key={o}>{o}</option>)}
              </OttoSelect>
            </Field>
          )}
          {pilar === 'cri_cra' && (
            <Field label="Certificado *" help="Define a legislação aplicável e os campos ANBIMA obrigatórios">
              <div className="grid grid-cols-2 gap-3">
                {(['cri', 'cra'] as const).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => set('criOuCra', v)}
                    className={`py-3 rounded-[10px] border text-[13px] font-medium transition-all ${
                      form.criOuCra === v
                        ? 'border-accent-strong bg-accent-soft text-accent-ink'
                        : 'border-border bg-surface text-ink-2 hover:border-border-strong'
                    }`}
                  >
                    {v === 'cri' ? 'CRI — Imobiliário' : 'CRA — Agronegócio'}
                  </button>
                ))}
              </div>
            </Field>
          )}
          {pilar === 'asset_prep' && (
            <Field label="Tipo de ativo *">
              <OttoSelect value={form.tipoAtivo} onChange={e => { set('tipoAtivo', e.target.value); set('assetPrepTipoAtivo', e.target.value) }}>
                <option value="">Selecione...</option>
                <option value="imobiliario">Imobiliário</option>
                <option value="saas">SaaS / Tecnologia</option>
                <option value="recebivel">Recebível / Crédito</option>
                <option value="agro">Agronegócio</option>
                <option value="industrial">Industrial</option>
                <option value="infraestrutura">Infraestrutura</option>
                <option value="outro">Outro</option>
              </OttoSelect>
            </Field>
          )}
        </div>
      )}
    </div>
  )

  // ── Step 3: Estrutura da Operação ──────────────────────────────────────────
  if (step === 3) {
    // ── M&A ──
    if (pilar === 'ma') return (
      <div className="space-y-5">
        <p className="text-[13px] text-ink-2 -mt-2">Campos específicos para M&A. Tudo opcional — preencha o que estiver disponível.</p>

        <Field label="Tipo de transação *">
          <OttoSelect value={form.tipoTransacaoMA} onChange={e => set('tipoTransacaoMA', e.target.value)}>
            <option value="">Selecione...</option>
            {TIPOS_TRANSACAO_MA.map(o => <option key={o}>{o}</option>)}
          </OttoSelect>
        </Field>

        <Field label="Setor de atuação" help="Auxilia os agentes de benchmarking e valuation setorial">
          <OttoSelect value={form.setorAtivo} onChange={e => set('setorAtivo', e.target.value)}>
            <option value="">Selecione (opcional)...</option>
            {SETORES_MA.map(o => <option key={o}>{o}</option>)}
          </OttoSelect>
        </Field>

        {/* Reforma Tributária — opt-in premium */}
        <div className="pt-5 border-t border-border">
          <div className="flex items-center gap-2 mb-1.5">
            <p className="text-[13px] font-semibold text-ink">Adequação à Reforma Tributária</p>
            <span className="text-[9px] font-semibold uppercase tracking-wide text-accent-strong border border-accent-strong/40 rounded px-1.5 py-0.5">Premium</span>
          </div>
          <p className="text-[12px] text-ink-3 mb-4 leading-relaxed">
            Rastreio de conformidade tributária e impactos da Reforma (EC 132/2023) sobre a operação.
          </p>
          {rtUnlocked ? (
            <div className="grid gap-2">
              {([
                { v: 'na' as const,           t: 'Não incluir nesta análise',             d: 'O diagnóstico tributário não será gerado.' },
                { v: 'possui' as const,       t: 'Empresa já possui análise de adequação', d: 'Marca como já adequada; sem novo diagnóstico.' },
                { v: 'diagnosticar' as const, t: 'Ativar Módulo Reforma Tributária',       d: 'Diagnóstico completo de adequação (EC 132/2023).' },
              ]).map(opt => (
                <button key={opt.v} type="button" onClick={() => setReformaTributaria(opt.v)}
                  className={`text-left px-3.5 py-3 rounded-[10px] border text-[13px] transition-all ${
                    reformaTributaria === opt.v ? 'border-accent-strong bg-accent-soft text-accent-ink font-medium' : 'border-border bg-surface text-ink-2 hover:border-border-strong'
                  }`}
                >
                  <span className="flex items-center">
                    {reformaTributaria === opt.v && <span className="text-accent-strong mr-1.5 font-bold">✓</span>}
                    {opt.t}
                  </span>
                  <span className="block text-[11px] text-ink-3 mt-0.5 font-normal">{opt.d}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-[10px] border border-border bg-surface-2 px-4 py-3.5 opacity-90">
              <p className="text-[12px] text-ink-2">
                Recurso disponível em planos avançados.{' '}
                <a href="/dashboard/planos" className="text-accent-strong font-medium underline-offset-2 hover:underline">Conheça os planos</a>.
              </p>
            </div>
          )}
        </div>
      </div>
    )

    // ── FIDC ──
    if (pilar === 'fidc') return (
      <div className="space-y-5">
        <p className="text-[13px] text-ink-2 -mt-2">Contexto do lastro e da operação para a Mesa de Crédito. Tudo opcional.</p>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Cedente / Originador" help="Quem origina os recebíveis">
            <OttoInput value={form.cedente} onChange={e => set('cedente', e.target.value)} placeholder="Ex.: Varejista ABC Ltda"/>
          </Field>
          <Field label="Tipo de recebível" help="Natureza do lastro">
            <OttoSelect value={form.tipoRecebivel} onChange={e => set('tipoRecebivel', e.target.value)}>
              <option value="">Selecione...</option>
              {TIPOS_RECEBIVEL.map(o => <option key={o}>{o}</option>)}
            </OttoSelect>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Status do recebível" help="Determina a classificação padronizado / não padronizado (CVM)">
            <OttoSelect value={form.statusRecebivel} onChange={e => set('statusRecebivel', e.target.value)}>
              <option value="">Não informado</option>
              <option value="performado">Performado — serviço/venda já ocorreu</option>
              <option value="a_performar">A performar — ainda vai ocorrer</option>
              <option value="vencido_nao_pago">Vencido e não pago (FIDC NP)</option>
            </OttoSelect>
          </Field>
          <Field label="Estrutura cedente × sacado" help="Define onde está o risco de crédito">
            <OttoSelect value={form.estruturaCedenteSacado} onChange={e => set('estruturaCedenteSacado', e.target.value)}>
              <option value="">Não informado</option>
              <option value="monocedente_multisacados">Monocedente / Multisacados</option>
              <option value="multicedentes_monosacado">Multicedentes / Monosacado (FIDC Fornecedores)</option>
              <option value="multicedentes_multisacados">Multicedentes / Multisacados (Fomento Mercantil)</option>
            </OttoSelect>
          </Field>
        </div>

        {form.statusRecebivel === 'vencido_nao_pago' && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-800">
            Recebíveis vencidos e não pagos são classificados como <strong>FIDC Não Padronizado</strong> pela CVM — restrito a investidores profissionais.
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Cedente cotista subordinado?" help="Alinhamento de interesses — boa prática de governança">
            <OttoSelect value={form.cedenteCotistaSubordinado} onChange={e => set('cedenteCotistaSubordinado', e.target.value)}>
              <option value="">Não informado</option>
              <option value="sim">Sim — cedente participa como cotista subordinado</option>
              <option value="nao">Não — cedente não participa</option>
              <option value="nao_definido">A definir</option>
            </OttoSelect>
          </Field>
          <Field label="Tipo de oferta" help="ICVM 476: máx 75 investidores profissionais, sem prospecto nem rating obrigatório">
            <OttoSelect value={form.tipoOferta} onChange={e => set('tipoOferta', e.target.value)}>
              <option value="">Não informado</option>
              <option value="icvm_400">ICVM 400 — Oferta pública (rating obrigatório)</option>
              <option value="icvm_476">ICVM 476 — Oferta restrita (até 75 profissionais)</option>
              <option value="nao_definido">A definir</option>
            </OttoSelect>
          </Field>
        </div>

        <Field label="Estrutura de cotas / tranches" help="Distribuição por tranche — a soma deve ser exatamente 100%">
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-ink-3 mb-1">Sênior (%)</label>
                <OttoInput type="number" min={0} max={100} value={form.cotaSeniorPct} onChange={e => set('cotaSeniorPct', e.target.value)} placeholder="Ex.: 80"/>
              </div>
              <div>
                <label className="block text-[11px] text-ink-3 mb-1">Mezanino (%)</label>
                <OttoInput type="number" min={0} max={100} value={form.cotaMezaninoPct} onChange={e => set('cotaMezaninoPct', e.target.value)} placeholder="Ex.: 10"/>
              </div>
              <div>
                <label className="block text-[11px] text-ink-3 mb-1">Subordinada (%)</label>
                <OttoInput type="number" min={0} max={100} value={form.cotaSubordinadaPct} onChange={e => set('cotaSubordinadaPct', e.target.value)} placeholder="Ex.: 10"/>
              </div>
            </div>
            {(() => {
              const s = parseFloat(form.cotaSeniorPct || '0')
              const m = parseFloat(form.cotaMezaninoPct || '0')
              const sub = parseFloat(form.cotaSubordinadaPct || '0')
              const total = s + m + sub
              const algum = form.cotaSeniorPct || form.cotaMezaninoPct || form.cotaSubordinadaPct
              if (!algum) return null
              return <p className={`text-[11px] font-medium ${total === 100 ? 'text-green-600' : 'text-red-500'}`}>
                {total === 100 ? '✓ Soma: 100%' : `Soma: ${total}% — deve ser exatamente 100%`}
              </p>
            })()}
          </div>
        </Field>

        <Field label="Série / emissão" help="Identificação da série ou emissão, se já definida">
          <OttoInput value={form.serieEmissao} onChange={e => set('serieEmissao', e.target.value)} placeholder="Ex.: 1ª série / 2ª emissão"/>
        </Field>
      </div>
    )

    // ── CRI / CRA ──
    if (pilar === 'cri_cra') return (
      <div className="space-y-5">
        <p className="text-[13px] text-ink-2 -mt-2">Classificação ANBIMA e dimensões de risco e elegibilidade. Tudo opcional.</p>

        {/* CRI */}
        {(form.criOuCra === 'cri' || !form.criOuCra) && (
          <div className="space-y-4">
            <h3 className="text-[12px] font-semibold text-ink uppercase tracking-wider">Classificação ANBIMA — CRI</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Categoria" help="Residencial, Corporativo ou Híbrido">
                <OttoSelect value={form.categoriaCri} onChange={e => set('categoriaCri', e.target.value)}>
                  <option value="">Não informado</option>
                  {CATEGORIAS_CRI.map(o => <option key={o} value={o.toLowerCase().replace(' ', '_')}>{o}</option>)}
                </OttoSelect>
              </Field>
              <Field label="Concentração" help="Pulverizado ≤20% ou Concentrado >20% por devedor">
                <OttoSelect value={form.concentracaoCri} onChange={e => set('concentracaoCri', e.target.value)}>
                  <option value="">Não informado</option>
                  <option value="pulverizado">Pulverizado (≤ 20% por devedor)</option>
                  <option value="concentrado">Concentrado (&gt; 20% por devedor)</option>
                </OttoSelect>
              </Field>
            </div>
            <Field label="Segmento imobiliário" help="Determina o perfil de risco">
              <OttoSelect value={form.segmentoImobiliario} onChange={e => set('segmentoImobiliario', e.target.value)}>
                <option value="">Não informado</option>
                {SEGMENTOS_CRI.map(o => <option key={o} value={o.toLowerCase().replace(/\s+/g, '_').replace(/\//g, '_')}>{o}</option>)}
              </OttoSelect>
            </Field>
          </div>
        )}

        {/* CRA */}
        {(form.criOuCra === 'cra' || !form.criOuCra) && (
          <div className={`space-y-4 ${!form.criOuCra ? 'pt-5 border-t border-border' : ''}`}>
            <h3 className="text-[12px] font-semibold text-ink uppercase tracking-wider">Classificação ANBIMA — CRA</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Atividade do devedor" help="Quem gera o recebível">
                <OttoSelect value={form.atividadeDevedor} onChange={e => set('atividadeDevedor', e.target.value)}>
                  <option value="">Não informado</option>
                  {ATIVIDADES_DEVEDOR.map(o => <option key={o} value={o.toLowerCase().replace(' ', '_')}>{o}</option>)}
                </OttoSelect>
              </Field>
              <Field label="Revolvência" help="Se a carteira permite admissão de novos créditos após emissão">
                <OttoSelect value={form.revolvencia} onChange={e => set('revolvencia', e.target.value)}>
                  <option value="">Não informado</option>
                  <option value="com_revolvencia">Com revolvência</option>
                  <option value="sem_revolvencia">Sem revolvência</option>
                </OttoSelect>
              </Field>
            </div>
            {form.revolvencia === 'com_revolvencia' && (
              <Field label="Critérios de underwriting / admissão *" help="Obrigatório para carteiras com revolvência">
                <OttoTextarea
                  rows={3}
                  value={form.criteriosUnderwriting}
                  onChange={e => set('criteriosUnderwriting', e.target.value)}
                  placeholder="Ex.: Score mínimo 650, prazo máximo 36 meses, concentração máx 5% por devedor..."
                />
                {!form.criteriosUnderwriting.trim() && (
                  <p className="text-[11px] text-red-500 mt-1">Obrigatório para carteiras com revolvência.</p>
                )}
              </Field>
            )}
            <Field label="Segmento agrícola" help="Determina o ciclo e sazonalidade">
              <OttoSelect value={form.segmentoAgro} onChange={e => set('segmentoAgro', e.target.value)}>
                <option value="">Não informado</option>
                {SEGMENTOS_AGRO.map(o => <option key={o} value={o.toLowerCase().replace(/\s+/g, '_')}>{o}</option>)}
              </OttoSelect>
            </Field>
          </div>
        )}

        {/* Estrutura de cotas (comum CRI/CRA) */}
        <div className="pt-5 border-t border-border">
          <Field label="Série / emissão" help="Identificação da série ou emissão, se já definida">
            <OttoInput value={form.serieEmissao} onChange={e => set('serieEmissao', e.target.value)} placeholder="Ex.: 1ª série / 2ª emissão"/>
          </Field>
        </div>
      </div>
    )

    // ── Asset Preparation ──
    if (pilar === 'asset_prep') return (
      <div className="space-y-6">
        <p className="text-[13px] text-ink-2 -mt-2">
          Dados para avaliar a prontidão do ativo para o mercado de capitais. Deixe em branco o que não souber.
        </p>

        <div className="bg-surface rounded-[10px] p-4 border border-border space-y-3">
          <h4 className="text-[12px] font-semibold text-ink uppercase tracking-wider">Dados Financeiros</h4>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Receita anual (R$ milhões)">
              <OttoInput type="text" placeholder="Ex.: 50" value={form.assetPrepReceitaAnual} onChange={e => set('assetPrepReceitaAnual', e.target.value)}/>
            </Field>
            <Field label="EBITDA (R$ milhões)">
              <OttoInput type="text" placeholder="Ex.: 12.5" value={form.assetPrepEbitda} onChange={e => set('assetPrepEbitda', e.target.value)}/>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Patrimônio Líquido (R$ milhões)">
              <OttoInput type="text" placeholder="Ex.: 100" value={form.assetPrepPatrimonioLiquido} onChange={e => set('assetPrepPatrimonioLiquido', e.target.value)}/>
            </Field>
            <Field label="Alavancagem (ex: 1.5x)">
              <OttoInput type="text" placeholder="Ex.: 1.5x" value={form.assetPrepAlavancagem} onChange={e => set('assetPrepAlavancagem', e.target.value)}/>
            </Field>
          </div>
        </div>

        <div className="bg-surface rounded-[10px] p-4 border border-border space-y-3">
          <h4 className="text-[12px] font-semibold text-ink uppercase tracking-wider">Maturidade & Governança</h4>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Maturidade operacional">
              <OttoSelect value={form.assetPrepMaturidade} onChange={e => set('assetPrepMaturidade', e.target.value)}>
                <option value="">— Opcional</option>
                <option value="pre_operacional">Pré-operacional</option>
                <option value="ramp_up">Ramp-up</option>
                <option value="maduro">Maduro</option>
                <option value="estavel">Estável</option>
              </OttoSelect>
            </Field>
            <Field label="Histórico operacional (anos)">
              <OttoInput type="text" placeholder="Ex.: 5" value={form.assetPrepHistoricoAnosOperacao} onChange={e => set('assetPrepHistoricoAnosOperacao', e.target.value)}/>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tem governança formal?">
              <OttoSelect value={form.assetPrepTemGovernanca} onChange={e => set('assetPrepTemGovernanca', e.target.value)}>
                <option value="">— Opcional</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
                <option value="nao_definido">Não definido</option>
              </OttoSelect>
            </Field>
            <Field label="Tem board ou conselho?">
              <OttoSelect value={form.assetPrepTemBoard} onChange={e => set('assetPrepTemBoard', e.target.value)}>
                <option value="">— Opcional</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
                <option value="nao_definido">Não definido</option>
              </OttoSelect>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Posição no mercado">
              <OttoSelect value={form.assetPrepPosicaoMercado} onChange={e => set('assetPrepPosicaoMercado', e.target.value)}>
                <option value="">— Opcional</option>
                <option value="lider">Líder</option>
                <option value="consolidada">Consolidada</option>
                <option value="emergente">Emergente</option>
                <option value="startup">Startup</option>
              </OttoSelect>
            </Field>
            <Field label="Atratividade do mercado">
              <OttoSelect value={form.assetPrepAtratividade} onChange={e => set('assetPrepAtratividade', e.target.value)}>
                <option value="">— Opcional</option>
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </OttoSelect>
            </Field>
          </div>
        </div>

        <div className="bg-surface rounded-[10px] p-4 border border-border space-y-3">
          <h4 className="text-[12px] font-semibold text-ink uppercase tracking-wider">Objetivo de Captação</h4>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Objetivo">
              <OttoSelect value={form.assetPrepObjetivoCapitacao} onChange={e => set('assetPrepObjetivoCapitacao', e.target.value)}>
                <option value="">— Opcional</option>
                <option value="crescimento">Crescimento</option>
                <option value="refinanciamento">Refinanciamento</option>
                <option value="aquisicao">Aquisição</option>
                <option value="estruturacao">Estruturação</option>
                <option value="outro">Outro</option>
              </OttoSelect>
            </Field>
            <Field label="Volume (R$ milhões)">
              <OttoInput type="text" placeholder="Ex.: 25" value={form.assetPrepVolumeCapitacao} onChange={e => set('assetPrepVolumeCapitacao', e.target.value)}/>
            </Field>
          </div>
          <Field label="Horizonte da captação">
            <OttoSelect value={form.assetPrepHorizonteCapitacao} onChange={e => set('assetPrepHorizonteCapitacao', e.target.value)}>
              <option value="">— Opcional</option>
              <option value="imediato">Imediato (&lt; 30 dias)</option>
              <option value="3_meses">3 meses</option>
              <option value="6_meses">6 meses</option>
              <option value="12_meses">12 meses</option>
            </OttoSelect>
          </Field>
        </div>
      </div>
    )

    return null
  }

  // ── Step 4: Contexto & Estágio ──────────────────────────────────────────────
  if (step === 4) return (
    <div className="space-y-5">
      <p className="text-[13px] text-ink-2 -mt-2">
        Dimensionamento e momento da operação.
      </p>

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

      <Field label="Ticket Estimado *" help="Valor esperado da transação ou captação">
        <OttoInput value={form.ticketEstimado} onChange={e => set('ticketEstimado', e.target.value)} placeholder="Ex.: R$ 20M a R$ 30M"/>
      </Field>

      <Field label="Nível de Informação Disponível *">
        <OttoSelect value={form.nivelInformacao} onChange={e => set('nivelInformacao', e.target.value)}>
          <option value="">Selecione...</option>
          {NIVEIS_INFO.map(o => <option key={o}>{o}</option>)}
        </OttoSelect>
      </Field>

      <Field label="A operação já está em andamento? *" help="Projetos pré-operacionais ainda não têm histórico financeiro. A análise se adapta ao estágio.">
        <OttoSelect value={form.operacaoEmAndamento} onChange={e => set('operacaoEmAndamento', e.target.value)}>
          <option value="">Selecione...</option>
          {OPERACAO.map(o => <option key={o}>{o}</option>)}
        </OttoSelect>
      </Field>

      {/* Tipo de transação para M&A — caso ainda não preenchido no step 3 */}
      {pilar === 'ma' && !form.tipoTransacaoMA && (
        <Field label="Tipo de transação *">
          <OttoSelect value={form.tipoTransacaoMA} onChange={e => set('tipoTransacaoMA', e.target.value)}>
            <option value="">Selecione...</option>
            {TIPOS_TRANSACAO_MA.map(o => <option key={o}>{o}</option>)}
          </OttoSelect>
        </Field>
      )}
    </div>
  )

  // ── Step 5: Tese da Operação ────────────────────────────────────────────────
  if (step === 5) {
    const hints = pilar ? MICRO_HINTS[pilar] : MICRO_HINTS.ma
    return (
      <div>
        <p className="text-[13px] text-ink-3 mb-4">
          Este é o campo mais importante do cadastro. Descreva o contexto que não está nos documentos:
          objetivo da operação, partes envolvidas, estrutura pretendida, pendências já conhecidas e
          situações excepcionais. Divergências explicadas aqui (ex.: &quot;a matrícula enviada está
          desatualizada&quot;) deixam de virar apontamento indevido na análise.
        </p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {hints.map(h => (
            <span key={h} className="text-[11px] text-ink-3 bg-bg-tint border border-border rounded px-2 py-1">{h}</span>
          ))}
        </div>
        <OttoTextarea
          value={form.resumoAtivo}
          onChange={e => set('resumoAtivo', e.target.value)}
          rows={8}
          placeholder={
            pilar === 'ma'         ? 'Ex.: Empresa familiar, 2ª geração, sócios alinhados. Nunca foi ao mercado. Urgência moderada. A DRE enviada é gerencial (não auditada) — auditoria em andamento, finaliza em 60 dias.' :
            pilar === 'fidc'       ? 'Ex.: FIDC para originação de recebíveis de uma rede varejista. Cedente com 5 anos de histórico, inadimplência abaixo de 2%. Cotas sênior parcialmente negociadas com gestora X.' :
            pilar === 'cri_cra'    ? 'Ex.: CRI lastreado em contratos de locação corporativa de imóvel comercial em SP. Devedor com rating AA. Emissão prevista para Q3. Matrícula em atualização.' :
            'Ex.: Empresa de logística, 8 anos de operação, busca captação para expansão. Governança informal, sem board formalizado — em processo de constituição. DRE gerencial disponível.'
          }
        />
      </div>
    )
  }

  // ── Step 6: Documentos ──────────────────────────────────────────────────────
  if (step === 6) {
    const { criticos, altos } = formatDocsCriticosUI(form.tipoAtivo, form.pilarOperacao)
    const hasDocs = criticos.length > 0 || altos.length > 0

    return (
      <div>
        <p className="text-[13px] text-ink-3 mb-4">
          Suba todos os documentos disponíveis. Aceita PDF, Word, Excel, CSV, imagens.
          Quanto mais completa a documentação, mais precisa a análise.
        </p>

        {hasDocs && (
          <div className="mb-6 p-5 rounded-[12px] border border-accent-soft bg-accent-soft/20">
            <h3 className="text-[12px] font-semibold text-accent-strong uppercase tracking-wider mb-4">
              Documentos esperados
            </h3>
            {criticos.length > 0 && (
              <div className="mb-4">
                <p className="text-[11px] font-semibold text-ink mb-2">Críticos — alta relevância</p>
                <div className="space-y-2">
                  {criticos.map((doc, idx) => (
                    <div key={idx} className="text-[11px] bg-white rounded border border-accent-soft p-2.5">
                      <p className="font-medium text-ink">{doc.nome}</p>
                      <p className="text-ink-3 mt-0.5">{doc.descricao}</p>
                      {doc.dica && <p className="text-accent-strong text-[10px] mt-1 italic">{doc.dica}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {altos.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-ink mb-2">Recomendados</p>
                <div className="space-y-2">
                  {altos.map((doc, idx) => (
                    <div key={idx} className="text-[11px] bg-white rounded border border-amber-200 p-2.5">
                      <p className="font-medium text-ink">{doc.nome}</p>
                      <p className="text-ink-3 mt-0.5">{doc.descricao}</p>
                      {doc.dica && <p className="text-amber-700 text-[10px] mt-1 italic">{doc.dica}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-[14px] p-10 text-center cursor-pointer transition-all ${
            dragging ? 'border-accent-strong bg-accent-soft/30' : 'border-border hover:border-border-strong hover:bg-surface-hover'
          }`}
        >
          <input ref={fileInputRef} type="file" multiple accept={accepted} className="hidden"
            onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }}
          />
          <div className="mb-2"/>

          <p className="text-ink-2 text-[13px] font-medium">Clique para selecionar ou arraste os arquivos</p>
          <p className="text-ink-3 text-[11px] mt-1">PDF · Word · Excel · CSV · PNG · JPG · máx. {MAX_FILE_MB}MB por arquivo</p>
        </div>

        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            {files.map((file, i) => (
              <div key={i} className="flex items-center gap-3 bg-surface border border-border rounded-[10px] px-3 py-2.5">
                <span className="text-[10px] font-bold text-ink-3 bg-surface-2 border border-border rounded px-1.5 py-0.5 flex-none tracking-wide">{fileIcon(file.name)}</span>
                <span className="text-[13px] text-ink-2 truncate flex-1">{file.name}</span>
                <span className="text-[11px] text-ink-3 flex-none">{formatBytes(file.size)}</span>
                <button type="button" onClick={e => { e.stopPropagation(); removeFile(i) }}
                  className="text-ink-3 hover:text-[oklch(0.6_0.16_25)] transition-colors text-[13px] flex-none">✕</button>
              </div>
            ))}
            <p className="text-[12px] text-accent-ink pt-1">{files.length} arquivo(s) selecionado(s)</p>
          </div>
        )}
      </div>
    )
  }

  return null
}
