/**
 * Asset Preparation — Scoring e Matriz de Elegibilidade
 *
 * Calcula 7 scores de prontidão e matriz de elegibilidade para 8 tipos de captação.
 * Baseado em padrões reais do mercado de capital.
 */

import { ElegibilidadeResult } from './eligibility-analyzer'
import { GarganlosResult } from './bottleneck-identifier'
import { AssetPrepIntakeData } from './directives'

// ═══════════════════════════════════════════════════════════════════════════════

export interface ScoresDimensoes {
  juridico: number             // 0-100: contratos, certidões, processos
  financeiro: number            // 0-100: DRE, balanço, fluxo, consistência
  operacional: number           // 0-100: histórico, performance, previsibilidade
  governanca: number            // 0-100: conselho, compliance, estrutura
  garantias: number             // 0-100: colateral, seguros, mitigação
  compliance: number            // 0-100: regulatório, fiscal, ambiental
  atratividade_investidores: number  // 0-100: mercado, tese, retorno
}

export interface MatrizElegibilidade {
  captacao_geral: 'sim' | 'nao' | 'condicional'
  credito_estruturado: 'sim' | 'nao' | 'condicional'
  cri: 'sim' | 'nao' | 'condicional'
  cra: 'sim' | 'nao' | 'condicional'
  fidc: 'sim' | 'nao' | 'condicional'
  private_equity: 'sim' | 'nao' | 'condicional'
  family_office: 'sim' | 'nao' | 'condicional'
  debenturo: 'sim' | 'nao' | 'condicional'
}

// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcular 7 scores de prontidão baseado em:
 * 1. Gargalos identificados (peso: -25 por crítico, -10 por importante)
 * 2. Dados do intake (tamanho, histórico, governança)
 * 3. Elegibilidade (confirmação de viabilidade)
 */
export function calcularScoresDimensoes(
  intake: AssetPrepIntakeData,
  gargalos: GarganlosResult,
  elegibilidade: ElegibilidadeResult,
): ScoresDimensoes {
  // Base: 70 pontos (nem tudo é informação)
  // Adiciona 30 pontos baseado em dados positivos
  // Descontos por gargalos

  let juridico = 70
  let financeiro = 70
  let operacional = 70
  let governanca = 70
  let garantias = 70
  let compliance = 70
  let atratividade = 70

  // ── Bônus por dados preenchidos ────────────────────────────────────────────
  if (intake.receitaAnual) {
    const receita = parseFloat(intake.receitaAnual)
    if (receita > 10) financeiro += 20
    else if (receita > 1) financeiro += 10
    else financeiro += 5
  }

  if (intake.ebitda) {
    const ebitda = parseFloat(intake.ebitda)
    if (ebitda > 2) financeiro += 10
  }

  if (intake.patrimonioLiquido) {
    const pl = parseFloat(intake.patrimonioLiquido)
    if (pl > 50) garantias += 15
    else if (pl > 5) garantias += 8
  }

  if (intake.temGovernanca === 'sim') {
    governanca += 20
  } else if (intake.temGovernanca === 'nao_definido') {
    governanca += 5
  }

  if (intake.temBoard === 'sim') {
    governanca += 15
  }

  if (intake.historicoAnosOperacao) {
    const anos = parseInt(intake.historicoAnosOperacao)
    if (anos >= 5) operacional += 25
    else if (anos >= 3) operacional += 15
    else if (anos >= 1) operacional += 8
  }

  if (intake.atratividade === 'alta') {
    atratividade += 25
  } else if (intake.atratividade === 'media') {
    atratividade += 12
  }

  if (intake.posicaoMercado === 'lider') {
    atratividade += 20
  } else if (intake.posicaoMercado === 'consolidada') {
    atratividade += 12
  }

  // ── Descontos por gargalos ─────────────────────────────────────────────────
  gargalos.criticos.forEach(g => {
    switch (g.tipo) {
      case 'Ausência de Documentação':
        juridico -= 20
        break
      case 'Inconsistências Financeiras':
        financeiro -= 25
        break
      case 'Problemas Societários':
        governanca -= 20
        juridico -= 15
        break
      case 'Passivos Jurídicos':
        juridico -= 25
        break
      case 'Falta de Governança':
        governanca -= 25
        break
      case 'Indicadores Financeiros Inadequados':
        financeiro -= 20
        break
      case 'Baixa Previsibilidade de Receita':
        operacional -= 20
        break
      case 'Falta de Garantias':
        garantias -= 20
        break
      case 'Riscos Regulatórios':
        compliance -= 25
        break
      case 'Falta de Histórico Operacional':
        operacional -= 25
        break
    }
  })

  gargalos.importantes.forEach(g => {
    switch (g.tipo) {
      case 'Ausência de Documentação':
        juridico -= 10
        break
      case 'Inconsistências Financeiras':
        financeiro -= 12
        break
      case 'Problemas Societários':
        governanca -= 10
        break
      case 'Passivos Jurídicos':
        juridico -= 12
        break
      case 'Falta de Governança':
        governanca -= 12
        break
      case 'Indicadores Financeiros Inadequados':
        financeiro -= 10
        break
      case 'Baixa Previsibilidade de Receita':
        operacional -= 10
        break
      case 'Falta de Garantias':
        garantias -= 10
        break
      case 'Riscos Regulatórios':
        compliance -= 12
        break
      case 'Falta de Histórico Operacional':
        operacional -= 12
        break
    }
  })

  // ── Normalizar para 0-100 ──────────────────────────────────────────────────
  const normalizar = (score: number) => Math.max(0, Math.min(100, score))

  return {
    juridico: normalizar(juridico),
    financeiro: normalizar(financeiro),
    operacional: normalizar(operacional),
    governanca: normalizar(governanca),
    garantias: normalizar(garantias),
    compliance: normalizar(compliance),
    atratividade_investidores: normalizar(atratividade),
  }
}

// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mapear resultados de elegibilidade para matriz estruturada.
 */
export function construirMatrizElegibilidade(elegibilidade: ElegibilidadeResult): MatrizElegibilidade {
  const mapearItem = (tipo: string): 'sim' | 'nao' | 'condicional' => {
    const item = elegibilidade.items.find(i => i.tipo.toLowerCase().includes(tipo.toLowerCase()))
    if (!item) return 'nao'
    return item.elegivel as 'sim' | 'nao' | 'condicional'
  }

  return {
    captacao_geral: mapearItem('Captação Geral'),
    credito_estruturado: mapearItem('Crédito Estruturado'),
    cri: mapearItem('CRI'),
    cra: mapearItem('CRA'),
    fidc: mapearItem('FIDC'),
    private_equity: mapearItem('Private Equity'),
    family_office: mapearItem('Family Office'),
    debenturo: mapearItem('Debênture'),
  }
}

// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcular score consolidado (0-100).
 * Média simples das 7 dimensões.
 */
export function calcularScoreConsolidado(scores: ScoresDimensoes): number {
  const values = Object.values(scores)
  const media = values.reduce((a, b) => a + b, 0) / values.length
  return Math.round(media)
}

// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Identifier quais scores estão críticos (< 50).
 * Esses bloqueiam o gate inteligente.
 */
export function identificarScoresCriticos(scores: ScoresDimensoes): (keyof ScoresDimensoes)[] {
  const criticos: (keyof ScoresDimensoes)[] = []
  Object.entries(scores).forEach(([key, value]) => {
    if (value < 50) {
      criticos.push(key as keyof ScoresDimensoes)
    }
  })
  return criticos
}

// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Formatação visual dos scores para UI.
 */
export function formatarScoresParaUI(scores: ScoresDimensoes): Record<string, { valor: number; label: string; cor: string }> {
  const cores = (valor: number): string => {
    if (valor >= 75) return 'green'
    if (valor >= 50) return 'amber'
    return 'red'
  }

  return {
    juridico: {
      valor: scores.juridico,
      label: 'Jurídico',
      cor: cores(scores.juridico),
    },
    financeiro: {
      valor: scores.financeiro,
      label: 'Financeiro',
      cor: cores(scores.financeiro),
    },
    operacional: {
      valor: scores.operacional,
      label: 'Operacional',
      cor: cores(scores.operacional),
    },
    governanca: {
      valor: scores.governanca,
      label: 'Governança',
      cor: cores(scores.governanca),
    },
    garantias: {
      valor: scores.garantias,
      label: 'Garantias',
      cor: cores(scores.garantias),
    },
    compliance: {
      valor: scores.compliance,
      label: 'Compliance',
      cor: cores(scores.compliance),
    },
    atratividade: {
      valor: scores.atratividade_investidores,
      label: 'Atratividade',
      cor: cores(scores.atratividade_investidores),
    },
  }
}
