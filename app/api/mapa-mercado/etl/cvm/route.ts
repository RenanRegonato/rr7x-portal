// POST /api/mapa-mercado/etl/cvm  — dispara o ETL do cadastro de fundos da CVM.
// Admin-only. Roda em background via Inngest (carga pesada > limite de request).
import { NextResponse } from 'next/server'
import { getUserContext } from '@/lib/get-role'
import { inngest } from '@/lib/inngest'

export const dynamic = 'force-dynamic'

export async function POST() {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'não autenticado' }, { status: 401 })
  if (ctx.role !== 'admin') return NextResponse.json({ error: 'apenas admin' }, { status: 403 })

  await inngest.send({ name: 'mapa-mercado/etl.cvm_requested', data: { manual: true } })
  return NextResponse.json({ ok: true, mensagem: 'ETL da CVM disparado em background.' })
}
