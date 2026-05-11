import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { createShareToken } from '@/lib/share-token'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { ShareCreateSchema, ShareRevokeSchema } from '@/lib/schemas'
import { audit, extractIp } from '@/lib/audit'

// POST — gerar link de compartilhamento
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // 20 tokens por hora por usuário
  const rl = await checkRateLimit(`share:${user.id}`, 20, 3600)
  if (!rl.allowed) return rateLimitResponse(rl.resetIn)

  const body = await req.json()
  const parsed = ShareCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'analiseId inválido' }, { status: 400 })
  }
  const { analiseId } = parsed.data

  const admin = createAdminClient()
  const { data } = await admin
    .from('analises')
    .select('id, user_id')
    .eq('id', analiseId)
    .single()

  // 404 para ambos os casos: não existe e não pertence ao usuário
  if (!data || data.user_id !== user.id) {
    return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  }

  const token = createShareToken(analiseId)
  const url   = `${req.nextUrl.origin}/view/${token}`

  void audit({
    event:    'share.created',
    userId:   user.id,
    targetId: analiseId,
    ip:       extractIp(req.headers),
    userAgent: req.headers.get('user-agent'),
  })

  return NextResponse.json({ url, expiresIn: '7 dias' })
}

// DELETE — revogar link de compartilhamento
export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const parsed = ShareRevokeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'analiseId inválido' }, { status: 400 })
  }
  const { analiseId } = parsed.data

  const admin = createAdminClient()

  // Confirma propriedade antes de revogar
  const { data: analise } = await admin
    .from('analises')
    .select('user_id')
    .eq('id', analiseId)
    .single()

  if (!analise || analise.user_id !== user.id) {
    return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  }

  await admin
    .from('share_revocations')
    .upsert({ analise_id: analiseId, revoked_at: new Date().toISOString() }, { onConflict: 'analise_id' })

  void audit({
    event:    'share.revoked',
    userId:   user.id,
    targetId: analiseId,
    ip:       extractIp(req.headers),
    userAgent: req.headers.get('user-agent'),
  })

  return NextResponse.json({ ok: true })
}
