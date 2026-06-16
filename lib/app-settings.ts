import type { SupabaseClient } from '@supabase/supabase-js'

// Leitura da flag de manutenção a partir de `app_settings`. Roda no middleware
// (Edge), então: (1) recebe o client já criado lá, sem instanciar outro;
// (2) cacheia em memória por TTL curto para não consultar o banco a cada request;
// (3) é fail-open — qualquer erro de leitura NÃO derruba o site.

export interface Maintenance {
  enabled: boolean
  message: string
}

const OFF: Maintenance = { enabled: false, message: '' }
const TTL_MS = 30_000

let cache: { value: Maintenance; at: number } | null = null

export async function getMaintenance(supabase: SupabaseClient): Promise<Maintenance> {
  const now = Date.now()
  if (cache && now - cache.at < TTL_MS) return cache.value
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'maintenance')
      .maybeSingle()
    if (error) throw error
    const value = (data?.value as Maintenance | undefined) ?? OFF
    cache = { value, at: now }
    return value
  } catch {
    // Fail-open: mantém o último valor conhecido ou assume "desligado".
    return cache?.value ?? OFF
  }
}
