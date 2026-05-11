import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase-server'
import Stripe from 'stripe'

const VALID_PLANOS = ['avulso', 'recorrente'] as const
type Plano = typeof VALID_PLANOS[number]

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Assinatura ausente' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Webhook inválido' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Idempotency: ignore events already processed
  const { data: existing } = await supabase
    .from('webhook_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ received: true })
  }

  // Register event before processing to prevent race conditions
  await supabase
    .from('webhook_events')
    .insert({ stripe_event_id: event.id, event_type: event.type, processed_at: new Date().toISOString() })

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const user_id = session.metadata?.user_id
    const plano   = session.metadata?.plano

    if (!user_id || !UUID_REGEX.test(user_id)) {
      console.error(`[webhook] checkout.session.completed: user_id inválido (event=${event.id})`)
      return NextResponse.json({ error: 'Metadata inválida: user_id' }, { status: 400 })
    }
    if (!plano || !VALID_PLANOS.includes(plano as Plano)) {
      console.error(`[webhook] checkout.session.completed: plano inválido "${plano}" (event=${event.id})`)
      return NextResponse.json({ error: 'Metadata inválida: plano' }, { status: 400 })
    }

    const analises_restantes = plano === 'avulso' ? 1 : null

    await supabase.from('subscriptions').upsert({
      user_id,
      stripe_customer_id:      session.customer as string,
      stripe_subscription_id:  session.subscription as string ?? null,
      plano,
      analises_restantes,
      status:       'ativo',
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    await supabase
      .from('subscriptions')
      .update({ status: 'cancelado', atualizado_em: new Date().toISOString() })
      .eq('stripe_subscription_id', sub.id)
  }

  return NextResponse.json({ received: true })
}
