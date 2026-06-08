import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { audit, extractIp } from '@/lib/audit'
import { buildThesisFromAnalise } from '@/lib/invest-match/builder'
import { gateInvestMatch } from '@/lib/invest-match/auth-helpers'
import { inngest } from '@/lib/inngest'

// POST /api/invest-match/teses/from-analise/[id]
//
// Converte a análise consolidada do Mandor (mesa_revisao + fact_bank + outputs)
// numa Tese estruturada do Invest Match.
//
// - Requer auth.
// - Apenas o dono da análise (ou membro do deal) pode disparar.
// - Idempotente: rodar 2x atualiza a mesma tese (unique constraint analise_id).
// - Resposta: { tese_id, is_new, embedding_dim, model_id }
//
// Sem matching ainda — só persiste a tese. O job de matching v2 será chamado
// numa próxima sprint (Inngest event 'invest-match/thesis-created').

export const maxDuration = 60  // Sonnet + voyage podem demorar 20-40s

export async function POST(
  req:    NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: analiseId } = await params

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Entitlement: o módulo Invest Match (Plus) precisa estar habilitado no escritório.
  const gate = await gateInvestMatch(user.id)
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  // Permissão: dono da análise OU membro do deal
  const admin = createAdminClient()
  const { data: analise } = await admin
    .from('analises')
    .select('user_id, mesa_revisao')
    .eq('id', analiseId)
    .single()

  if (!analise) {
    return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })
  }

  if (analise.user_id !== user.id) {
    const { data: member } = await admin
      .from('deal_members')
      .select('user_id')
      .eq('analise_id', analiseId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!member) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }
  }

  if (!analise.mesa_revisao) {
    return NextResponse.json(
      { error: 'Análise ainda não tem mesa_revisao consolidada. Rode o pipeline completo antes.' },
      { status: 409 },
    )
  }

  try {
    const result = await buildThesisFromAnalise({
      analiseId,
      userId: user.id,
    })

    void audit({
      event:    result.is_new ? 'tese.created' : 'tese.updated',
      userId:   user.id,
      targetId: result.tese_id,
      metadata: {
        analise_id:    analiseId,
        origem:        result.origem,
        model_id:      result.model_id,
        embedding_dim: result.embedding_dim,
      },
      ip:        extractIp(req.headers),
      userAgent: req.headers.get('user-agent'),
    })

    // Dispara o motor de matching de forma assíncrona (Inngest).
    // Não bloqueia a resposta — os matches aparecem na UI conforme processam.
    try {
      await inngest.send({
        name: 'invest-match/thesis.created',
        data: { teseId: result.tese_id, analiseId, userId: user.id },
      })
    } catch (e) {
      // Falha ao enfileirar não invalida a tese criada — pode reprocessar depois.
      console.error('[from-analise] falha ao enfileirar matching:', e)
    }

    return NextResponse.json({
      ok:            true,
      tese_id:       result.tese_id,
      is_new:        result.is_new,
      origem:        result.origem,
      model_id:      result.model_id,
      embedding_dim: result.embedding_dim,
      matching_enfileirado: true,
    })
  } catch (e) {
    const err = e as Error
    console.error('[from-analise] build failed:', err)
    return NextResponse.json(
      { error: 'Falha ao construir tese: ' + err.message },
      { status: 500 },
    )
  }
}
