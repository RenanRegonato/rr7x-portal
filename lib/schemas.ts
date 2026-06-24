import { z } from 'zod'
import { isValidCPF, isValidCNPJ } from './extract/br-parsers'

const uuid    = z.string().uuid('ID inválido')
const shortStr = (max = 200) => z.string().max(max).trim()
const optUrl  = z.union([z.string().url('URL inválida').max(500), z.literal(''), z.undefined()])
const optEmail = z.union([z.string().email('Email inválido').max(200), z.literal(''), z.undefined()])

// CPF (11 díg. + DV) ou CNPJ (14 díg. + DV). Opcional; se vier, tem de ser válido
// pelo dígito verificador — barra número incompleto/inventado antes do auto-pull.
const onlyDigits = (s: string) => s.replace(/\D/g, '')
const optCpfCnpj = z.union([
  z.literal(''), z.undefined(),
  z.string().max(20).refine(v => {
    const d = onlyDigits(v)
    return isValidCPF(d) || isValidCNPJ(d)
  }, 'CPF ou CNPJ inválido'),
])
// Telefone BR: opcional; se vier, 10 (fixo) ou 11 (celular) dígitos.
const optTelefone = z.union([
  z.literal(''), z.undefined(),
  z.string().max(20).refine(v => {
    const n = onlyDigits(v).length
    return n === 10 || n === 11
  }, 'Telefone inválido (DDD + número)'),
])

