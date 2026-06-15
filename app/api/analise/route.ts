import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { AnaliseCreateSchema } from '@/lib/schemas'
import { audit, extractIp } from '@/lib/audit'
import { encryptSensitiveFields } from '@/lib/crypto'
import { gateReformaTributaria } from '@/lib/reforma-tributaria/auth-helpers'

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

  // Gate comercial do módulo premium: o opt-in da Reforma Tributária ('possui' ou
  // 'diagnosticar') só é aceito se o escritório do criador tiver o módulo habilitado
  // (admin do Mandor bypassa). Espelha o bloqueio da UI e fecha o atalho de POST
  // direto na API que setaria o opt-in sem entitlement.
  if (intake.reformaTributaria && intake.reformaTributaria !== 'na') {
    const gate = await gateReformaTributaria(user.id)
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  const admin = createAdminClient()

  // 1. Identifica o escritório do usuário (se houver) — usado para consumir do pacote
  const { data: perfil } = await admin
    .from('perfis')
    .select('escritorio_id')
    .eq('user_id', user.id)
    .maybeSingle()

  // 2. Consome do pacote ativo do escritório (FIFO). Consumo ATÔMICO via RPC
  //    (lock + incremento num só statement) para não furar o saldo sob
  //    concorrência. Fallback read-modify-write enquanto a RPC não existir.
  let pacoteId: string | null = null
  let pacoteNovoConsumido: number | null = null
  let consumoAtomico = false

  if (perfil?.escritorio_id) {
    const rpc = await admin.rpc('consumir_pacote_fifo', { p_escritorio_id: perfil.escritorio_id })
    if (!rpc.error) {
      consumoAtomico = true
      const row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data
      if (row?.pacote_id) {
        pacoteId = row.pacote_id
        pacoteNovoConsumido = row.novo_consumido
      } else {
        // Não consumiu: distingue "pacote esgotado" de "sem pacote".
        const { data: temPacote } = await admin
          .from('pacotes')
          .select('id')
          .eq('escritorio_id', perfil.escritorio_id)
          .eq('status', 'ativo')
          .limit(1)
          .maybeSingle()
        if (temPacote) {
          return NextResponse.json(
            { error: 'Pacote esgotado. Solicite ao gestor a habilitação de um novo pacote.' },
            { status: 403 }
          )
        }
        // sem pacote → cai no fallback de subscriptions abaixo
      }
    } else {
      // Fallback pré-migration: comportamento antigo (não-atômico).
      const { data: pacote } = await admin
        .from('pacotes')
        .select('id, analises_total, analises_consumidas')
        .eq('escritorio_id', perfil.escritorio_id)
        .eq('status', 'ativo')
        .order('criado_em', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (pacote && pacote.analises_consumidas < pacote.analises_total) {
        pacoteId = pacote.id
        pacoteNovoConsumido = pacote.analises_consumidas + 1
      } else if (pacote) {
        return NextResponse.json(
          { error: 'Pacote esgotado. Solicite ao gestor a habilitação de um novo pacote.' },
          { status: 403 }
        )
      }
    }
  }

  // 3. Fallback: usa subscriptions legacy se não consumiu de pacote
  let sub: { id: string; analises_restantes: number | null } | null = null
  if (!pacoteId) {
    const { data } = await admin
      .from('subscriptions')
      .select('id, analises_restantes')
      .eq('user_id', user.id)
      .eq('status', 'ativo')
      .maybeSingle()
    sub = data

    if (!sub) {
      return NextResponse.json(
        { error: 'Sem pacote ativo ou assinatura. Solicite ao gestor a habilitação de um pacote.' },
        { status: 403 }
      )
    }

    if (sub.analises_restantes !== null && sub.analises_restantes <= 0) {
      return NextResponse.json({ error: 'Limite de análises atingido.' }, { status: 403 })
    }
  }

  const { data: analise, error: createError } = await admin
    .from('analises')
    .insert({
      user_id:     user.id,
      nome_ativo:  intake.nomeAtivo,
      deal_intake: encryptSensitiveFields(intake),
      status:      'processando',
      pacote_id:   pacoteId,
    })
    .select()
    .single()

  if (createError || !analise) {
    // Já consumimos atomicamente, mas a análise não nasceu: devolve a unidade.
    if (consumoAtomico && pacoteId) {
      await admin.rpc('devolver_pacote', { p_pacote_id: pacoteId })
    }
    return NextResponse.json({ error: 'Erro ao criar análise' }, { status: 500 })
  }

  void audit({
    event:    'analise.created',
    userId:   user.id,
    targetId: analise.id,
    metadata: { nome_ativo: intake.nomeAtivo, tipo_ativo: intake.tipoAtivo, pacote_id: pacoteId },
    ip:       extractIp(req.headers),
    userAgent: req.headers.get('user-agent'),
  })

  // 4. Decremento do pacote: no consumo atômico já foi feito na RPC; só o
  //    fallback (não-atômico) precisa gravar aqui. Audit sempre que houve pacote.
  if (pacoteId && pacoteNovoConsumido !== null) {
    if (!consumoAtomico) {
      await admin
        .from('pacotes')
        .update({
          analises_consumidas: pacoteNovoConsumido,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', pacoteId)
    }

    void audit({
      event:    'pacote.consumed',
      userId:   user.id,
      targetId: pacoteId,
      metadata: { analise_id: analise.id, novo_consumido: pacoteNovoConsumido },
      ip:       extractIp(req.headers),
      userAgent: req.headers.get('user-agent'),
    })
  } else if (sub && sub.analises_restantes !== null) {
    await admin
      .from('subscriptions')
      .update({ analises_restantes: sub.analises_restantes - 1 })
      .eq('id', sub.id)
  }

  return NextResponse.json({ analiseId: analise.id })
}
