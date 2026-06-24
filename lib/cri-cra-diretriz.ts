import { DealIntake } from './types'

/**
 * Diretriz de Análise CRI/CRA — Inteligência Institucional baseada em ANBIMA.
 *
 * Injeta contexto regulatório nos agentes da análise (Estruturação, Mesa, KYC)
 * para que entendam as dimensões de risco e elegibilidade conforme classificação ANBIMA.
 *
 * Padrão: <diretriz_cri_cra>...</diretriz_cri_cra> — delimitado nos prompts dos agentes.
 */

interface CRIDiretriz {
  categoria?: string
  concentracao?: string
  segmento?: string
  riscosElegibilidade?: string[]
  alertasAnacomp?: string[]
}

interface CRADiretriz {
  atividade?: string
  revolvencia?: string
  segmento?: string
  riscosElegibilidade?: string[]
  alertasAnacomp?: string[]
}

/**
 * Identifica se a estrutura é CRI baseado nos campos preenchidos.
 */
function isCRIStructure(intake: Record<string, string> | DealIntake): boolean {
  return !!(
    intake.categoriaCri ||
    intake.concentracaoCri ||
    intake.segmentoImobiliario
  )
}

/**
 * Identifica se a estrutura é CRA baseado nos campos preenchidos.
 */
function isCRAStructure(intake: Record<string, string> | DealIntake): boolean {
  return !!(
    intake.atividadeDevedor ||
    intake.revolvencia ||
    intake.segmentoAgro
  )
}

/**
 * Constrói diretriz CRI com base em Regras ANBIMA.
 * Mapeia dimensões de risco e elegibilidade de cotas.
 */
function buildCRIDiretriz(intake: Record<string, string> | DealIntake): CRIDiretriz {
  const cri: CRIDiretriz = {
    categoria: intake.categoriaCri
      ? formatCRIField(intake.categoriaCri, 'categoria')
      : undefined,
    concentracao: intake.concentracaoCri
      ? formatCRIField(intake.concentracaoCri, 'concentracao')
      : undefined,
    segmento: intake.segmentoImobiliario
      ? formatCRIField(intake.segmentoImobiliario, 'segmento')
      : undefined,
    riscosElegibilidade: [],
    alertasAnacomp: [],
  }

  // Lógica de risco baseada em concentração
  if (intake.concentracaoCri === 'concentrado') {
    cri.riscosElegibilidade?.push(
      'Concentração > 20% por devedor: exige subordinação mínima 40% (vs 25% para pulverizado)'
    )
    cri.riscosElegibilidade?.push(
      'Yellow flag: validar diversificação entre os maiores devedores e monitoramento contínuo'
    )
    cri.alertasAnacomp?.push(
      'Estrutura de cotas deve refletir concentração — tranches sub robustas esperadas'
    )
  } else if (intake.concentracaoCri === 'pulverizado') {
    cri.riscosElegibilidade?.push(
      'Concentração ≤ 20% por devedor: elegível para subordinação padrão 25%'
    )
  }

  // Lógica de risco por segmento imobiliário
  const segmentsWithHighRisk = ['industrial', 'logistico', 'infraestrutura']
  if (
    intake.segmentoImobiliario &&
    segmentsWithHighRisk.includes(intake.segmentoImobiliario)
  ) {
    cri.riscosElegibilidade?.push(
      `Segmento ${intake.segmentoImobiliario}: risco de mercado/commodity sensível — validar hedges`
    )
  }

  // Híbrido traz complexidade
  if (intake.categoriaCri === 'hibrido') {
    cri.alertasAnacomp?.push(
      'Categoria Híbrida: analisar separadamente os perfis Residencial e Corporativo dentro da mesma emissão'
    )
  }

  return cri
}

/**
 * Constrói diretriz CRA com base em Regras ANBIMA.
 * Mapeia dimensões de risco e características de carteira agrícola.
 */
function buildCRADiretriz(intake: Record<string, string> | DealIntake): CRADiretriz {
  const cra: CRADiretriz = {
    atividade: intake.atividadeDevedor
      ? formatCRAField(intake.atividadeDevedor, 'atividade')
      : undefined,
    revolvencia: intake.revolvencia
      ? formatCRAField(intake.revolvencia, 'revolvencia')
      : undefined,
    segmento: intake.segmentoAgro
      ? formatCRAField(intake.segmentoAgro, 'segmento')
      : undefined,
    riscosElegibilidade: [],
    alertasAnacomp: [],
  }

  // Lógica de revolvência
  if (intake.revolvencia === 'com_revolvencia') {
    cra.riscosElegibilidade?.push(
      'Carteira com revolvência: permite novas admissões — exige gate de underwriting robusto'
    )
    cra.alertasAnacomp?.push(
      'Monitoramento mensal de composição da carteira obrigatório (cedente responsável)'
    )
  } else if (intake.revolvencia === 'sem_revolvencia') {
    cra.riscosElegibilidade?.push(
      'Carteira fechada (sem revolvência): perfil de amortização previsível'
    )
  }

  // Lógica por atividade do devedor
  if (intake.atividadeDevedor === 'produtor_rural') {
    cra.riscosElegibilidade?.push(
      'Produtor Rural: risco de safra e commodity — impacta fluxo de caixa sazonal'
    )
    cra.alertasAnacomp?.push(
      'Validar cobertura de seguro rural e hedge de commodity quando aplicável'
    )
  } else if (intake.atividadeDevedor === 'cooperativa') {
    cra.riscosElegibilidade?.push(
      'Cooperativa: tipicamente mais pulverizada — avaliar estrutura de governança'
    )
  } else if (intake.atividadeDevedor === 'terceiro_fornecedor') {
    cra.riscosElegibilidade?.push(
      'Terceiro Fornecedor: concentração em serviços/insumos — risco de substituição'
    )
  }

  // Lógica por segmento agrícola
  const riskSegments = ['graos', 'usina']
  if (intake.segmentoAgro && riskSegments.includes(intake.segmentoAgro)) {
    cra.riscosElegibilidade?.push(
      `Segmento ${intake.segmentoAgro}: commodity com volatilidade de preço — impacto em inadimplência`
    )
    cra.alertasAnacomp?.push(
      'Monitoramento de preços de commodity é fator de risco crítico'
    )
  }

  return cra
}