// POST /api/analise
export const AnaliseCreateSchema = z.object({
  nomeAtivo:             shortStr(200).min(1, 'Nome do ativo é obrigatório'),
  tipoAtivo:             shortStr(100).min(1),
  estagio:               shortStr(100).min(1),
  objetivo:              shortStr(2000).min(1),
  // Opt-in do módulo premium Adequação à Reforma Tributária (Ferrante).
  // 'na' = não incluir; 'possui' = empresa já adequada; 'diagnosticar' = rodar Ferrante.
  reformaTributaria:     z.enum(['na', 'possui', 'diagnosticar']).optional(),
  nivelInformacao:       shortStr(100).min(1),
  operacaoEmAndamento:   shortStr(120).optional(),
  localizacao:           shortStr(200).min(1),
  ticketEstimado:        shortStr(100).min(1),
  receitaCaixa:          shortStr(500).optional(),
  passivos:              shortStr(500).optional(),
  informacoesAdicionais: shortStr(15000).optional(),
  resumoAtivo:           shortStr(15000).optional(),
  // Estrutura de crédito (FIDC / Securitização / Portfólio de Crédito) — opcionais.
  cedente:                    shortStr(300).optional(),
  tipoRecebivel:              shortStr(200).optional(),
  statusRecebivel:            z.enum(['performado', 'a_performar', 'vencido_nao_pago', '']).optional(),
  estruturaCedenteSacado:     z.enum(['monocedente_multisacados', 'multicedentes_monosacado', 'multicedentes_multisacados', '']).optional(),
  cedenteCotistaSubordinado:  z.enum(['sim', 'nao', 'nao_definido', '']).optional(),
  tipoOferta:                 z.enum(['icvm_400', 'icvm_476', 'nao_definido', '']).optional(),
  estruturaCotas:             shortStr(500).optional(),  // legado — mantido para deals existentes
  cotaSeniorPct:              z.coerce.number().min(0).max(100).optional(),
  cotaMezaninoPct:            z.coerce.number().min(0).max(100).optional(),
  cotaSubordinadaPct:         z.coerce.number().min(0).max(100).optional(),
  serieEmissao:               shortStr(200).optional(),
  // Classificação ANBIMA — CRI (Certificados de Recebíveis Imobiliários) — opcionais.
  categoriaCri:               z.enum(['residencial', 'corporativo', 'hibrido', '']).optional(),
  concentracaoCri:            z.enum(['pulverizado', 'concentrado', '']).optional(),
  segmentoImobiliario:        z.enum(['apartamento', 'loteamento', 'industrial', 'logistico', 'comercial', 'shopping', 'infraestrutura', 'hotel', 'outro', '']).optional(),
  // Classificação ANBIMA — CRA (Certificados de Recebíveis do Agronegócio) — opcionais.
  atividadeDevedor:           z.enum(['cooperativa', 'produtor_rural', 'terceiro_fornecedor', 'terceiro_comprador', '']).optional(),
  revolvencia:                z.enum(['com_revolvencia', 'sem_revolvencia', '']).optional(),
  segmentoAgro:               z.enum(['graos', 'usina', 'logistica', 'hibrido', 'outro', '']).optional(),
  // linkDocumentos: REMOVIDO. Campo do antigo fluxo de Google Drive, não é mais
  // coletado. Como o schema não é .strict(), se um cliente com JS em cache antigo
  // ainda enviar esse campo, ele é simplesmente ignorado em vez de derrubar a
  // requisição com "URL inválida".
  nomeProprietario:      shortStr(200).optional(),
  cpfCnpjProprietario:   optCpfCnpj,
  telefoneProprietario:  optTelefone,
  emailProprietario:     optEmail,
  obsProprietario:       shortStr(2000).optional(),
  assessorNome:          shortStr(200).optional(),
  assessorTelefone:      optTelefone,
  assessorEmail:         optEmail,
  parceiroNome:          shortStr(200).optional(),
  parceiroTelefone:      optTelefone,
  parceiroEmail:         optEmail,
  obsMandato:            shortStr(2000).optional(),
  // Asset Preparation — diagnóstico de prontidão para captação
  assetPrepTipoAtivo:           z.enum(['imobiliario', 'saas', 'recebivel', 'agro', 'industrial', 'infraestrutura', 'outro', '']).optional(),
  assetPrepReceitaAnual:        shortStr(100).optional(),
  assetPrepEbitda:              shortStr(100).optional(),
  assetPrepPatrimonioLiquido:   shortStr(100).optional(),
  assetPrepAlavancagem:         shortStr(100).optional(),
  assetPrepPosicaoMercado:      z.enum(['lider', 'consolidada', 'emergente', 'startup', '']).optional(),
  assetPrepAtratividade:        z.enum(['alta', 'media', 'baixa', '']).optional(),
  assetPrepMaturidade:          z.enum(['pre_operacional', 'ramp_up', 'maduro', 'estavel', '']).optional(),
  assetPrepTemGovernanca:       z.enum(['sim', 'nao', 'nao_definido', '']).optional(),
  assetPrepTemBoard:            z.enum(['sim', 'nao', 'nao_definido', '']).optional(),
  assetPrepHistoricoAnosOperacao: shortStr(100).optional(),
  assetPrepObjetivoCapitacao:   z.enum(['crescimento', 'refinanciamento', 'aquisicao', 'estruturacao', 'outro', '']).optional(),
  assetPrepVolumeCapitacao:     shortStr(100).optional(),
  assetPrepHorizonteCapitacao:  z.enum(['imediato', '3_meses', '6_meses', '12_meses', '']).optional(),
})

// POST /api/analise/share
export const ShareCreateSchema = z.object({
  analiseId: uuid,
})

// DELETE /api/analise/share
export const ShareRevokeSchema = z.object({
  analiseId: uuid,
})

// POST /api/upload-url
export const UploadUrlSchema = z.object({
  analiseId: uuid,
  files: z
    .array(z.object({ name: z.string().min(1).max(255).trim() }))
    .min(1, 'Pelo menos um arquivo é obrigatório')
    .max(50, 'Máximo de 50 arquivos por vez'),
})

// POST /api/admin (ativar plano)
export const AdminSubscriptionSchema = z.object({
  user_id: uuid,
  plano:   z.enum(['avulso', 'recorrente']),
})

// DELETE /api/admin (cancelar plano)
export const AdminCancelSchema = z.object({
  user_id: uuid,
})

// POST /api/gerente/convidar
export const ConvidarSchema = z.object({
  email: z.string().email('Email inválido').max(200).trim().toLowerCase(),
})

