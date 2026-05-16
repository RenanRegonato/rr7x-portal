// Coverage Checklists (Fase 11) — pontos obrigatórios por tipo de operação.
// Hardcoded em código para fácil revisão e versionamento via git.
// Editar e fazer PR quando precisar evoluir.

export type TipoOperacao = 'FIDC' | 'M_A_VENDA' | 'M_A_CAPTACAO' | 'CREDITO_BANCARIO' | 'GERAL'

export interface ChecklistItem {
  key:                  string
  label:                string
  description:          string
  agentes_responsaveis: string[]  // quais step_keys deveriam cobrir esse item
}

const FIDC_CHECKLIST: ChecklistItem[] = [
  { key: 'demonstrativos_3y',        label: 'Demonstrativos dos últimos 3 anos',  description: 'DRE e Balanço Patrimonial dos últimos 3 anos disponíveis e analisados.',                 agentes_responsaveis: ['diagnostico'] },
  { key: 'ebitda_normalizado',       label: 'EBITDA normalizado',                description: 'EBITDA ajustado para itens não-recorrentes calculado.',                                   agentes_responsaveis: ['diagnostico'] },
  { key: 'divida_liquida',           label: 'Dívida líquida mapeada',            description: 'Dívida líquida total mapeada, incluindo dívidas bancárias, debêntures e operações off-balance.', agentes_responsaveis: ['diagnostico'] },
  { key: 'fluxo_caixa',              label: 'Fluxo de caixa operacional',         description: 'Fluxo de caixa operacional analisado e geração de caixa estimada.',                       agentes_responsaveis: ['diagnostico'] },
  { key: 'concentracao_devedores',   label: 'Concentração de devedores',          description: 'Concentração de devedores/clientes mapeada — % por contraparte.',                         agentes_responsaveis: ['diagnostico', 'kyc'] },
  { key: 'patrimonio_cedente',       label: 'PL do cedente',                      description: 'Patrimônio líquido do cedente apurado e qualificado.',                                    agentes_responsaveis: ['diagnostico'] },
  { key: 'garantias',                label: 'Garantias mapeadas',                 description: 'Garantias e colaterais disponíveis mapeados e avaliados.',                                agentes_responsaveis: ['contratos', 'estruturacao'] },
  { key: 'ticket_versus_benchmark',  label: 'Ticket vs benchmark de mercado',     description: 'Ticket proposto comparado com benchmarks de FIDC (mínimo, típico).',                       agentes_responsaveis: ['estruturacao'] },
  { key: 'estrutura_proposta',       label: 'Estrutura específica do produto',    description: 'Estrutura do FIDC definida: senior/subordinada, prazo, taxa, vencimentos.',                agentes_responsaveis: ['estruturacao'] },
  { key: 'spread_modelado',          label: 'Spread/pricing modelado',            description: 'Spread esperado (sênior e subordinado) modelado com referência a CDI.',                  agentes_responsaveis: ['estruturacao'] },
  { key: 'riscos_juridicos',         label: 'Riscos jurídicos',                   description: 'Riscos jurídicos materiais (contratos, contingências, partes relacionadas) mapeados.',   agentes_responsaveis: ['contratos'] },
  { key: 'kyc_concluido',            label: 'KYC e screening concluídos',         description: 'KYC do cedente e screening de partes relacionadas concluídos.',                          agentes_responsaveis: ['kyc'] },
]

