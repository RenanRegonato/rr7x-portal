import { createAdminClient } from '@/lib/supabase-server'
import { inngest } from '@/lib/inngest'

// step e logger vêm do Inngest SDK (tipo any no boundary, como nas outras funções).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Step = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Logger = any

interface WatchdogParams { step: Step; logger: Logger }

/**
 * Backstop da ingestão (roda por cron). O onFailure de processDocumentFn já cobre
 * o caso comum: um documento que erra ou trava esgota os retries e vira 'failed',
 * liberando a consolidação. Este watchdog cobre o resíduo que o onFailure não
 * alcança: análises cuja ingestão começou mas nunca consolidou porque algum
 * documento ficou preso num estado NÃO-terminal sem nem esgotar retries (evento
 * de processamento perdido, função que nunca rodou, doc preso em 'pending'), ou
 * porque o evento de consolidação se perdeu com todos os docs já terminais.
 *
 * Conservador de propósito: só toca em análises cuja ingestão começou há mais de
 * GRACE_MIN minutos (default 60), bem além do tempo normal de processamento e do
 * ciclo de retries do onFailure (que assim sempre tem a primeira chance). Marca
 * os docs não-terminais restantes como 'failed' e dispara a consolidação com os
 * fatos dos documentos que deram certo, para o deal seguir.
 */
export async function recoverStuckIngestions({ step, logger }: WatchdogParams) {
  const admin = createAdminClient()
  const graceMin = Number(process.env.INGESTION_WATCHDOG_GRACE_MIN ?? 60)
  const cutoff = new Date(Date.now() - graceMin * 60_000).toISOString()

  const candidates = await step.run('find-stuck-ingestions', async () => {
    const { data } = await admin
      .from('analises')
      .select('id, nome_ativo, documents_total')
      .not('documents_ingestion_started_at', 'is', null)
      .is('documents_ingested_at', null)
      .lt('documents_ingestion_started_at', cutoff)
      .limit(50)
    return data ?? []
  }) as Array<{ id: string; nome_ativo: string | null; documents_total: number | null }>

  if (candidates.length === 0) {
    logger.info('watchdog: nenhuma ingestão travada', { graceMin })
    return { graceMin, candidates: 0, recovered: 0 }
  }

  let recovered = 0
  for (const a of candidates) {
    const res = await step.run(`recover-${a.id}`, async () => {
      // Pode ter consolidado nesse meio tempo (corrida com o fluxo normal).
      const { data: cur } = await admin
        .from('analises')
        .select('documents_total, documents_ingested_at, fact_bank_consolidated_at')
        .eq('id', a.id)
        .single()
      if (!cur || cur.documents_ingested_at || cur.fact_bank_consolidated_at) {
        return { analiseId: a.id, action: 'already_done', failedNow: 0 }
      }

      // Marca como 'failed' todos os docs não-terminais presos (bulk, idempotente).
      const { data: marked } = await admin
        .from('analise_documents')
        .update({
          status:        'failed',
          error_message: `watchdog: ingestão sem conclusão após ${graceMin}min (doc preso em estado não-terminal)`,
          completed_at:  new Date().toISOString(),
        })
        .eq('analise_id', a.id)
        .not('status', 'in', '(completed,failed)')
        .select('id')
      const failedNow = marked?.length ?? 0

      // Recalcula o contador observável a partir do estado real (sem corrida).
      const { count: failedTotal } = await admin
        .from('analise_documents')
        .select('*', { count: 'exact', head: true })
        .eq('analise_id', a.id)
        .eq('status', 'failed')
      await admin.from('analises').update({ documents_failed: failedTotal ?? 0 }).eq('id', a.id)

      // Todos terminais agora? Dispara a consolidação (com os fatos que deram certo).
      const { count: terminal } = await admin
        .from('analise_documents')
        .select('*', { count: 'exact', head: true })
        .eq('analise_id', a.id)
        .in('status', ['completed', 'failed'])
      if ((terminal ?? 0) >= (cur.documents_total ?? 0)) {
        await inngest.send({ name: 'analise/fact_bank.consolidate_requested', data: { analiseId: a.id } })
        return { analiseId: a.id, action: 'consolidate_triggered', failedNow }
      }
      return { analiseId: a.id, action: 'still_incomplete', failedNow }
    }) as { analiseId: string; action: string; failedNow: number }

    if (res.action === 'consolidate_triggered') recovered++
    logger.info('watchdog recovery', res)
  }

  return { graceMin, candidates: candidates.length, recovered }
}
