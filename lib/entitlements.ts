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
