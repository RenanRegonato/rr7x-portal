import { createServerSupabaseClient, createAdminClient } from './supabase-server'

export type UserRole = 'admin' | 'gerente' | 'assessor'

export interface UserContext {
  userId:       string
  email:        string
  role:         UserRole
  escritorioId: string | null
}

const ADMIN_EMAIL = 'gestor@renanregonato.com.br'

export async function getUserContext(): Promise<UserContext | null> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  if (user.email === ADMIN_EMAIL) {
    return { userId: user.id, email: user.email, role: 'admin', escritorioId: null }
  }

  const admin = createAdminClient()
  const { data: perfil } = await admin
    .from('perfis')
    .select('role, escritorio_id')
    .eq('user_id', user.id)
    .maybeSingle()

  return {
    userId:       user.id,
    email:        user.email!,
    role:         (perfil?.role as UserRole) ?? 'assessor',
    escritorioId: perfil?.escritorio_id ?? null,
  }
}

// Returns the list of user_ids whose analises this user can see.
// Returns null for admin (= no filter, all users).
export async function getTeamUserIds(ctx: UserContext): Promise<string[] | null> {
  if (ctx.role === 'admin') return null

  if (ctx.role === 'gerente') {
    const admin = createAdminClient()
    const { data: escritorio } = await admin
      .from('escritorios')
      .select('id')
      .eq('user_id', ctx.userId)
      .maybeSingle()

    if (!escritorio) return [ctx.userId]

    const { data: membros } = await admin
      .from('perfis')
      .select('user_id')
      .eq('escritorio_id', escritorio.id)

    const memberIds = (membros ?? []).map((m: { user_id: string }) => m.user_id)
    return [...new Set([ctx.userId, ...memberIds])]
  }

  return [ctx.userId]
}

// Check whether `viewerId` can access an analise owned by `ownerId`.
export async function canAccessAnalise(viewerCtx: UserContext, ownerId: string): Promise<boolean> {
  if (viewerCtx.role === 'admin') return true
  if (viewerCtx.userId === ownerId) return true

  if (viewerCtx.role === 'gerente') {
    const ids = await getTeamUserIds(viewerCtx)
    return ids?.includes(ownerId) ?? false
  }

  return false
}
