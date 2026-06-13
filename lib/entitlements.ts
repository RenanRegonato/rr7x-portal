// ============================================================
// Entitlements — acesso ao banco (server)
// ============================================================
// Camada única para perguntar "este escritório tem direito a X?".
// Lê a linha do escritório e resolve preset + overrides (lib/entitlements-presets).
// Pode substituir gradualmente isInvestMatchEnabled / isReformaTributariaEnabled.
import { createAdminClient } from '@/lib/supabase-server'
import { resolveEntitlements, type Entitlements, type ModuloKey, type LimiteKey } from '@/lib/entitlements-presets'

export async function getEntitlements(escritorioId: string | null): Promise<Entitlements | null> {
  if (!escritorioId) return null
  const admin = createAdminClient()
  const { data } = await admin
    .from('escritorios')
    .select('plano, preco_mensal_brl, entitlements, invest_match_enabled, reforma_tributaria_enabled')
    .eq('id', escritorioId)
    .maybeSingle()
  if (!data) return null
  return resolveEntitlements(data)
}

export async function hasModulo(escritorioId: string | null, modulo: ModuloKey): Promise<boolean> {
  const ent = await getEntitlements(escritorioId)
  return ent?.modulos[modulo] === true
}

export async function getLimite(escritorioId: string | null, limite: LimiteKey): Promise<number | null> {
  const ent = await getEntitlements(escritorioId)
  return ent ? ent.limites[limite] : null
}

export interface UsuariosUsage {
  count: number       // total de perfis vinculados ao escritório (inclui o gerente)
  max: number | null  // limite usuarios_max do plano (null = ilimitado)
  atLimit: boolean    // já atingiu/excedeu o limite
}

// Uso de assentos do escritório vs. o limite usuarios_max do plano.
// Conta perfis já provisionados (convites pendentes criam perfil), evitando
// burlar o limite disparando vários convites de uma vez.
export async function getUsuariosUsage(escritorioId: string | null): Promise<UsuariosUsage> {
  const ent = await getEntitlements(escritorioId)
  const max = ent ? ent.limites.usuarios_max : null
  if (!escritorioId) return { count: 0, max, atLimit: false }
  const admin = createAdminClient()
  const { count } = await admin
    .from('perfis')
    .select('*', { count: 'exact', head: true })
    .eq('escritorio_id', escritorioId)
  const c = count ?? 0
  return { count: c, max, atLimit: max != null && c >= max }
}

export interface LimiteUsage {
  count: number       // uso no período corrente
  max: number | null  // limite do plano (null = ilimitado)
  atLimit: boolean
}

// Buscas IA no Mapa feitas pelo escritório no mês corrente vs. mapa_buscas_ia_mes.
// A contagem mensal (fuso America/Sao_Paulo) fica na RPC mercado_buscas_ia_mes_count.
// Fail-open: se a tabela/RPC ainda não existir, count=0 (não bloqueia a busca).
export async function getMapaBuscasIaUsage(escritorioId: string | null): Promise<LimiteUsage> {
  const ent = await getEntitlements(escritorioId)
  const max = ent ? ent.limites.mapa_buscas_ia_mes : null
  if (!escritorioId) return { count: 0, max, atLimit: false }
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('mercado_buscas_ia_mes_count', { p_escritorio_id: escritorioId })
  if (error) {
    console.error('[entitlements] mercado_buscas_ia_mes_count falhou:', error.message)
    return { count: 0, max, atLimit: false }
  }
  const c = typeof data === 'number' ? data : 0
  return { count: c, max, atLimit: max != null && c >= max }
}
