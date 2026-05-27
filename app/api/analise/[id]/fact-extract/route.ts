import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server'
import { canAccessAnalise, getUserContext } from '@/lib/get-role'
import { audit, extractIp } from '@/lib/audit'
import { extractFacts } from '@/lib/agents/fact-extractor'
import { upsertFact } from '@/lib/truth-layer'
import { isInternalCall } from '@/lib/internal-auth'

// Dispara extração de fatos a partir do output do drive_intake.
// Idempotente: se já rodou, retorna 200 sem re-executar (a menos que ?force=1).

export const maxDuration = 300

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Chamada server-to-server do orquestrador Inngest pula auth de usuário.
  const internal = isInternalCall(req)

  let userId: string | null = null
  if (!internal) {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    userId = user.id

    const ctx = await getUserContext()
    if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

    const { id: analiseIdAuth } = await params
    const admin0 = createAdminClient()
    const { data: a0 } = await admin0
      .from('analises')
      .select('user_id')
      .eq('id', analiseIdAuth)
      .maybeSingle()
    if (!a0) return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })
    const podeAcessar = await canAccessAnalise(ctx, a0.user_id)
    if (!podeAcessar) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { id: analiseId } = await params
  const force = req.nextUrl.searchParams.get('force') === '1'

  const admin = createAdminClient()

  const { data: analise } = await admin
    .from('analises')
    .select('id, user_id, deal_intake, outputs, facts_extracted_at')
    .eq('id', analiseId)
    .maybeSingle()

  if (!analise) return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })

  // Idempotência: se já extraiu e não é force, devolve já
  if (analise.facts_extracted_at && !force) {
    return NextResponse.json({ ok: true, ja_extraido: true })
  }

  const outputs = (analise.outputs ?? {}) as Record<string, string>
  const driveIntakeOutput = outputs['drive_intake'] ?? ''

  if (!driveIntakeOutput) {
    return NextResponse.json(
      { error: 'Aguarde o agente drive_intake concluir antes de extrair fatos.' },
      { status: 409 }
    )
  }

  const intake = (analise.deal_intake ?? {}) as Record<string, string>
  const intakeResumo = [
    ['Ativo',           intake.nomeAtivo],
    ['Tipo de ativo',   intake.tipoAtivo],
    ['Estágio',         intake.estagio],
    ['Objetivo',        intake.objetivo],
    ['Ticket estimado', intake.ticketEstimado],
    ['Localização',     intake.localizacao],
    ['Resumo ativo',    intake.resumoAtivo],
  ]
    .filter(([, v]) => v && v.length > 0)
    .map(([k, v]) => `**${k}:** ${v}`)
    .join('\n')

  let result
  try {
    result = await extractFacts({
      intake_resumo:       intakeResumo,
      drive_intake_output: driveIntakeOutput,
    }, analiseId)
  } catch (e) {
    console.error('[fact-extract] failed:', e)
    return NextResponse.json(
      { error: 'Falha ao extrair fatos. Tente novamente.' },
      { status: 502 }
    )
  }

  // Se force=1, limpa os fatos antigos (asserted_by='fact_extractor') antes de inserir
  if (force) {
    await admin
      .from('analise_facts')
      .delete()
      .eq('analise_id', analiseId)
      .eq('asserted_by', 'fact_extractor')
  }

  // Persiste fatos
  for (const fact of result.facts) {
    try {
      await upsertFact({
        analise_id:   analiseId,
        fact_type:    fact.fact_type,
        key:          fact.key,
        value:        fact.value,
        source_doc:   fact.source_doc,
        source_page:  fact.source_page,
        source_quote: fact.source_quote,
        asserted_by:  'fact_extractor',
        confidence:   fact.confidence,
        notes:        fact.notes,
      })
    } catch (e) {
      console.error('[fact-extract] failed to upsert fact:', fact.key, e)
    }
  }

  // Marca timestamp de extração
  await admin
    .from('analises')
    .update({ facts_extracted_at: new Date().toISOString() })
    .eq('id', analiseId)

  void audit({
    event:    'fact.extracted',
    userId,
    targetId: analiseId,
    metadata: {
      facts_count: result.facts.length,
      por_tipo: result.facts.reduce<Record<string, number>>((acc, f) => {
        acc[f.fact_type] = (acc[f.fact_type] ?? 0) + 1
        return acc
      }, {}),
    },
    ip:       extractIp(req.headers),
    userAgent: req.headers.get('user-agent'),
  })

  return NextResponse.json({
    ok: true,
    facts_count: result.facts.length,
  })
}

// GET — retorna fatos consolidados da análise (para UI)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { id: analiseId } = await params

  const admin = createAdminClient()

  const { data: analise } = await admin
    .from('analises')
    .select('id, user_id, facts_extracted_at')
    .eq('id', analiseId)
    .maybeSingle()

  if (!analise) return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })

  const podeAcessar = await canAccessAnalise(ctx, analise.user_id)
  if (!podeAcessar) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { data: facts, error } = await admin
    .from('analise_facts')
    .select('*')
    .eq('analise_id', analiseId)
    .order('fact_type', { ascending: true })
    .order('key',       { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    facts: facts ?? [],
    facts_extracted_at: analise.facts_extracted_at,
  })
}
