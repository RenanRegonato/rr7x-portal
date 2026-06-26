/**
 * Calculadora de Completude Documental
 *
 * Compara os documentos enviados numa análise contra o checklist esperado
 * para o pilar e tipo de ativo, retornando o percentual de completude e
 * o status de cada item.
 *
 * Pesos: critico=3, alto=2, recomendado=1
 * Percentual = (soma dos pesos encontrados) / (soma dos pesos esperados) * 100
 */

import { TODOS_DOCS, type ItemChecklist, type PilarOperacao, type SeveridadeDoc } from './checklist'

export interface DocEnviado {
  nome: string
  status: 'processing' | 'completed' | 'failed'
  chunks_count?: number
}

export interface ItemStatus {
  doc: ItemChecklist
  encontrado: boolean
  nomeArquivo?: string // nome do arquivo que foi identificado como este doc
}

export interface ResultadoCompletude {
  percentual: number
  totalPeso: number
  pessoEncontrado: number
  criticos: ItemStatus[]
  altos: ItemStatus[]
  recomendados: ItemStatus[]
  /** Documentos enviados que não foram identificados em nenhuma categoria */
  naoIdentificados: string[]
}

const PESO: Record<SeveridadeDoc, number> = { critico: 3, alto: 2, recomendado: 1 }

/**
 * Mapeia pilar e tipoAtivo do sistema para os tipos esperados pelo checklist.
 */
export function resolverPilar(tipoAtivo: string, pilarOperacao?: string): {
  pilar: PilarOperacao
  subtipos: string[]
} {
  if (pilarOperacao === 'ma') return { pilar: 'ma', subtipos: [] }
  if (pilarOperacao === 'asset_prep') {
    const sub = tipoAtivo?.toLowerCase() ?? ''
    return { pilar: 'asset_prep', subtipos: [sub] }
  }
  if (pilarOperacao === 'fidc' || tipoAtivo?.includes('FIDC') || tipoAtivo?.includes('Crédito Estruturado')) {
    return { pilar: 'fidc', subtipos: [] }
  }
  if (pilarOperacao === 'cri_cra' || tipoAtivo?.includes('Securitização')) {
    const subtipos: string[] = []
    if (tipoAtivo?.includes('CRI') || tipoAtivo?.includes('imobiliário') || tipoAtivo?.includes('Imobiliário')) subtipos.push('cri')
    if (tipoAtivo?.includes('CRA') || tipoAtivo?.includes('agro') || tipoAtivo?.includes('Agro')) subtipos.push('cra')
    return { pilar: 'cri_cra', subtipos }
  }
  return { pilar: 'ma', subtipos: [] }
}

/**
 * Verifica se um documento enviado corresponde a um item do checklist.
 * Usa os matchPatterns do item.
 */
function matchDoc(nomeArquivo: string, item: ItemChecklist): boolean {
  const nome = nomeArquivo.toLowerCase().replace(/[_\-\.]/g, ' ')
  return item.matchPatterns.some(re => re.test(nome))
}

/**
 * Seleciona os documentos esperados para o pilar e subtipos dados.
 */
function selecionarDocs(pilar: PilarOperacao, subtipos: string[]): ItemChecklist[] {
  return TODOS_DOCS.filter(doc => {
    if (!doc.pilares.includes(pilar)) return false
    if (!doc.subtipos || doc.subtipos.length === 0) return true // sem restrição de subtipo
    if (subtipos.length === 0) return false // doc restrito a subtipo, mas nenhum informado
    return doc.subtipos.some(s => subtipos.some(st => st.toLowerCase().includes(s) || s.includes(st.toLowerCase())))
  })
}

/**
 * Calcula a completude documental de uma análise.
 */
export function calcularCompletude(
  tipoAtivo: string,
  pilarOperacao: string | undefined,
  documentosEnviados: DocEnviado[]
): ResultadoCompletude {
  const { pilar, subtipos } = resolverPilar(tipoAtivo, pilarOperacao)
  const docsEsperados = selecionarDocs(pilar, subtipos)

  // Apenas documentos que foram lidos com sucesso contam como "enviados"
  const docsValidos = documentosEnviados
    .filter(d => d.status === 'completed' && (d.chunks_count ?? 0) > 0)
    .map(d => d.nome)

  const identificados = new Set<string>()

  function avaliarItem(item: ItemChecklist): ItemStatus {
    for (const nome of docsValidos) {
      if (matchDoc(nome, item)) {
        identificados.add(nome)
        return { doc: item, encontrado: true, nomeArquivo: nome }
      }
    }
    return { doc: item, encontrado: false }
  }

  const criticos    = docsEsperados.filter(d => d.severidade === 'critico').map(avaliarItem)
  const altos       = docsEsperados.filter(d => d.severidade === 'alto').map(avaliarItem)
  const recomendados = docsEsperados.filter(d => d.severidade === 'recomendado').map(avaliarItem)

  const totalPeso = docsEsperados.reduce((s, d) => s + PESO[d.severidade], 0)
  const pesoEncontrado =
    criticos.filter(i => i.encontrado).reduce((s, i) => s + PESO[i.doc.severidade], 0) +
    altos.filter(i => i.encontrado).reduce((s, i) => s + PESO[i.doc.severidade], 0) +
    recomendados.filter(i => i.encontrado).reduce((s, i) => s + PESO[i.doc.severidade], 0)

  const percentual = totalPeso === 0 ? 0 : Math.round((pesoEncontrado / totalPeso) * 100)

  const naoIdentificados = docsValidos.filter(n => !identificados.has(n))

  return { percentual, totalPeso, pessoEncontrado: pesoEncontrado, criticos, altos, recomendados, naoIdentificados }
}

/**
 * Retorna uma descrição textual do nível de confiança baseada na completude.
 */
export function nivelConfianca(percentual: number): {
  label: string
  descricao: string
  cor: 'verde' | 'amarelo' | 'laranja' | 'vermelho'
} {
  if (percentual >= 85) return {
    label: 'Alta confiança',
    descricao: 'Documentação robusta. A análise terá conclusões precisas e auditáveis.',
    cor: 'verde',
  }
  if (percentual >= 65) return {
    label: 'Confiança moderada',
    descricao: 'Documentação suficiente para análise. Algumas seções podem ter ressalvas.',
    cor: 'amarelo',
  }
  if (percentual >= 40) return {
    label: 'Confiança limitada',
    descricao: 'Documentação parcial. A análise registrará lacunas e não emitirá conclusões onde faltar evidência.',
    cor: 'laranja',
  }
  return {
    label: 'Confiança insuficiente',
    descricao: 'Documentação insuficiente. O parecer terá muitas lacunas e baixa precisão.',
    cor: 'vermelho',
  }
}
