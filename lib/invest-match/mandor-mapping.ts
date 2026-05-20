// Contrato de mapping Mandor → Tese estruturada do Invest Match.
//
// A Mandor produz três fontes de verdade ao concluir uma análise:
//   1. analises.mesa_revisao      — veredito final da Mesa Consolidadora (jsonb)
//   2. analises.fact_bank         — consolidação dos facts extraídos (jsonb)
//   3. analise_facts (truth layer) — fatos atômicos com source/confidence
//
// O agente "Thesis Builder" (Claude Sonnet) recebe esses três inputs +
// metadados da análise (estagio, tipoAtivo, ticket, etc — vindos do DealIntake)
// e produz um StructuredThesis (lib/invest-match/types.ts).
//
// Este arquivo declara:
//   - tipo MandorThesisInput (o que entra)
//   - tabela MAPPING (campo da tese ← origem na Mandor)
//   - função stub mapMandorToThesis (a ser implementada no próximo passo)
//
// A função real combinará:
//   (a) Mapping determinístico — campos numéricos, listas, scores.
//   (b) Mapping via LLM — extração de campos não-estruturados a partir
//       da narrativa da mesa_revisao + diagnostico do fact_bank.

import type { StructuredThesis } from './types'
import type { DealIntake } from '../types'
import type { Fact } from '../truth-layer'


// ============================================================
// INPUT — o que a Mandor entrega
// ============================================================

export interface MesaRevisao {
  aprovacao:                 'aprovado' | 'aprovado_com_ressalvas' | 'revisao_necessaria'
  diagnostico_final:         string
  pontos_fortes:             string[]
  pontos_fracos:             string[]
  contradicoes_detectadas?:  Array<{
    descricao:               string
    agentes:                 string[]
    criticidade:             'alta' | 'media' | 'baixa'
  }>
  recomendacao_assessor:     string
  model_id:                  string
}

// Estrutura REAL do fact_bank consolidado.
// Espelha lib/ingestion/consolidate-fact-bank.ts:ConsolidatedFact.
// O fact_bank é um ARRAY plano (não objeto aninhado): consultas se fazem
// via filter por fact_type + key (ver lib/invest-match/fact-lookup.ts).

export interface ConsolidatedFactSource {
  doc_id:    string
  doc_name:  string
  page:      number | null
  quote:     string | null
}

export interface ConsolidatedFact {
  fact_type:            string  // numero_financeiro | governanca | etc (vocabulário do truth layer)
  key:                  string  // ex: 'ebitda_2024', 'socio_majoritario'
  value:                unknown // tipicamente { amount, unit, periodo, descricao } pra números
  status?:              'consolidated' | 'conflict'
  confidence:           number
  sources:              ConsolidatedFactSource[]
  conflicting_values?:  Array<{ value: unknown; doc_id: string; doc_name: string; page: number | null }>
}

export interface FactBank {
  facts:                ConsolidatedFact[]
  stats?: {
    total_facts_in?:    number
    total_facts_out?:   number
    conflicts?:         number
    duplicates_merged?: number
  }
  consolidation_model?: string  // ex: 'claude-sonnet-4-6'
}

export interface MandorThesisInput {
  analise_id:                string
  escritorio_id:             string

  // Metadados estruturados (DealIntake do form de criação)
  intake:                    DealIntake

  // Veredito consolidado
  mesa_revisao:              MesaRevisao | null

  // Fact bank consolidado (pode estar parcial em análises antigas)
  fact_bank:                 FactBank | null

  // Truth layer — fatos atômicos (rastreáveis a documento+página)
  facts:                     Fact[]

  // Scores das dimensões (calculados em outras camadas da Mandor)
  // Vêm de tabelas como coverage_check, consistency_issues, agent_claims
  scores:                    {
    maturity_score?:         number  // calculado pelo agente "maturidade"
    governance_score?:       number  // calculado por revisao/coverage
    operational_score?:      number
    documentacao_score?:     number  // % de cobertura documental
    risk_overall_score?:     number  // de risk_correlation
  }
}


