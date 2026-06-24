// ============================================================
// Mapa Inteligente do Mercado — leitura de dados (server-side)
// ============================================================
// Usa o admin client (service_role) e SEMPRE filtra redistribuivel = true
// para nunca vazar dado licenciado (ANBIMA Feed / Coponto) ao usuário final.
// A RPC mercado_buscar já aplica o mesmo filtro internamente.
// ============================================================
import { createAdminClient } from '@/lib/supabase-server'
import { embedQuery } from '@/lib/ingestion/voyage-embeddings'
import type {
  Entidade, EntidadeBusca, PrestadorDeEntidade, ConexaoVizinha, MetricaSerie, EntidadeTipo, PerfilEntidade,
} from './types'

export interface BuscaParams {
  q?: string
  tipos?: EntidadeTipo[]
  uf?: string
  limit?: number
  offset?: number
}

export async function buscarEntidades(params: BuscaParams): Promise<EntidadeBusca[]> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('mercado_buscar', {
    p_q:      params.q?.trim() || null,
    p_tipos:  params.tipos && params.tipos.length ? params.tipos : null,
    p_uf:     params.uf || null,
    p_limit:  params.limit ?? 30,
    p_offset: params.offset ?? 0,
  })
  if (error) {
    console.error('[mapa-mercado] buscarEntidades erro:', error.message)
    return []
  }
  return (data ?? []) as EntidadeBusca[]
}

// Busca semântica (linguagem natural): embeda a pergunta e ranqueia por
// similaridade de cosseno. Retorna no mesmo formato da busca normal (rank =
// similaridade) para a UI reaproveitar a mesma lista.
export async function buscarSemantica(
  q: string,
  params: { tipos?: EntidadeTipo[]; uf?: string; limit?: number } = {},
): Promise<EntidadeBusca[]> {
  if (!q.trim()) return []
  let emb: number[]
  try {
    emb = await embedQuery(q.trim())
  } catch (e) {
    console.error('[mapa-mercado] embedQuery falhou:', e instanceof Error ? e.message : String(e))
    return []
  }
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('mercado_busca_semantica', {
    p_query_embedding: emb as unknown as string,
    p_tipos: params.tipos && params.tipos.length ? params.tipos : null,
    p_uf:    params.uf || null,
    p_limit: params.limit ?? 30,
    p_min:   0.3,
  })
  if (error) {
    console.error('[mapa-mercado] buscarSemantica erro:', error.message)
    return []
  }
  type Row = EntidadeBusca & { similaridade: number }
  return ((data ?? []) as Row[]).map(r => ({ ...r, rank: r.similaridade }))
}

// Registra uma busca IA executada (para o limite mensal mapa_buscas_ia_mes).
// Best-effort: nunca quebra a renderização da busca.
export async function registrarBuscaIa(
  escritorioId: string,
  userId: string,
  q: string,
  resultados: number,
): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('mapa_buscas_log').insert({
      escritorio_id: escritorioId,
      user_id:       userId,
      q:             q.slice(0, 300),
      resultados,
    })
  } catch (e) {
    console.error('[mapa-mercado] registrarBuscaIa falhou:', e instanceof Error ? e.message : String(e))
  }
}

export async function getEntidade(id: string): Promise<Entidade | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('mercado_entidades')
    .select('id, cnpj, razao_social, nome_fantasia, tipos, situacao, cnae, uf, municipio, fundada_em, website, logo_url, descricao, score_relevancia, fonte')
    .eq('id', id)
    .eq('redistribuivel', true)
    .maybeSingle()
  if (error) {
    console.error('[mapa-mercado] getEntidade erro:', error.message)
    return null
  }
  return (data as Entidade) ?? null
}

