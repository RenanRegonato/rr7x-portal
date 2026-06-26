// POST /api/mapa-mercado/etl/embed — gera embeddings das entidades (busca semântica).
// Admin-only. Roda em background via Inngest (paginado, voyage-3-large).
import { NextResponse } from 'next/server'
import { getUserContext } from '@/lib/get-role'
import { inngest } from '@/lib/inngest'

export const dynamic = 'force-dynamic'

export async function POST() {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'não autenticado' }, { status: 401 })
  if (ctx.role !== 'admin') return NextResponse.json({ error: 'apenas admin' }, { status: 403 })

  await inngest.send({ name: 'mapa-mercado/etl.embed_requested', data: { manual: true } })
  return NextResponse.json({ ok: true, mensagem: 'Geração de embeddings disparada em background.' })
}
