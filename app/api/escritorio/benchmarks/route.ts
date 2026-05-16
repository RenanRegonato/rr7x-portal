import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getUserContext } from '@/lib/get-role'
import { BenchmarkCreateSchema } from '@/lib/schemas'
import { audit, extractIp } from '@/lib/audit'

// Resolve qual escritorio_id o usuário pode gerenciar.
//   - gerente / assessor: o do seu perfil
//   - admin: pode passar escritorio_id na query/body
async function escritorioIdDoUsuario(req: NextRequest, bodyEscritorioId?: string | null): Promise<{ escritorio_id: string | null; role: string; user_id: string } | null> {
  const ctx = await getUserContext()
  if (!ctx) return null

  if (ctx.role === 'admin') {
    const fromQuery = req.nextUrl.searchParams.get('escritorio_id')
    const target = bodyEscritorioId ?? fromQuery ?? ctx.escritorioId
    return { escritorio_id: target, role: ctx.role, user_id: ctx.userId }
  }

  if (ctx.role !== 'gerente') return null  // assessor não escreve
  if (!ctx.escritorioId)     return null

  return { escritorio_id: ctx.escritorioId, role: ctx.role, user_id: ctx.userId }
}

// GET /api/escritorio/benchmarks
// Retorna globais + overrides do próprio escritório, em duas listas separadas
// (UI faz o merge visual). Leitura permitida a qualquer membro do escritório
// (assessor inclusive). Escrita restrita a gerente/admin.
export async function GET(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!ctx.escritorioId && ctx.role !== 'admin') {
    return NextResponse.json({ error: 'Usuário sem escritório vinculado' }, { status: 403 })
  }

  const targetEscritorioId =
    ctx.role === 'admin'
      ? (req.nextUrl.searchParams.get('escritorio_id') ?? ctx.escritorioId)
      : ctx.escritorioId

  const admin = createAdminClient()

  const [{ data: globals }, { data: overrides }] = await Promise.all([
    admin.from('market_benchmarks')
      .select('*')
      .is('escritorio_id', null)
      .eq('ativo', true)
      .order('instrument', { ascending: true })
      .order('parameter',  { ascending: true }),
    targetEscritorioId
      ? admin.from('market_benchmarks')
          .select('*')
          .eq('escritorio_id', targetEscritorioId)
          .eq('ativo', true)
      : Promise.resolve({ data: [] as never[], error: null }),
  ])

  return NextResponse.json({
    globals:        globals ?? [],
    overrides:      overrides ?? [],
    escritorio_id:  targetEscritorioId,
    pode_editar:    ctx.role === 'gerente' || ctx.role === 'admin',
  })
}

// POST /api/escritorio/benchmarks
// Cria override do escritório para (instrument, parameter). Se já existir
// override ativo, retorna 409 (use PATCH).
export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (ctx.role !== 'gerente' && ctx.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas gerente ou admin pode criar override' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = BenchmarkCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const d = parsed.data

  // Resolve escritorio_id: admin pode passar via body, gerente sempre o próprio
  const meta = await escritorioIdDoUsuario(req, body.escritorio_id ?? null)
  if (!meta?.escritorio_id) {
    return NextResponse.json({ error: 'Escritório não resolvido' }, { status: 403 })
  }

  const adminCli = createAdminClient()

  // Verifica se já existe override ativo (deve usar PATCH em vez de POST)
  const { data: existing } = await adminCli
    .from('market_benchmarks')
    .select('id')
    .eq('escritorio_id', meta.escritorio_id)
    .eq('instrument',    d.instrument)
    .eq('parameter',     d.parameter)
    .eq('ativo', true)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Override já existe — use PATCH', existing_id: existing.id }, { status: 409 })
  }

  const { data: created, error } = await adminCli
    .from('market_benchmarks')
    .insert({
      instrument:    d.instrument,
      parameter:     d.parameter,
      value_min:     d.value_min,
      value_max:     d.value_max,
      unit:          d.unit,
      descricao:     d.descricao  ?? null,
      notes:         d.notes      ?? null,
      source:        d.source     ?? null,
      valid_from:    d.valid_from ?? new Date().toISOString().slice(0, 10),
      valid_to:      d.valid_to   ?? null,
      ativo:         true,
      escritorio_id: meta.escritorio_id,
      version:       1,
      criado_por:    meta.user_id,
    })
    .select()
    .single()

  if (error || !created) {
    return NextResponse.json({ error: error?.message ?? 'Erro ao criar override' }, { status: 500 })
  }

  void audit({
    event:    'benchmark.created',
    userId:   meta.user_id,
    targetId: created.id,
    metadata: { instrument: d.instrument, parameter: d.parameter, escritorio_id: meta.escritorio_id, escopo: 'escritorio' },
    ip:       extractIp(req.headers),
    userAgent: req.headers.get('user-agent'),
  })

  return NextResponse.json({ benchmark: created })
}
