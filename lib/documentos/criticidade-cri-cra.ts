/**
 * Mapeamento de Documentos Críticos por Tipo de Ativo (CRI/CRA)
 *
 * Define quais documentos são obrigatórios para validação conforme CVM 175/22.
 * Usado em:
 * - UI: exibir checklist de docs esperados em /nova-analise Step 7
 * - Gate: bloquear análise se doc crítico falta/falhou em triagem
 */

export interface DocumentoCritico {
  nome: string
  descricao: string
  severidade: 'critico' | 'alto'
  exemplo?: string
  dica?: string
}

/**
 * Lista documentos críticos esperados para CRI.
 * Usados para validar elegibilidade CVM 175/22.
 */
export function getDocsCriticosImobiliarios(): DocumentoCritico[] {
  return [
    {
      nome: 'Contrato Imobiliário (Compra-Venda / Locação / Financiamento)',
      descricao: 'Documento que origina o crédito imobiliário',
      severidade: 'critico',
      exemplo: 'Escritura de compra-venda, contrato de locação, contrato de financiamento imobiliário',
      dica: 'Este é o lastro da securitização. Sem ele, não há crédito para securitizar.',
    },
    {
      nome: 'Avaliação / Laudo do Imóvel',
      descricao: 'Avaliação técnica do imóvel (data ≤ 12 meses)',
      severidade: 'critico',
      exemplo: 'Laudo ABNT NBR 14653, com assinatura de engenheiro ou AMC',
      dica: 'Avaliação desatualizada (> 12 meses) reduz confiança. Consideraremos como pendência.',
    },
    {
      nome: 'Matrícula do Imóvel',
      descricao: 'Registro imobiliário atual (sem ônus que prejudiquem o crédito)',
      severidade: 'critico',
      exemplo: 'Matrícula do Cartório de Registro de Imóveis (Estado/Município)',
      dica: 'Deve estar em nome do cedente (ou devedor, conforme contrato). Ônus de primeira ordem podem aparecer se houver financiamento anterior.',
    },
    {
      nome: 'Documentação do Cedente (CNPJ / Contrato Social)',
      descricao: 'Comprovação da identidade e legitimidade de quem origina os créditos',
      severidade: 'critico',
      exemplo: 'CNPJ, extrato de CNPJ, contrato social / alterações, últimos balanços',
      dica: 'Cedente é quem origina ou endossa o crédito. Deve estar em dia com os órgãos de fiscalização.',
    },
    {
      nome: 'Estrutura de Cotas (Proposição)',
      descricao: 'Documento formal definindo sênior / mezanino / subordinada',
      severidade: 'alto',
      exemplo: '% de cada cota (ex.: Sênior 75% / Mez 15% / Sub 10%), ou prospecto preliminar',
      dica: 'A estrutura deve atender ao mínimo de subordinação conforme CVM 175/22 (25% para pulverizado, 40% para concentrado).',
    },
  ]
}

/**
 * Lista documentos críticos esperados para CRA.
 */
export function getDocsCriticosAgricolas(): DocumentoCritico[] {
  return [
    {
      nome: 'Contrato Agrícola (Compra / Financiamento / Custódia)',
      descricao: 'Documento que origina o crédito agrícola',
      severidade: 'critico',
      exemplo: 'Contrato de compra de grão, contrato de financiamento agrícola, contrato de custódia de safra',
      dica: 'Este é o lastro da securitização CRA. Define responsabilidade do devedor (produtor/intermediário).',
    },
    {
      nome: 'Cadastro do Produtor / Cooperativa',
      descricao: 'Comprovação da qualificação do devedor (produtor rural ou cooperativa)',
      severidade: 'critico',
      exemplo: 'Cadastro MAPA (Ministério da Agricultura), registro na OAC (Organização de Certificação de Cooperativa), CNPJ',
      dica: 'Produtor deve estar registrado em órgão competente. Cooperativa deve estar filiada à ACI (Aliança Cooperativa Internacional).',
    },
    {
      nome: 'Ciclo Agrícola / Calendário de Safra',
      descricao: 'Documentação do ciclo agrícola e sazonalidade (colheita, venda, pagamento)',
      severidade: 'critico',
      exemplo: 'Calendário de safra (ex.: plantio fev-mar, colheita jun-jul), documentação de hedge se houver',
      dica: 'Crítico para avaliar fluxo de caixa do devedor e risco de commodity. Se houver revolvência, deve estar clara a periodicidade.',
    },
    {
      nome: 'Documentação do Cedente (CNPJ / Contrato Social)',
      descricao: 'Comprovação da identidade de quem origina/estrutura os créditos',
      severidade: 'critico',
      exemplo: 'CNPJ, extrato de CNPJ, contrato social, ultimos balanços',
      dica: 'Cedente (originador ou banco) deve estar em dia. Se for cooperativa, documento de filiação à ACI.',
    },
    {
      nome: 'Seguro Rural / Hedge de Commodity (recomendado)',
      descricao: 'Evidência de proteção contra risco de commodity ou safra',
      severidade: 'alto',
      exemplo: 'Apólice de seguro rural (PROAGRO), contrato de venda futura (NDF/futuros), swaps de preço',
      dica: 'Não é obrigatório, mas reduz risco de commodity e melhora elegibilidade. Recomendado para CRA com sazonalidade alta.',
    },
  ]
}

/**
 * Lista documentos críticos esperados para M&A.
 */
