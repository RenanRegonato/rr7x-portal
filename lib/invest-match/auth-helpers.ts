// Helpers de auth/autorização do módulo Invest Match.
// Centraliza resolução de escritorio_id (multi-tenant) usado por:
//   - builder.ts (from-analise)
//   - rotas /api/invest-match/*

import { createAdminClient } from '@/lib/supabase-server'

/**
 * Resolve o escritorio_id do usuário logado.
 * Ordem de busca:
 *   1) escritorios.user_id (dono direto — único por user)
 *   2) perfis.escritorio_id (membro de uma equipe)
 *
 * Retorna null se o usuário ainda não tem escritório cadastrado.
 */
export async function resolveEscritorioId(userId: string): Promise<string | null> {
  const admin = createAdminClient()

  const { data: owner } = await admin
    .from('escritorios')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  if (owner?.id) return owner.id

  const { data: perfil } = await admin
    .from('perfis')
    .select('escritorio_id')
    .eq('user_id', userId)
    .maybeSingle()
  return perfil?.escritorio_id ?? null
}
