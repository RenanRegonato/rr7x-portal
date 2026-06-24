/**
 * Asset Preparation — Plano de Preparação
 *
 * Consolida ações prioritárias em um plano executável.
 * Similar ao triagem/plano.ts mas com lógica de Asset Prep.
 */

import { Gargalo, GarganlosResult } from './bottleneck-identifier'
import { ValidationResult } from './validation'

// ═══════════════════════════════════════════════════════════════════════════════

export interface AcaoPreparacao {
  id: string
  titulo: string
  descricao: string
  severidade: 'critico' | 'importante' | 'menor'
  dimensao: string           // qual dimensão melhora (jurídico, financeiro, etc)
  prazo_dias: number
  responsavel?: string       // quem executa
  documentos_necessarios: string[]
  concluida: boolean
  data_conclusao?: Date
  observacoes?: string
}

export interface PlanodePreparacao {
  total_acoes: number
  acoes_criticas: number
  acoes_concluidas: number
  percentual_conclusao: number  // 0-100
  prazo_total_dias: number      // soma dos prazos, ajustado por paralelismo
  acoes: AcaoPreparacao[]
  timeline_fases: TimelineFase[]
}

export interface TimelineFase {
  nome: string
  semana: number
  acoes: AcaoPreparacao[]
  objetivo: string
}

// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Converter gargalos em plano de preparação executável.
 */