export function getDocsCriticosMA(): DocumentoCritico[] {
  return [
    {
      nome: 'DRE — Demonstração de Resultado do Exercício',
      descricao: 'Últimos 2-3 exercícios; auditada é ideal, gerencial também aceita',
      severidade: 'critico',
      exemplo: 'DRE anual auditada, DRE gerencial dos últimos 3 anos',
      dica: 'Se não auditada, explique na Tese da Operação — o sistema registra como ressalva, não como red flag.',
    },
    {
      nome: 'Balanço Patrimonial',
      descricao: 'Posição de ativos, passivos e patrimônio líquido',
      severidade: 'critico',
      exemplo: 'Balanço dos últimos 2 exercícios (auditado ou contábil)',
      dica: 'Divergências entre DRE e balanço são apontadas automaticamente. Explique na Tese se houver.',
    },
    {
      nome: 'Contrato Social / Estatuto',
      descricao: 'Documento constitutivo + última alteração com estrutura societária vigente',
      severidade: 'critico',
      exemplo: 'Contrato social consolidado ou estatuto atualizado com cap table',
    },
    {
      nome: 'Certidões Negativas (CND)',
      descricao: 'Situação fiscal, trabalhista e previdenciária da empresa',
      severidade: 'alto',
      exemplo: 'CND Federal (Receita), PGFN, CND Estadual, CND Trabalhista (TST)',
      dica: 'Pendências conhecidas devem ser explicadas na Tese para contextualizar o risco.',
    },
    {
      nome: 'Apresentação do Negócio (Pitch Deck)',
      descricao: 'Visão geral da empresa, produto/serviço, mercado e estratégia',
      severidade: 'alto',
      exemplo: 'Pitch deck, IM (Information Memorandum) ou apresentação institucional',
    },
  ]
}

/**
 * Lista documentos críticos esperados para Asset Preparation.
 */
export function getDocsCriticosAssetPrep(): DocumentoCritico[] {
  return [
    {
      nome: 'DRE ou Demonstrativo Financeiro',
      descricao: 'Qualquer dado financeiro disponível — gerencial, parcial ou projetado',
      severidade: 'critico',
      exemplo: 'DRE gerencial, planilha de receitas, projeção financeira',
      dica: 'Mesmo que incompleto, envie o que tiver. O diagnóstico se adapta ao nível de informação.',
    },
    {
      nome: 'Contrato Social / Estatuto',
      descricao: 'Documento constitutivo da entidade',
      severidade: 'critico',
      exemplo: 'Contrato social, estatuto, ata de constituição',
    },
    {
      nome: 'Apresentação do Ativo',
      descricao: 'Qualquer documento que descreva o negócio, produto ou ativo',
      severidade: 'alto',
      exemplo: 'Pitch deck, apresentação comercial, one-pager',
      dica: 'Quanto mais contexto, mais preciso o diagnóstico de prontidão para o mercado.',
    },
  ]
}

/**
 * Retorna lista de docs críticos conforme tipo_ativo ou pilar.
 */
export function getDocsCriticos(tipoAtivo: string, pilarOperacao?: string): DocumentoCritico[] {
  // Pilar explícito tem prioridade
  if (pilarOperacao === 'ma') return getDocsCriticosMA()
  if (pilarOperacao === 'asset_prep') return getDocsCriticosAssetPrep()
  if (pilarOperacao === 'cri_cra' || tipoAtivo?.includes('Securitização')) {
    // UI permite distinguir CRI de CRA pelo subtipo — aqui retornamos ambos como fallback
    return [...getDocsCriticosImobiliarios(), ...getDocsCriticosAgricolas()]
  }
  if (pilarOperacao === 'fidc' || CREDIT_TIPOS_FIDC.has(tipoAtivo)) {
    return [] // FIDC não tem lista de docs críticos padronizados — depende do lastro
  }

  // Fallback por tipoAtivo (compatibilidade com deals antigos)
  if (tipoAtivo?.includes('CRI')) return getDocsCriticosImobiliarios()
  if (tipoAtivo?.includes('CRA')) return getDocsCriticosAgricolas()
  if (['Empresa (M&A)', 'Startup / Scale-up', 'Franquia', 'Agronegócio'].includes(tipoAtivo)) {
    return getDocsCriticosMA()
  }
  return []
}

const CREDIT_TIPOS_FIDC = new Set(['FIDC / Crédito Estruturado', 'FIDC de Infraestrutura (incentivado)', 'Portfólio de Crédito'])

/**
 * Identifica qual documento crítico foi enviado.
 * Usado para marcar como "lido" na triagem.
 *
 * Heurística: procura por keywords no nome do arquivo.
 */
export function identifyDocCritico(fileName: string, tipoAtivo: string): string | null {
  const lower = fileName.toLowerCase()
  const docs = getDocsCriticos(tipoAtivo)

  for (const doc of docs) {
    const keywords = extrairKeywords(doc.nome)
    if (keywords.some(kw => lower.includes(kw))) {
      return doc.nome
    }
  }

  return null
}

function extrairKeywords(docName: string): string[] {
  return docName
    .toLowerCase()
    .split(/[\/\(\)]/)[0] // pega a parte antes de / ou ()
    .split(/[\s-]+/)
    .filter(w => w.length > 3)
}

/**
 * Helper: formata a lista para exibir na UI.
 */
export function formatDocsCriticosUI(tipoAtivo: string, pilarOperacao?: string): {
  criticos: DocumentoCritico[]
  altos: DocumentoCritico[]
} {
  const docs = getDocsCriticos(tipoAtivo, pilarOperacao)
  return {
    criticos: docs.filter(d => d.severidade === 'critico'),
    altos: docs.filter(d => d.severidade === 'alto'),
  }
}
