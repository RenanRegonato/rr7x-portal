import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { checkDriveAccess } from '@/lib/drive'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ status: 'error', message: 'Não autenticado.' }, { status: 401 })

  // Rate limit: cada validação dispara fetch externo (Google Docs ou Jina AI),
  // pago em latência + custo Jina. 20 validações/hora por usuário é mais que
  // suficiente pro fluxo legítimo de cadastrar links de Drive em uma análise.
  const rl = await checkRateLimit(`validar-drive:${user.id}`, 20, 3600)
  if (!rl.allowed) return rateLimitResponse(rl.resetIn)

  const { url } = await req.json()
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ status: 'error', message: 'URL não informada.' }, { status: 400 })
  }

  const result = await checkDriveAccess(url)
  return NextResponse.json(result)
}
