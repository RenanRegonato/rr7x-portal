// Helpers de auth/autorização do módulo Adequação à Reforma Tributária (Ferrante).
// Mesmo padrão do Invest Match: gating premium por flag booleano no escritório,
// controlado pelo gestor master do Mandor (admin).

import { createAdminClient } from '@/lib/supabase-server'
// resolveEscritorioId é genérico (resolução de tenant), reutilizado entre módulos.
import { resolveEscritorioId } from '@/lib/invest-match/auth-helpers'

export { resolveEscritorioId }

/**
 * O escritório contratou o módulo Adequação à Reforma Tributária (premium)?
 * Flag controlada exclusivamente pelo gestor master do Mandor (admin).
 */
export async function isReformaTributariaEnabled(escritorioId: string | null): Promise<boolean> {
  if (!escritorioId) return false
  const admin = createAdminClient()
  const { data } = await admin
    .from('escritorios')
    .select('reforma_tributaria_enabled')
    .eq('id', escritorioId)
    .maybeSingle()
  return data?.reforma_tributaria_enabled === true
}

export type ReformaTributariaGate =
  | { ok: true;  escritorioId: string }
  | { ok: false; status: number; error: string }

/**
 * Gate único para as rotas/ações do módulo.
 * - Gestor master do Mandor (role=admin): acesso irrestrito.
 * - Demais usuários: só passam se o escritório tiver o módulo habilitado.
 */
export async function gateReformaTributaria(userId: string): Promise<ReformaTributariaGate> {
  const escritorioId = await resolveEscritorioId(userId)
  if (!escritorioId) {
    return { ok: false, status: 409, error: 'Usuário sem escritório cadastrado' }
  }

  const admin = createAdminClient()
  const { data: perfil } = await admin
    .from('perfis')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle()
  if (perfil?.role === 'admin') return { ok: true, escritorioId }

  if (!(await isReformaTributariaEnabled(escritorioId))) {
    return {
      ok: false,
      status: 403,
      error: 'Módulo Adequação à Reforma Tributária não habilitado para este escritório.',
    }
  }
  return { ok: true, escritorioId }
}
