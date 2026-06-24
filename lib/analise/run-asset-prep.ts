/**
 * Asset Preparation Integration
 *
 * Executa a análise de preparação de ativo para mercado de capitais.
 * Coordena 3 agentes paralelos (elegibilidade, gargalos, market-fit)
 * e retorna parecer consolidado com scoring e gate.
 */

import { createAdminClient } from '@/lib/supabase-server'
import { executarAssetPrepAnalysis, type AssetPrepAnalysisResult } from '@/lib/asset-prep/service'
import { AssetPrepIntakeData } from '@/lib/asset-prep/directives'

interface RunAssetPrepParams {
  analiseId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  step: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logger: any
  documentosResumo?: string
}

/**
 * Converte o deal_intake genérico para AssetPrepIntakeData
 */
function mapToAssetPrepIntake(intake: Record<string, string>): AssetPrepIntakeData {
  return {
    tipoAtivo: intake.assetPrepTipoAtivo ?? intake.tipoAtivo ?? '',
    receitaAnual: intake.assetPrepReceitaAnual ?? '',
    ebitda: intake.assetPrepEbitda ?? '',
    patrimonioLiquido: intake.assetPrepPatrimonioLiquido ?? '',
    alavancagem: intake.assetPrepAlavancagem ?? '',
    posicaoMercado: intake.assetPrepPosicaoMercado ?? '',
    atratividade: intake.assetPrepAtratividade ?? '',
    maturidade: intake.assetPrepMaturidade ?? '',
    temGovernanca: intake.assetPrepTemGovernanca ?? '',
    temBoard: intake.assetPrepTemBoard ?? '',
    historicoAnosOperacao: intake.assetPrepHistoricoAnosOperacao ?? '',
    objetivoCapitacao: intake.assetPrepObjetivoCapitacao ?? intake.objetivo ?? '',
    volumeCapitacao: intake.assetPrepVolumeCapitacao ?? '',
    horizonteCapitacao: intake.assetPrepHorizonteCapitacao ?? '',
  }
}

/**
 * Formata o resultado da análise de Asset Prep para exibição e armazenamento
 */
function formatResultForOutput(result: AssetPrepAnalysisResult): string {
  const parts: string[] = [
    result.parecer_executivo,
    '',
    '---',
    '',
    `**Status de Preparação:** ${result.status_pronto.toUpperCase()}`,
    `**Score Consolidado:** ${result.score_consolidado}/100`,
    '',
    '**Próximos Passos (Priorizado):**',
    result.proximos_passos_prioritarios.map((p, i) => `${i + 1}. ${p}`).join('\n'),
  ]
  return parts.join('\n')
}

/**
 * Executa Asset Preparation e salva resultado em analises.outputs['asset_prep']
 */
export async function runAssetPrep({ analiseId, step, logger, documentosResumo }: RunAssetPrepParams) {
  const admin = createAdminClient()

  logger.info('Asset Prep: iniciando análise', { analiseId })

  try {
    // Carrega análise
    const { data: analise, error: loadError } = await admin
      .from('analises')
      .select('id, nome_ativo, deal_intake, outputs')
      .eq('id', analiseId)
      .single()

    if (loadError || !analise) {
      throw new Error(`Não foi possível carregar análise: ${loadError?.message ?? 'não encontrada'}`)
    }

    const intake = (analise.deal_intake ?? {}) as Record<string, string>
    const nomeAtivo = analise.nome_ativo ?? 'Ativo'

    // Verifica se Asset Prep foi solicitado (pelo menos um campo preenchido)
    const temCamposAssetPrep = [
      'assetPrepTipoAtivo',
      'assetPrepReceitaAnual',
      'assetPrepEbitda',
      'assetPrepPatrimonioLiquido',
      'assetPrepObjetivoCapitacao',
    ].some(k => intake[k])

    if (!temCamposAssetPrep) {
      logger.info('Asset Prep: nenhum campo preenchido, pulando', { analiseId })
      return { skipped: true, reason: 'no_fields' }
    }

    // Converte para formato interno
    const assetPrepIntake = mapToAssetPrepIntake(intake)

    // Executa análise (3 agentes paralelos)
    const result = await executarAssetPrepAnalysis(
      nomeAtivo,
      assetPrepIntake,
      documentosResumo,
      analiseId
    )

    logger.info('Asset Prep: análise concluída', {
      analiseId,
      status: result.status_pronto,
      score: result.score_consolidado,
    })

    // Formata para armazenamento
    const outputText = formatResultForOutput(result)

    // Salva resultado em analises.outputs['asset_prep']
    const currentOutputs = (analise.outputs ?? {}) as Record<string, string>
    await admin
      .from('analises')
      .update({
        outputs: {
          ...currentOutputs,
          asset_prep: outputText,
        },
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', analiseId)

    logger.info('Asset Prep: resultado salvo', { analiseId })

    return {
      ok: true,
      status: result.status_pronto,
      score: result.score_consolidado,
      gargalos_criticos: result.gargalos.criticos.length,
    }
  } catch (error) {
    const e = error as Error
    logger.error('Asset Prep: erro na execução', { analiseId, error: e.message })
    throw e
  }
}