/**
 * Formata um campo CRI para display legível.
 */
function formatCRIField(value: string, field: 'categoria' | 'concentracao' | 'segmento'): string {
  const map: Record<string, Record<string, string>> = {
    categoria: {
      residencial: 'Residencial',
      corporativo: 'Corporativo',
      hibrido: 'Híbrido',
    },
    concentracao: {
      pulverizado: 'Pulverizado (≤ 20% por devedor)',
      concentrado: 'Concentrado (> 20% por devedor)',
    },
    segmento: {
      apartamento: 'Apartamentos ou casas',
      loteamento: 'Loteamento',
      industrial: 'Industrial',
      logistico: 'Logístico',
      comercial: 'Comercial / Corporativo',
      shopping: 'Shopping / Lojas',
      infraestrutura: 'Infraestrutura',
      hotel: 'Hotel',
      outro: 'Outro',
    },
  }
  return map[field]?.[value] || value
}

/**
 * Formata um campo CRA para display legível.
 */
function formatCRAField(value: string, field: 'atividade' | 'revolvencia' | 'segmento'): string {
  const map: Record<string, Record<string, string>> = {
    atividade: {
      cooperativa: 'Cooperativa',
      produtor_rural: 'Produtor Rural',
      terceiro_fornecedor: 'Terceiro Fornecedor',
      terceiro_comprador: 'Terceiro Comprador',
    },
    revolvencia: {
      com_revolvencia: 'Com revolvência',
      sem_revolvencia: 'Sem revolvência',
    },
    segmento: {
      graos: 'Grãos',
      usina: 'Usina',
      logistica: 'Logística',
      hibrido: 'Híbrido',
      outro: 'Outro',
    },
  }
  return map[field]?.[value] || value
}

/**
 * Formata o bloco de diretriz CRI/CRA para injeção nos prompts dos agentes.
 *
 * Padrão: <diretriz_cri_cra>...</diretriz_cri_cra>
 *
 * Uso:
 *   - Estruturação: valida elegibilidade de cotas pela concentração e segmento
 *   - Mesa: consolida parecer técnico com base nas dimensões ANBIMA
 *   - KYC: aponta yellow flags e requisitos de governança
 */
export function formatCRICRABlock(intake: Record<string, string> | DealIntake): string {
  const hasCRI = isCRIStructure(intake)
  const hasCRA = isCRAStructure(intake)

  if (!hasCRI && !hasCRA) return ''

  const parts: string[] = []

  if (hasCRI) {
    const criDiretriz = buildCRIDiretriz(intake)
    parts.push('## Classificação ANBIMA — CRI (Certificados de Recebíveis Imobiliários)')
    if (criDiretriz.categoria) parts.push(`- **Categoria:** ${criDiretriz.categoria}`)
    if (criDiretriz.concentracao) parts.push(`- **Concentração:** ${criDiretriz.concentracao}`)
    if (criDiretriz.segmento) parts.push(`- **Segmento:** ${criDiretriz.segmento}`)
    if (criDiretriz.riscosElegibilidade?.length) {
      parts.push('### Riscos e Elegibilidade de Cotas:')
      criDiretriz.riscosElegibilidade.forEach(r => parts.push(`- ${r}`))
    }
    if (criDiretriz.alertasAnacomp?.length) {
      parts.push('### Alertas para Análise Complementar:')
      criDiretriz.alertasAnacomp.forEach(a => parts.push(`- ${a}`))
    }
  }

  if (hasCRA) {
    if (hasCRI) parts.push('')
    const craDiretriz = buildCRADiretriz(intake)
    parts.push('## Classificação ANBIMA — CRA (Certificados de Recebíveis do Agronegócio)')
    if (craDiretriz.atividade) parts.push(`- **Atividade do Devedor:** ${craDiretriz.atividade}`)
    if (craDiretriz.revolvencia) parts.push(`- **Revolvência:** ${craDiretriz.revolvencia}`)
    if (craDiretriz.segmento) parts.push(`- **Segmento:** ${craDiretriz.segmento}`)
    if (craDiretriz.riscosElegibilidade?.length) {
      parts.push('### Riscos e Características de Carteira:')
      craDiretriz.riscosElegibilidade.forEach(r => parts.push(`- ${r}`))
    }
    if (craDiretriz.alertasAnacomp?.length) {
      parts.push('### Alertas para Análise Complementar:')
      craDiretriz.alertasAnacomp.forEach(a => parts.push(`- ${a}`))
    }
  }

  const innerContent = parts.join('\n')
  return `<diretriz_cri_cra>\n${innerContent}\n</diretriz_cri_cra>`
}

/**
 * Versão texto plano (sem delimitadores XML) para uso em summaries.
 */
export function formatCRICRAText(intake: DealIntake): string {
  return formatCRICRABlock(intake).replace(/<\/?diretriz_cri_cra>/g, '').trim()
}

/**
 * Check booleano: há contexto ANBIMA relevante para injetar?
 */
export function hasCRICRAContext(intake: Record<string, string> | DealIntake): boolean {
  return isCRIStructure(intake) || isCRAStructure(intake)
}
