import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { resolveEscritorioId } from '@/lib/invest-match/auth-helpers'
import InvestidorForm from '@/components/invest-match/InvestidorForm'
import { IconArrowLeft } from '@/components/Icons'

export const dynamic = 'force-dynamic'

export default async function NovoInvestidorPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const escritorioId = await resolveEscritorioId(user.id)
  if (!escritorioId) redirect('/dashboard/invest-match')

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/invest-match/investidores" className="p-1.5 rounded-md hover:bg-surface-hover text-ink-2">
          <IconArrowLeft size={18}/>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-ink">Novo investidor</h1>
          <p className="text-ink-3 text-xs mt-0.5">Preencha a tese declarada para receber matches qualificados.</p>
        </div>
      </div>

      <InvestidorForm mode="create"/>
    </div>
  )
}
