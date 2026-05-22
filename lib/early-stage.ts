// Detector de operações em estágio inicial / pré-operacional (early-stage).
//
// Um deal early-stage ainda não tem operação consolidada nem histórico
// financeiro (DRE, balancete, DFRE). A ausência desses documentos é ESPERADA
// e JUSTIFICADA — não deve penalizar o coverage, o score nem o relatório.
//
// Fonte única de verdade, usada por:
//   - app/api/analise/[id]/coverage-check (marca histórico financeiro como N/A)
//   - app/api/analise/[id]/step (injeta diretriz no contexto dos agentes + ressalva no relatório)
//   - lib/invest-match/builder (documentacao_score / pronto_para_dd)

type IntakeLike = Record<string, string | undefined> | null | undefined

// Valor explícito do campo "A operação já está em andamento?" no intake.
// 'nao' → projeto pré-operacional (autoritativo). 'sim' → já opera (autoritativo).
function operacaoEmAndamento(intake: IntakeLike): 'sim' | 'nao' | null {
  const raw = (intake?.operacaoEmAndamento ?? '').toLowerCase().trim()
  if (!raw) return null
  // o campo guarda o label escolhido no select; normaliza por prefixo/conteúdo
  if (/^n[aã]o|pr[eé][- ]?operacional|sem opera|sem hist[oó]rico/.test(raw)) return 'nao'
  if (/^sim|j[aá] (h[aá]|opera)|opera[çc][aã]o\/?receita|com opera/.test(raw)) return 'sim'
  return null
}

/**
 * Decide se o deal deve ser tratado como early-stage (pré-operacional).
 *
 * Precedência:
 *   1. Campo explícito "operacaoEmAndamento" é autoritativo quando preenchido:
 *      'sim' → NÃO é early-stage (mesmo com nível baixo, falta de doc é gap real);
 *      'nao' → É early-stage.
 *   2. Sem campo explícito (ex.: análises antigas): auto-detecção pelo estágio
 *      pré-operacional OU pelo nível de informação "Baixo".
 */
export function isEarlyStage(intake: IntakeLike): boolean {
  const op = operacaoEmAndamento(intake)
  if (op === 'sim') return false
  if (op === 'nao') return true

  // Fallback (campo explícito ausente) — auto-detecção
  const estagio = (intake?.estagio ?? '').toLowerCase()
  const nivel   = (intake?.nivelInformacao ?? '').toLowerCase()

  // estágios que indicam ativo ainda não operacional / não validado
  const estagioInicial =
    /pr[eé][- ]?operacional|origina[çc][aã]o|fase inicial|preliminar|n[aã]o[ -]?validad|\bcru\b/.test(estagio)

  const nivelBaixo = /baixo/.test(nivel)

  return estagioInicial || nivelBaixo
}

// Texto da ressalva institucional usada no relatório consolidado e como base
// para a diretriz injetada no contexto dos agentes. Linguagem de mercado, sem
// conotar "deal incompleto".
export const EARLY_STAGE_RESSALVA =
  'Por se tratar de uma operação em estágio inicial de estruturação, ainda sem ' +
  'histórico operacional consolidado, determinados documentos financeiros históricos ' +
  '(DRE, balancete, DFRE) não foram disponibilizados nesta etapa — o que é esperado para ' +
  'o estágio. A análise foi conduzida com base nos materiais estratégicos, projeções, ' +
  'estrutura proposta e potencial econômico da operação.'

// Diretriz injetada no bloco DEAL INTAKE lido por todos os agentes do pipeline.
export const EARLY_STAGE_DIRETRIZ_AGENTE = `

================================
⚠️ OPERAÇÃO EM ESTÁGIO INICIAL DE ESTRUTURAÇÃO (PROJETO PRÉ-OPERACIONAL)
================================
Este deal ainda NÃO possui operação consolidada nem histórico financeiro (DRE, balancete, DFRE, fluxo de caixa histórico). A ausência desses demonstrativos é ESPERADA E JUSTIFICADA para o estágio — não a trate como lacuna crítica, não penalize o deal por ela e não a classifique como "informação faltante" ou "dado indisponível".

Conduza a análise com base nos materiais estratégicos, projeções, estrutura proposta, uso de recursos e potencial econômico da operação. Onde você normalmente avaliaria a saúde financeira histórica, avalie viabilidade, coerência da tese, qualidade da estrutura proposta e potencial. Seja rigoroso quanto à consistência do projeto — apenas não exija histórico que, por definição, ainda não existe.`
