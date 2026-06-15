// ============================================================
// Entitlements — presets de plano + resolução (puro, sem import de servidor)
// ============================================================
// Este arquivo NÃO importa nada de servidor (pode ser usado em client e server).
// O acesso ao banco fica em lib/entitlements.ts.

export type Plano = 'essential' | 'professional' | 'enterprise'
export type Suporte = 'padrao' | 'prioritario' | 'dedicado'

export type ModuloKey =
  | 'reforma_tributaria'
  | 'invest_match'
  | 'invest_match_rede'
  | 'mapa_completo'
  | 'aprendizados'
  | 'monitoramento'
  | 'api'
  | 'sso'

// Volume de análises é controlado pelo PACOTE de créditos (tabela `pacotes`),
// não por um teto mensal de plano — por isso não há `analises_mes` aqui.
export type LimiteKey =
  | 'usuarios_max'
  | 'regeneracoes_por_analise'
  | 'mapa_buscas_ia_mes'

export interface Entitlements {
  plano: Plano
  modulos: Record<ModuloKey, boolean>
  limites: Record<LimiteKey, number | null> // null = ilimitado
  suporte: Suporte
  preco_mensal_brl: number | null
}

export const MODULO_LABEL: Record<ModuloKey, string> = {
  reforma_tributaria: 'Reforma Tributária',
  invest_match:       'Invest Match',
  invest_match_rede:  'Invest Match em Rede + API',
  mapa_completo:      'Mapa do Mercado — completo (IA, grafo, alvos)',
  aprendizados:       'Aprendizados do escritório',
  monitoramento:      'Monitoramento contínuo de deals',
  api:                'API e integrações',
  sso:                'SSO / governança avançada',
}

export const LIMITE_LABEL: Record<LimiteKey, string> = {
  usuarios_max:             'Usuários (máximo)',
  regeneracoes_por_analise: 'Regenerações por análise',
  mapa_buscas_ia_mes:       'Buscas IA no Mapa por mês',
}

export const MODULO_KEYS = Object.keys(MODULO_LABEL) as ModuloKey[]
export const LIMITE_KEYS = Object.keys(LIMITE_LABEL) as LimiteKey[]

// Presets de cada plano (valores de referência; o admin pode sobrescrever).
export const PRESETS: Record<Plano, Omit<Entitlements, 'plano' | 'preco_mensal_brl'> & { preco_mensal_brl: number | null }> = {
  essential: {
    modulos: { reforma_tributaria: false, invest_match: false, invest_match_rede: false, mapa_completo: false, aprendizados: false, monitoramento: true, api: false, sso: false },
    limites: { usuarios_max: 3, regeneracoes_por_analise: 3, mapa_buscas_ia_mes: 0 },
    suporte: 'padrao',
    preco_mensal_brl: 1490,
  },
  professional: {
    modulos: { reforma_tributaria: true, invest_match: true, invest_match_rede: false, mapa_completo: true, aprendizados: true, monitoramento: true, api: false, sso: false },
    limites: { usuarios_max: 17, regeneracoes_por_analise: 3, mapa_buscas_ia_mes: 200 },
    suporte: 'prioritario',
    preco_mensal_brl: 3900,
  },
  enterprise: {
    modulos: { reforma_tributaria: true, invest_match: true, invest_match_rede: true, mapa_completo: true, aprendizados: true, monitoramento: true, api: true, sso: true },
    limites: { usuarios_max: null, regeneracoes_por_analise: 5, mapa_buscas_ia_mes: null },
    suporte: 'dedicado',
    preco_mensal_brl: 9900,
  },
}

export const PLANO_LABEL: Record<Plano, string> = {
  essential:    'Essential',
  professional: 'Professional',
  enterprise:   'Enterprise',
}

// Linha do escritório (subset relevante) para resolver entitlements.
export interface EscritorioEntitlementRow {
  plano?: string | null
  preco_mensal_brl?: number | null
  entitlements?: Partial<{ modulos: Partial<Record<ModuloKey, boolean>>; limites: Partial<Record<LimiteKey, number | null>>; suporte: Suporte }> | null
  invest_match_enabled?: boolean | null
  reforma_tributaria_enabled?: boolean | null
}

/**
 * Resolve os entitlements efetivos: preset do plano + overrides do escritório,
 * com fallback nas flags antigas (para escritórios ainda não migrados).
 */
export function resolveEntitlements(row: EscritorioEntitlementRow): Entitlements {
  const plano = (['essential', 'professional', 'enterprise'].includes(row.plano ?? '') ? row.plano : 'essential') as Plano
  const preset = PRESETS[plano]
  const ov = row.entitlements ?? {}

  const modulos = { ...preset.modulos, ...(ov.modulos ?? {}) } as Record<ModuloKey, boolean>
  // Fallback de compatibilidade: se o override não definiu explicitamente e a
  // flag antiga está ligada, respeita a flag antiga.
  if (ov.modulos?.invest_match === undefined && row.invest_match_enabled === true) modulos.invest_match = true
  if (ov.modulos?.reforma_tributaria === undefined && row.reforma_tributaria_enabled === true) modulos.reforma_tributaria = true

  const limites = { ...preset.limites, ...(ov.limites ?? {}) } as Record<LimiteKey, number | null>
  const suporte = ov.suporte ?? preset.suporte

  return { plano, modulos, limites, suporte, preco_mensal_brl: row.preco_mensal_brl ?? preset.preco_mensal_brl }
}
