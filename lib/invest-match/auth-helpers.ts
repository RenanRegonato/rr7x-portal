// Helpers de auth/autorização do módulo Invest Match.
// Centraliza resolução de escritorio_id (multi-tenant) usado por:
//   - builder.ts (from-analise)
//   - rotas /api/invest-match/*

import { createAdminClient } from '@/lib/supabase-server'
import { hasModulo } from '@/lib/entitlements'

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

/**
 * O escritório contratou o módulo Invest Match?
 * Resolve via entitlements (preset do plano + overrides), com fallback na flag
 * antiga invest_match_enabled (escritórios ainda não migrados). Configurado
 * pelo Gestor Geral em Admin → Planos & Acessos.
 */
export async function isInvestMatchEnabled(escritorioId: string | null): Promise<boolean> {
  return hasModulo(escritorioId, 'invest_match')
}

export type InvestMatchGate =
  | { ok: true;  escritorioId: string }
  | { ok: false; status: number; error: string }

/**
 * Gate único para as rotas de API do Invest Match.
 * Resolve o escritório do usuário e verifica o entitlement Plus.
 * - Gestor master do Mandor (role=admin): acesso irrestrito ao módulo.
 * - Demais usuários: só passam se o escritório tiver o Plus habilitado.
 */
export async function gateInvestMatch(userId: string): Promise<InvestMatchGate> {
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

  if (!(await isInvestMatchEnabled(escritorioId))) {
    return {
      ok: false,
      status: 403,
      error: 'Módulo Invest Match (Plus) não habilitado para este escritório.',
    }
  }
  return { ok: true, escritorioId }
}
