import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getUserContext } from '@/lib/get-role'
import { hasModulo } from '@/lib/entitlements'

async function verificarGerente() {
  const ctx = await getUserContext()
  if (!ctx || ctx.role !== 'gerente') return null
  if (!ctx.escritorioId) return null
  // Aprendizados é um diferencial de plano (módulo 'aprendizados').
  if (!(await hasModulo(ctx.escritorioId, 'aprendizados'))) return null
  return ctx
}

export async function GET() {
  const ctx = await verificarGerente()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('escritorio_feedbacks')
    .select('*')
    .eq('escritorio_id', ctx.escritorioId)
    .order('criado_em', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ feedbacks: data })
}

export async function POST(req: NextRequest) {
  const ctx = await verificarGerente()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { texto } = await req.json()
  if (!texto?.trim()) return NextResponse.json({ error: 'Texto obrigatório' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('escritorio_feedbacks')
    .insert({ texto: texto.trim(), escritorio_id: ctx.escritorioId })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ feedback: data })
}

export async function PATCH(req: NextRequest) {
  const ctx = await verificarGerente()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { id, ativo } = await req.json()
  if (!id || typeof ativo !== 'boolean') return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })

  const admin = createAdminClient()
  // Scope update to this escritório only
  const { error } = await admin
    .from('escritorio_feedbacks')
    .update({ ativo })
    .eq('id', id)
    .eq('escritorio_id', ctx.escritorioId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const ctx = await verificarGerente()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const admin = createAdminClient()
  // Scope delete to this escritório only
  const { error } = await admin
    .from('escritorio_feedbacks')
    .delete()
    .eq('id', id)
    .eq('escritorio_id', ctx.escritorioId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