// Veículos em que a entidade atua (com o papel exercido) — base do perfil.
// Capado (default 500) para entidades com muitíssimos veículos (ex.: grandes
// administradores). O total real vem de contarVeiculosDaEntidade.
export async function getVeiculosDaEntidade(
  entidadeId: string,
  limit = 2000,
): Promise<PrestadorDeEntidade[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('mercado_veiculo_prestadores')
    .select('papel, veiculo:mercado_veiculos!inner(id, nome, tipo, categoria_cvm, situacao, redistribuivel)')
    .eq('entidade_id', entidadeId)
    .eq('ativo', true)
    .limit(limit)
  if (error) {
    console.error('[mapa-mercado] getVeiculosDaEntidade erro:', error.message)
    return []
  }
  type Row = { papel: string; veiculo: { id: string; nome: string; tipo: string; categoria_cvm: string | null; situacao: string | null; redistribuivel: boolean } | null }
  return ((data ?? []) as unknown as Row[])
    .filter(r => r.veiculo && r.veiculo.redistribuivel)
    .map(r => ({
      veiculo_id:        r.veiculo!.id,
      veiculo_nome:      r.veiculo!.nome,
      veiculo_tipo:      r.veiculo!.tipo as PrestadorDeEntidade['veiculo_tipo'],
      veiculo_categoria: r.veiculo!.categoria_cvm,
      veiculo_situacao:  r.veiculo!.situacao,
      papel:             r.papel as PrestadorDeEntidade['papel'],
    }))
}

export async function contarVeiculosDaEntidade(entidadeId: string): Promise<number> {
  const admin = createAdminClient()
  const { count } = await admin
    .from('mercado_veiculo_prestadores')
    .select('*', { count: 'exact', head: true })
    .eq('entidade_id', entidadeId)
    .eq('ativo', true)
  return count ?? 0
}

// Monta o "perfil de atuação" (tese derivada) a partir dos veículos da entidade.
export function montarPerfil(total: number, veiculos: PrestadorDeEntidade[]): PerfilEntidade {
  const contar = (arr: string[]) => {
    const m = new Map<string, number>()
    for (const v of arr) if (v) m.set(v, (m.get(v) ?? 0) + 1)
    return [...m.entries()].map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n)
  }
  const tipos = contar(veiculos.map(v => v.veiculo_tipo)).map(x => ({ tipo: x.k, n: x.n }))
  const papeis = contar(veiculos.map(v => v.papel)).map(x => ({ papel: x.k, n: x.n }))
  const cats = contar(veiculos.map(v => v.veiculo_categoria ?? '').filter(Boolean))
    .slice(0, 6).map(x => ({ categoria: x.k, n: x.n }))
  return { total_veiculos: total, por_tipo: tipos, por_papel: papeis, top_categorias: cats }
}

// Vizinhança no grafo de conexões (mapa de relacionamentos).
export async function getConexoes(entidadeId: string, limit = 20): Promise<ConexaoVizinha[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('mercado_conexoes')
    .select('tipo, peso, destino:mercado_entidades!mercado_conexoes_destino_id_fkey(id, razao_social, nome_fantasia, tipos, redistribuivel)')
    .eq('origem_id', entidadeId)
    .order('peso', { ascending: false })
    .limit(limit)
  if (error) {
    console.error('[mapa-mercado] getConexoes erro:', error.message)
    return []
  }
  type Row = { tipo: string; peso: number; destino: { id: string; razao_social: string; nome_fantasia: string | null; tipos: string[]; redistribuivel: boolean } | null }
  return ((data ?? []) as unknown as Row[])
    // Nunca expor entidade licenciada (redistribuivel=false) no grafo de conexões.
    .filter(r => r.destino && r.destino.redistribuivel !== false)
    .map(r => ({
      entidade_id: r.destino!.id,
      nome:        r.destino!.nome_fantasia || r.destino!.razao_social,
      tipos:       (r.destino!.tipos ?? []) as EntidadeTipo[],
      tipo:        r.tipo as ConexaoVizinha['tipo'],
      peso:        Number(r.peso),
    }))
}

