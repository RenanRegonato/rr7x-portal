import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getUserContext } from '@/lib/get-role'
import { EscritorioUpdateSchema } from '@/lib/schemas'

// Resolve the escritório for the current user.
// Priority: perfis.escritorio_id → escritorios.user_id (owner fallback for admin)
async function resolveEscritorioId(userId: string, escritorioIdFromCtx: string | null): Promise<string | null> {
  if (escritorioIdFromCtx) return escritorioIdFromCtx
  const admin = createAdminClient()
  const { data } = await admin
    .from('escritorios')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.id ?? null
}

export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const escritorioId = await resolveEscritorioId(ctx.userId, ctx.escritorioId)
  if (!escritorioId) return NextResponse.json({ escritorio: null })

  const admin = createAdminClient()
  const { data } = await admin
    .from('escritorios')
    .select('*')
    .eq('id', escritorioId)
    .single()

  return NextResponse.json({ escritorio: data ?? null })
}

export async function PATCH(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const escritorioId = await resolveEscritorioId(ctx.userId, ctx.escritorioId)
  if (!escritorioId) return NextResponse.json({ error: 'Sem escritório vinculado' }, { status: 400 })

  const raw = await req.json()
  const parsed = EscritorioUpdateSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const update = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined)
  )

  const admin = createAdminClient()
  const { error } = await admin
    .from('escritorios')
    .update({ ...update, atualizado_em: new Date().toISOString() })
    .eq('id', escritorioId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
