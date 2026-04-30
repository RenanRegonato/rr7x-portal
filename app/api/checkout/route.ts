import { NextRequest, NextResponse } from 'next/server'
import { stripe, PLANOS } from '@/lib/stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { plano } = await req.json()

  if (plano === 'enterprise') {
    return NextResponse.json({ url: 'mailto:gestor@renanregonato.com.br?subject=Enterprise Deal Intelligence' })
  }

  const planoConfig = PLANOS[plano as keyof typeof PLANOS]
  if (!planoConfig) return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })

  const session = await stripe.checkout.sessions.create({
    mode: plano === 'recorrente' ? 'subscription' : 'payment',
    line_items: [{ price: planoConfig.priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?sucesso=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/planos`,
    customer_email: user.email,
    metadata: { user_id: user.id, plano },
  })

  return NextResponse.json({ url: session.url })
}
