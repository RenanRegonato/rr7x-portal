// Tipos do módulo Invest Match.
// Espelha o schema definido em supabase/migrations/20260520_invest_match_schema.sql.

// ============================================================
// Vocabulários controlados (consistência com a UI e o motor)
// ============================================================

export type Estagio =
  | 'ideia'
  | 'mvp'
  | 'early_revenue'
  | 'growth'
  | 'mature'
  | 'turnaround'

export type TipoInvestidor =
  | 'pessoa_fisica'
  | 'holding_familiar'
  | 'family_office'
  | 'fundo'
  | 'financeira'
  | 'pj'
  | 'estrategico_corporativo'
  | 'gestora'
  | 'clube_investimento'

export type TipoDeal =
  | 'equity'
  | 'debt'
  | 'convertible'
  | 'm_and_a_sale'
  | 'm_and_a_acquisition'
  | 'earn_out'
  | 'growth_equity'
  | 'special_situations'

export type ControleOferecido = 'minority' | 'majority' | 'full'

export type Urgencia = 'baixa' | 'media' | 'alta'

export type NivelCompliance = 'basico' | 'intermediario' | 'avancado'

export type StatusTese =
  | 'lead'
  | 'atendimento'
  | 'matches'
  | 'negociacao'
  | 'realizado'
  | 'suspenso'
  | 'arquivado'

export type StatusMatch =
  | 'sugerido'
  | 'aprovado_auto'
  | 'aprovado_admin'
  | 'notificado'
  | 'em_negociacao'
  | 'nda'
  | 'proposta'
  | 'dd'
  | 'fechado'
  | 'rejeitado_admin'
  | 'rejeitado_investidor'
  | 'rejeitado_projeto'
  | 'descartado'

export type OrigemTese = 'mandor' | 'manual' | 'importada'

export type LlmRecommendation = 'strong_match' | 'review' | 'skip'


// ============================================================
// Tese estruturada — espelha a tabela `teses`
// ============================================================
// Esta é a representação completa de uma tese de empresa/projeto.
// Quando origem='mandor', os campos vêm do MandorMapping (ver mandor-mapping.ts).

export interface StructuredThesis {
  id?:                          string
  escritorio_id:                string
  analise_id:                   string | null
  origem:                       OrigemTese
  origem_model_id?:             string | null
  origem_payload?:              Record<string, unknown> | null

  // Identidade
  empresa_nome:                 string
  empresa_descricao_curta:      string | null

  // Setorial
  setor_primario:               string
  sub_setores:                  string[]
  modelos_negocio:              string[]
  vertical_tags:                string[]

  // Estágio
  estagio:                      Estagio
  maturity_score:               number | null   // 0-100
  anos_operacao:                number | null

  // Financeiro
  receita_anual_brl:            number | null
  ebitda_brl:                   number | null
  margem_ebitda_pct:            number | null
  crescimento_yoy_pct:          number | null
  capital_buscado_brl:          number
  capital_minimo_ticket_brl:    number | null
  uso_capital:                  Record<string, number> | null
  valuation_pre_money_brl:      number | null
  equity_oferecido_pct:         number | null

  // Governança
  governance_score:             number | null   // 0-100
  tem_conselho:                 boolean | null
  tem_auditoria:                boolean | null
  nivel_compliance:             NivelCompliance | null

  // Risco
  risk_overall_score:           number | null   // 0-100, menor=menos risco
  risk_factors:                 string[]

  // Operacional
  operational_score:            number | null
  team_size:                    number | null
  key_dependencies:             string[]

  // Geografia
  hq_estado:                    string | null
  hq_cidade:                    string | null
  regioes_operacao:             string[]

  // Deal
  tipo_deal:                    TipoDeal | null
  controle_oferecido:           ControleOferecido | null
  horizonte_saida_anos:         number | null
  urgencia:                     Urgencia

  // Documentação
  documentacao_score:           number | null
  pronto_para_dd:               boolean

  // Exclusões
  tipos_investidor_excluidos:   string[]
  esg_compliant:                boolean

  // Narrativa (entra no embedding)
  tese_investimento:            string | null
  value_proposition:            string | null
  competitive_moat:             string | null
  risk_narrative:               string | null
  exit_story:                   string | null

