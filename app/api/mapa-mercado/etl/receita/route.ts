// POST /api/mapa-mercado/etl/receita — enriquece entidades via Receita (BrasilAPI).
// Admin-only. Roda em background via Inngest (paginado, gentil com rate-limit).
import { NextResponse } from 'next/server'
import { getUserContext } from '@/lib/get-role'
import { inngest } from '@/lib/inngest'

export const dynamic = 'force-dynamic'

export async function POST() {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'não autenticado' }, { status: 401 })
  if (ctx.role !== 'admin') return NextResponse.json({ error: 'apenas admin' }, { status: 403 })

  await inngest.send({ name: 'mapa-mercado/etl.receita_requested', data: { manual: true } })
  return NextResponse.json({ ok: true, mensagem: 'Enriquecimento via Receita disparado em background.' })
}
