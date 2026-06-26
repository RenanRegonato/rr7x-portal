/**
 * Queries para o Mapa Inteligente do Mercado
 * 
 * Todas as queries filtram redistribuivel = true por padrão (governança de licença)
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { MercadoEntidade, MercadoVeiculo } from './types'

let _supabase: SupabaseClient | null = null
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )
  }
  return _supabase
}
const supabase = new Proxy({} as SupabaseClient, {
  get(_t, prop) { return getSupabase()[prop as keyof SupabaseClient] },
})

interface SearchParams {
  q?: string
  tipos?: string[]
  uf?: string
  limit?: number
  offset?: number
}

/**
 * Busca unificada de entidades
 */
export async function searchEntidades(params: SearchParams): Promise<{
  entidades: MercadoEntidade[]
  total: number
}> {
  const { q = '', tipos = [], uf = '', limit = 20, offset = 0 } = params

  let query = supabase
    .from('mercado_entidades')
    .select('*', { count: 'exact' })
    .eq('redistribuivel', true)

  if (q) {
    query = query.textSearch('busca_tsv', q)
  }

  if (tipos.length > 0) {
    query = query.overlaps('tipos', tipos)
  }

  if (uf) {
    query = query.eq('uf', uf)
  }

  const { data, count, error } = await query
    .order('score_relevancia', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1)

  if (error) throw error

  return {
    entidades: data as MercadoEntidade[],
    total: count || 0,
  }
}

/**
 * Busca de veículos
 */
