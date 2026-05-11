import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { AnaliseCreateSchema } from '@/lib/schemas'
import { audit, extractIp } from '@/lib/audit'
import { encryptSensitiveFields } from '@/lib/crypto'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // 10 novas análises por hora por usuário (protege quota de IA)
  const rl = await checkRateLimit(`analise:${user.id}`, 10, 3600)
  if (!rl.allowed) return rateLimitResponse(rl.resetIn)

  const body = await req.json()
  const parsed = AnaliseCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const intake = parsed.data

  const admin = createAdminClient()

  const { data: sub } = await admin
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'ativo')
    .single()

  if (!sub) {
    return NextResponse.json({ error: 'Sem assinatura ativa. Adquira um plano para continuar.' }, { status: 403 })
  }

  if (sub.analises_restantes !== null && sub.analises_restantes <= 0) {
    return NextResponse.json({ error: 'Limite de análises atingido.' }, { status: 403 })
  }

  const { data: analise, error: createError } = await admin
    .from('analises')
    .insert({
      user_id:     user.id,
      nome_ativo:  intake.nomeAtivo,
      deal_intake: encryptSensitiveFields(intake),
      status:      'processando',
    })
    .select()
    .single()

  if (createError || !analise) {
    return NextResponse.json({ error: 'Erro ao criar análise' }, { status: 500 })
  }

  void audit({
    event:    'analise.created',
    userId:   user.id,
    targetId: analise.id,
    metadata: { nome_ativo: intake.nomeAtivo, tipo_ativo: intake.tipoAtivo },
    ip:       extractIp(req.headers),
    userAgent: req.headers.get('user-agent'),
  })

  if (sub.analises_restantes !== null) {
    await admin
      .from('subscriptions')
      .update({ analises_restantes: sub.analises_restantes - 1 })
      .eq('id', sub.id)
  }

  return NextResponse.json({ analiseId: analise.id })
}
