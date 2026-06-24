/**
 * Asset Preparation — Agente de Gargalos
 *
 * Identifica os fatores que bloqueiam ou reduzem atratividade do ativo.
 * Retorna lista priorizada com severidade, impacto e ações sugeridas.
 */

import { callLLM } from '@/lib/llm/call'
import { GARGALOS_DIRETRIZ, formatarIntakeParaAgentes, AssetPrepIntakeData } from './directives'

// ═══════════════════════════════════════════════════════════════════════════════

export interface Gargalo {
  id: string
  tipo: string  // um dos 10 tipos
  severidade: 'critico' | 'importante' | 'menor'
  descricao: string
  impacto: string
  acao: string
  prazo_dias?: number
}

export interface GarganlosResult {
  criticos: Gargalo[]
  importantes: Gargalo[]
  menores: Gargalo[]
  resumo: string  // parágrafo geral
  totalScore: number  // 0-100: quanto melhor (100 = sem gargalos)
}

// ═══════════════════════════════════════════════════════════════════════════════

export async function identificarGargalos(
  nomeAtivo: string,
  intake: AssetPrepIntakeData,
  documentosResumo?: string,
  parecer_tecnico?: string,
): Promise<GarganlosResult> {
  const intakeFormatado = formatarIntakeParaAgentes(intake)
  const documentosBloco = documentosResumo
    ? `\nDocumentos analisados:\n${documentosResumo.substring(0, 2000)}`
    : ''
  const parecerBloco = parecer_tecnico
    ? `\nParêcer técnico prélio:\n${parecer_tecnico.substring(0, 1500)}`
    : ''

  const systemPrompt = `Você é um especialista em identificar riscos e gargalos de ativos. Seja específico e baseie-se em evidências.

${GARGALOS_DIRETRIZ}

Responda APENAS com JSON válido (sem markdown, sem cercas de código).`

  const userPrompt = `Ativo: ${nomeAtivo}

Dados do Ativo:
${intakeFormatado}
${documentosBloco}
${parecerBloco}

Tarefa: Identifique os gargalos específicos que afetam este ativo.

Responda em JSON:
{
  "resumo": "parágrafo sobre os gargalos principais",
  "gargalos": [
    {"tipo": "tipo de gargalo", "severidade": "critico|importante|menor", "descricao": "...", "impacto": "...", "acao": "...", "prazo_dias": 15},
    ...
  ]
}`

  try {
    const { text } = await callLLM({
      task: 'asset_prep_gargalos',
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

    if (!Array.isArray(parsed.gargalos)) {
      throw new Error('JSON inválido: gargalos não é array')
    }

    // Normalizar
    const gargalos: Gargalo[] = parsed.gargalos.map((g: any, idx: number) => ({
      id: `gargalo_${idx}`,
      tipo: g.tipo || 'Outro',
      severidade: (g.severidade || 'menor').toLowerCase(),
      descricao: g.descricao || 'Sem descrição',
      impacto: g.impacto || 'Impacto não especificado',
      acao: g.acao || 'Ação não especificada',
      prazo_dias: g.prazo_dias || 30,
    }))

    // Separar por severidade
    const criticos = gargalos.filter(g => g.severidade === 'critico')
    const importantes = gargalos.filter(g => g.severidade === 'importante')
    const menores = gargalos.filter(g => g.severidade === 'menor')

    // Calcular score (0-100: 100 = sem gargalos críticos, 50 = 1 crítico, 0 = 3+ críticos)
    let totalScore = 100
    totalScore -= criticos.length * 25  // -25 por crítico
    totalScore -= importantes.length * 10  // -10 por importante
    totalScore = Math.max(0, Math.min(100, totalScore))

    return {
      criticos,
      importantes,
      menores,
      resumo: parsed.resumo || 'Análise de gargalos concluída.',
      totalScore,
    }
  } catch (error) {
    console.error('[identificarGargalos] Erro:', error)
    return {
      criticos: [],
      importantes: [
        {
          id: 'fallback_1',
          tipo: 'Falta de Documentação',
          severidade: 'importante',
          descricao:
            'Documentação incompleta impede análise detalhada. Envie todos os documentos financeiros, jurídicos e operacionais disponíveis.',
          impacto: 'Reduz confiança do investidor na qualidade do ativo.',
          acao: 'Compilar pacote completo: balanços, DRE, contratos, licenças, matrículas.',
          prazo_dias: 7,
        },
      ],
      menores: [],
      resumo:
        'Análise de gargalos indisponível. Verifique os documentos e tente novamente. Contato de suporte: support@mandor.com.br',
      totalScore: 40,
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper: Status dos gargalos (pronto ou não?)
// ═══════════════════════════════════════════════════════════════════════════════

export function statusGargalos(result: GarganlosResult): {
  pronto: boolean
  label: string
  acoes_requeridas: number
} {
  const pronto = result.criticos.length === 0
  const acoes_requeridas = result.criticos.length + result.importantes.length

  return {
    pronto,
    label: pronto
      ? '✅ Sem gargalos críticos'
      : `❌ ${result.criticos.length} gargalo(s) crítico(s) a resolver`,
    acoes_requeridas,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper: Timeline de resolução
// ═══════════════════════════════════════════════════════════════════════════════

export function timelineResolucao(result: GarganlosResult): {
  dias_minimo: number
  dias_provavel: number
  label: string
} {
  const todos = [...result.criticos, ...result.importantes, ...result.menores]
  if (todos.length === 0) {
    return {
      dias_minimo: 0,
      dias_provavel: 0,
      label: 'Sem gargalos, pronto imediatamente.',
    }
  }

  const dias_minimo = Math.min(...todos.map(g => g.prazo_dias || 30))
  const dias_provavel = Math.max(...todos.map(g => g.prazo_dias || 30))

  return {
    dias_minimo,
    dias_provavel,
    label: `${dias_minimo}-${dias_provavel} dias para resolver (depende da priorização)`,
  }
}
