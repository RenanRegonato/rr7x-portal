/**
 * Asset Preparation — Orquestrador de Análise
 *
 * Coordena os 3 agentes em paralelo para gerar parecer completo.
 */

import { analisarElegibilidade, type ElegibilidadeResult } from './eligibility-analyzer'
import { identificarGargalos, type GarganlosResult } from './bottleneck-identifier'
import { recomendarMarketFit, type MarketFitResult } from './market-fit-recommender'
import { AssetPrepIntakeData } from './directives'

// ═══════════════════════════════════════════════════════════════════════════════

export interface AssetPrepAnalysisResult {
  elegibilidade: ElegibilidadeResult
  gargalos: GarganlosResult
  market_fit: MarketFitResult
  parecer_executivo: string
  score_geral: number  // 0-100: média ponderada das 3 análises
  status_pronto: 'pronto' | 'pronto_condicional' | 'nao_pronto'
  proximos_passos_prioritarios: string[]
}

// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Executar análise completa de Asset Preparation (P2: Injeção nos Agentes).
 * Chama 3 agentes em paralelo e consolida resultados.
 */
export async function executarAssetPrepAnalysis(
  nomeAtivo: string,
  intake: AssetPrepIntakeData,
  documentosResumo?: string,
  analiseId?: string,
): Promise<AssetPrepAnalysisResult> {
  console.log(`[Asset Prep] Iniciando análise de ${nomeAtivo}`)

  try {
    // Executar 3 agentes em paralelo
    const [elegibilidade, gargalos, market_fit] = await Promise.all([
      analisarElegibilidade(nomeAtivo, intake, documentosResumo),
      identificarGargalos(nomeAtivo, intake, documentosResumo),
      recomendarMarketFit(
        nomeAtivo,
        intake,
        documentosResumo,
        undefined,  // elegibilidade resume
        undefined,  // gargalos resume
      ),
    ])

    // Consolidar scores
    const score_elegibilidade = elegibilidade.score
    const score_gargalos = 100 - (100 - gargalos.totalScore)  // inverte: maior é melhor
    const score_market_fit = market_fit.recomendacao_principal.fit_score

    const score_geral = Math.round((score_elegibilidade + score_gargalos + score_market_fit) / 3)

    // Determinar status geral
    let status_pronto: 'pronto' | 'pronto_condicional' | 'nao_pronto' = 'nao_pronto'
    if (elegibilidade.items.some(i => i.elegivel === 'sim') && gargalos.criticos.length === 0) {
      status_pronto = 'pronto'
    } else if (
      elegibilidade.items.some(i => i.elegivel === 'sim') ||
      elegibilidade.items.some(i => i.elegivel === 'condicional')
    ) {
      status_pronto = 'pronto_condicional'
    }

    // Próximos passos (priorizado)
    const proximos_passos_prioritarios: string[] = []

    // P1: Resolver gargalos críticos
    if (gargalos.criticos.length > 0) {
      gargalos.criticos.slice(0, 2).forEach(g => {
        proximos_passos_prioritarios.push(`[CRÍTICO] ${g.acao}`)
      })
    }

    // P2: Próximos passos do Market Fit
    if (market_fit.recomendacao_principal.proximos_passos.length > 0) {
      proximos_passos_prioritarios.push(market_fit.recomendacao_principal.proximos_passos[0])
    }

    // P3: Resolver gargalos importantes
    if (gargalos.importantes.length > 0) {
      gargalos.importantes.slice(0, 1).forEach(g => {
        proximos_passos_prioritarios.push(g.acao)
      })
    }

    const parecer_executivo = `
O ativo está ${status_pronto === 'pronto' ? 'PRONTO' : status_pronto === 'pronto_condicional' ? 'PRONTO COM CONDIÇÕES' : 'NÃO PRONTO'} para acessar o mercado de capitais.

**Elegibilidade:** ${elegibilidade.items.filter(i => i.elegivel === 'sim').length} de ${elegibilidade.items.length} tipos de captação são elegíveis.

**Gargalos:** ${gargalos.criticos.length} crítico(s), ${gargalos.importantes.length} importante(s), ${gargalos.menores.length} menor(es).

**Market Fit Ideal:** ${market_fit.recomendacao_principal.tipo_capital_ideal} (${market_fit.recomendacao_principal.fit_score}% de fit).

${
  status_pronto === 'pronto'
    ? 'O ativo está apto para iniciar o roadshow com investidores.'
    : status_pronto === 'pronto_condicional'
      ? `Recomendamos resolver os ${gargalos.criticos.length} gargalo(s) crítico(s) antes de apresentar aos investidores.`
      : `Antes de buscar capital, recomendamos executar o plano de preparação: ${gargalos.criticos.length + gargalos.importantes.length} ação(ões) prioritárias.`
}
`

    return {
      elegibilidade,
      gargalos,
      market_fit,
      parecer_executivo: parecer_executivo.trim(),
      score_geral,
      status_pronto,
      proximos_passos_prioritarios,
    }
  } catch (error) {
    console.error('[Asset Prep] Erro na análise:', error)
    throw error
  }
}
