import { createServerSupabaseClient, createAdminClient } from './supabase-server'

export type UserRole = 'admin' | 'gerente' | 'assessor'

export interface UserContext {
  userId:       string
  email:        string
  role:         UserRole
  escritorioId: string | null
}

export async function getUserContext(): Promise<UserContext | null> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: perfil } = await admin
    .from('perfis')
    .select('role, escritorio_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const role: UserRole = (perfil?.role as UserRole) ?? 'assessor'

  return {
    userId:       user.id,
    email:        user.email!,
    role,
    escritorioId: perfil?.escritorio_id ?? null,
  }
}

// Returns the list of user_ids whose analises this user can see.
// Returns null for admin (= no filter, all users).
export async function getTeamUserIds(ctx: UserContext): Promise<string[] | null> {
  if (ctx.role === 'admin') return null

  if (ctx.role === 'gerente') {
    if (!ctx.escritorioId) return [ctx.userId]

    const admin = createAdminClient()
    const { data: membros } = await admin
      .from('perfis')
      .select('user_id')
      .eq('escritorio_id', ctx.escritorioId)

    const memberIds = (membros ?? []).map((m: { user_id: string }) => m.user_id)
    return [...new Set([ctx.userId, ...memberIds])]
  }

  return [ctx.userId]
}

// Cheap role check by user_id — útil em endpoints onde já temos `user.id`
// e não precisamos do resto do contexto.
export async function isAdminViewer(userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('perfis')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.role === 'admin'
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
