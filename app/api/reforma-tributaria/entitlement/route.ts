import { NextResponse } from 'next/server'
import { getUserContext } from '@/lib/get-role'
import { resolveEscritorioId, isReformaTributariaEnabled } from '@/lib/reforma-tributaria/auth-helpers'

// Entitlement do módulo Adequação à Reforma Tributária (Ferrante) para o usuário
// logado. Usado pelo formulário de nova análise para liberar/bloquear o opt-in.
// Mesmo critério do gate: gestor master da Mandor (admin) sempre liberado; demais
// só com o flag do escritório habilitado. Sempre 200 (enabled boolean), nunca quebra
// o formulário.
export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ enabled: false })
  if (ctx.role === 'admin') return NextResponse.json({ enabled: true })
  const escritorioId = await resolveEscritorioId(ctx.userId)
  const enabled = await isReformaTributariaEnabled(escritorioId)
  return NextResponse.json({ enabled })
}