export async function searchVeiculos(params: SearchParams & { tipo?: string }): Promise<{
  veiculos: MercadoVeiculo[]
  total: number
}> {
  const { q = '', tipo = '', limit = 20, offset = 0 } = params

  let query = supabase
    .from('mercado_veiculos')
    .select('*', { count: 'exact' })
    .eq('redistribuivel', true)

  if (q) {
    query = query.ilike('nome', `%${q}%`)
  }

  if (tipo) {
    query = query.eq('tipo', tipo)
  }

  const { data, count, error } = await query
    .order('atualizado_em', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error

  return {
    veiculos: data as MercadoVeiculo[],
    total: count || 0,
  }
}

/**
 * Ficha completa da entidade
 */
export async function getEntidadeCompleta(entidade_id: string) {
  const { data: entidade, error: e1 } = await supabase
    .from('mercado_entidades')
    .select('*')
    .eq('id', entidade_id)
    .eq('redistribuivel', true)
    .single()

  if (e1) throw e1

  const { data: veiculos, error: e2 } = await supabase
    .from('mercado_veiculo_prestadores')
    .select('veiculo_id, papel, ativo, mercado_veiculos!inner(id, nome, tipo, situacao, categoria_cvm)')
    .eq('entidade_id', entidade_id)
    .order('ativo', { ascending: false })
    .limit(1000)

  if (e2) throw e2

  const { data: metricas, error: e3 } = await supabase
    .from('mercado_metricas')
    .select('*')
    .eq('entidade_id', entidade_id)
    .eq('redistribuivel', true)
    .order('competencia', { ascending: false })
    .limit(24)

  if (e3) throw e3

  return {
    entidade,
    veiculos,
    metricas,
  }
}

/**
 * Ficha do veículo
 */
export async function getVeiculoCompleto(veiculo_id: string) {
  const { data: veiculo, error: e1 } = await supabase
    .from('mercado_veiculos')
    .select('*')
    .eq('id', veiculo_id)
    .eq('redistribuivel', true)
    .single()

  if (e1) throw e1

  const { data: prestadores, error: e2 } = await supabase
    .from('mercado_veiculo_prestadores')
    .select(`
      papel,
      mercado_entidades (
        id, razao_social, nome_fantasia, cnpj, tipos, score_relevancia
      )
    `)
    .eq('veiculo_id', veiculo_id)

  if (e2) throw e2

  const { data: metricas, error: e3 } = await supabase
    .from('mercado_metricas')
    .select('*')
    .eq('veiculo_id', veiculo_id)
    .eq('redistribuivel', true)
    .order('competencia', { ascending: false })
    .limit(24)

  if (e3) throw e3

  return {
    veiculo,
    prestadores,
    metricas,
  }
}

/**
 * Rankings proprietários
 */
export async function getRankings(ranking_key: string, limit = 20) {
  const { data, error } = await supabase
    .from('mercado_rankings')
    .select(`
      position, value,
      mercado_entidades (
        id, razao_social, nome_fantasia, logo_url, score_relevancia
      )
    `)
    .eq('ranking_key', ranking_key)
    .order('position', { ascending: true })
    .limit(limit)

  if (error) throw error

  return data
}

/**
 * Stats do dashboard
 */
export async function getMapaDashboardStats() {
  const { data: gestoras, error: e1 } = await supabase
    .from('mercado_entidades')
    .select('id', { count: 'exact' })
    .eq('redistribuivel', true)
    .contains('tipos', ['gestora'])

  const { data: fidcs, error: e2 } = await supabase
    .from('mercado_veiculos')
    .select('id', { count: 'exact' })
    .eq('redistribuivel', true)
    .eq('tipo', 'FIDC')

  const { data: securitizadoras, error: e3 } = await supabase
    .from('mercado_entidades')
    .select('id', { count: 'exact' })
    .eq('redistribuivel', true)
    .contains('tipos', ['securitizadora'])

  const errors = [e1, e2, e3].filter(e => e)
  if (errors.length > 0) throw errors[0]

  return {
    total_gestoras: gestoras?.[0] || 0,
    total_fidcs: fidcs?.[0] || 0,
    total_securitizadoras: securitizadoras?.[0] || 0,
  }
}

/**
 * Aliases e exports adicionais para compatibilidade
 */
export const buscarEntidades = searchEntidades
export const buscarSemantica = searchEntidades  // TODO: Implementar busca semântica com pgvector
export const getEntidade = getEntidadeCompleta
export const getVeiculosDaEntidade = (id: string) => getEntidadeCompleta(id).then(r => r.veiculos)
export const getConexoes = getEntidadeCompleta  // TODO: Implementar grafo de conexões
export const getMetricas = (id: string) => getEntidadeCompleta(id).then(r => r.metricas)
export const registrarBuscaIa = async () => {} // TODO: Implementar logging de buscas
export const contarVeiculosDaEntidade = async (id: string) => {
  const { veiculos } = await getEntidadeCompleta(id)
  return veiculos?.length ?? 0
}

export const montarPerfil = getEntidadeCompleta // TODO: Implementar perfil completo
export const getVeiculo = getVeiculoCompleto
export const getPrestadoresDoVeiculo = (id: string) => getVeiculoCompleto(id).then(r => r.prestadores ?? [])
export const getResumoMercado = getMapaDashboardStats
export const getTopEntidades = (tipo?: string, limit = 10) => getRankings(tipo ?? 'gestoras', limit).then(r => (r as any).rankings ?? r ?? [])

export async function getMapaPublicStats(): Promise<{
  participantes: number
  gestoras: number
  veiculos: number
  conexoes: number
}> {
  const [p, g, v, c] = await Promise.all([
    supabase.from('mercado_entidades').select('*', { count: 'exact', head: true }).eq('redistribuivel', true),
    supabase.from('mercado_entidades').select('*', { count: 'exact', head: true }).eq('redistribuivel', true).contains('tipos', ['gestora']),
    supabase.from('mercado_veiculos').select('*', { count: 'exact', head: true }).eq('redistribuivel', true),
    supabase.from('mercado_conexoes').select('*', { count: 'exact', head: true }),
  ])
  return {
    participantes: p.count ?? 0,
    gestoras:      g.count ?? 0,
    veiculos:      v.count ?? 0,
    conexoes:      c.count ?? 0,
  }
}
