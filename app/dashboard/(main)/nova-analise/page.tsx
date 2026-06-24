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
import { z } from 'zod'

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPOS_ATIVO = ['Empresa (M&A)', 'Imóvel / Real Estate', 'Startup / Scale-up', 'FIDC / Crédito Estruturado', 'FIDC de Infraestrutura (incentivado)', 'Securitização (CRI / CRA)', 'Portfólio de Crédito', 'Franquia', 'Agronegócio', 'Outro']
// Tipos de ativo que abrem os campos de estrutura de crédito (cedente, recebível,
// estrutura de cotas, série). Mantém o vocabulário do gestor de crédito/FIDC.
const CREDIT_TYPES = new Set(['FIDC / Crédito Estruturado', 'FIDC de Infraestrutura (incentivado)', 'Securitização (CRI / CRA)', 'Portfólio de Crédito'])
const isCreditAsset = (tipo: string) => CREDIT_TYPES.has(tipo)
const TIPOS_RECEBIVEL = ['Duplicatas / Notas comerciais', 'Cartão de crédito', 'Consignado', 'Cheques', 'Contratos / Prestação de serviços', 'CCB / Crédito bancário', 'Imobiliário', 'Precatórios', 'Outro']
// Classificação ANBIMA — CRI (Certificados de Recebíveis Imobiliários)
const CATEGORIAS_CRI = ['Residencial', 'Corporativo', 'Híbrido']
const CONCENTRACOES = ['Pulverizado (≤ 20% por devedor)', 'Concentrado (> 20% por devedor)']
const SEGMENTOS_CRI = ['Apartamentos ou casas', 'Loteamento', 'Industrial', 'Logístico', 'Comercial / Corporativo', 'Shopping / Lojas', 'Infraestrutura', 'Hotel', 'Outro']
// Classificação ANBIMA — CRA (Certificados de Recebíveis do Agronegócio)
const ATIVIDADES_DEVEDOR = ['Cooperativa', 'Produtor Rural', 'Terceiro Fornecedor', 'Terceiro Comprador']
const REVOLVENCIAS = ['Com revolvência', 'Sem revolvência']
const SEGMENTOS_AGRO = ['Grãos', 'Usina', 'Logística', 'Híbrido', 'Outro']
const ESTAGIOS   = ['Projeto Pré-Operacional', 'Estruturando', 'Estruturado', 'Em comercialização', 'Em negociação / Closing']
const OBJETIVOS  = ['Vender 100%', 'Vender participação', 'Captar investimento', 'Estruturar crédito', 'Preparar para o mercado', 'Diagnóstico / Due Diligence']
const NIVEIS_INFO = ['Baixo (poucos dados formais)', 'Médio (dados parciais)', 'Alto (DRE, balanço e documentos disponíveis)']
const OPERACAO   = ['Sim: já há operação/receita', 'Não: projeto pré-operacional (sem histórico financeiro)']
const MICRO_HINTS = [
  'O ativo já foi apresentado ao mercado anteriormente?',
  'Qual é o nível de urgência da operação?',
  'A tese de valor é clara ou ainda está sendo estruturada?',
  'Existem conflitos societários entre sócios?',
  'Já houve contato com investidores ou compradores?',
  'Há pendências ou particularidades nos documentos anexados?',
  'Alguma situação excepcional que não aparece formalmente nos anexos?',
]
// Mantém em sincronia com a whitelist do servidor (lib/upload-validation.ts) e com
// o que a ingestão consegue ler (categorize em app/api/analise/[id]/ingest/route.ts).
const ACCEPTED   = '.pdf,.docx,.xls,.xlsx,.csv,.tsv,.txt,.md,.json,.png,.jpg,.jpeg,.webp,.gif'
const ACCEPTED_EXTS = new Set(['pdf','docx','xls','xlsx','csv','tsv','txt','md','json','png','jpg','jpeg','webp','gif'])
const MAX_FILE_MB = 20
const DRAFT_KEY     = 'otto-intake-draft'
const DRAFT_VERSION = 4   // v4: descarta rascunhos com campos do antigo fluxo de Drive (linkDocumentos)

