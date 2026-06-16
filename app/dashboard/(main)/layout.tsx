import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { getUserContext } from '@/lib/get-role'
import { hasModulo } from '@/lib/entitlements'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import OnboardingTour from '@/components/OnboardingTour'
import DicaPagina from '@/components/DicaPagina'
import ReleaseNotice, { type ReleaseData } from '@/components/ReleaseNotice'
import MaintenanceBanner from '@/components/MaintenanceBanner'

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
  const onboardingDone = meta.onboarding_completed === true
  const aprendizadosEnabled = ctx?.role === 'gerente'
    ? await hasModulo(ctx.escritorioId, 'aprendizados')
    : false

  // Última release publicada → aviso "Plataforma Atualizada". Best-effort: nunca
  // derruba o layout. Só dispara quando o onboarding já foi feito (evita 2 modais).
  let release: ReleaseData | null = null
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('platform_releases')
      .select('version, title, release_date, improvements, new_features, fixes')
      .eq('published', true)
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    release = (data as ReleaseData | null) ?? null
  } catch { /* sem release */ }
  const lastSeen = meta.last_seen_release_version as string | undefined
  const showRelease = onboardingDone && !!release && lastSeen !== release.version

  // Banner de manutenção para admin (ele tem bypass; o cliente vê /manutencao).
  let maintenanceOn = false
  if (ctx?.role === 'admin') {
    try {
      const admin = createAdminClient()
      const { data } = await admin
        .from('app_settings').select('value').eq('key', 'maintenance').maybeSingle()
      maintenanceOn = (data?.value as { enabled?: boolean } | undefined)?.enabled === true
    } catch { /* ignora */ }
  }

  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr]">
      <Sidebar
        user={{ name, role: roleLabel, email: user.email!, initials }}
        userRole={ctx?.role ?? 'assessor'}
        aprendizadosEnabled={aprendizadosEnabled}
      />
      <main className="flex flex-col min-h-screen overflow-y-auto bg-bg">
        {maintenanceOn && <MaintenanceBanner/>}
        {children}
      </main>
      <OnboardingTour autoStart={!onboardingDone}/>
      <ReleaseNotice release={release} autoShow={showRelease}/>
      <DicaPagina/>
    </div>
  )
}
