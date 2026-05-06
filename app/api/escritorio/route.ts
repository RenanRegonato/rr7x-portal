import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getUserContext } from '@/lib/get-role'

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

  const body = await req.json()
  const fields = ['nome', 'cnpj', 'endereco', 'cidade_uf', 'telefone', 'email_contato', 'site', 'tagline', 'logo_url']
  const update = Object.fromEntries(
    fields.filter(f => f in body).map(f => [f, body[f]])
  )

  const admin = createAdminClient()
  const { error } = await admin
    .from('escritorios')
    .update({ ...update, atualizado_em: new Date().toISOString() })
    .eq('id', escritorioId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