  // Embedding (gerado em pipeline separado)
  tese_embedding?:              number[] | null
  tese_embedding_model?:        string | null
  tese_embedding_at?:           string | null

  // Pipeline
  status:                       StatusTese

  // Auditoria
  criado_por?:                  string | null
  criado_em?:                   string
  atualizado_em?:                string
}


// ============================================================
// Investidor — espelha a tabela `investidores`
// ============================================================

export interface Investidor {
  id?:                          string
  user_id:                      string | null
  escritorio_id:                string

  nome:                         string
  tipo:                         TipoInvestidor | string
  email:                        string | null
  telefone:                     string | null
  cidade:                       string | null
  estado:                       string | null

  // Tese declarada
  setores_alvo:                 string[]
  sub_setores:                  string[]
  modelos_negocio:              string[]
  vertical_tags:                string[]

  estagios_aceitos:             Estagio[]
  maturity_min_score:           number | null
  governance_min_score:         number | null
  documentacao_min_score:       number | null
  risk_max_score:               number | null

  ticket_min_brl:               number | null
  ticket_max_brl:               number | null
  receita_min_brl:              number | null
  receita_max_brl:              number | null
  ebitda_min_brl:               number | null
  ebitda_max_brl:               number | null
  margem_ebitda_min_pct:        number | null

  tipos_deal_aceitos:           TipoDeal[]
  controle_aceito:              ControleOferecido[]
  horizonte_saida_min_anos:     number | null
  horizonte_saida_max_anos:     number | null

  geografias_aceitas:           string[]
  geografias_excluidas:         string[]

  setores_excluidos:            string[]
  requer_esg:                   boolean
  requer_audited_financials:    boolean
  requer_pronto_para_dd:        boolean

  tese_resumo:                  string | null
  tese_completa:                string | null
  exemplos_deals_passados:      string | null

  tese_embedding?:              number[] | null
  tese_embedding_model?:        string | null
  tese_embedding_at?:           string | null

  // Sinais comportamentais
  matches_recebidos?:           number
  matches_aprovados?:           number
  matches_rejeitados?:          number
  ndas_assinados?:              number
  deals_fechados?:              number
  response_avg_hours?:          number | null
  ultima_atividade_em?:         string | null

  status:                       'ativo' | 'pausado' | 'arquivado'
  observacoes?:                 string | null

  criado_por?:                  string | null
  criado_em?:                   string
  atualizado_em?:                string
}


// ============================================================
// Match — espelha a tabela `matches`
// ============================================================

export interface MatchScoreDimensao {
  score:    number   // 0-100
  peso:     number   // 0-1 (somam 1 entre as dimensões)
  motivo?:  string   // explicação curta (gerada pelo motor)
}

export type MatchScoreBreakdown = {
  setorial:      MatchScoreDimensao
  ticket:        MatchScoreDimensao
  stage:         MatchScoreDimensao
  maturity:      MatchScoreDimensao
  governance:    MatchScoreDimensao
  risk:          MatchScoreDimensao
  geography:     MatchScoreDimensao
  documentation: MatchScoreDimensao
  exit_horizon:  MatchScoreDimensao
  urgency:       MatchScoreDimensao
}

export interface Match {
  id?:                          string
  investidor_id:                string
  tese_id:                      string
  analise_id:                   string | null
  escritorio_id:                string

  score_final:                  number
  score_estruturado:            number | null
  score_semantico:              number | null
  score_llm:                    number | null
  score_breakdown:              MatchScoreBreakdown | Record<string, unknown>

  passou_hard_filter:           boolean
  motivos_bloqueio:             string[]

  llm_recommendation:           LlmRecommendation | null
  llm_strengths:                string[]
  llm_concerns:                 string[]
  llm_talking_points:           string[]
  llm_close_probability:        number | null
  llm_resumo:                   string | null
  llm_model_id:                 string | null
  llm_payload:                  Record<string, unknown> | null

  status:                       StatusMatch
  rejeicao_motivo:              string | null
  tags:                         string[]

  calculado_em:                 string
  motor_versao:                 string
  aprovado_em:                  string | null
  aprovado_por:                 string | null
  notificado_em:                string | null
  primeiro_contato_em:          string | null
  fechado_em:                   string | null

  criado_em?:                   string
  atualizado_em?:                string
}
