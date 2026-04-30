import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
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
