import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { inngest } from '@/lib/inngest'
import { isAdminViewer } from '@/lib/get-role'

/**
 * Re-dispara o consolidator de fact_bank pra uma análise.
 * Útil quando o consolidator anterior falhou (parse_error) e o código foi corrigido,
 * mas os document_facts já estão extraídos no banco.
 *
 * POST /api/admin/retrigger-consolidate?id=<analise_id>
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!(await isAdminViewer(user.id))) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const analiseId = req.nextUrl.searchParams.get('id')
  if (!analiseId) return NextResponse.json({ error: 'Falta query param id' }, { status: 400 })

  const admin = createAdminClient()

  // Reseta fact_bank_consolidated_at pra que o maybeTriggerConsolidation do processDocument
  // não conflite. Não apaga os fatos brutos — só limpa o consolidated.
  await admin
    .from('analises')
    .update({
      fact_bank:                 null,
      fact_bank_consolidated_at: null,
      fact_bank_model_id:        null,
    })
    .eq('id', analiseId)

  await inngest.send({
    name: 'analise/fact_bank.consolidate_requested',
    data: { analiseId },
  })

  return NextResponse.json({ ok: true, message: 'Consolidator re-disparado' })
}