export async function getMetricas(entidadeId: string): Promise<MetricaSerie[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('mercado_metricas')
    .select('metrica, competencia, valor, unidade')
    .eq('entidade_id', entidadeId)
    .eq('redistribuivel', true)
    .order('competencia', { ascending: true })
  if (error) {
    console.error('[mapa-mercado] getMetricas erro:', error.message)
    return []
  }
  return (data ?? []) as MetricaSerie[]
}

// Contadores para os cards do dashboard executivo.
export async function getResumoMercado(): Promise<{
  total: number
  porTipo: Record<string, number>
  veiculos: number
}> {
  const admin = createAdminClient()
  const [{ count: total }, { count: veiculos }, { data: tiposRows }] = await Promise.all([
    admin.from('mercado_entidades').select('*', { count: 'exact', head: true }).eq('redistribuivel', true),
    admin.from('mercado_veiculos').select('*', { count: 'exact', head: true }).eq('redistribuivel', true),
    admin.from('mercado_entidades').select('tipos').eq('redistribuivel', true).limit(5000),
  ])
  const porTipo: Record<string, number> = {}
  for (const row of (tiposRows ?? []) as { tipos: string[] }[]) {
    for (const t of row.tipos ?? []) porTipo[t] = (porTipo[t] ?? 0) + 1
  }
  return { total: total ?? 0, veiculos: veiculos ?? 0, porTipo }
}

// Números agregados para a página PÚBLICA do Mapa (prova social). Só dado
// redistribuível. Leve (4 counts head-only); use com ISR na page.
export async function getMapaPublicStats(): Promise<{
  participantes: number
  gestoras: number
  veiculos: number
  conexoes: number
}> {
  const admin = createAdminClient()
  const [p, g, v, c] = await Promise.all([
    admin.from('mercado_entidades').select('*', { count: 'exact', head: true }).eq('redistribuivel', true),
    admin.from('mercado_entidades').select('*', { count: 'exact', head: true }).eq('redistribuivel', true).contains('tipos', ['gestora']),
    admin.from('mercado_veiculos').select('*', { count: 'exact', head: true }).eq('redistribuivel', true),
    admin.from('mercado_conexoes').select('*', { count: 'exact', head: true }),
  ])
  return {
    participantes: p.count ?? 0,
    gestoras:      g.count ?? 0,
    veiculos:      v.count ?? 0,
    conexoes:      c.count ?? 0,
  }
}

// Top entidades por score de relevância (opcionalmente filtrado por tipo).
// Usado no dashboard quando ainda não há snapshot em mercado_rankings.
export async function getTopEntidades(
  tipo?: EntidadeTipo,
  limit = 8,
): Promise<{ id: string; nome: string; score: number | null; num_veiculos: number }[]> {
  const admin = createAdminClient()
  let query = admin
    .from('mercado_entidades')
    .select('id, razao_social, nome_fantasia, score_relevancia')
    .eq('redistribuivel', true)
    .order('score_relevancia', { ascending: false, nullsFirst: false })
    .limit(limit)
  if (tipo) query = query.contains('tipos', [tipo])
  const { data, error } = await query
  if (error) {
    console.error('[mapa-mercado] getTopEntidades erro:', error.message)
    return []
  }
  type Row = { id: string; razao_social: string; nome_fantasia: string | null; score_relevancia: number | null }
  const rows = (data ?? []) as Row[]
  // Conta veículos por entidade (uma chamada por entidade do top — lista curta).
  const out = await Promise.all(rows.map(async r => {
    const { count } = await admin
      .from('mercado_veiculo_prestadores')
      .select('*', { count: 'exact', head: true })
      .eq('entidade_id', r.id)
    return { id: r.id, nome: r.nome_fantasia || r.razao_social, score: r.score_relevancia, num_veiculos: count ?? 0 }
  }))
  return out
}