// ============================================================
// MAPPING — campo da Tese ← origem na Mandor
// ============================================================
// Esta tabela é a documentação canônica da integração. Cada linha
// declara como um campo de StructuredThesis é populado.
//
// Tipos de origem:
//   intake         — vem do form de criação (DealIntake)
//   mesa_revisao   — campo direto do veredito
//   fact_bank      — campo numérico/booleano do bank
//   facts          — fact atômico (com source) — para campos sensíveis
//   scores         — score de outras tabelas (coverage/risk/maturidade)
//   llm            — extração via Claude Sonnet (campos narrativos + nuance)
//   derivado       — calculado a partir de outros campos

export const MAPPING = [
  // === IDENTIDADE ===
  { campo: 'empresa_nome',              origem: 'intake',       fonte: 'intake.nomeAtivo' },
  { campo: 'empresa_descricao_curta',   origem: 'intake',       fonte: 'intake.resumoAtivo' },

  // === SETORIAL ===
  { campo: 'setor_primario',            origem: 'intake',       fonte: 'normalizar(intake.tipoAtivo)' },
  { campo: 'sub_setores',               origem: 'llm',          fonte: 'extrair de mesa_revisao.diagnostico_final + fact_bank' },
  { campo: 'modelos_negocio',           origem: 'llm',          fonte: 'extrair de diagnostico (SaaS, marketplace, indústria...)' },
  { campo: 'vertical_tags',             origem: 'llm',          fonte: 'extrair tags livres (ESG, IoT, GenAI, regulado)' },

  // === ESTÁGIO ===
  { campo: 'estagio',                   origem: 'intake',       fonte: 'normalizar(intake.estagio) → Estagio enum' },
  { campo: 'maturity_score',            origem: 'scores',       fonte: 'scores.maturity_score' },
  { campo: 'anos_operacao',             origem: 'facts',        fonte: 'getFact(facts, "evento_relevante", "fundacao") → diff(now, data_fundacao)' },

  // === FINANCEIRO ===
  // Convenção de keys do fact-extractor: '<metrica>_<ano>' (ex: 'receita_2024', 'ebitda_2024')
  // value tem shape { amount: number, unit: 'BRL', periodo: string, descricao: string }
  { campo: 'receita_anual_brl',         origem: 'facts',        fonte: 'getLatestFinancialFact("receita") → value.amount' },
  { campo: 'ebitda_brl',                origem: 'facts',        fonte: 'getLatestFinancialFact("ebitda") → value.amount' },
  { campo: 'margem_ebitda_pct',         origem: 'derivado',     fonte: 'ebitda_brl / receita_anual_brl * 100' },
  { campo: 'crescimento_yoy_pct',       origem: 'derivado',     fonte: 'compara receita ano N e N-1 (se ambos existirem em facts)' },
  { campo: 'capital_buscado_brl',       origem: 'intake',       fonte: 'parseTicket(intake.ticketEstimado)' },
  { campo: 'capital_minimo_ticket_brl', origem: 'derivado',     fonte: 'default 20% do capital_buscado' },
  { campo: 'uso_capital',               origem: 'llm',          fonte: 'extrair de intake.objetivo + mesa_revisao.diagnostico_final' },
  { campo: 'valuation_pre_money_brl',   origem: 'facts',        fonte: 'getFact("numero_financeiro","valuation_pre_money") → value.amount' },
  { campo: 'equity_oferecido_pct',      origem: 'llm',          fonte: 'extrair de intake.objetivo + mesa_revisao' },

  // === GOVERNANÇA ===
  // Heurística: deduzir de facts.estrutura_societaria + presença de auditoria nos docs
  { campo: 'governance_score',          origem: 'scores',       fonte: 'scores.governance_score (de coverage_check/revisao)' },
  { campo: 'tem_conselho',              origem: 'llm',          fonte: 'inferir de mesa_revisao + facts.estrutura_societaria' },
  { campo: 'tem_auditoria',             origem: 'facts',        fonte: 'hasDocFact("auditoria") || hasDocFact("balanco_auditado")' },
  { campo: 'nivel_compliance',          origem: 'llm',          fonte: 'inferir de mesa_revisao.pontos_fortes + facts.documento_disponivel' },

  // === RISCO ===
  { campo: 'risk_overall_score',        origem: 'scores',       fonte: 'scores.risk_overall_score (de risk_correlation)' },
  { campo: 'risk_factors',              origem: 'mesa_revisao', fonte: 'mesa_revisao.pontos_fracos + facts do tipo "lacuna" e "passivo"' },

  // === OPERACIONAL ===
  { campo: 'operational_score',         origem: 'scores',       fonte: 'scores.operational_score (de coverage/agentes operacionais)' },
  { campo: 'team_size',                 origem: 'llm',          fonte: 'extrair de mesa_revisao + intake.resumoAtivo' },
  { campo: 'key_dependencies',          origem: 'llm',          fonte: 'sintetizar de mesa_revisao.pontos_fracos + facts.contrato (concentração)' },

  // === GEOGRAFIA ===
  { campo: 'hq_estado',                 origem: 'intake',       fonte: 'parseLocalizacao(intake.localizacao).estado' },
  { campo: 'hq_cidade',                 origem: 'intake',       fonte: 'parseLocalizacao(intake.localizacao).cidade' },
  { campo: 'regioes_operacao',          origem: 'llm',          fonte: 'extrair de mesa_revisao + fact_bank' },

  // === DEAL ===
  { campo: 'tipo_deal',                 origem: 'llm',          fonte: 'inferir de intake.objetivo (compra, venda, captação...)' },
  { campo: 'controle_oferecido',        origem: 'llm',          fonte: 'inferir de intake.objetivo + equity_oferecido_pct' },
  { campo: 'horizonte_saida_anos',      origem: 'llm',          fonte: 'extrair de exit_story' },
  { campo: 'urgencia',                  origem: 'llm',          fonte: 'inferir de mesa_revisao.recomendacao_assessor + intake' },

  // === DOCUMENTAÇÃO ===
  { campo: 'documentacao_score',        origem: 'scores',       fonte: 'scores.documentacao_score (coverage_check)' },
  { campo: 'pronto_para_dd',            origem: 'derivado',     fonte: 'documentacao_score >= 80 && mesa_revisao.aprovacao !== "revisao_necessaria"' },

  // === EXCLUSÕES / SINALIZAÇÕES ===
  { campo: 'tipos_investidor_excluidos', origem: 'llm',         fonte: 'inferir de intake.obsMandato' },
  { campo: 'esg_compliant',             origem: 'llm',          fonte: 'inferir de mesa_revisao + fact_bank.indicadores' },

  // === NARRATIVA (entra no embedding) ===
  { campo: 'tese_investimento',         origem: 'llm',          fonte: 'sintetizar de mesa_revisao.diagnostico_final + pontos_fortes' },
  { campo: 'value_proposition',         origem: 'llm',          fonte: 'extrair de mesa_revisao.pontos_fortes' },
  { campo: 'competitive_moat',          origem: 'llm',          fonte: 'extrair de mesa_revisao.pontos_fortes + diagnostico' },
  { campo: 'risk_narrative',            origem: 'llm',          fonte: 'sintetizar de mesa_revisao.pontos_fracos + contradicoes_detectadas' },
  { campo: 'exit_story',                origem: 'llm',          fonte: 'sintetizar de mesa_revisao.recomendacao_assessor + fact_bank' },
] as const

