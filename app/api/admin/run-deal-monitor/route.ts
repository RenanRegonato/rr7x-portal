import { NextResponse } from 'next/server'
import { getUserContext } from '@/lib/get-role'
import { runDealMonitor } from '@/lib/monitoring/deal-monitor'

// POST /api/admin/run-deal-monitor
// Dispara o monitoramento na hora (admin), para validar sem esperar o cron.
// Roda síncrono e retorna os contadores. O cron diário usa a mesma função.
export const maxDuration = 300

export async function POST() {
  const ctx = await getUserContext()
  if (!ctx || ctx.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const result = await runDealMonitor()
  return NextResponse.json({ ok: true, ...result })
}
