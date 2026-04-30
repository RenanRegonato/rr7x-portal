import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const concluir = req.nextUrl.searchParams.get('concluir')
  const erro = req.nextUrl.searchParams.get('erro')

  const admin = createAdminClient()

  if (concluir === '1') {
    await admin.from('analises').update({ status: 'concluido', atualizado_em: new Date().toISOString() }).eq('id', id)
  }
  if (erro === '1') {
    await admin.from('analises').update({ status: 'erro', atualizado_em: new Date().toISOString() }).eq('id', id)
  }

  const { data } = await admin
    .from('analises')
    .select('id, status, outputs, nome_ativo, criado_em')
    .eq('id', id)
    .single()

  return NextResponse.json(data)
}
