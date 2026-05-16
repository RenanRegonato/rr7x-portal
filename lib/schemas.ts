import { z } from 'zod'

const uuid    = z.string().uuid('ID inválido')
const shortStr = (max = 200) => z.string().max(max).trim()
const optUrl  = z.union([z.string().url('URL inválida').max(500), z.literal(''), z.undefined()])
const optEmail = z.union([z.string().email('Email inválido').max(200), z.literal(''), z.undefined()])

// POST /api/analise
export const AnaliseCreateSchema = z.object({
  nomeAtivo:             shortStr(200).min(1, 'Nome do ativo é obrigatório'),
  tipoAtivo:             shortStr(100).min(1),
  estagio:               shortStr(100).min(1),
  objetivo:              shortStr(2000).min(1),
  nivelInformacao:       shortStr(100).min(1),
  localizacao:           shortStr(200).min(1),
  ticketEstimado:        shortStr(100).min(1),
  receitaCaixa:          shortStr(500).optional(),
  passivos:              shortStr(500).optional(),
  informacoesAdicionais: shortStr(5000).optional(),
  resumoAtivo:           shortStr(5000).optional(),
  linkDocumentos:        optUrl,
  nomeProprietario:      shortStr(200).optional(),
  cpfCnpjProprietario:   shortStr(20).optional(),
  telefoneProprietario:  shortStr(20).optional(),
  emailProprietario:     optEmail,
  obsProprietario:       shortStr(2000).optional(),
  assessorNome:          shortStr(200).optional(),
  assessorTelefone:      shortStr(20).optional(),
  assessorEmail:         optEmail,
  parceiroNome:          shortStr(200).optional(),
  parceiroTelefone:      shortStr(20).optional(),
  parceiroEmail:         optEmail,
  obsMandato:            shortStr(2000).optional(),
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
