import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not set')
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' })
  }
  return _stripe
}

// Alias para compatibilidade com código legado que usa `stripe` diretamente
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return getStripe()[prop as keyof Stripe]
  },
})

export const PLANOS = {
  avulso: {
    label: 'Avulso',
    priceId: process.env.STRIPE_PRICE_AVULSO!,
    analises: 1,
    valor: 'R$ 2.500 – R$ 5.000',
  },
  recorrente: {
    label: 'Recorrente',
    priceId: process.env.STRIPE_PRICE_RECORRENTE!,
    analises: null, // ilimitado no plano
    valor: 'R$ 8.000 – R$ 15.000/mês',
  },
}
