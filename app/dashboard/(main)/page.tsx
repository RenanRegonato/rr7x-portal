import { createAdminClient } from '@/lib/supabase-server'
import { getUserContext, getTeamUserIds } from '@/lib/get-role'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')

  const admin = createAdminClient()

  const teamIds = await getTeamUserIds(ctx)

  let analiseQuery = admin.from('analises').select('*').order('criado_em', { ascending: false })
  if (teamIds !== null) analiseQuery = analiseQuery.in('user_id', teamIds)

  const [{ data: analises }, { data: sub }] = await Promise.all([
    analiseQuery,
    admin.from('subscriptions').select('*').eq('user_id', ctx.userId).eq('status', 'ativo').single(),
  ])

  const initials = ctx.email
    .split('@')[0]
    .split(/[\s._-]/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <DashboardClient
      analises={analises ?? []}
      sub={sub}
      userInitials={initials}
    />
  )
}
