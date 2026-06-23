// Zod schemas do módulo Invest Match.
// Valida payloads das rotas /api/invest-match/*.

import { z } from 'zod'

// ============================================================
// Vocabulários controlados (espelham types.ts)
// ============================================================
const TIPO_INVESTIDOR = [
  'pessoa_fisica', 'holding_familiar', 'family_office', 'fundo', 'financeira',
  'pj', 'estrategico_corporativo', 'gestora', 'clube_investimento',
  'securitizadora', 'administradora_fiduciaria',
] as const

const ESTAGIOS = ['ideia', 'mvp', 'early_revenue', 'growth', 'mature', 'turnaround'] as const

const TIPOS_DEAL = [
  'equity', 'debt', 'convertible', 'm_and_a_sale', 'm_and_a_acquisition',
  'earn_out', 'growth_equity', 'special_situations', 'credito_estruturado',
] as const

const CONTROLES = ['minority', 'majority', 'full'] as const

const STATUS_INVESTIDOR = ['ativo', 'pausado', 'arquivado'] as const


// ============================================================
// Helpers
// ============================================================
const trimString = (max: number) => z.string().trim().max(max)
const optTrim    = (max: number) => trimString(max).optional().nullable()

const optInt = (min: number, max: number) =>
  z.number().int().min(min).max(max).optional().nullable()

const optBigInt = (min: number, max: number) =>
  z.number().int().min(min).max(max).optional().nullable()

const optPct = z.number().min(0).max(100).optional().nullable()

const arrStr = (maxItems: number, maxLen = 100) =>
  z.array(z.string().trim().max(maxLen)).max(maxItems).optional().default([])

const arrEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.array(z.enum(values)).optional().default([])


// ============================================================
// Base (sem superRefine) — referenciada por Create e Update
// ============================================================
// Em Zod 4 o .superRefine() vira ZodEffects e perde .partial()/.extend().
// Mantemos o objeto base separado pra reusar em ambos os schemas.
const InvestidorBase = z.object({
  // === Identidade ===
  nome:       trimString(200).min(2, 'Nome obrigatório'),
  tipo:       z.enum(TIPO_INVESTIDOR),
  email:      z.union([z.string().email().max(200), z.literal(''), z.null()]).optional(),
  telefone:   optTrim(50),
  cidade:     optTrim(120),
  estado:     optTrim(4),     // UF: 2 letras + folga

  // === Tese declarada — setorial ===
  setores_alvo:       arrStr(15),
  sub_setores:        arrStr(20),
  modelos_negocio:    arrStr(10),
  vertical_tags:      arrStr(20, 60),

  // === Estágio/Maturidade ===
  estagios_aceitos:        arrEnum(ESTAGIOS),
  maturity_min_score:      optInt(0, 100),
  governance_min_score:    optInt(0, 100),
  documentacao_min_score:  optInt(0, 100),
  risk_max_score:          optInt(0, 100),

  // === Financeiro ===
  ticket_min_brl:        optBigInt(0, 100_000_000_000),  // até R$ 100bi
  ticket_max_brl:        optBigInt(0, 100_000_000_000),
  receita_min_brl:       optBigInt(0, 100_000_000_000),
  receita_max_brl:       optBigInt(0, 100_000_000_000),
  ebitda_min_brl:        optBigInt(-10_000_000_000, 100_000_000_000),
  ebitda_max_brl:        optBigInt(-10_000_000_000, 100_000_000_000),
  margem_ebitda_min_pct: optPct,

  // === Deal ===
  tipos_deal_aceitos:        arrEnum(TIPOS_DEAL),
  controle_aceito:           arrEnum(CONTROLES),
  horizonte_saida_min_anos:  optInt(0, 30),
  horizonte_saida_max_anos:  optInt(0, 30),

  // === Geografia ===
  geografias_aceitas:    arrStr(30, 30),
  geografias_excluidas:  arrStr(30, 30),

  // === Exclusões ===
  setores_excluidos:          arrStr(15),
  requer_esg:                 z.boolean().optional().default(false),
  requer_audited_financials:  z.boolean().optional().default(false),
  requer_pronto_para_dd:      z.boolean().optional().default(false),

  // === Narrativa (alimenta embedding) ===
  tese_resumo:              optTrim(2000),
  tese_completa:            optTrim(8000),
  exemplos_deals_passados:  optTrim(4000),

  // === Estado ===
  observacoes:  optTrim(2000),
})


// ============================================================
// CREATE — POST /api/invest-match/investidores
// ============================================================
export const InvestidorCreateSchema = InvestidorBase.superRefine((data, ctx) => {
  if (data.ticket_min_brl != null && data.ticket_max_brl != null
      && data.ticket_min_brl > data.ticket_max_brl) {
    ctx.addIssue({
      code: 'custom',
      path: ['ticket_max_brl'],
      message: 'ticket_max_brl deve ser >= ticket_min_brl',
    })
  }
  if (data.horizonte_saida_min_anos != null && data.horizonte_saida_max_anos != null
      && data.horizonte_saida_min_anos > data.horizonte_saida_max_anos) {
    ctx.addIssue({
      code: 'custom',
      path: ['horizonte_saida_max_anos'],
      message: 'horizonte_saida_max_anos deve ser >= horizonte_saida_min_anos',
    })
  }
  if (data.receita_min_brl != null && data.receita_max_brl != null
      && data.receita_min_brl > data.receita_max_brl) {
    ctx.addIssue({
      code: 'custom',
      path: ['receita_max_brl'],
      message: 'receita_max_brl deve ser >= receita_min_brl',
    })
  }
})

