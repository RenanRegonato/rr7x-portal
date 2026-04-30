import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { analiseId, files } = await req.json() as { analiseId: string; files: { name: string }[] }

  if (!analiseId || !Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 })
  }

  // Valida que a análise pertence ao usuário
  const admin = createAdminClient()
  const { data: analise } = await admin
    .from('analises')
    .select('id, user_id')
    .eq('id', analiseId)
    .single()

  if (!analise || analise.user_id !== user.id) {
    return NextResponse.json({ error: 'Análise não encontrada.' }, { status: 404 })
  }

  const urls = await Promise.all(
    files.map(async ({ name }) => {
      const safeName = name.replace(/[^a-zA-Z0-9._\-À-ɏ]/g, '_')
      const path = `${user.id}/${analiseId}/${safeName}`
      const { data, error } = await admin.storage
        .from('analises')
        .createSignedUploadUrl(path)

      if (error || !data) {
        return { name, originalName: name, error: error?.message ?? 'Falha ao gerar URL.' }
      }

      return { name: safeName, originalName: name, signedUrl: data.signedUrl, token: data.token, path }
    })
  )

  return NextResponse.json({ urls })
}