// Steps válidos para regeneração (mesmos da página de análise)
const STEP_KEYS = [
  'orchestration', 'pesquisa', 'diagnostico', 'analise_ma', 'kyc',
  'contratos', 'originacao', 'estruturacao', 'maturidade',
  'relatorio_consolidado', 'blind_teaser', 'sell_side_pitchbook',
] as const

// POST /api/analise/[id]/regenerar/avaliar
export const RegenerarAvaliarSchema = z.object({
  step:    z.enum(STEP_KEYS),
  o_que:   z.string().min(10, 'Mínimo 10 caracteres').max(3000, 'Máximo 3000 caracteres').trim(),
  motivo:  z.string().min(10, 'Mínimo 10 caracteres').max(3000, 'Máximo 3000 caracteres').trim(),
})

// POST /api/analise/[id]/regenerar/executar
export const RegenerarExecutarSchema = z.object({
  regeneracao_id: uuid,
})

// POST /api/analise/[id]/regenerar/cascade
export const RegenerarCascadeSchema = z.object({
  regeneracao_id: uuid,
})

// POST /api/admin/benchmarks
export const BenchmarkCreateSchema = z.object({
  instrument:  shortStr(100).min(1),
  parameter:   shortStr(100).min(1),
  value_min:   z.number().finite(),
  value_max:   z.number().finite(),
  unit:        z.enum(['BRL', 'pct', 'multiplo', 'meses', 'qtd', 'pct_cdi']),
  descricao:   shortStr(500).optional(),
  notes:       shortStr(2000).optional(),
  source:      shortStr(500).optional(),
  valid_from:  z.string().optional(),    // YYYY-MM-DD
  valid_to:    z.string().nullable().optional(),
}).refine((d) => d.value_max >= d.value_min, {
  message: 'value_max precisa ser >= value_min',
  path:    ['value_max'],
})

// PATCH /api/admin/benchmarks/[id]
export const BenchmarkUpdateSchema = z.object({
  value_min:   z.number().finite().optional(),
  value_max:   z.number().finite().optional(),
  unit:        z.enum(['BRL', 'pct', 'multiplo', 'meses', 'qtd', 'pct_cdi']).optional(),
  descricao:   shortStr(500).optional(),
  notes:       shortStr(2000).optional(),
  source:      shortStr(500).optional(),
  valid_to:    z.string().nullable().optional(),
  ativo:       z.boolean().optional(),
})

// PATCH /api/escritorio/benchmarks/[id] — com optimistic locking (Fase 12)
export const BenchmarkEscritorioUpdateSchema = z.object({
  value_min:        z.number().finite().optional(),
  value_max:        z.number().finite().optional(),
  unit:             z.enum(['BRL', 'pct', 'multiplo', 'meses', 'qtd', 'pct_cdi']).optional(),
  descricao:        shortStr(500).optional(),
  notes:            shortStr(2000).optional(),
  source:           shortStr(500).optional(),
  expected_version: z.number().int().min(1),   // optimistic lock
})

// POST /api/admin/pacotes
export const PacoteCreateSchema = z.object({
  escritorio_id:  uuid,
  tipo:           z.enum(['pontual', 'institucional', 'corporativo']),
  analises_total: z.number().int().positive().max(1000),
  observacoes:    shortStr(2000).optional(),
}).refine(
  (d) => d.tipo !== 'institucional' || d.analises_total <= 20,
  { message: 'Pacote institucional permite no máximo 20 análises', path: ['analises_total'] }
)

// PATCH /api/admin/pacotes/[id]
export const PacoteUpdateSchema = z.object({
  analises_total: z.number().int().positive().max(1000).optional(),
  status:         z.enum(['ativo', 'pausado', 'encerrado']).optional(),
  observacoes:    shortStr(2000).optional(),
})

// PATCH /api/escritorio
export const EscritorioUpdateSchema = z.object({
  nome:           shortStr(200).optional(),
  cnpj:           shortStr(20).optional(),
  endereco:       shortStr(500).optional(),
  cidade_uf:      shortStr(100).optional(),
  telefone:       shortStr(20).optional(),
  email_contato:  optEmail,
  site:           optUrl,
  tagline:        shortStr(500).optional(),
  logo_url:       optUrl,
}).strict()