const M_A_VENDA_CHECKLIST: ChecklistItem[] = [
  { key: 'valuation_completo',       label: 'Valuation completo',                 description: 'Valuation por múltiplos + DCF (se aplicável) entregue, com range.',                       agentes_responsaveis: ['analise_ma', 'diagnostico'] },
  { key: 'ebitda_3y',                label: 'EBITDA dos últimos 3 anos',          description: 'EBITDA dos últimos 3 anos apurado e ajustado.',                                          agentes_responsaveis: ['diagnostico'] },
  { key: 'justificativa_multiplo',   label: 'Justificativa do múltiplo',          description: 'Múltiplo EBITDA proposto justificado com peers listados e transações comparáveis.',     agentes_responsaveis: ['analise_ma', 'pesquisa'] },
  { key: 'estrutura_societaria',     label: 'Estrutura societária',               description: 'Estrutura societária atual e pós-deal mapeada.',                                          agentes_responsaveis: ['kyc', 'contratos'] },
  { key: 'earnout_lockup',           label: 'Earnout / lockup considerados',      description: 'Componente de earnout, lockup e golden parachute considerados na estrutura.',           agentes_responsaveis: ['analise_ma', 'contratos'] },
  { key: 'riscos_juridicos',         label: 'Contingências mapeadas',             description: 'Contingências jurídicas, tributárias e trabalhistas mapeadas com valor estimado.',     agentes_responsaveis: ['contratos'] },
  { key: 'tax_structure',            label: 'Estrutura tributária',               description: 'Tax structure do deal definida (ganho de capital, holding, etc).',                       agentes_responsaveis: ['analise_ma', 'contratos'] },
  { key: 'transacoes_comparaveis',   label: 'Transações comparáveis',             description: 'Transações comparáveis recentes do setor citadas.',                                       agentes_responsaveis: ['pesquisa', 'analise_ma'] },
  { key: 'buyer_universe',           label: 'Universo de compradores',            description: 'Tipos de compradores prováveis (estratégico, financeiro, internacional) mapeados.',     agentes_responsaveis: ['originacao'] },
  { key: 'timing_processo',          label: 'Timing e processo',                  description: 'Cronograma e tipo de processo (M&A privado, leilão, dual-track) definidos.',          agentes_responsaveis: ['originacao'] },
]

const M_A_CAPTACAO_CHECKLIST: ChecklistItem[] = [
  { key: 'equity_story',             label: 'Equity story',                       description: 'Equity story clara e diferenciada apresentada.',                                          agentes_responsaveis: ['analise_ma', 'pesquisa'] },
  { key: 'use_of_proceeds',          label: 'Uso dos recursos',                   description: 'Uso dos recursos pleiteados detalhado.',                                                  agentes_responsaveis: ['analise_ma'] },
  { key: 'target_investors',         label: 'Investidor-alvo',                    description: 'Perfil de investidor-alvo (VC, PE, family office, estratégico) definido.',              agentes_responsaveis: ['originacao'] },
  { key: 'valuation_range',          label: 'Range de valuation',                 description: 'Floor / ceiling de valuation com justificativa.',                                        agentes_responsaveis: ['analise_ma'] },
  { key: 'traction_metrics',         label: 'Métricas de tração',                 description: 'Métricas de tração (receita, growth, margem, retention) apresentadas.',                  agentes_responsaveis: ['diagnostico', 'pesquisa'] },
  { key: 'governance',               label: 'Governance pós-investimento',        description: 'Governance pós-investimento (board, vetos, drag/tag) considerada.',                    agentes_responsaveis: ['contratos'] },
  { key: 'comparable_funding',       label: 'Rodadas comparáveis',                description: 'Rodadas comparáveis do setor citadas com valuation e investidor.',                        agentes_responsaveis: ['pesquisa'] },
  { key: 'kyc_concluido',            label: 'KYC concluído',                      description: 'KYC do controlador e partes relacionadas concluído.',                                     agentes_responsaveis: ['kyc'] },
]