// Alvos de captação a partir do mandato de um deal: gestoras que já operam
// aqueles tipos de veículo, rankeadas por experiência. Motor de originação.
export interface AlvoCaptacao {
  entidade_id: string
  razao_social: string
  nome_fantasia: string | null
  tipos: EntidadeTipo[]
  uf: string | null
  score_relevancia: number | null
  veiculos_no_mandato: number
  total_veiculos: number
}

export async function getAlvosCaptacao(
  tiposVeiculo: string[],
  opts: { uf?: string; limit?: number; papeis?: string[] } = {},
): Promise<AlvoCaptacao[]> {
  if (!tiposVeiculo.length) return []
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('mercado_alvos_captacao', {
    p_tipos_veiculo: tiposVeiculo,
    p_papeis:        opts.papeis ?? ['gestor'],
    p_uf:            opts.uf ?? null,
    p_limit:         opts.limit ?? 15,
  })
  if (error) {
    console.error('[mapa-mercado] getAlvosCaptacao erro:', error.message)
    return []
  }
  return (data ?? []) as AlvoCaptacao[]
}

// ─── Ficha do Veículo ────────────────────────────────────────────────────────

export interface VeiculoDetalhe {
  id: string
  cnpj: string | null
  codigo_cvm: string | null
  nome: string
  tipo: string
  categoria_cvm: string | null
  classe_anbima: string | null
  situacao: string | null
  esg: boolean | null
  fonte: string
}

export interface PrestadorDoVeiculo {
  entidade_id: string
  nome: string
  tipos: EntidadeTipo[]
  papel: string
  uf: string | null
}

export async function getVeiculo(id: string): Promise<VeiculoDetalhe | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('mercado_veiculos')
    .select('id, cnpj, codigo_cvm, nome, tipo, categoria_cvm, classe_anbima, situacao, esg, fonte')
    .eq('id', id)
    .eq('redistribuivel', true)
    .maybeSingle()
  if (error) {
    console.error('[mapa-mercado] getVeiculo erro:', error.message)
    return null
  }
  return (data as VeiculoDetalhe) ?? null
}

export async function getPrestadoresDoVeiculo(veiculoId: string): Promise<PrestadorDoVeiculo[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('mercado_veiculo_prestadores')
    .select('papel, entidade:mercado_entidades!inner(id, razao_social, nome_fantasia, tipos, uf, redistribuivel)')
    .eq('veiculo_id', veiculoId)
    .eq('ativo', true)
  if (error) {
    console.error('[mapa-mercado] getPrestadoresDoVeiculo erro:', error.message)
    return []
  }
  type Row = { papel: string; entidade: { id: string; razao_social: string; nome_fantasia: string | null; tipos: string[]; uf: string | null; redistribuivel: boolean } | null }
  return ((data ?? []) as unknown as Row[])
    .filter(r => r.entidade && r.entidade.redistribuivel !== false)
    .map(r => ({
      entidade_id: r.entidade!.id,
      nome:        r.entidade!.nome_fantasia || r.entidade!.razao_social,
      tipos:       (r.entidade!.tipos ?? []) as EntidadeTipo[],
      papel:       r.papel,
      uf:          r.entidade!.uf,
    }))
}

export async function getRanking(chave: string, limit = 10): Promise<
  { posicao: number; valor: number | null; entidade_id: string; nome: string }[]
> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('mercado_rankings')
    .select('posicao, valor, entidade:mercado_entidades!inner(id, razao_social, nome_fantasia)')
    .eq('chave', chave)
    .order('posicao', { ascending: true })
    .limit(limit)
  if (error) {
    console.error('[mapa-mercado] getRanking erro:', error.message)
    return []
  }
  type Row = { posicao: number; valor: number | null; entidade: { id: string; razao_social: string; nome_fantasia: string | null } | null }
  return ((data ?? []) as unknown as Row[])
    .filter(r => r.entidade)
    .map(r => ({
      posicao:     r.posicao,
      valor:       r.valor,
      entidade_id: r.entidade!.id,
      nome:        r.entidade!.nome_fantasia || r.entidade!.razao_social,
    }))
}