export type InvestidorCreateInput = z.infer<typeof InvestidorCreateSchema>


// ============================================================
// UPDATE — PATCH /api/invest-match/investidores/[id]
// ============================================================
// Tudo opcional pra permitir update parcial. status pode mudar aqui.
// Não usa superRefine — validação cruzada acontece no service.

export const InvestidorUpdateSchema = InvestidorBase.partial().extend({
  status: z.enum(STATUS_INVESTIDOR).optional(),
})

export type InvestidorUpdateInput = z.infer<typeof InvestidorUpdateSchema>


// ============================================================
// LIST — GET /api/invest-match/investidores?status=ativo&q=...
// ============================================================
export const InvestidorListQuerySchema = z.object({
  status: z.enum(STATUS_INVESTIDOR).optional(),
  q:      z.string().trim().max(200).optional(),  // busca livre por nome/email
  limit:  z.coerce.number().int().min(1).max(200).optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

export type InvestidorListQuery = z.infer<typeof InvestidorListQuerySchema>


// ============================================================
// Vocabulários adicionais (tese)
// ============================================================
const URGENCIAS        = ['baixa', 'media', 'alta'] as const
const NIVEIS_COMPLIANCE = ['basico', 'intermediario', 'avancado'] as const
const STATUS_TESE = [
  'lead', 'atendimento', 'matches', 'negociacao', 'realizado', 'suspenso', 'arquivado',
] as const

const optBrl   = optBigInt(0, 100_000_000_000)
const optFloat = (min: number, max: number) =>
  z.number().min(min).max(max).optional().nullable()


// ============================================================
// CREATE — POST /api/invest-match/teses (cadastro manual de tese)
// ============================================================
// Espelha os campos inseríveis da tabela `teses` (StructuredThesis), com tudo
// opcional exceto o núcleo que o matching precisa (nome, setor, estágio,
// capital buscado). origem/analise_id/embedding NÃO entram aqui — o service
// cuida deles. Defaults seguem o builder (status 'lead', urgência 'media').
export const TeseCreateSchema = z.object({
  // === Núcleo (obrigatório) ===
  empresa_nome:        trimString(200).min(2, 'Nome da empresa/projeto obrigatório'),
  setor_primario:      trimString(120).min(2, 'Setor obrigatório'),
  estagio:             z.enum(ESTAGIOS),
  capital_buscado_brl: z.number().int().min(0).max(100_000_000_000),

  // === Identidade ===
  empresa_descricao_curta: optTrim(500),

  // === Setorial ===
  sub_setores:      arrStr(20),
  modelos_negocio:  arrStr(10),
  vertical_tags:    arrStr(20, 60),

  // === Estágio / qualidade (scores 0-100) ===
  maturity_score:     optInt(0, 100),
  governance_score:   optInt(0, 100),
  operational_score:  optInt(0, 100),
  risk_overall_score: optInt(0, 100),
  documentacao_score: optInt(0, 100),
  anos_operacao:      optInt(0, 200),
  team_size:          optInt(0, 1_000_000),

  // === Financeiro ===
  receita_anual_brl:         optBrl,
  ebitda_brl:                optBigInt(-100_000_000_000, 100_000_000_000),
  margem_ebitda_pct:         optFloat(-1000, 1000),
  crescimento_yoy_pct:       optFloat(-1000, 100000),
  capital_minimo_ticket_brl: optBrl,
  valuation_pre_money_brl:   optBrl,
  equity_oferecido_pct:      optPct,

  // === Governança / risco ===
  tem_conselho:    z.boolean().optional().nullable(),
  tem_auditoria:   z.boolean().optional().nullable(),
  nivel_compliance: z.enum(NIVEIS_COMPLIANCE).optional().nullable(),
  risk_factors:    arrStr(20, 200),
  key_dependencies: arrStr(20, 200),

  // === Geografia ===
  hq_estado:        optTrim(4),
  hq_cidade:        optTrim(120),
  regioes_operacao: arrStr(30, 40),

  // === Deal ===
  tipo_deal:            z.enum(TIPOS_DEAL).optional().nullable(),
  controle_oferecido:   z.enum(CONTROLES).optional().nullable(),
  horizonte_saida_anos: optInt(0, 30),
  urgencia:             z.enum(URGENCIAS).optional().default('media'),

  // === Documentação / exclusões ===
  pronto_para_dd:             z.boolean().optional().default(false),
  tipos_investidor_excluidos: arrEnum(TIPO_INVESTIDOR),
  esg_compliant:              z.boolean().optional().default(false),

  // === Narrativa (alimenta o embedding) ===
  tese_investimento: optTrim(8000),
  value_proposition: optTrim(4000),
  competitive_moat:  optTrim(4000),
  risk_narrative:    optTrim(4000),
  exit_story:        optTrim(4000),

  // === Estado ===
  status: z.enum(STATUS_TESE).optional().default('lead'),
})

export type TeseCreateInput = z.infer<typeof TeseCreateSchema>
