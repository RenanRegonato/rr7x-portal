import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getUserContext } from '@/lib/get-role'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const ROLE_LABEL: Record<string, string> = {
  admin:    'Administrador',
  gerente:  'Gerente',
  assessor: 'Assessor',
}

export default async function DashboardMainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const ctx = await getUserContext()

  const meta     = user.user_metadata ?? {}
  const name     = (meta.nome as string | undefined) || user.email?.split('@')[0] || 'Usuário'
  const roleLabel = (meta.escritorio as string | undefined) || ROLE_LABEL[ctx?.role ?? 'assessor']
  const initials = name.split(' ').slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? '').join('')

  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr]">
      <Sidebar
        user={{ name, role: roleLabel, email: user.email!, initials }}
        userRole={ctx?.role ?? 'assessor'}
      />
      <main className="flex flex-col min-h-screen overflow-y-auto bg-bg">
        {children}
      </main>
    </div>
  )
}
