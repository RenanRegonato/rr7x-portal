import { createAdminClient } from '@/lib/supabase-server'
import { getCNPJMonitor } from '@/lib/auto-pull/cnpj'

// Monitoramento contínuo de deals (MVP). Re-checa, para os deals concluídos,
// a situação cadastral do CNPJ do detentor. Se a empresa sair de ATIVA ou a
// situação mudar desde a última verificação, grava um alerta no deal.
// É a "recorrência" do roadmap: a análise vira vigilância contínua.

const BATCH = 100

export interface MonitorResult {
  checked:         number   // deals com CNPJ efetivamente consultados (snapshot ok)
  alerts_created:  number
  skipped_no_cnpj: number   // sem CNPJ válido no intake (decifrado)
  fetch_failed:    number   // tinha CNPJ, mas a consulta à Receita não retornou
}

interface MonitorState {
  cnpj?: { situacao?: string; checked_at?: string }
}

export async function runDealMonitor(): Promise<MonitorResult> {
  const admin = createAdminClient()

  // Deals concluídos, priorizando os nunca monitorados ou mais antigos.
  const { data: deals, error } = await admin
    .from('analises')
    .select('id, deal_intake, monitor')
    .eq('status', 'concluido')
    .order('monitorado_em', { ascending: true, nullsFirst: true })
    .limit(BATCH)

  if (error) throw new Error(`deal-monitor: ${error.message}`)

  let checked = 0
  let alertsCreated = 0
  let skipped = 0
  let fetchFailed = 0

  for (const d of deals ?? []) {
    const intake = (d.deal_intake ?? {}) as Record<string, string>
    const res = await getCNPJMonitor(intake)

    if (res.status === 'no_cnpj') {
      skipped++
      // Carimba mesmo sem CNPJ, para não re-tentar o mesmo deal toda rodada.
      await admin.from('analises').update({ monitorado_em: new Date().toISOString() }).eq('id', d.id)
      continue
    }
    if (res.status === 'fetch_failed') {
      fetchFailed++
      // Não carimba: a consulta pode voltar a funcionar na próxima rodada.
      continue
    }
    const snap = res.snapshot
    checked++

    const prev = (d.monitor as MonitorState | null)?.cnpj?.situacao
    const situacao = snap.situacao
    const isRisco = situacao !== 'ATIVA'
    const mudou = prev != null && prev !== situacao

    if (isRisco || mudou) {
      // Dedup: não recria se já há alerta aberto desse tipo citando a situação atual.
      const { data: abertos } = await admin
        .from('deal_alertas')
        .select('detalhe')
        .eq('analise_id', d.id)
        .eq('tipo', 'cnpj_situacao')
        .is('resolvido_em', null)
        .limit(5)

      const jaTem = (abertos ?? []).some(a => (a.detalhe ?? '').includes(situacao))
      if (!jaTem) {
        await admin.from('deal_alertas').insert({
          analise_id: d.id,
          tipo:       'cnpj_situacao',
          severidade: isRisco ? 'critico' : 'warn',
          titulo:     isRisco
            ? `Situação cadastral do CNPJ: ${situacao}`
            : `Situação cadastral mudou para ${situacao}`,
          detalhe:    `${snap.razao_social} (CNPJ ${snap.cnpj}). Situação atual: ${situacao}${prev ? `. Anterior: ${prev}` : ''}.`,
        })
        alertsCreated++
      }
    }

    const monitor: MonitorState = {
      ...(d.monitor as MonitorState | null ?? {}),
      cnpj: { situacao, checked_at: new Date().toISOString() },
    }
    await admin
      .from('analises')
      .update({ monitor, monitorado_em: new Date().toISOString() })
      .eq('id', d.id)
  }

  return { checked, alerts_created: alertsCreated, skipped_no_cnpj: skipped, fetch_failed: fetchFailed }
}
