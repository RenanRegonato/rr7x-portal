import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getUserContext } from '@/lib/get-role'
import { resolveEscritorioId, isInvestMatchEnabled } from '@/lib/invest-match/auth-helpers'
import UpsellPlus from '@/components/invest-match/UpsellPlus'

// Gate do módulo Invest Match (Plus).
// O item continua visível no menu para todos; o acesso real é verificado aqui.
// - Gestor master da Mandor (admin): acesso irrestrito.
// - Escritório sem o Plus habilitado: tela de upsell (oportunidade comercial).

export default async function InvestMatchLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const ctx = await getUserContext()
  if (ctx?.role === 'admin') return <>{children}</>

  const escritorioId = await resolveEscritorioId(user.id)
  const habilitado   = await isInvestMatchEnabled(escritorioId)
  if (!habilitado) return <UpsellPlus />

  return <>{children}</>
}
