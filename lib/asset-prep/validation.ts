/**
 * Asset Preparation — Validação e Gate Inteligente
 *
 * Regras de validação para determinar prontidão final.
 * Gate bloqueia pipeline se há bloqueadores críticos.
 */

import { ScoresDimensoes, MatrizElegibilidade, identificarScoresCriticos } from './scoring'
import { GarganlosResult } from './bottleneck-identifier'
import { MarketFitResult } from './market-fit-recommender'

// ═══════════════════════════════════════════════════════════════════════════════

export interface ValidationResult {
  pronto_para_captacao: boolean  // passa no gate?
  status: 'pronto' | 'pronto_condicional' | 'nao_pronto'
  score_consolidado: number
  scores_criticos: string[]  // quais dimensões < 50
  bloqueadores: string[]  // razões pelas quais NÃO está pronto
  avisos: string[]  // condições que reduzem atratividade
  recomendacoes: string[]  // ações para melhorar
}

// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Avaliar se o ativo passou na validação (gate).
 *
 * Regras:
 * 1. BLOQUEADOR CRÍTICO: score < 30 em qualquer dimensão
 * 2. BLOQUEADOR CRÍTICO: > 2 gargalos críticos não resolvidos
 * 3. BLOQUEADOR CRÍTICO: market fit score < 40%
 * 4. PRONTO: score >= 75 + 0 gargalos críticos + elegível para >=1 tipo
 * 5. PRONTO_CONDICIONAL: score >= 50 + <=2 gargalos críticos + elegível para >=2 tipos
 * 6. NÃO_PRONTO: qualquer outro caso
 */
export function validarAssetPrep(
  scores: ScoresDimensoes,
  matriz: MatrizElegibilidade,
  gargalos: GarganlosResult,
  market_fit: MarketFitResult,
): ValidationResult {
  const bloqueadores: string[] = []
  const avisos: string[] = []
  const recomendacoes: string[] = []

  const scoreConsolidado = Math.round(
    Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length,
  )
  const scoresCriticos = identificarScoresCriticos(scores)

  // ── Validação 1: Score crítico em dimensão ────────────────────────────────
  scoresCriticos.forEach(dimensao => {
    const valor = scores[dimensao]
    bloqueadores.push(`${dimensao.charAt(0).toUpperCase() + dimensao.slice(1)} crítico (${valor}/100)`)
    recomendacoes.push(`Melhorar score de ${dimensao}: atualmente ${valor}, recomendado >= 50`)
  })

  // ── Validação 2: Gargalos críticos ────────────────────────────────────────
  if (gargalos.criticos.length > 2) {
    bloqueadores.push(`Múltiplos gargalos críticos (${gargalos.criticos.length})`)
    gargalos.criticos.forEach(g => {
      recomendacoes.push(`Resolver: ${g.acao} (prazo: ${g.prazo_dias} dias)`)
    })
  } else if (gargalos.criticos.length > 0) {
    avisos.push(`${gargalos.criticos.length} gargalo(s) crítico(s) a resolver`)
    gargalos.criticos.forEach(g => {
      recomendacoes.push(`[URGENTE] ${g.acao}`)
    })
  }

  // ── Validação 3: Market Fit adequado ───────────────────────────────────────
  if (market_fit.recomendacao_principal.fit_score < 40) {
    bloqueadores.push(
      `Market fit inadequado para ${market_fit.recomendacao_principal.tipo_capital_ideal} (${market_fit.recomendacao_principal.fit_score}%)`,
    )
    recomendacoes.push('Avaliar com estruturador: ativo pode não ser adequado para esta modalidade')
  } else if (market_fit.recomendacao_principal.fit_score < 60) {
    avisos.push(
      `Market fit moderado para ${market_fit.recomendacao_principal.tipo_capital_ideal} (${market_fit.recomendacao_principal.fit_score}%)`,
    )
  }

  // ── Validação 4: Elegibilidade (deve ter >= 1 tipo) ──────────────────────
  const tiposElegiveis = Object.values(matriz).filter(e => e === 'sim').length
  const tiposCondicionais = Object.values(matriz).filter(e => e === 'condicional').length

  if (tiposElegiveis === 0 && tiposCondicionais === 0) {
    bloqueadores.push('Não elegível para nenhum tipo de captação')
    recomendacoes.push('Revisar estrutura com especialista: ativo pode não ser adequado para mercado de capital')
  } else if (tiposElegiveis === 0 && tiposCondicionais > 0) {
    avisos.push(`Elegível apenas condicionalmente para ${tiposCondicionais} tipo(s)`)
  }

  // ── Determinação do status ─────────────────────────────────────────────────
  let status: 'pronto' | 'pronto_condicional' | 'nao_pronto'
  let pronto = false

  if (bloqueadores.length === 0) {
    // Sem bloqueadores
    if (scoreConsolidado >= 75 && gargalos.criticos.length === 0 && tiposElegiveis >= 1) {
      status = 'pronto'
      pronto = true
    } else if (scoreConsolidado >= 50 && gargalos.criticos.length <= 2 && tiposElegiveis + tiposCondicionais >= 2) {
      status = 'pronto_condicional'
      pronto = false
    } else {
      status = 'nao_pronto'
      pronto = false
    }
  } else {
    status = 'nao_pronto'
    pronto = false
  }

  // ── Recomendações adicionais ───────────────────────────────────────────────
  if (avisos.length === 0 && recomendacoes.length === 0) {
    if (status === 'pronto') {
      recomendacoes.push('Ativo pronto para roadshow com investidores')
      recomendacoes.push('Próximo passo: preparar book de apresentação e contatar gestoras')
    } else if (status === 'pronto_condicional') {
      recomendacoes.push('Resolver condições de preparação e reavaliar em 15 dias')
    }
  }

  return {
    pronto_para_captacao: pronto,
    status,
    score_consolidado: scoreConsolidado,
    scores_criticos: scoresCriticos,
    bloqueadores,
    avisos,
    recomendacoes,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mensagem executiva para o usuário.
 */
export function gerarMensagemValidacao(validation: ValidationResult): string {
  if (validation.pronto_para_captacao) {
    return `✅ PRONTO PARA CAPTAÇÃO\n\nO ativo está apto para acessar o mercado de capitais. Score consolidado: ${validation.score_consolidado}/100.`
  }

  if (validation.status === 'pronto_condicional') {
    return `⚠️ PRONTO COM CONDIÇÕES\n\nO ativo pode acessar o mercado, mas recomendamos resolver ${validation.bloqueadores.length + validation.avisos.length} item(ns) primeiro. Score consolidado: ${validation.score_consolidado}/100.`
  }

  const msg = validation.bloqueadores.slice(0, 3).join('\n• ')
  return `❌ NÃO PRONTO PARA CAPTAÇÃO\n\nBloqueadores:\n• ${msg}${validation.bloqueadores.length > 3 ? `\n• +${validation.bloqueadores.length - 3} outros` : ''}\n\nScore consolidado: ${validation.score_consolidado}/100.`
}