const CREDITO_BANCARIO_CHECKLIST: ChecklistItem[] = [
  { key: 'demonstrativos_3y',        label: 'Demonstrativos 3 anos',              description: 'DRE e Balanço dos últimos 3 anos.',                                                       agentes_responsaveis: ['diagnostico'] },
  { key: 'ebitda_normalizado',       label: 'EBITDA normalizado',                description: 'EBITDA ajustado/normalizado calculado.',                                                  agentes_responsaveis: ['diagnostico'] },
  { key: 'cobertura_juros',          label: 'Cobertura de juros',                description: 'Índice de cobertura de juros (ICJ) e divida/EBITDA calculados.',                          agentes_responsaveis: ['diagnostico'] },
  { key: 'garantias',                label: 'Garantias',                          description: 'Garantias propostas (real, fidejussória) mapeadas e avaliadas.',                          agentes_responsaveis: ['contratos', 'estruturacao'] },
  { key: 'rating_estimado',          label: 'Rating de crédito estimado',         description: 'Rating estimado da operação com base em indicadores financeiros.',                       agentes_responsaveis: ['estruturacao'] },
  { key: 'pricing_estimado',         label: 'Pricing estimado',                   description: 'Spread esperado sobre CDI/IPCA estimado.',                                                agentes_responsaveis: ['estruturacao'] },
  { key: 'prazo_amortizacao',        label: 'Prazo e amortização',                description: 'Prazo e estrutura de amortização propostos.',                                             agentes_responsaveis: ['estruturacao'] },
  { key: 'covenants',                label: 'Covenants propostos',                description: 'Covenants financeiros e operacionais propostos.',                                         agentes_responsaveis: ['estruturacao', 'contratos'] },
]

const GERAL_CHECKLIST: ChecklistItem[] = [
  { key: 'demonstrativos_3y',        label: 'Demonstrativos 3 anos',              description: 'DRE e Balanço dos últimos 3 anos disponíveis.',                                          agentes_responsaveis: ['diagnostico'] },
  { key: 'ebitda_apurado',           label: 'EBITDA apurado',                     description: 'EBITDA apurado.',                                                                         agentes_responsaveis: ['diagnostico'] },
  { key: 'estrutura_societaria',     label: 'Estrutura societária',               description: 'Estrutura societária mapeada.',                                                           agentes_responsaveis: ['kyc'] },
  { key: 'riscos_juridicos',         label: 'Riscos jurídicos',                   description: 'Riscos jurídicos materiais mapeados.',                                                    agentes_responsaveis: ['contratos'] },
  { key: 'kyc_concluido',            label: 'KYC concluído',                      description: 'KYC e screening concluídos.',                                                             agentes_responsaveis: ['kyc'] },
  { key: 'maturidade_avaliada',      label: 'Maturidade avaliada',                description: 'Veredito de maturidade emitido com roadmap.',                                             agentes_responsaveis: ['maturidade'] },
]

export function getChecklist(tipo: TipoOperacao): ChecklistItem[] {
  switch (tipo) {
    case 'FIDC':              return FIDC_CHECKLIST
    case 'M_A_VENDA':         return M_A_VENDA_CHECKLIST
    case 'M_A_CAPTACAO':      return M_A_CAPTACAO_CHECKLIST
    case 'CREDITO_BANCARIO':  return CREDITO_BANCARIO_CHECKLIST
    case 'GERAL':             return GERAL_CHECKLIST
  }
}

// Detecta tipo de operação a partir do intake. Usa heurística sobre
// objetivo + tipoAtivo (campos do intake).
export function detectarTipoOperacao(intake: Record<string, string>): TipoOperacao {
  const objetivo = (intake.objetivo ?? '').toLowerCase()
  const tipoAtivo = (intake.tipoAtivo ?? '').toLowerCase()

  // FIDC: explícito no tipo ou objetivo
  if (tipoAtivo.includes('fidc') || objetivo.includes('fidc')) return 'FIDC'

  // M&A captação
  if (objetivo.includes('captar investimento') || objetivo.includes('captação')) return 'M_A_CAPTACAO'

  // M&A venda
  if (objetivo.includes('vender 100') || objetivo.includes('vender participa') || objetivo.includes('venda de')) {
    return 'M_A_VENDA'
  }

  // Crédito estruturado: padrão amplo
  if (objetivo.includes('estruturar crédito') || objetivo.includes('credito') || objetivo.includes('financiamento')) {
    return 'CREDITO_BANCARIO'
  }

  return 'GERAL'
}
