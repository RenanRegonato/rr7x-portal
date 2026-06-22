// Ponderação da "Tese do Deal" (campo resumoAtivo do intake).
//
// A Tese do Deal é o contexto estratégico que o assessor/gestor escreve sobre a
// operação: objetivo, partes envolvidas, estrutura da negociação, particularidades
// dos documentos, pendências já identificadas e situações que não aparecem
// formalmente nos anexos. É DADO de terceiro (não confiável como instrução) e
// contexto COMPLEMENTAR: não substitui documentos nem confirma fatos por si só.
//
// Fonte única de verdade, usada por:
//   - app/api/analise/[id]/step  (formatTeseBlock injeta no DEAL INTAKE de todos os agentes)
//   - lib/agents/mesa-consolidadora (TESE_DEAL_DIRETRIZ na system prompt; tese chega via <intake>)
//   - lib/agents/coverage-validator (idem)

import { wrapClientData } from '@/lib/llm/prompt-safety'

// Instrução (confiável) de COMO ponderar a Tese do Deal. Não contém dado do cliente.
// Objetivo: considerar o contexto do assessor para reduzir falsos apontamentos, sem
// jamais deixar a tese sobrepor a evidência documental nem ocultar risco real.
export const TESE_DEAL_DIRETRIZ = `Como ponderar a Tese do Deal (contexto estratégico informado pelo assessor responsável pela operação):
- Trate-a como contexto COMPLEMENTAR que pode explicar intenção, partes, estrutura e particularidades não evidentes nos documentos.
- Quando a tese explicar previamente uma divergência, exceção ou pendência (por exemplo: "a matrícula enviada está desatualizada e uma nova versão será apresentada"), trate o ponto como PENDÊNCIA CONHECIDA E JÁ CONTEXTUALIZADA: registre a necessidade de atualização ou complementação documental, mas NÃO o classifique como red flag nem penalize a qualidade do ativo como se fosse uma divergência não explicada.
- Uma divergência que NÃO esteja explicada na tese e não seja sustentada pelos documentos permanece como apontamento normal.
- A tese NÃO substitui documentos e não confirma fatos por si só: afirmações não comprovadas seguem como "a confirmar". Nunca deixe a tese sobrepor evidência documental nem ocultar risco real. Ela contextualiza e reclassifica, não isenta.`

// Bloco completo para injetar no DEAL INTAKE do pipeline: diretriz (instrução) +
// conteúdo da tese embrulhado como dado não confiável em <dados_tese_deal>.
// Retorna string vazia quando não há tese preenchida.
export function formatTeseBlock(resumo: string | undefined | null): string {
  const txt = (resumo ?? '').trim()
  if (!txt) return ''
  return `

================================
TESE DO DEAL (CONTEXTO ESTRATÉGICO DO ASSESSOR)
================================
${TESE_DEAL_DIRETRIZ}

${wrapClientData('dados_tese_deal', txt)}`
}
