import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { resolveEscritorioId } from '@/lib/invest-match/auth-helpers'
import { IconArrowLeft } from '@/components/Icons'
import TeseForm from '@/components/invest-match/TeseForm'

export const dynamic = 'force-dynamic'

export default async function NovaTeseManualPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const escritorioId = await resolveEscritorioId(user.id)
  if (!escritorioId) redirect('/dashboard/invest-match')

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/dashboard/invest-match/teses/nova" className="p-1.5 rounded-md hover:bg-surface-hover text-ink-2">
          <IconArrowLeft size={18}/>
        </Link>
        <h1 className="text-2xl font-semibold text-ink">Cadastrar tese manualmente</h1>
      </div>
      <p className="text-ink-2 text-sm mb-6 ml-10">
        Inclua uma oportunidade direto no sistema, sem depender de uma análise do Mandor.
        Ao salvar, o motor de matching cruza a tese com sua base de investidores.
      </p>

      <TeseForm/>
    </div>
  )
}
