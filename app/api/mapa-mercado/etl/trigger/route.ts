import { NextRequest, NextResponse } from 'next/server'
import { getUserContext } from '@/lib/get-role'
import { inngest } from '@/lib/inngest'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (ctx.role !== 'admin') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  try {
    const { etl, max, pageSize } = await req.json()

    if (!etl || !['cvm', 'bcb', 'receita', 'embed'].includes(etl)) {
      return NextResponse.json(
        { error: 'ETL inválido. Use: cvm, bcb, receita, embed' },
        { status: 400 }
      )
    }

    console.log(`[ETL-TRIGGER] Disparando ${etl}...`)

    const events = {
      cvm: () => inngest.send({
        name: 'mapa-mercado/etl.cvm_requested',
        data: { manual: true, max: max ?? 0, pageSize: pageSize ?? 8000 },
      }),
      bcb: () => inngest.send({
        name: 'mapa-mercado/etl.bcb_requested',
        data: { manual: true },
      }),
      receita: () => inngest.send({
        name: 'mapa-mercado/etl.receita_requested',
        data: { manual: true, pageSize: pageSize ?? 120 },
      }),
      embed: () => inngest.send({
        name: 'mapa-mercado/etl.embed_requested',
        data: { manual: true, pageSize: pageSize ?? 128 },
      }),
    }

    const result = await events[etl as keyof typeof events]()

    return NextResponse.json({
      success: true,
      message: `ETL ${etl} disparado com sucesso`,
      result,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ETL-TRIGGER] Erro:', msg)
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    )
  }
}
