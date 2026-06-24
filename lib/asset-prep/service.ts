/**
 * Asset Preparation — Orquestrador de Análise
 *
 * Coordena os 3 agentes em paralelo para gerar parecer completo.
 */

import { analisarElegibilidade, type ElegibilidadeResult } from './eligibility-analyzer'
import { identificarGargalos, type GarganlosResult } from './bottleneck-identifier'
import { recomendarMarketFit, type MarketFitResult } from './market-fit-recommender'
import {
  calcularScoresDimensoes,
  construirMatrizElegibilidade,
  calcularScoreConsolidado,
  formatarScoresParaUI,
  type ScoresDimensoes,
  type MatrizElegibilidade,
} from './scoring'
import { validarAssetPrep, gerarMensagemValidacao, type ValidationResult } from './validation'
import { AssetPrepIntakeData } from './directives'

// ═══════════════════════════════════════════════════════════════════════════════

export interface AssetPrepAnalysisResult {
  // Análises dos 3 agentes
  elegibilidade: ElegibilidadeResult
  gargalos: GarganlosResult
  market_fit: MarketFitResult

  // Validação (P3)
  scores_dimensoes: ScoresDimensoes
  matriz_elegibilidade: MatrizElegibilidade
  validation: ValidationResult

  // Consolidação
  parecer_executivo: string
  mensagem_usuario: string  // mensagem clara sobre status
  score_consolidado: number  // 0-100
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

    // ── P3: Validação e Scoring ──────────────────────────────────────────────
    const scores_dimensoes = calcularScoresDimensoes(intake, gargalos, elegibilidade)
    const matriz_elegibilidade = construirMatrizElegibilidade(elegibilidade)
    const validation = validarAssetPrep(scores_dimensoes, matriz_elegibilidade, gargalos, market_fit)
    const score_consolidado = calcularScoreConsolidado(scores_dimensoes)
    const mensagem_usuario = gerarMensagemValidacao(validation)

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

    // Adicionar recomendações da validação
    proximos_passos_prioritarios.push(...validation.recomendacoes.slice(0, 2))

    const parecer_executivo = `
## Parecer de Asset Preparation

**Status:** ${validation.status.toUpperCase()}
**Score Consolidado:** ${score_consolidado}/100

**Dimensões de Prontidão:**
${Object.entries(scores_dimensoes)
  .map(([key, value]) => `- ${key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}: ${value}/100`)
  .join('\n')}

**Elegibilidade para Captação:**
${Object.entries(matriz_elegibilidade)
  .map(([key, value]) => {
    const label = key.replace(/_/g, ' ').toUpperCase()
    const icon = value === 'sim' ? '✅' : value === 'condicional' ? '⚠️' : '❌'
    return `${icon} ${label}`
  })
  .join('\n')}

**Market Fit Ideal:** ${market_fit.recomendacao_principal.tipo_capital_ideal} (${market_fit.recomendacao_principal.fit_score}% fit score)

**Gargalos Identificados:**
- Críticos: ${gargalos.criticos.length}
- Importantes: ${gargalos.importantes.length}
- Menores: ${gargalos.menores.length}

${validation.pronto_para_captacao ? '**Conclusão:** O ativo está apto para acessar o mercado de capitais. Recomendamos iniciar o roadshow com investidores.' : validation.status === 'pronto_condicional' ? `**Conclusão:** O ativo pode acessar o mercado após resolver ${validation.avisos.length + validation.bloqueadores.length} condição(ões).` : `**Conclusão:** Recomendamos executar o plano de preparação antes de buscar capital.`}
`

    return {
      elegibilidade,
      gargalos,
      market_fit,
      scores_dimensoes,
      matriz_elegibilidade,
      validation,
      parecer_executivo: parecer_executivo.trim(),
      mensagem_usuario,
      score_consolidado,
      status_pronto: validation.status,
      proximos_passos_prioritarios,
    }
  } catch (error) {
    console.error('[Asset Prep] Erro na análise:', error)
    throw error
  }
}
