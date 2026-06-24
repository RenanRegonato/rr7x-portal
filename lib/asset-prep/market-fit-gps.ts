/**
 * Asset Preparation — P5: Market Fit GPS (Conexão com Invest Match)
 *
 * Recomenda tipo de capital ideal e conecta com investidores do Invest Match.
 * "GPS de Captação": qual caminho seguir para chegar ao mercado.
 */

import { MarketFitResult } from './market-fit-recommender'
import { MarketFitRecomendacao, mapeiarParaInvestidoresInvestMatch } from './market-fit-recommender'

// ═══════════════════════════════════════════════════════════════════════════════

export interface InvestidorRecomendado {
  tipo_investidor: string    // securitizadora, gestora, family_office, etc
  tipo_deal: string          // credito_estruturado, equity, debt, etc
  descricao: string          // "Gestoras que operam FIDC de crédito"
  exemplos: string[]         // ["Bradesco Asset", "Tercon", "SRM Empírica"]
  contato_invest_match: boolean  // está cadastrado no Invest Match?
}

export interface MarketFitGPS {
  recomendacao_principal: MarketFitRecomendacao
  alternativas: MarketFitRecomendacao[]
  investidores_recomendados: InvestidorRecomendado[]
  proximo_passo_roadshow: {
    titulo: string
    descricao: string
    checklist: string[]
  }
  tempo_estimado_ciclo: {
    preparacao_dias: number
    pitch_dias: number  // dias de roadshow/pitching
    negociacao_dias: number  // dias de negociação/due diligence
    total_ciclo_dias: number
  }
}

// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gerar GPS completo de captação com recomendações de investidores.
 */