export function gerarPlanodePreparacao(gargalos: GarganlosResult, validation: ValidationResult): PlanodePreparacao {
  const todas: AcaoPreparacao[] = []
  let id = 0

  // Adicionar ações de gargalos críticos
  gargalos.criticos.forEach(g => {
    todas.push({
      id: `critico_${id++}`,
      titulo: g.acao,
      descricao: g.descricao,
      severidade: 'critico',
      dimensao: extrairDimensao(g.tipo),
      prazo_dias: g.prazo_dias || 30,
      documentos_necessarios: extrairDocumentos(g.acao),
      concluida: false,
    })
  })

  // Adicionar ações de gargalos importantes
  gargalos.importantes.forEach(g => {
    todas.push({
      id: `importante_${id++}`,
      titulo: g.acao,
      descricao: g.descricao,
      severidade: 'importante',
      dimensao: extrairDimensao(g.tipo),
      prazo_dias: g.prazo_dias || 30,
      documentos_necessarios: extrairDocumentos(g.acao),
      concluida: false,
    })
  })

  // Recomendações de validação como ações
  validation.recomendacoes.forEach(rec => {
    todas.push({
      id: `recomendacao_${id++}`,
      titulo: rec,
      descricao: rec,
      severidade: 'menor',
      dimensao: 'geral',
      prazo_dias: 7,
      documentos_necessarios: [],
      concluida: false,
    })
  })

  const acoes_criticas = todas.filter(a => a.severidade === 'critico').length
  const acoes_concluidas = todas.filter(a => a.concluida).length
  const percentual_conclusao = todas.length === 0 ? 100 : Math.round((acoes_concluidas / todas.length) * 100)

  // Calcular prazo total (máximo prazo, ajustado por paralelismo)
  // Simplificado: usar o máximo dos críticos, depois adicionar importantes
  const prazo_criticos = Math.max(...(gargalos.criticos.map(g => g.prazo_dias || 30) || [0]))
  const prazo_importantes = Math.max(...(gargalos.importantes.map(g => g.prazo_dias || 30) || [0]))
  const prazo_total_dias = prazo_criticos + Math.ceil(prazo_importantes / 2)  // paralelo com críticos

  // Organizar em timeline (fases de 1-2 semanas)
  const timeline_fases = gerarTimeline(todas)

  return {
    total_acoes: todas.length,
    acoes_criticas,
    acoes_concluidas,
    percentual_conclusao,
    prazo_total_dias: Math.max(prazo_total_dias, 7),  // mínimo 7 dias
    acoes: todas,
    timeline_fases,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extrair dimensão do tipo de gargalo.
 */
function extrairDimensao(tipo: string): string {
  if (tipo.includes('Jurídico') || tipo.includes('Documentação') || tipo.includes('Passivos')) return 'juridico'
  if (tipo.includes('Financeiro') || tipo.includes('Indicadores')) return 'financeiro'
  if (tipo.includes('Operacional') || tipo.includes('Histórico')) return 'operacional'
  if (tipo.includes('Governança')) return 'governanca'
  if (tipo.includes('Garantias')) return 'garantias'
  if (tipo.includes('Regulatório') || tipo.includes('Compliance')) return 'compliance'
  return 'geral'
}

/**
 * Extrair documentos mencionados na ação.
 */
function extrairDocumentos(acao: string): string[] {
  const docs: string[] = []
  const patterns = [
    { regex: /balanço|dre/i, doc: 'DRE/Balanço' },
    { regex: /contrato/i, doc: 'Contrato' },
    { regex: /matrícula|imóvel/i, doc: 'Matrícula' },
    { regex: /laudo|técnico/i, doc: 'Laudo Técnico' },
    { regex: /certidão|órgão público/i, doc: 'Certidão' },
    { regex: /procuração|poder/i, doc: 'Procuração' },
    { regex: /governança|compliance/i, doc: 'Documento de Governança' },
  ]

  patterns.forEach(p => {
    if (p.regex.test(acao)) docs.push(p.doc)
  })

  return docs.length > 0 ? docs : ['Documentação']
}

/**
 * Organizar ações em timeline de fases.
 */
function gerarTimeline(acoes: AcaoPreparacao[]): TimelineFase[] {
  const fases: TimelineFase[] = []
  const acoesOrdenadas = [...acoes].sort((a, b) => {
    // Ordenar por: crítico > importante > menor, depois por prazo
    const severidadeOrder: Record<string, number> = { critico: 3, importante: 2, menor: 1 }
    const severidadeA = severidadeOrder[a.severidade] || 0
    const severidadeB = severidadeOrder[b.severidade] || 0
    if (severidadeA !== severidadeB) return severidadeB - severidadeA
    return a.prazo_dias - b.prazo_dias
  })

  let acoesRestantes = [...acoesOrdenadas]
  let semana = 1
  const diasPorSemana = 14

  while (acoesRestantes.length > 0) {
    const acoesDaSemana: AcaoPreparacao[] = []
    let diasUsados = 0

    // Tentar agrupar ações que cabem na semana
    acoesRestantes = acoesRestantes.filter(a => {
      if (diasUsados + a.prazo_dias <= diasPorSemana) {
        acoesDaSemana.push(a)
        diasUsados += a.prazo_dias
        return false
      }
      return true
    })

    if (acoesDaSemana.length === 0 && acoesRestantes.length > 0) {
      // Força adicionar a próxima ação mesmo que ultrapasse
      acoesDaSemana.push(acoesRestantes.shift()!)
    }

    if (acoesDaSemana.length > 0) {
      fases.push({
        nome: `Semana ${semana}`,
        semana,
        acoes: acoesDaSemana,
        objetivo: resumirObjetivo(acoesDaSemana),
      })
      semana++
    } else {
      break
    }
  }

  return fases
}

/**
 * Resumir objetivo da fase.
 */
function resumirObjetivo(acoes: AcaoPreparacao[]): string {
  const criticos = acoes.filter(a => a.severidade === 'critico').length
  const importantes = acoes.filter(a => a.severidade === 'importante').length

  if (criticos > 0) return `Resolver ${criticos} bloqueador(es) crítico(s)`
  if (importantes > 0) return `Melhorar ${importantes} aspecto(s) importante(s)`
  return `Completar ${acoes.length} ação(ões) de preparação`
}

// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Marcar ação como concluída.
 */
export function marcarAcaoConcluida(
  plano: PlanodePreparacao,
  acaoId: string,
  observacoes?: string,
): PlanodePreparacao {
  const acao = plano.acoes.find(a => a.id === acaoId)
  if (acao) {
    acao.concluida = true
    acao.data_conclusao = new Date()
    acao.observacoes = observacoes
  }

  // Recalcular percentual
  const acoes_concluidas = plano.acoes.filter(a => a.concluida).length
  const percentual_conclusao = Math.round((acoes_concluidas / plano.total_acoes) * 100)

  return {
    ...plano,
    acoes_concluidas,
    percentual_conclusao,
  }
}
