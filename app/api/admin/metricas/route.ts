import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'

const ADMIN_EMAIL = 'gestor@renanregonato.com.br'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const admin = createAdminClient()

  const [
    { data: users },
    { data: subs },
    { data: analises },
  ] = await Promise.all([
    admin.auth.admin.listUsers(),
    admin.from('subscriptions').select('plano, status'),
    admin.from('analises').select('status, criado_em'),
  ])

  const totalClientes = users?.users.length ?? 0
  const subsAtivas = subs?.filter(s => s.status === 'ativo') ?? []
  const porPlano = { avulso: 0, recorrente: 0, enterprise: 0 }
  subsAtivas.forEach(s => { if (s.plano in porPlano) porPlano[s.plano as keyof typeof porPlano]++ })

  const totalAnalises = analises?.length ?? 0
  const analisesHoje = analises?.filter(a => {
    const d = new Date(a.criado_em)
    const hoje = new Date()
    return d.getDate() === hoje.getDate() && d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear()
  }).length ?? 0

  const porStatus = {
    concluido: analises?.filter(a => a.status === 'concluido').length ?? 0,
    processando: analises?.filter(a => a.status === 'processando').length ?? 0,
    erro: analises?.filter(a => a.status === 'erro').length ?? 0,
  }

  return NextResponse.json({ totalClientes, subsAtivas: subsAtivas.length, porPlano, totalAnalises, analisesHoje, porStatus })
}
