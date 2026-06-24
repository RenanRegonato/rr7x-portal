/**
 * Asset Preparation — Agente de Elegibilidade
 *
 * Avalia elegibilidade do ativo para 8 tipos de captação.
 * Retorna matriz de elegibilidade (SIM/NÃO/CONDICIONAL) com razões.
 */

import { callLLM } from '@/lib/llm/call'
import { ELEGIBILIDADE_DIRETRIZ, formatarIntakeParaAgentes, AssetPrepIntakeData } from './directives'

// ═══════════════════════════════════════════════════════════════════════════════

export interface ElegibilidadeItem {
  tipo: string
  elegivel: 'sim' | 'nao' | 'condicional'
  razao: string
  condicao?: string  // se CONDICIONAL, o que falta?
}

export interface ElegibilidadeResult {
  resumo: string  // parecer geral: "pronto" | "pronto_com_condicoes" | "nao_pronto"
  items: ElegibilidadeItem[]
  score: number  // 0-100: quantos tipos elegíveis
}

// ═══════════════════════════════════════════════════════════════════════════════

const TIPOS_CAPTACAO = [
  'Captação Geral (algum tipo de capital estruturado)',
  'Crédito Estruturado (FIDC, Securitização, Debênture)',
  'CRI (Certificado de Recebível Imobiliário)',
  'CRA (Certificado de Recebível Agro)',
  'FIDC (Fundo de Investimento em Direitos Creditórios)',
  'Private Equity',
  'Family Office',
  'Debênture',
  'Investidor Estratégico Corporativo',
]

// ═══════════════════════════════════════════════════════════════════════════════

export async function analisarElegibilidade(
  nomeAtivo: string,
  intake: AssetPrepIntakeData,
  documentosResumo?: string,
): Promise<ElegibilidadeResult> {
  const intakeFormatado = formatarIntakeParaAgentes(intake)
  const documentosBloco = documentosResumo
    ? `\nDocumentos analisados:\n${documentosResumo}`
    : ''

  const systemPrompt = `Você é um analista especializado em elegibilidade de ativos para captação.

${ELEGIBILIDADE_DIRETRIZ}

Responda APENAS com JSON válido (sem markdown, sem cercas de código).`

  const userPrompt = `Ativo: ${nomeAtivo}

Dados do Ativo:
${intakeFormatado}
${documentosBloco}

Tarefa: Avalie a elegibilidade para cada tipo de captação.

Responda em JSON:
{
  "resumo": "parágrafo sobre a elegibilidade geral",
  "items": [
    {"tipo": "Captação Geral", "elegivel": "sim|nao|condicional", "razao": "...", "condicao": "..."},
    ...
  ]
}`

  try {
    const { text } = await callLLM({
      task: 'asset_prep_elegibilidade',
      context: 'validators',
      system: [{ type: 'text', text: systemPrompt }],
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 2000,
      temperature: 0.7,
    })

    // Parse JSON da resposta
    let parsed: any
    try {
      parsed = JSON.parse(text.trim())
    } catch {
      // Se JSON falhar, tenta extrair um bloco JSON da resposta
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) {
        throw new Error('Resposta não contém JSON válido')
      }
      parsed = JSON.parse(match[0])
    }

    // Validar estrutura
    if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
      throw new Error('JSON inválido: items não é array ou está vazio')
    }

    // Normalizar e calcular score
    const items: ElegibilidadeItem[] = parsed.items.map((item: any) => ({
      tipo: item.tipo || 'Desconhecido',
      elegivel: (item.elegivel || 'nao').toLowerCase(),
      razao: item.razao || 'Sem justificativa',
      condicao: item.condicao,
    }))

    const simCount = items.filter(i => i.elegivel === 'sim').length
    const score = Math.round((simCount / items.length) * 100)

    return {
      resumo: parsed.resumo || 'Análise concluída.',
      items,
      score,
    }
  } catch (error) {
    console.error('[analisarElegibilidade] Erro:', error)
    // Fallback: retornar resposta vazia estruturada
    return {
      resumo:
        'Análise de elegibilidade indisponível no momento. Verifique os documentos enviados e tente novamente.',
      items: TIPOS_CAPTACAO.map(tipo => ({
        tipo,
        elegivel: 'condicional' as const,
        razao: 'Aguardando análise. Documente melhor os aspectos financeiros e operacionais.',
        condicao: 'Dados incompletos ou documentação insuficiente',
      })),
      score: 0,
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper: Resumir elegibilidade em cores/status
// ═══════════════════════════════════════════════════════════════════════════════

export function statusElegibilidade(result: ElegibilidadeResult): {
  status: 'pronto' | 'condicional' | 'nao_pronto'
  label: string
  cor: string
} {
  const simCount = result.items.filter(i => i.elegivel === 'sim').length
  const condicionaiCount = result.items.filter(i => i.elegivel === 'condicional').length

  if (simCount >= 5) {
    return {
      status: 'pronto',
      label: '✅ Pronto para captação',
      cor: 'green',
    }
  } else if (simCount >= 2 || condicionaiCount >= 3) {
    return {
      status: 'condicional',
      label: '⚠️ Pronto com condições',
      cor: 'amber',
    }
  } else {
    return {
      status: 'nao_pronto',
      label: '❌ Não pronto para captação',
      cor: 'red',
    }
  }
}
