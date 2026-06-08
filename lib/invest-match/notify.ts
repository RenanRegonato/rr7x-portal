// Notificação do ASSESSOR (dono do deal) quando o motor de matching gera
// matches para uma tese. Não notifica o investidor — apenas avisa internamente
// quem subiu o deal no Mandor que há oportunidades para revisar.
//
// Chamado ao fim do runThesisMatchingFn, somente se matches foram persistidos.
// Best-effort: sem email do assessor → skip sem erro.

import { createAdminClient } from '@/lib/supabase-server'
import { sendDealMatchesEmail } from '@/lib/email'

export interface NotifyAssessorParams {
  teseId:         string
  totalMatches:   number   // matches persistidos nesta rodada
  autoAprovados:  number   // score >= 85
}

export interface NotifyAssessorResult {
  status: 'sent' | 'skipped' | 'failed'
  reason?: string
  to?:    string
}

export async function notifyAssessorOfMatches(params: NotifyAssessorParams): Promise<NotifyAssessorResult> {
  const admin = createAdminClient()

  // 1) Carrega a tese (nome real — interno, não-blind) + vínculo com a análise
  const { data: tese, error: teseErr } = await admin
    .from('teses')
    .select('id, empresa_nome, analise_id, criado_por')
    .eq('id', params.teseId)
    .single()
  if (teseErr || !tese) {
    return { status: 'failed', reason: `tese não encontrada: ${teseErr?.message ?? 'sem dados'}` }
  }

  // 2) Descobre o assessor (dono): user_id da análise (Mandor) OU criado_por da tese (manual)
  let assessorUserId: string | null = null
  if (tese.analise_id) {
    const { data: analise } = await admin
      .from('analises')
      .select('user_id')
      .eq('id', tese.analise_id)
      .maybeSingle()
    assessorUserId = analise?.user_id ?? null
  }
  if (!assessorUserId) assessorUserId = tese.criado_por ?? null
  if (!assessorUserId) {
    return { status: 'skipped', reason: 'sem assessor vinculado à tese' }
  }

  // 3) Resolve o email do assessor (auth)
  const { data: userInfo, error: userErr } = await admin.auth.admin.getUserById(assessorUserId)
  if (userErr) return { status: 'failed', reason: `auth: ${userErr.message}` }
  const email = userInfo?.user?.email
  if (!email) return { status: 'skipped', reason: 'assessor sem email' }

  // 4) Envia o email factual com link para revisar
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.mandor.com.br'
  try {
    await sendDealMatchesEmail({
      to:            email,
      nomeAtivo:     tese.empresa_nome,
      teseId:        tese.id,
      totalMatches:  params.totalMatches,
      autoAprovados: params.autoAprovados,
      baseUrl,
    })
    return { status: 'sent', to: email }
  } catch (e) {
    return { status: 'failed', reason: (e as Error).message, to: email }
  }
}