export function gerarMarketFitGPS(marketFit: MarketFitResult): MarketFitGPS {
  const recomendacao_principal = marketFit.recomendacao_principal
  const investidoresMap = mapeiarParaInvestidoresInvestMatch(recomendacao_principal.tipo_capital_ideal)

  // Mapear para investidores recomendados
  const investidores_recomendados: InvestidorRecomendado[] = []

  if (investidoresMap.tipo_investidor && investidoresMap.tipo_investidor.length > 0) {
    investidoresMap.tipo_investidor.forEach(tipo => {
      const descricao = descreverTipoInvestidor(tipo, recomendacao_principal.tipo_capital_ideal)
      const exemplos = exemplosInvestidores(tipo, recomendacao_principal.tipo_capital_ideal)

      investidores_recomendados.push({
        tipo_investidor: tipo,
        tipo_deal: investidoresMap.tipo_deal || 'outro',
        descricao,
        exemplos,
        contato_invest_match: true,  // assume que estão no sistema
      })
    })
  }

  // Timeline de ciclo típico
  const tempo_estimado_ciclo = calcularTempoCiclo(recomendacao_principal.tipo_capital_ideal)

  // Próximos passos para roadshow
  const proximo_passo_roadshow = {
    titulo: `Preparar para Roadshow com ${recomendacao_principal.tipo_capital_ideal}`,
    descricao: `Seu ativo está pronto para apresentar. Os próximos ${tempo_estimado_ciclo.preparacao_dias + 7} dias são críticos.`,
    checklist: gerarChecklistRoadshow(recomendacao_principal.tipo_capital_ideal),
  }

  return {
    recomendacao_principal,
    alternativas: marketFit.alternativas,
    investidores_recomendados,
    proximo_passo_roadshow,
    tempo_estimado_ciclo,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Descrever tipo de investidor.
 */
function descreverTipoInvestidor(tipo: string, capitalTipo: string): string {
  const mapa: Record<string, string> = {
    securitizadora: 'Estruturadoras e securitizadoras especializadas em CRI/CRA/CCB',
    gestora: `Gestoras de ${capitalTipo} com expertise em crédito e estruturação`,
    fundo: `Fundos de investimento focados em ${capitalTipo}`,
    financeira: 'Instituições financeiras e bancos com desk de crédito estruturado',
    family_office: 'Family offices e patrimônios altos buscando investimentos estratégicos',
    pj: 'Pessoas jurídicas e holdings com apetite de investimento',
    estrategico_corporativo: 'Corporativos estratégicos e sócios-investidores',
    clube_investimento: 'Clubes de investimento e sindicatos de investidores',
    administradora_fiduciaria: 'Administradoras fiduciárias de FIDC',
  }

  return mapa[tipo] || 'Investidores institucionais qualificados'
}

/**
 * Listar exemplos de investidores por tipo.
 */
function exemplosInvestidores(tipo: string, capitalTipo: string): string[] {
  const exemplos: Record<string, Record<string, string[]>> = {
    gestora: {
      FIDC: ['Bradesco Asset Management', 'Tercon', 'SRM Empírica', 'Ouro Preto'],
      CRI: ['BTG Pactual', 'Kinea', 'Vórtx'],
      CRA: ['Compass', 'Terra', 'Ouro Preto Agronegocios'],
      'Private Equity': ['3G Capital', 'GP Investments', 'Tarpon'],
    },
    securitizadora: {
      CRI: ['Vórtx Securitizadora', 'Bradesco Securitizadora', 'Itaú Securitizadora'],
      CRA: ['Bradesco Securitizadora', 'Itaú Securitizadora'],
    },
    family_office: {
      'Private Equity': ['BTG Pactual Wealth', 'Banco Modal Family'],
    },
  }

  return (exemplos[tipo]?.[capitalTipo] || exemplos[tipo]?.['FIDC']) ?? ['Investidores qualificados do Invest Match']
}

/**
 * Checklist de preparação para roadshow.
 */
function gerarChecklistRoadshow(capitalTipo: string): string[] {
  const baseChecklist = [
    '✓ Book de apresentação (20 slides)',
    '✓ Executive Summary (2 páginas)',
    '✓ Apresentação executiva (15 min)',
  ]

  const porTipo: Record<string, string[]> = {
    FIDC: [
      '✓ Contrato de lastro e cedentes',
      '✓ Histórico de recebimento (12+ meses)',
      '✓ Estrutura de cotas (sênior/subordinada)',
      '✓ Parecer jurídico da estruturação',
    ],
    CRI: [
      '✓ Matrícula do imóvel atualizada',
      '✓ Laudo de avaliação do imóvel',
      '✓ Certidão de ônus do imóvel',
      '✓ Parecer jurídico CRI',
    ],
    CRA: [
      '✓ Documentação do ativo agrícola',
      '✓ Histórico de safra/colheita',
      '✓ Parecer jurídico CRA',
      '✓ Aval de crédito rural se houver',
    ],
    'Private Equity': [
      '✓ Plano de crescimento (3-5 anos)',
      '✓ Análise de potencial de saída',
      '✓ Projeção de retorno (IRR, MOIC)',
      '✓ Management presentation',
    ],
  }

  return baseChecklist.concat(porTipo[capitalTipo] || [])
}

/**
 * Timeline de ciclo típico de captação.
 */
function calcularTempoCiclo(capitalTipo: string): {
  preparacao_dias: number
  pitch_dias: number
  negociacao_dias: number
  total_ciclo_dias: number
} {
  const timelines: Record<string, any> = {
    FIDC: { prep: 15, pitch: 30, neg: 45, total: 90 },
    CRI: { prep: 20, pitch: 30, neg: 60, total: 110 },
    CRA: { prep: 20, pitch: 30, neg: 60, total: 110 },
    'Private Equity': { prep: 30, pitch: 45, neg: 90, total: 165 },
    'Family Office': { prep: 14, pitch: 21, neg: 30, total: 65 },
    Debênture: { prep: 20, pitch: 30, neg: 60, total: 110 },
    'Growth Equity': { prep: 25, pitch: 35, neg: 60, total: 120 },
  }

  const timeline = timelines[capitalTipo] || { prep: 20, pitch: 30, neg: 60, total: 110 }

  return {
    preparacao_dias: timeline.prep,
    pitch_dias: timeline.pitch,
    negociacao_dias: timeline.neg,
    total_ciclo_dias: timeline.total,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Formatar GPS para exibição ao usuário.
 */
export function formatarGPSParaUI(gps: MarketFitGPS): {
  tipo_capital: string
  fit_score: number
  timeline_semanas: number
  investidores_prioritarios: string
  proximos_30_dias: string[]
} {
  const semanas = Math.ceil(gps.tempo_estimado_ciclo.total_ciclo_dias / 7)
  const investidores = gps.investidores_recomendados
    .slice(0, 2)
    .map(i => i.tipo_investidor)
    .join(' + ')

  const proximos_30 = [
    `Dias 1-${gps.tempo_estimado_ciclo.preparacao_dias}: Finalizar preparação`,
    `Dias ${gps.tempo_estimado_ciclo.preparacao_dias + 1}-${gps.tempo_estimado_ciclo.preparacao_dias + gps.tempo_estimado_ciclo.pitch_dias}: Roadshow (${gps.investidores_recomendados.length} tipos de investidor)`,
    `Dias ${gps.tempo_estimado_ciclo.preparacao_dias + gps.tempo_estimado_ciclo.pitch_dias + 1}+: Negociação e due diligence`,
  ]

  return {
    tipo_capital: gps.recomendacao_principal.tipo_capital_ideal,
    fit_score: gps.recomendacao_principal.fit_score,
    timeline_semanas: semanas,
    investidores_prioritarios: investidores,
    proximos_30_dias: proximos_30,
  }
}
