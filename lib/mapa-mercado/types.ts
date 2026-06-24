// ============================================================
// Mapa Inteligente do Mercado — tipos compartilhados
// ============================================================

export type EntidadeTipo =
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

export type VeiculoTipo =
  | 'FIDC' | 'FII' | 'FIP' | 'FIF' | 'ETF' | 'FIAGRO' | 'OFFSHORE'
  | 'CRI' | 'CRA' | 'debenture' | 'CCB' | 'fundo_geral'

export type PrestadorPapel =
  | 'administrador' | 'gestor' | 'co_gestor' | 'distribuidor' | 'custodiante' | 'controladoria'

export type ConexaoTipo = 'co_servico' | 'co_investimento' | 'distribui_para' | 'mesmo_grupo'

// Rótulos PT-BR para a UI (canônico → apresentação)
export const TIPO_LABEL: Record<EntidadeTipo, string> = {
  gestora:                         'Gestora',
  administrador:                   'Administrador',
  distribuidor:                    'Distribuidor',
  custodiante:                     'Custodiante',
  controladoria:                   'Controladoria',
  banco:                           'Banco',
  securitizadora:                  'Securitizadora',
  escritorio_credito_estruturado:  'Escritório de Crédito Estruturado',
  boutique_investimento:           'Boutique de Investimento',
  family_office:                   'Family Office',
  asset:                           'Asset',
  consultoria:                     'Consultoria',
  plataforma:                      'Plataforma',
}

export const PAPEL_LABEL: Record<PrestadorPapel, string> = {
  administrador: 'Administrador',
  gestor:        'Gestor',
  co_gestor:     'Co-gestor',
  distribuidor:  'Distribuidor',
  custodiante:   'Custodiante',
  controladoria: 'Controladoria',
}

export const CONEXAO_LABEL: Record<ConexaoTipo, string> = {
  co_servico:      'Co-serviço',
  co_investimento: 'Co-investimento',
  distribui_para:  'Distribui para',
  mesmo_grupo:     'Mesmo grupo',
}

export interface EntidadeBusca {
  id: string
  razao_social: string
  nome_fantasia: string | null
  tipos: EntidadeTipo[]
  uf: string | null
  municipio: string | null
  logo_url: string | null
  score_relevancia: number | null
  fonte: string
  num_veiculos: number
  rank: number
}

export interface Entidade {
  id: string
  cnpj: string | null
  razao_social: string
  nome_fantasia: string | null
  tipos: EntidadeTipo[]
  situacao: string | null
  cnae: string | null
  uf: string | null
  municipio: string | null
  fundada_em: string | null
  website: string | null
  logo_url: string | null
  descricao: string | null
  score_relevancia: number | null
  fonte: string
}

export interface PrestadorDeEntidade {
  veiculo_id: string
  veiculo_nome: string
  veiculo_tipo: VeiculoTipo
  veiculo_categoria: string | null
  veiculo_situacao: string | null
  papel: PrestadorPapel
}

const SITUACOES_ENCERRADAS = new Set(['CANCELADA', 'LIQUIDADA', 'ENCERRADA', 'CANCELADO', 'LIQUIDADO', 'ENCERRADO'])
export function veiculoEncerrado(situacao: string | null): boolean {
  return !!situacao && SITUACOES_ENCERRADAS.has(situacao.toUpperCase())
}

// Perfil derivado (a "tese de atuação") de uma entidade, a partir dos veículos
// em que atua e dos papéis exercidos. Sem fonte externa — calculado dos dados.
export interface PerfilEntidade {
  total_veiculos: number
  por_tipo: { tipo: string; n: number }[]
  por_papel: { papel: string; n: number }[]
  top_categorias: { categoria: string; n: number }[]
}

export interface ConexaoVizinha {
  entidade_id: string
  nome: string
  tipos: EntidadeTipo[]
  tipo: ConexaoTipo
  peso: number
}

export interface MetricaSerie {
  metrica: string
  competencia: string
  valor: number | null
  unidade: string | null
}
