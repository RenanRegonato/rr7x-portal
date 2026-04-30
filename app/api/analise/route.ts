import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { DealIntake } from '@/lib/agents/pipeline'
import { checkDriveAccess } from '@/lib/drive'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const admin = createAdminClient()

  // Verifica assinatura ativa
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

  const intake: DealIntake = await req.json()

  // Gate: valida acesso ao Drive antes de criar o registro e consumir crédito
  if (!intake.linkDocumentos) {
    return NextResponse.json({ error: 'Link de documentos obrigatório para iniciar a análise.' }, { status: 400 })
  }

  const driveCheck = await checkDriveAccess(intake.linkDocumentos)
  if (driveCheck.status === 'blocked' || driveCheck.status === 'error') {
    return NextResponse.json({
      error: `Não foi possível acessar o Drive: ${driveCheck.message}`,
      driveStatus: driveCheck.status,
    }, { status: 422 })
  }

  // Cria o registro da análise
  const { data: analise, error: createError } = await admin
    .from('analises')
    .insert({
      user_id: user.id,
      nome_ativo: intake.nomeAtivo,
      deal_intake: intake,
      status: 'processando',
    })
    .select()
    .single()

  if (createError || !analise) {
    return NextResponse.json({ error: 'Erro ao criar análise' }, { status: 500 })
  }

  // Decrementa análises restantes (plano avulso)
  if (sub.analises_restantes !== null) {
    await admin
      .from('subscriptions')
      .update({ analises_restantes: sub.analises_restantes - 1 })
      .eq('id', sub.id)
  }

  // Pipeline é orquestrado pelo frontend via /api/analise/[id]/step
  return NextResponse.json({ analiseId: analise.id })
}
