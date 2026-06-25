/**
 * Tipos para o Mapa Inteligente do Mercado
 * Schema mercado.* — participantes, veículos, métricas, rankings
 */

export type TipoEntidade =
  | 'gestora'
  | 'administrador'
  | 'distribuidor'
  | 'custodiante'
  | 'controladoria'
  | 'banco'
  | 'securitizadora'
  | 'escritorio_credito_estruturado'
  | 'boutique_investimento'
  | 'family_office'
  | 'asset'
  | 'consultoria'
  | 'plataforma'

export type TipoVeiculo =
  | 'FIDC'
  | 'FII'
  | 'FIP'
  | 'FIF'
  | 'ETF'
  | 'FIAGRO'
  | 'OFFSHORE'
  | 'CRI'
  | 'CRA'
  | 'debenture'
  | 'CCB'
  | 'fundo_geral'

export type PapelPrestador =
  | 'administrador'
  | 'gestor'
  | 'co_gestor'
  | 'distribuidor'
  | 'custodiante'
  | 'controladoria'

export type MetricaType =
  | 'pl'
  | 'captacao'
  | 'resgate'
  | 'cotistas'
  | 'carteira_pj'
  | 'aum'
  | 'num_veiculos'

export type FonteDado =
  | 'cvm'
  | 'bcb'
  | 'b3'
  | 'receita'
  | 'anbima_feed'
  | 'coponto'
  | 'seed'
  | 'manual'

export interface MercadoEntidade {
  id: string
  cnpj: string | null
  razao_social: string
  nome_fantasia: string | null
  tipos: TipoEntidade[]
  situacao: string | null
  cnae: string | null
  uf: string | null
  municipio: string | null
  fundada_em: string | null
  website: string | null
  logo_url: string | null
  descricao: string | null
  score_relevancia: number | null
  fonte: FonteDado
  redistribuivel: boolean
  raw: Record<string, unknown> | null
  visto_em: string
  criado_em: string
  atualizado_em: string
}

export interface MercadoVeiculo {
  id: string
  cnpj: string | null
  codigo_anbima: string | null
  codigo_cvm: string | null
  nome: string
  tipo: TipoVeiculo
  categoria_cvm: string | null
  classe_anbima: string | null
  situacao: string | null
  esg: boolean | null
  fonte: FonteDado
  redistribuivel: boolean
  raw: Record<string, unknown> | null
  criado_em: string
  atualizado_em: string
}

export interface MercadoMetrica {
  id: string
  entidade_id: string | null
  veiculo_id: string | null
  metrica: MetricaType
  competencia: string
  valor: number | null
  unidade: string | null
  fonte: FonteDado
  redistribuivel: boolean
  criado_em: string
}

export interface IngestionRun {
  id: string
  fonte: FonteDado
  dataset: string
  status: 'running' | 'completed' | 'failed'
  rows_in: number | null
  rows_upserted: number | null
  rows_failed: number | null
  competencia: string | null
  error_message: string | null
  started_at: string
  finished_at: string | null
}

/**
 * DTOs para ETL
 */

export interface CvmFundoCadastro {
  cnpj: string
  codigo_anbima: string
  razao_social: string
  nome_comercial: string
  tipo: TipoVeiculo
  categoria_cvm: string
  classe_anbima: string
  situacao: string
  administrador_cnpj: string
  administrador_nome: string
  gestor_cnpj: string
  gestor_nome: string
}

export interface CvmFidcInformeMensal {
  competencia: string
  fundo_cnpj: string
  fundo_nome: string
  pl_total: number
  captacao_mes: number
  resgate_mes: number
  num_cotistas: number
  num_cedentes: number
  num_sacados: number
}

export interface BcbIfDataCarteira {
  banco_cnpj: string
  banco_nome: string
  data_referencia: string
  modalidade_credito: string
  uf: string
  saldo_pj: number
}

/**
 * Resultado de operação de upsert
 */
export interface UpsertResult {
  rows_inserted: number
  rows_updated: number
  rows_failed: number
  errors: string[]
}

/**
 * Labels e constantes para export
 */
export const TIPO_LABEL: Record<TipoEntidade, string> = {
  gestora: 'Gestora',
  administrador: 'Administrador',
  distribuidor: 'Distribuidor',
  custodiante: 'Custodiante',
  controladoria: 'Controladoria',
  banco: 'Banco',
  securitizadora: 'Securitizadora',
  escritorio_credito_estruturado: 'Escritório de Crédito Estruturado',
  boutique_investimento: 'Boutique de Investimento',
  family_office: 'Family Office',
  asset: 'Asset',
  consultoria: 'Consultoria',
  plataforma: 'Plataforma',
}

export const PAPEL_LABEL: Record<PapelPrestador, string> = {
  administrador: 'Administrador',
  gestor: 'Gestor',
  co_gestor: 'Co-Gestor',
  distribuidor: 'Distribuidor',
  custodiante: 'Custodiante',
  controladoria: 'Controladoria',
}

export const CONEXAO_LABEL: Record<string, string> = {
  co_servico: 'Co-serviço',
  co_investimento: 'Co-investimento',
  distribui_para: 'Distribui para',
  mesmo_grupo: 'Mesmo grupo',
}

export function veiculoEncerrado(veiculo: MercadoVeiculo): boolean {
  return veiculo.situacao === 'cancelada' || veiculo.situacao === 'encerrada'
}

// Aliases para compatibilidade
export type EntidadeTipo = TipoEntidade
export interface ConexaoVizinha {
  entidade: MercadoEntidade
  tipo: string
  força: number
}
