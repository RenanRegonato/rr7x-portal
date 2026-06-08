import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { isAdminViewer } from '@/lib/get-role'

const ATTESTATION_STATEMENT =
  'Declaro que li, revisei e assumo responsabilidade pelo conteúdo deste relatório gerado com auxílio de IA, conforme ICVM 598/2018 e Código ANBIMA para M&A.'

// GET — busca atestado existente para analise+step+version
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const analiseId  = req.nextUrl.searchParams.get('analiseId')
  const stepKey    = req.nextUrl.searchParams.get('stepKey')
  if (!analiseId || !stepKey) return NextResponse.json({ error: 'Params obrigatórios' }, { status: 400 })

  const admin = createAdminClient()
  const isAdmin = await isAdminViewer(user.id)

  // Verifica acesso
  const { data: analise } = await admin.from('analises').select('user_id').eq('id', analiseId).single()
  if (!analise) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })
  if (analise.user_id !== user.id && !isAdmin) {
    const { data: member } = await admin.from('deal_members').select('id').eq('analise_id', analiseId).eq('user_id', user.id).maybeSingle()
    if (!member) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  // Atestado mais recente para esse step
  const { data: attestation } = await admin
    .from('deal_attestations')
    .select('id, version_num, attested_email, attested_at, statement')
    .eq('analise_id', analiseId)
    .eq('step_key', stepKey)
    .order('attested_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Histórico de execuções da IA (tokens/duração) revela o CUSTO/COGS interno
  // do Mandor. SOMENTE admin do Mandor vê. Escritório (dono/assessor/membro)
  // NÃO pode saber quanto/quando se gastou — retorna lista vazia, e a UI
  // (que só renderiza se length > 0) some sozinha.
  type AuditLog = {
    id: string; model_id: string; input_tokens: number; output_tokens: number
    context_steps: string[]; external_data: Record<string, boolean>; ran_at: string; duration_ms: number
  }
  let auditLogs: AuditLog[] = []
  if (isAdmin) {
    const { data } = await admin
      .from('deal_step_audit_logs')
      .select('id, model_id, input_tokens, output_tokens, context_steps, external_data, ran_at, duration_ms')
      .eq('analise_id', analiseId)
      .eq('step_key', stepKey)
      .order('ran_at', { ascending: false })
      .limit(5)
    auditLogs = (data ?? []) as AuditLog[]
  }

  return NextResponse.json({
    attestation: attestation ?? null,
    auditLogs,
    statement:   ATTESTATION_STATEMENT,
  })
}

// POST — cria atestado
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { analiseId, stepKey, versionNum } = await req.json()
  if (!analiseId || !stepKey || versionNum == null) {
    return NextResponse.json({ error: 'analiseId, stepKey e versionNum obrigatórios' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: analise } = await admin.from('analises').select('user_id').eq('id', analiseId).single()
  if (!analise) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })
  if (analise.user_id !== user.id && !(await isAdminViewer(user.id))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  // IP via header (best-effort)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown'

  // Upsert — se já atestou essa versão, atualiza timestamp
  const { data, error } = await admin
    .from('deal_attestations')
    .upsert({
      analise_id:     analiseId,
      step_key:       stepKey,
      version_num:    versionNum,
      attested_by:    user.id,
      attested_email: user.email!,
      statement:      ATTESTATION_STATEMENT,
      ip_address:     ip,
      attested_at:    new Date().toISOString(),
    }, { onConflict: 'analise_id,step_key,version_num' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, attestation: data })
}
