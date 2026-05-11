import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { sendCompletionEmail, sendErrorNotification } from '@/lib/email'
import { decryptSensitiveFields } from '@/lib/crypto'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const concluir     = req.nextUrl.searchParams.get('concluir')
  const erro         = req.nextUrl.searchParams.get('erro')
  const reprocessar  = req.nextUrl.searchParams.get('reprocessar')

  const admin   = createAdminClient()
  const baseUrl = req.nextUrl.origin

  const continuar = req.nextUrl.searchParams.get('continuar')

  if (continuar === '1') {
    await admin.from('analises').update({ status: 'processando', atualizado_em: new Date().toISOString() }).eq('id', id)
  }

  if (concluir === '1') {
    await admin.from('analises').update({ status: 'concluido', atualizado_em: new Date().toISOString() }).eq('id', id)
    try {
      const { data: a } = await admin.from('analises').select('nome_ativo, user_id').eq('id', id).single()
      if (a) {
        const { data: owner } = await admin.auth.admin.getUserById(a.user_id)
        const to = owner?.user?.email
        if (to) await sendCompletionEmail({ to, nomeAtivo: a.nome_ativo, analiseId: id, baseUrl })
      }
    } catch { /* non-blocking */ }
  }
  if (erro === '1') {
    await admin.from('analises').update({ status: 'erro', atualizado_em: new Date().toISOString() }).eq('id', id)
    try {
      const { data: a } = await admin.from('analises').select('nome_ativo').eq('id', id).single()
      if (a) {
        await sendErrorNotification({ nomeAtivo: a.nome_ativo, analiseId: id, baseUrl })
      }
    } catch { /* non-blocking */ }
  }
  if (reprocessar === '1') {
    await admin.from('analises').update({ status: 'processando', outputs: {}, atualizado_em: new Date().toISOString() }).eq('id', id)
  }

  const { data } = await admin
    .from('analises')
    .select('id, status, outputs, nome_ativo, deal_intake, criado_em')
    .eq('id', id)
    .single()

  if (!data) return NextResponse.json(null)

  // Decrypt PII fields before sending to the client
  const response = {
    ...data,
    deal_intake: data.deal_intake ? decryptSensitiveFields(data.deal_intake) : null,
  }

  return NextResponse.json(response)
}