export type MappingEntry = (typeof MAPPING)[number]


// ============================================================
// STUB — a ser implementada em /api/invest-match/teses/from-analise
// ============================================================
//
// Implementação prevista (próxima sprint):
//   1. Hidratar MandorThesisInput (lê analises + mesa_revisao + fact_bank +
//      analise_facts + scores de outras tabelas).
//   2. Aplicar mapping determinístico (campos com origem ∈ {intake, fact_bank,
//      facts, scores, derivado, mesa_revisao} sem LLM).
//   3. Chamar Claude Sonnet 4.6 com prompt estruturado pra preencher campos
//      origem='llm'. Saída JSON validada por zod.
//   4. Persistir em teses (com unique constraint analise_id → upsert).
//   5. Enfileirar job Inngest 'invest-match/thesis-created' que vai:
//        - gerar embedding (voyage-3-large) via /api/embeddings
//        - rodar motor de matching (Camadas 1-4) contra investidores ativos
//        - persistir matches com score >= 70
//        - notificar UI via Supabase Realtime

export async function mapMandorToThesis(
  input: MandorThesisInput
): Promise<StructuredThesis> {
  throw new Error(
    '[invest-match/mandor-mapping] mapMandorToThesis() não implementada. ' +
    'Próxima sprint: ver MAPPING table e contract acima. ' +
    `Input recebido para analise_id=${input.analise_id}.`
  )
}
