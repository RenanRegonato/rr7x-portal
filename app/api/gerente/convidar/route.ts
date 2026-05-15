import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getUserContext } from '@/lib/get-role'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { ConvidarSchema } from '@/lib/schemas'
import { audit, extractIp } from '@/lib/audit'

export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx || ctx.role !== 'gerente') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }
  if (!ctx.escritorioId) {
    return NextResponse.json({ error: 'Escritório não configurado' }, { status: 400 })
  }

  // 5 convites por hora por gerente
  const rl = await checkRateLimit(`convidar:${ctx.userId}`, 5, 3600)
  if (!rl.allowed) return rateLimitResponse(rl.resetIn)

  const body = await req.json()
  const parsed = ConvidarSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  }
  const { email } = parsed.data

  const admin = createAdminClient()

  const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    email.trim(),
    {
      data: {
        invited_role:          'assessor',
        invited_escritorio_id: ctx.escritorioId,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.mandor.com.br'}/auth/definir-senha`,
    }
  )

  if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 500 })

  // Pre-create perfil so the callback knows the user is already provisioned
  if (inviteData?.user) {
    await admin.from('perfis').upsert({
      user_id:       inviteData.user.id,
      role:          'assessor',
      escritorio_id: ctx.escritorioId,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  }

  void audit({
    event:    'invite.sent',
    userId:   ctx.userId,
    metadata: { invitee_email: email, escritorio_id: ctx.escritorioId },
    ip:       extractIp(req.headers),
    userAgent: req.headers.get('user-agent'),
  })

  return NextResponse.json({ ok: true })
}