// ─── Section & step definitions ───────────────────────────────────────────────

const STEPS = [
  { label: 'Proprietário',           section: 0 },
  { label: 'Mandato',                section: 1 },
  { label: 'Identificação do Ativo', section: 2 },
  { label: 'Localização & Estágio',  section: 2 },
  { label: 'Objetivo da Operação',   section: 2 },
  { label: 'Dados Financeiros',      section: 2 },
  { label: 'Tese do Deal',           section: 2 },
  { label: 'Documentos',             section: 2 },
]

const SECTIONS = [
  { label: 'Proprietário', start: 0, end: 0 },
  { label: 'Mandato',      start: 1, end: 1 },
  { label: 'Ativo',        start: 2, end: 7 },
]

// Mapeia cada campo do AnaliseCreateSchema para um rótulo legível e a etapa
// onde ele é editado — usado para transformar o 400 genérico "Dados inválidos"
// numa mensagem que aponta exatamente o que corrigir e onde.
const FIELD_LABELS: Record<string, { label: string; step: number }> = {
  nomeAtivo:             { label: 'Nome do ativo',                step: 2 },
  tipoAtivo:             { label: 'Tipo de ativo',                step: 2 },
  cedente:                    { label: 'Cedente / Originador',              step: 2 },
  tipoRecebivel:              { label: 'Tipo de recebível',                step: 2 },
  statusRecebivel:            { label: 'Status do recebível',              step: 2 },
  estruturaCedenteSacado:     { label: 'Estrutura cedente × sacado',       step: 2 },
  cedenteCotistaSubordinado:  { label: 'Cedente cotista subordinado',       step: 2 },
  tipoOferta:                 { label: 'Tipo de oferta',                   step: 2 },
  estruturaCotas:             { label: 'Estrutura de cotas',               step: 2 },
  serieEmissao:               { label: 'Série / emissão',                  step: 2 },
  categoriaCri:               { label: 'Categoria CRI',                    step: 2 },
  concentracaoCri:            { label: 'Concentração CRI',                 step: 2 },
  segmentoImobiliario:        { label: 'Segmento imobiliário',             step: 2 },
  atividadeDevedor:           { label: 'Atividade do devedor (CRA)',       step: 2 },
  revolvencia:                { label: 'Revolvência (CRA)',                step: 2 },
  segmentoAgro:               { label: 'Segmento agrícola',                step: 2 },
  estagio:               { label: 'Estágio atual',                step: 3 },
  localizacao:           { label: 'Localização (cidade/estado)',  step: 3 },
  objetivo:              { label: 'Objetivo da operação',         step: 4 },
  ticketEstimado:        { label: 'Ticket estimado',              step: 5 },
  nivelInformacao:       { label: 'Nível de informação',          step: 5 },
  operacaoEmAndamento:   { label: 'Operação em andamento',        step: 5 },
  resumoAtivo:           { label: 'Tese do Deal',                 step: 6 },
  informacoesAdicionais: { label: 'Tese do Deal',                 step: 6 },
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

// Transforma os erros do Zod (cliente) numa frase única em PT, com campo + etapa.
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
    else if (key === 'linkDocumentos')                why = 'URL inválida'
    const where = info ? ` — etapa ${info.step + 1}` : ''
    return `${label}: ${why}${where}`
  })
  const unique = Array.from(new Set(parts))
  return unique.length === 1
    ? `Não foi possível ativar. ${unique[0]}.`
    : `Corrija os campos antes de ativar: ${unique.join('; ')}.`
}

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
  // Adequação à Reforma Tributária (Ferrante) — opt-in premium na abertura.
  const [reformaTributaria, setReformaTributaria] = useState<'na' | 'possui' | 'diagnosticar'>('na')
  const [rtUnlocked,    setRtUnlocked]    = useState(false)
  const [files,         setFiles]         = useState<File[]>([])
  const [dragging,      setDragging]      = useState(false)
  const [draftRestored,  setDraftRestored]  = useState(false)
  const [draftAvailable, setDraftAvailable] = useState(false)
  const [lgpdConsent,    setLgpdConsent]    = useState(false)

  const [form, setForm] = useState({
    // ── Ativo ──────────────────────────────────────────────────────────────
    nomeAtivo:            searchParams.get('nomeAtivo') ?? '',
    tipoAtivo:            searchParams.get('tipoAtivo') ?? '',
    cidade:               '',
    estado:               '',
    pais:                 'Brasil',
    estagio:              '',
    nivelInformacao:      '',
    operacaoEmAndamento:  '',
    ticketEstimado:       '',
    resumoAtivo:          '',
    // ── Estrutura de crédito (só para FIDC / Securitização / Portfólio) ──────
    cedente:                   '',
    tipoRecebivel:             '',
    statusRecebivel:           '',
    estruturaCedenteSacado:    '',
    cedenteCotistaSubordinado: '',
    tipoOferta:                '',
    estruturaCotas:            '',
    serieEmissao:              '',
    // ── Classificação ANBIMA — CRI ──────────────────────────────────────────
    categoriaCri:              '',
    concentracaoCri:           '',
    segmentoImobiliario:       '',
    // ── Classificação ANBIMA — CRA ──────────────────────────────────────────
    atividadeDevedor:          '',
    revolvencia:               '',
    segmentoAgro:              '',
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

  // Entitlement do módulo Reforma Tributária: libera o opt-in só p/ escritórios
  // com o pacote (ou admin). Falha silenciosa = bloqueado (mostra upsell).
  useEffect(() => {
    fetch('/api/reforma-tributaria/entitlement')
      .then(r => r.json())
      .then(d => setRtUnlocked(d?.enabled === true))
      .catch(() => setRtUnlocked(false))
  }, [])

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const d = JSON.parse(raw)
      // Restaura só campos que o formulário atual conhece. Rascunhos antigos
      // podem conter campos já removidos (ex.: linkDocumentos, do antigo fluxo
      // de Google Drive) que quebrariam a validação ao serem reenviados.
      if (d.form) setForm(prev => {
        const known = Object.fromEntries(
          Object.entries(d.form as Record<string, unknown>).filter(([k]) => k in prev)
        )
        return { ...prev, ...known }
      })
      if (d.objetivos) setObjetivos(d.objetivos)
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
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: DRAFT_VERSION, form, objetivos, reformaTributaria, step }))
  }, [form, objetivos, reformaTributaria, step])

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
      const ext = f.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? ''
      if (!ACCEPTED_EXTS.has(ext)) {
        setError(`"${f.name}" está em formato não suportado e foi ignorado. Converta para PDF (ex.: PowerPoint, .doc antigo ou foto HEIC) e tente novamente.`)
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
      if (!form.ticketEstimado.trim())   return 'Informe o ticket estimado.'
      if (!form.nivelInformacao)         return 'Selecione o nível de informação.'
      if (!form.operacaoEmAndamento)     return 'Informe se a operação já está em andamento.'
    }
    if (step === 6) {
      if (!form.resumoAtivo.trim()) return 'Descreva o ativo e objetivo.'
    }
    if (step === 7) {
      if (files.length === 0) return 'Adicione ao menos um documento.'
      if (!lgpdConsent)       return 'Confirme o consentimento para processamento de dados antes de continuar.'
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

    const payload = {
      ...form,
      objetivo:              objetivos.join(', '),
      // Só persiste o opt-in se o escritório tem o módulo liberado (defesa client-side;
      // a gating real do motor acontece server-side na Fase 2).
      reformaTributaria:     rtUnlocked ? reformaTributaria : 'na',
      localizacao:           `${form.cidade} – ${form.estado}, ${form.pais}`,
      informacoesAdicionais: form.resumoAtivo,
      lgpdConsentimento:     `Consentimento LGPD registrado em ${new Date().toISOString()} — dados processados por IA para análise de deal conforme LGPD art. 7º, inc. V (execução de contrato).`,
    }

    // Defesa: o formulário não coleta mais linkDocumentos (era do antigo fluxo
    // de Google Drive). Se ele ainda estiver no estado por causa de um rascunho
    // restaurado, removemos antes de validar/enviar — senão um valor que não é
    // URL barra o submit com "linkDocumentos: URL inválida".
    delete (payload as Record<string, unknown>).linkDocumentos

    // Valida com o MESMO schema do backend antes de enviar. Sem isso, um e-mail
    // malformado ou um texto acima do limite passava pela validação por etapa e
    // só era barrado no servidor com o 400 genérico "Dados inválidos".
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
      // Se o backend devolveu detalhes de validação por campo, aponta qual.
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
    // Upload protegido: uma falha de rede num arquivo não pode deixar a UI
    // congelada em "Enviando...". Em erro, mostra mensagem clara e reabilita o botão.
    // A análise já foi criada acima — ao tentar de novo, reenvie deste formulário.
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

    // Dispara ingestão assíncrona (Fase 13) — Inngest processa em background.
    // Não bloqueia o redirect: a página da análise faz polling em /ingest/status.
    // Se o disparo falhar (ex.: Inngest fora), análise continua acessível e
    // pode rodar no fluxo legado (drive_intake re-lê PDFs do Storage).
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

          {/* Consentimento LGPD — exibe apenas no último step */}
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
          Mandor valida o preenchimento e ativa os 10 especialistas automaticamente. Entrega em até 90 minutos.
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
  reformaTributaria, setReformaTributaria, rtUnlocked,
  files, dragging, setDragging, addFiles, removeFile,
  formatBytes, fileIcon, fileInputRef, accepted,
}: {
  step:           number
  form:           Record<string, string>
  set:            (field: string, value: string) => void
  objetivos:      string[]
  toggleObjetivo: (o: string) => void
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

  // ── Step 0: Proprietário ─────────────────────────────────────────────────
  if (step === 0) return (
    <div className="space-y-5">
      <p className="text-[13px] text-ink-2 -mt-2">
        Dados do detentor do ativo: aparece nos documentos de captação e no relatório.
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
            onChange={e => set('cpfCnpjProprietario', maskCpfCnpj(e.target.value))}
            inputMode="numeric"
            maxLength={18}
            placeholder="000.000.000-00"
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Telefone / WhatsApp">
          <OttoInput
            type="tel"
            value={form.telefoneProprietario}
            onChange={e => set('telefoneProprietario', maskTelefone(e.target.value))}
            inputMode="numeric"
            maxLength={15}
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
                onChange={e => set('assessorTelefone', maskTelefone(e.target.value))}
                inputMode="numeric"
                maxLength={15}
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
                onChange={e => set('parceiroTelefone', maskTelefone(e.target.value))}
                inputMode="numeric"
                maxLength={15}
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

      {/* ── Estrutura de crédito — só para FIDC / Securitização / Portfólio ──── */}
      {isCreditAsset(form.tipoAtivo) && (
        <div className="mt-2 pt-5 border-t border-border space-y-5">
          <div>
            <h3 className="text-[12px] font-semibold text-ink uppercase tracking-wider">Estrutura de crédito</h3>
            <p className="text-[12px] text-ink-3 mt-1">
              Contexto do lastro e da operação para a Mesa de Crédito. Tudo opcional: a análise se
              adapta ao que estiver disponível.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Cedente / Originador" help="Quem origina os recebíveis">
              <OttoInput
                value={form.cedente}
                onChange={e => set('cedente', e.target.value)}
                placeholder="Ex.: Varejista ABC Ltda"
              />
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
              Recebíveis vencidos e não pagos são classificados como <strong>FIDC Não Padronizado</strong> pela CVM — restrito a investidores profissionais. O Invest Match filtrará automaticamente.
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Cedente cotista subordinado?" help="Cedente investindo nas cotas subordinadas = alinhamento de interesses (boa prática de governança)">
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
          <Field label="Estrutura de cotas / tranches" help="Distribuição sênior / mezanino / subordinada e índice de subordinação">
            <OttoInput
              value={form.estruturaCotas}
              onChange={e => set('estruturaCotas', e.target.value)}
              placeholder="Ex.: Sênior 80% / Mezanino 10% / Subordinada 10%"
            />
          </Field>
          <Field label="Série / emissão" help="Identificação da série ou emissão, se já definida">
            <OttoInput
              value={form.serieEmissao}
              onChange={e => set('serieEmissao', e.target.value)}
              placeholder="Ex.: 1ª série / 2ª emissão"
            />
          </Field>

          {/* ── Classificação ANBIMA para CRI ──────────────────────────────── */}
          {form.tipoAtivo === 'Securitização (CRI / CRA)' && (
            <div className="mt-8 pt-5 border-t border-border space-y-5">
              <div>
                <h3 className="text-[12px] font-semibold text-ink uppercase tracking-wider">Classificação ANBIMA — CRI</h3>
                <p className="text-[12px] text-ink-3 mt-1">
                  Dimensões de risco e elegibilidade conforme Regras ANBIMA para CRI.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Categoria" help="Residencial, Corporativo ou Híbrido">
                  <OttoSelect value={form.categoriaCri} onChange={e => set('categoriaCri', e.target.value)}>
                    <option value="">Não informado</option>
                    {CATEGORIAS_CRI.map(o => <option key={o} value={o.toLowerCase().replace(' ', '_')}>{o}</option>)}
                  </OttoSelect>
                </Field>
                <Field label="Concentração" help="Pulverizado ≤20% ou Concentrado &gt;20% por devedor">
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

          {/* ── Classificação ANBIMA para CRA ──────────────────────────────── */}
          {form.tipoAtivo === 'Securitização (CRI / CRA)' && (
            <div className="mt-8 pt-5 border-t border-border space-y-5">
              <div>
                <h3 className="text-[12px] font-semibold text-ink uppercase tracking-wider">Classificação ANBIMA — CRA</h3>
                <p className="text-[12px] text-ink-3 mt-1">
                  Dimensões específicas de recebíveis do agronegócio.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Atividade do devedor" help="Quem gera o recebível">
                  <OttoSelect value={form.atividadeDevedor} onChange={e => set('atividadeDevedor', e.target.value)}>
                    <option value="">Não informado</option>
                    <option value="cooperativa">Cooperativa</option>
                    <option value="produtor_rural">Produtor Rural</option>
                    <option value="terceiro_fornecedor">Terceiro Fornecedor</option>
                    <option value="terceiro_comprador">Terceiro Comprador</option>
                  </OttoSelect>
                </Field>
                <Field label="Revolvência" help="Se a carteira permite novas admissões">
                  <OttoSelect value={form.revolvencia} onChange={e => set('revolvencia', e.target.value)}>
                    <option value="">Não informado</option>
                    <option value="com_revolvencia">Com revolvência</option>
                    <option value="sem_revolvencia">Sem revolvência</option>
                  </OttoSelect>
                </Field>
              </div>
              <Field label="Segmento agrícola" help="Determina o ciclo e sazonalidade">
                <OttoSelect value={form.segmentoAgro} onChange={e => set('segmentoAgro', e.target.value)}>
                  <option value="">Não informado</option>
                  {SEGMENTOS_AGRO.map(o => <option key={o} value={o.toLowerCase().replace(/\s+/g, '_')}>{o}</option>)}
                </OttoSelect>
              </Field>
            </div>
          )}
        </div>
      )}
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

      {/* ── Módulo premium: Adequação à Reforma Tributária (Ferrante) ───────── */}
      <div className="mt-7 pt-6 border-t border-border">
        <div className="flex items-center gap-2 mb-1.5">
          <p className="text-[13px] font-semibold text-ink">Adequação à Reforma Tributária</p>
          <span className="text-[9px] font-semibold uppercase tracking-wide text-accent-strong border border-accent-strong/40 rounded px-1.5 py-0.5">Premium</span>
        </div>
        <p className="text-[12px] text-ink-3 mb-4 leading-relaxed">
          Rastreio de conformidade tributária, riscos fiscais e impactos da Reforma (EC 132/2023)
          sobre o ativo, para captação, M&A e due diligence.
        </p>

        {rtUnlocked ? (
          <div className="grid gap-2">
            {([
              { v: 'na',            t: 'Não incluir nesta análise',                 d: 'O diagnóstico tributário não será gerado.' },
              { v: 'possui',        t: 'Empresa já possui análise de adequação',    d: 'Marca como já adequada; sem novo diagnóstico.' },
              { v: 'diagnosticar',  t: 'Ativar o Módulo Reforma Tributária',        d: 'Diagnóstico completo de adequação à Reforma (EC 132/2023) e recomendações.' },
            ] as const).map(opt => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setReformaTributaria(opt.v)}
                className={`text-left px-3.5 py-3 rounded-[10px] border text-[13px] transition-all ${
                  reformaTributaria === opt.v
                    ? 'border-accent-strong bg-accent-soft text-accent-ink font-medium'
                    : 'border-border bg-surface text-ink-2 hover:border-border-strong'
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
              🔒 Recurso disponível em planos avançados.{' '}
              <a href="/dashboard/planos" className="text-accent-strong font-medium underline-offset-2 hover:underline">
                Conheça os planos
              </a>.
            </p>
          </div>
        )}
      </div>
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
      <Field
        label="A operação já está em andamento? *"
        help="Projetos pré-operacionais ainda não têm histórico financeiro (DRE, balancete, DFRE). A análise se adapta ao estágio e não penaliza a ausência desses documentos."
      >
        <OttoSelect value={form.operacaoEmAndamento} onChange={e => set('operacaoEmAndamento', e.target.value)}>
          <option value="">Selecione...</option>
          {OPERACAO.map(o => <option key={o}>{o}</option>)}
        </OttoSelect>
      </Field>
    </div>
  )

  // ── Step 6: Tese do Deal ──────────────────────────────────────────────────
  if (step === 6) return (
    <div>
      <p className="text-[13px] text-ink-3 mb-4">
        Este é o campo mais importante do cadastro. Use-o para contextualizar o que pode não estar
        evidente nos documentos: o objetivo da operação, as partes envolvidas, a estrutura da
        negociação, particularidades e pendências documentais já conhecidas, e situações excepcionais
        que não aparecem formalmente nos anexos. Quanto mais detalhe, mais precisa a análise. Divergências
        já explicadas aqui (por exemplo, uma matrícula desatualizada que será reenviada) deixam de virar
        apontamento indevido.
      </p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {MICRO_HINTS.map(h => (
          <span key={h} className="text-[11px] text-ink-3 bg-bg-tint border border-border rounded px-2 py-1">{h}</span>
        ))}
      </div>
      <OttoTextarea
        value={form.resumoAtivo}
        onChange={e => set('resumoAtivo', e.target.value)}
        rows={8}
        placeholder="Ex: Empresa familiar, 2ª geração, sócios alinhados. Nunca foi ao mercado. Urgência moderada, sócio majoritário quer liquidez nos próximos 18 meses. Obs.: a matrícula anexada está desatualizada, versão atualizada será enviada na sequência."
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
        <p className="text-ink-3 text-[11px] mt-1">PDF · Word · Excel · CSV · PNG · JPG · máx. {MAX_FILE_MB}MB por arquivo</p>
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
