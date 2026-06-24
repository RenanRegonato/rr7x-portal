/**
 * Asset Preparation — Gate Inteligente
 *
 * Avalia se o pipeline pode prosseguir ou se está travado em gargalos críticos.
 * Similar a lib/triagem/gate.ts mas com lógica de Asset Prep.
 */

import { ValidationResult } from './validation'
import { GarganlosResult } from './bottleneck-identifier'

// ═══════════════════════════════════════════════════════════════════════════════

export interface GateCheckResult {
  pode_prosseguir: boolean        // pode executar análise?
  motivo_bloqueio?: string        // se bloqueado, por que?
  gargalos_criticos: number       // quantos críticos faltam resolver?
  timeout_minutos?: number        // quantos minutos até re-avaliar?
}

// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Avaliar se a análise de Asset Prep pode prosseguir.
 *
 * Lógica:
 * - BLOQUEADO: > 0 gargalos críticos não resolvidos
 * - BLOQUEADO: score consolidado < 30
 * - LIBERADO: pode prosseguir com ressalva se há gargalos importantes
 */
export function avaliarGateAssetPrep(
  validation: ValidationResult,
  gargalos: GarganlosResult,
): GateCheckResult {
  const gargalos_criticos = gargalos.criticos.length

  // Bloqueador 1: Gargalos críticos
  if (gargalos_criticos > 0) {
    return {
      pode_prosseguir: false,
      motivo_bloqueio: `${gargalos_criticos} gargalo(s) crítico(s) precisam ser resolvido(s) antes de prosseguir.`,
      gargalos_criticos,
      timeout_minutos: 15,  // re-avaliar em 15 min
    }
  }

  // Bloqueador 2: Score muito baixo
  if (validation.score_consolidado < 30) {
    return {
      pode_prosseguir: false,
      motivo_bloqueio: `Score consolidado muito baixo (${validation.score_consolidado}/100). Recomendamos melhorar antes de prosseguir.`,
      gargalos_criticos: 0,
      timeout_minutos: 30,
    }
  }

  // Gate passou
  return {
    pode_prosseguir: true,
    gargalos_criticos: 0,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Status de preparação do ativo (para exibição na UI).
 */
export interface AssetPrepStatus {
  bloqueado: boolean
  percentual_completo: number  // 0-100: quanto da preparação está feita
  gargalos_restantes: number
  dias_estimado: number        // quanto tempo até estar pronto
  proximo_check: Date
}

export function calcularStatusAssetPrep(
  validation: ValidationResult,
  gargalos: GarganlosResult,
  dataAnalise: Date = new Date(),
): AssetPrepStatus {
  const bloqueado = !validation.pronto_para_captacao

  // Percentual completo: 100 - (% de gargalos)
  const totalGargalos = gargalos.criticos.length + gargalos.importantes.length + gargalos.menores.length
  const percentualGargalos = totalGargalos === 0 ? 0 : (gargalos.criticos.length * 40 + gargalos.importantes.length * 20) / 100
  const percentual_completo = Math.max(0, Math.min(100, 100 - percentualGargalos))

  // Dias estimado: máximo prazo entre gargalos críticos
  const diasEstimado =
    gargalos.criticos.length > 0
      ? Math.max(...gargalos.criticos.map(g => g.prazo_dias || 30))
      : gargalos.importantes.length > 0
        ? Math.max(...gargalos.importantes.map(g => g.prazo_dias || 30))
        : 0

  // Próximo check: em 24h ou quando gargal for resolvido
  const proximo_check = new Date(dataAnalise.getTime() + 24 * 60 * 60 * 1000)

  return {
    bloqueado,
    percentual_completo: Math.round(percentual_completo),
    gargalos_restantes: totalGargalos,
    dias_estimado: diasEstimado,
    proximo_check,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Simular resolução de gargalo: que score ficaria se este gargalo fosse resolvido?
 * (Usado para prever impacto de ações)
 */
export function simularResolucaoGargalo(
  validation: ValidationResult,
  garaloId: string,
  gargalos: GarganlosResult,
): { novo_status: 'pronto' | 'pronto_condicional' | 'nao_pronto'; score_novo: number } {
  // Simplificado: assumir que resolver um crítico melhora ~10 pontos
  // e resolver um importante melhora ~5 pontos
  const gargaloParaResolver = gargalos.criticos.find(g => g.id === garaloId) ||
    gargalos.importantes.find(g => g.id === garaloId) || null

  if (!gargaloParaResolver) {
    return {
      novo_status: validation.status,
      score_novo: validation.score_consolidado,
    }
  }

  const melhoria = gargaloParaResolver.severidade === 'critico' ? 12 : 6
  const score_novo = Math.min(100, validation.score_consolidado + melhoria)

  let novo_status: 'pronto' | 'pronto_condicional' | 'nao_pronto' = 'nao_pronto'
  if (score_novo >= 75 && gargalos.criticos.length <= 1) {
    novo_status = 'pronto'
  } else if (score_novo >= 50 && gargalos.criticos.length <= 2) {
    novo_status = 'pronto_condicional'
  }

  return {
    novo_status,
    score_novo,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Formatação de mensagem de bloqueio para o usuário.
 */
export function formatarMensagemBloqueio(gateResult: GateCheckResult): {
  titulo: string
  descricao: string
  acao: string
} {
  if (!gateResult.pode_prosseguir) {
    return {
      titulo: '🔒 Análise Travada',
      descricao: gateResult.motivo_bloqueio || 'Há bloqueadores que impedem o prosseguimento.',
      acao: `Resolva os gargalos críticos. Próxima avaliação em ${gateResult.timeout_minutos || 15} minutos.`,
    }
  }

  return {
    titulo: '✅ Análise Liberada',
    descricao: 'Nenhum bloqueador crítico. Pode prosseguir com a análise.',
    acao: 'Clique em "Continuar Análise" para avançar.',
  }
}
