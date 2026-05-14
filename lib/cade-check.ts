// CADE — Conselho Administrativo de Defesa Econômica
// Resolução CADE nº 33/2022 e Lei 12.529/2011 (art. 88)
//
// Ato de concentração deve ser submetido ao CADE quando:
//   I.  O grupo de um dos agentes econômicos tenha registrado, no último balanço,
//       faturamento bruto anual ou volume de negócios total no País ≥ R$ 750 milhões; E
//   II. O grupo de pelo menos um dos demais agentes tenha registrado faturamento ≥ R$ 75 milhões.

export type CADEResult =
  | { status: 'obrigatorio';      nivel: 'critico' }
  | { status: 'provavel';         nivel: 'alto'    }
  | { status: 'inconclusivo';     nivel: 'medio'   }
  | { status: 'nao_obrigatorio';  nivel: 'baixo'   }

export interface CADECheck {
  resultado:    CADEResult
  threshold_i:  string   // R$ 750M — faturamento do grupo do comprador/maior parte
  threshold_ii: string   // R$ 75M  — faturamento do grupo do vendedor
  nota:         string
  prazo_legal:  string
  base_legal:   string
}

function parseBRL(s: string): number | null {
  if (!s) return null
  // Suporta: "R$ 1,2 bilhão", "R$ 500 milhões", "R$ 50MM", "R$ 1.200.000.000"
  const lower = s.toLowerCase().replace(/\s/g, '')
  let n = parseFloat(lower.replace(/[r$,.]/g, '').replace(',', '.'))
  if (isNaN(n)) return null
  if (lower.includes('bilhão') || lower.includes('bilhoes') || lower.includes('bi') || lower.includes('b')) n *= 1e9
  else if (lower.includes('milhão') || lower.includes('milhoes') || lower.includes('mm') || lower.includes('m')) n *= 1e6
  else if (lower.includes('mil')) n *= 1e3
  return n
}

export function checkCADE(intake: Record<string, string>): CADECheck {
  const ticket   = parseBRL(intake.ticketEstimado ?? '')
  const tipo     = (intake.tipoAtivo ?? '').toLowerCase()
  const objetivo = (intake.objetivo  ?? '').toLowerCase()

  // Tipos que implicam ato de concentração
  const isConcentracao = objetivo.includes('vender') || objetivo.includes('m&a') ||
    objetivo.includes('aquisição') || objetivo.includes('fusão') || objetivo.includes('captar')

  const threshold_i  = 'R$ 750 milhões (faturamento bruto anual no Brasil do grupo do adquirente)'
  const threshold_ii = 'R$ 75 milhões (faturamento bruto anual no Brasil do grupo do alvo)'
  const base_legal   = 'Lei 12.529/2011, art. 88 + Resolução CADE nº 33/2022'
  const prazo_legal  = '30 dias corridos a partir da celebração do instrumento definitivo (SPA/fusão)'

  if (!isConcentracao) {
    return {
      resultado:    { status: 'nao_obrigatorio', nivel: 'baixo' },
      threshold_i, threshold_ii, base_legal, prazo_legal,
      nota: 'Operação declarada não envolve transferência de controle ou fusão — não configura ato de concentração sujeito ao art. 88. Se o objetivo mudar para M&A/venda de controle, reavalie.',
    }
  }

  if (ticket === null) {
    return {
      resultado:    { status: 'inconclusivo', nivel: 'medio' },
      threshold_i, threshold_ii, base_legal, prazo_legal,
      nota: 'Ticket estimado não informado ou não parseável. Avalie manualmente: se o adquirente tem faturamento ≥ R$ 750 MM no Brasil E o alvo tem ≥ R$ 75 MM, a notificação é obrigatória. Sem essa informação, presuma que o CADE pode ser exigível.',
    }
  }

  // Ticket > R$ 750M → quase certamente ambos os thresholds atingidos
  if (ticket >= 750_000_000) {
    return {
      resultado:    { status: 'obrigatorio', nivel: 'critico' },
      threshold_i, threshold_ii, base_legal, prazo_legal,
      nota: `Ticket estimado (${intake.ticketEstimado}) indica forte probabilidade de atingir ambos os thresholds do art. 88. A notificação prévia ao CADE é OBRIGATÓRIA. Taxa de notificação: R$ 85.028,26 (2024). Prazo de aprovação: 240 dias úteis (fase 1: 30 dias; prorrogável). Recomenda-se contratar advogado antitruste antes de assinar qualquer instrumento definitivo.`,
    }
  }

  // Ticket entre R$ 75M e R$ 750M → threshold II provavelmente atingido, I depende do comprador
  if (ticket >= 75_000_000) {
    return {
      resultado:    { status: 'provavel', nivel: 'alto' },
      threshold_i, threshold_ii, base_legal, prazo_legal,
      nota: `Ticket estimado (${intake.ticketEstimado}) indica que o threshold II (R$ 75 MM) provavelmente é atingido pelo alvo. O threshold I (R$ 750 MM) depende do faturamento consolidado do grupo do adquirente no Brasil. Se o comprador for grupo de médio a grande porte, a notificação ao CADE será obrigatória. Avaliar com o adquirente antes de fechar o SPA.`,
    }
  }

  // Ticket < R$ 75M → threshold II provavelmente não atingido
  return {
    resultado:    { status: 'nao_obrigatorio', nivel: 'baixo' },
    threshold_i, threshold_ii, base_legal, prazo_legal,
    nota: `Ticket estimado (${intake.ticketEstimado}) sugere que o threshold II (R$ 75 MM) provavelmente não é atingido pelo alvo. Ressalva: se o alvo fizer parte de grupo econômico maior ou tiver participações em outras empresas que elevem o faturamento consolidado acima de R$ 75 MM, a análise muda. Confirme o faturamento total do grupo antes de concluir pela dispensa.`,
  }
}

export function formatCADEForPrompt(check: CADECheck): string {
  const emoji: Record<string, string> = {
    critico: '🔴', alto: '🟡', medio: '🟠', baixo: '🟢',
  }
  const icon = emoji[check.resultado.nivel] ?? '⚪'
  return `
---
VERIFICAÇÃO CADE (automática — base: ${check.base_legal}):
${icon} STATUS: ${check.resultado.status.replace('_', ' ').toUpperCase()}
Threshold I: ${check.threshold_i}
Threshold II: ${check.threshold_ii}
Prazo legal: ${check.prazo_legal}
Avaliação: ${check.nota}
---`
}
