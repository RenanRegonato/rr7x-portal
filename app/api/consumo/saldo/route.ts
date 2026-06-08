import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getUserContext } from '@/lib/get-role'

// GET /api/consumo/saldo
// Saldo de análises do pacote do escritório do usuário logado, para mostrar
// a transparência "antes do commit" na criação de uma análise (lição CBRdoc:
// o cliente sabe o custo antes de confirmar). Customer-facing: unidade é
// ANÁLISE (pacote), não USD — diferente do card de COGS, que é admin-only.

export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Sem escritório (ex.: admin master): não há pacote a exibir.
  if (!ctx.escritorioId) {
    return NextResponse.json({ has_pacote: false })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('pacotes')
    .select('analises_total, analises_consumidas')
    .eq('escritorio_id', ctx.escritorioId)
    .eq('status', 'ativo')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const pacotes = data ?? []
  if (pacotes.length === 0) {
    return NextResponse.json({ has_pacote: false })
  }

  const total     = pacotes.reduce((s, p) => s + (p.analises_total ?? 0), 0)
  const consumido = pacotes.reduce((s, p) => s + (p.analises_consumidas ?? 0), 0)
  const restante  = Math.max(0, total - consumido)

  // Mesma régua da página de consumo: alerta quando esgotado ou <= 20% restante.
  const esgotado     = total > 0 && restante === 0
  const limite_baixo = total > 0 && restante > 0 && restante <= Math.max(1, Math.ceil(total * 0.2))

  return NextResponse.json({
    has_pacote: true,
    total,
    consumido,
    restante,
    esgotado,
    limite_baixo,
  })
}
