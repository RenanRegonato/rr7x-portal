/**
 * Asset Preparation — Agente de Market Fit (GPS de Captação)
 *
 * Recomenda o tipo de capital ideal e estrutura mais adequada.
 * Retorna recomendação priorizada com rationale e timeline.
 */

import { callLLM } from '@/lib/llm/call'
import { MARKET_FIT_DIRETRIZ, formatarIntakeParaAgentes, AssetPrepIntakeData } from './directives'

// ═══════════════════════════════════════════════════════════════════════════════

export interface MarketFitRecomendacao {
  tipo_capital_ideal: string
  fit_score: number  // 0-100
  rationale: string  // 2-3 razões específicas
  estrutura_recomendada?: string  // ex: "FIDC com 2 tranches: sênior 6% e subordinada 12%"
  timeline_dias: number
  probabilidade_sucesso: number  // 0-100 (após resolver gargalos críticos)
  proximos_passos: string[]  // 3-5 ações iniciais
}

export interface MarketFitResult {
  recomendacao_principal: MarketFitRecomendacao
  alternativas: MarketFitRecomendacao[]
  parecer_executivo: string
}

// ═══════════════════════════════════════════════════════════════════════════════

export async function recomendarMarketFit(
  nomeAtivo: string,
  intake: AssetPrepIntakeData,
  documentosResumo?: string,
  elegibilidade?: string,  // resumo da análise anterior
  gargalos?: string,  // resumo dos gargalos identificados
): Promise<MarketFitResult> {
  const intakeFormatado = formatarIntakeParaAgentes(intake)
  const documentosBloco = documentosResumo
    ? `\nDocumentos analisados:\n${documentosResumo}`
    : ''
  const elegibilidadeBloco = elegibilidade
    ? `\nElegibilidade anterior:\n${elegibilidade.substring(0, 1000)}`
    : ''
  const gargalosBloco = gargalos
    ? `\nGargalos identificados:\n${gargalos.substring(0, 1000)}`
    : ''

  const systemPrompt = `Você é um especialista em estruturação de captação. Recomende com confiança baseado em dados reais.

${MARKET_FIT_DIRETRIZ}

Responda APENAS com JSON válido (sem markdown, sem cercas de código).`

  const userPrompt = `Ativo: ${nomeAtivo}

Dados do Ativo:
${intakeFormatado}
${documentosBloco}
${elegibilidadeBloco}
${gargalosBloco}

Tarefa: Recomende o tipo de capital IDEAL para este ativo e uma alternativa.

Responda em JSON:
{
  "recomendacao_principal": {
    "tipo_capital_ideal": "...",
    "fit_score": 85,
    "rationale": "...",
    "estrutura_recomendada": "...",
    "timeline_dias": 30,
    "probabilidade_sucesso": 78,
    "proximos_passos": ["...", "...", "..."]
  },
  "alternativas": [{"tipo_capital_ideal": "...", "fit_score": 65, "rationale": "...", "timeline_dias": 45, "probabilidade_sucesso": 55, "proximos_passos": ["..."]}],
  "parecer_executivo": "..."
}`

  try {
    const { text } = await callLLM({
      task: 'asset_prep_market_fit',
      context: 'validators',
      system: [{ type: 'text', text: systemPrompt }],
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 2500,
      temperature: 0.7,
    })

    let parsed: any
    try {
      parsed = JSON.parse(text.trim())
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) {
        throw new Error('Resposta não contém JSON válido')
      }
      parsed = JSON.parse(match[0])
    }

    // Validar e normalizar
    if (!parsed.recomendacao_principal) {
      throw new Error('JSON inválido: sem recomendacao_principal')
    }

    const normalizarRecomendacao = (r: any): MarketFitRecomendacao => ({
      tipo_capital_ideal: r.tipo_capital_ideal || 'Estrutura customizada',
      fit_score: Math.min(100, Math.max(0, r.fit_score || 50)),
      rationale: r.rationale || 'Recomendação baseada em perfil do ativo.',
      estrutura_recomendada: r.estrutura_recomendada,
      timeline_dias: r.timeline_dias || 30,
      probabilidade_sucesso: Math.min(100, Math.max(0, r.probabilidade_sucesso || 60)),
      proximos_passos: Array.isArray(r.proximos_passos)
        ? r.proximos_passos.slice(0, 5)
        : ['Levantar dados financeiros completos', 'Documentar estrutura operacional'],
    })

    const recomendacao_principal = normalizarRecomendacao(parsed.recomendacao_principal)
    const alternativas = (Array.isArray(parsed.alternativas) ? parsed.alternativas : [])
      .slice(0, 2)
      .map(normalizarRecomendacao)

    return {
      recomendacao_principal,
      alternativas,
      parecer_executivo:
        parsed.parecer_executivo ||
        `Recomendamos ${recomendacao_principal.tipo_capital_ideal} como estrutura ideal para este ativo.`,
    }
  } catch (error) {
    console.error('[recomendarMarketFit] Erro:', error)

    // Fallback sensato baseado no intake
    const tipoAtivo = intake.tipoAtivo?.toLowerCase() || 'outro'
    const temReceita = intake.receitaAnual && parseFloat(intake.receitaAnual) > 5
    const temHistorico = intake.historicoAnosOperacao && parseInt(intake.historicoAnosOperacao) >= 3

    let tipoIdeal = 'Estrutura customizada'
    if (tipoAtivo.includes('recebivel')) tipoIdeal = 'FIDC'
    else if (tipoAtivo.includes('imobiliario')) tipoIdeal = 'CRI'
    else if (tipoAtivo.includes('agro')) tipoIdeal = 'CRA'
    else if (temReceita && temHistorico) tipoIdeal = 'Debênture ou Private Equity'
    else if (tipoAtivo.includes('saas')) tipoIdeal = 'Venture Capital ou Growth Equity'

    return {
      recomendacao_principal: {
        tipo_capital_ideal: tipoIdeal,
        fit_score: 50,
        rationale:
          'Análise limitada. Envie mais documentação (balanços, contratos, histórico operacional) para recomendação mais precisa.',
        timeline_dias: 60,
        probabilidade_sucesso: 40,
        proximos_passos: [
          'Compilar balanços dos últimos 3 anos',
          'Documentar histórico operacional detalhado',
          'Mapear clientela e dependências',
          'Contatar estruturador especializado no seu setor',
        ],
      },
      alternativas: [],
      parecer_executivo:
        'Recomendamos complementar a documentação para uma recomendação mais precisa. Cada tipo de ativo tem caminho ideal diferente.',
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper: Mapear tipo ideal a investidores no Invest Match
// ═══════════════════════════════════════════════════════════════════════════════

export function mapeiarParaInvestidoresInvestMatch(tipo_capital: string): {
  tipo_investidor?: string[]
  tipo_deal?: string
  filtro_sugestao?: string
} {
  const mapa: Record<string, any> = {
    FIDC: {
      tipo_investidor: ['gestora', 'fundo'],
      tipo_deal: 'credito_estruturado',
      filtro_sugestao: 'opera_fidc',
    },
    CRI: {
      tipo_investidor: ['securitizadora', 'fundo'],
      tipo_deal: 'credito_estruturado',
      filtro_sugestao: 'opera_cri',
    },
    CRA: {
      tipo_investidor: ['fundo', 'family_office'],
      tipo_deal: 'credito_estruturado',
      filtro_sugestao: 'opera_cra',
    },
    'Private Equity': {
      tipo_investidor: ['fundo', 'gestora', 'family_office'],
      tipo_deal: 'equity',
      filtro_sugestao: 'opera_pe',
    },
    'Venture Capital': {
      tipo_investidor: ['fundo', 'gestora'],
      tipo_deal: 'equity',
      filtro_sugestao: 'opera_vc',
    },
    Debênture: {
      tipo_investidor: ['financeira', 'fundo'],
      tipo_deal: 'debt',
      filtro_sugestao: 'opera_debenturo',
    },
    'Family Office': {
      tipo_investidor: ['family_office'],
      tipo_deal: 'equity',
      filtro_sugestao: 'family_office',
    },
  }

  return mapa[tipo_capital] || { filtro_sugestao: 'mercado_aberto' }
}
