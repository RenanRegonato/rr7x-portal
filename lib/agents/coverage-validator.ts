import { callLLM } from '@/lib/llm/call'
import { PROMPT_INJECTION_GUARD } from '@/lib/llm/prompt-safety'
import type { ChecklistItem, TipoOperacao } from '@/lib/coverage-checklists'

// Coverage Validator (Fase 11) — agente que avalia se cada item da
// checklist obrigatória da operação foi efetivamente coberto pelos
// outputs dos agentes especialistas.

// 'nao_aplicavel' é atribuído deterministicamente pela rota (não pela IA) a itens
// de histórico financeiro em deals early-stage / pré-operacionais. Ver lib/early-stage.ts.
export type CoverageStatus = 'coberto' | 'parcial' | 'nao_coberto' | 'nao_aplicavel'

export interface CoverageItemResult {
  key:                  string
  label:                string
  status:               CoverageStatus
  evidencia:            string  // citação onde foi coberto
  justificativa:        string  // explica o status
  agentes_responsaveis: string[]
}

export interface CoverageInput {
  tipo_operacao:   TipoOperacao
  checklist:       ChecklistItem[]
  outputs_agentes: Record<string, { label: string; conteudo: string }>
  intake_resumo:   string
}

export interface CoverageOutput {
  items: CoverageItemResult[]
  resumo: { coberto: number; parcial: number; nao_coberto: number; nao_aplicavel: number }
}

const SYSTEM_PROMPT = `Você é o Coverage Validator da Mandor — agente que valida se uma análise multiagente cobriu todos os pontos OBRIGATÓRIOS para o tipo de operação em questão.

Não avalia QUALIDADE da análise — isso é trabalho da Mesa. Avalia apenas se cada item da checklist foi efetivamente abordado.

# Critérios de status por item

## "coberto"
- O item foi abordado com profundidade adequada em pelo menos um dos outputs dos agentes
- Há dados concretos / números / análise sobre o tema
- O assessor consegue responder uma pergunta de comitê sobre este tópico

## "parcial"
- O item foi mencionado mas sem profundidade suficiente
- Faltam números, faltam fontes, ou a análise é genérica
- Em comitê, o assessor teria dificuldade de defender

## "nao_coberto"
- O item NÃO foi abordado em nenhum output, OU
- Foi declarado "informação não disponível" sem alternativa
- O comitê notaria a ausência

# Evidência

Para itens "coberto" e "parcial", cite o agente onde encontrou + trecho específico (ex: "diagnostico: 'EBITDA 2024: R$ 2.3M ajustado por R$ 800k não-recorrentes'").

# Formato de saída

Retorne SOMENTE JSON puro, sem markdown, sem cercas:

{
  "items": [
    {
      "key": "ebitda_normalizado",
      "status": "coberto" | "parcial" | "nao_coberto",
      "evidencia": "diagnostico: 'EBITDA ajustado de R$ 2.3M, removendo R$ 800k de eventos não-recorrentes (...)'",
      "justificativa": "EBITDA foi calculado, normalizado por itens não-recorrentes claramente identificados."
    }
  ]
}

A lista DEVE conter exatamente um item para cada checklist key recebida (na mesma ordem).

${PROMPT_INJECTION_GUARD}`

function buildUserPrompt(input: CoverageInput): string {
  const outputs = Object.entries(input.outputs_agentes)
    .map(([key, { label, conteudo }]) =>
      `## ${label} (step: ${key})\n${truncate(conteudo, 3000)}`
    )
    .join('\n\n---\n\n')

  const checklist = input.checklist
    .map(c => `- **${c.key}** (${c.label}): ${c.description} — agentes esperados: ${c.agentes_responsaveis.join(', ')}`)
    .join('\n')

  return `# Tipo de operação

${input.tipo_operacao}

# Checklist obrigatório (${input.checklist.length} itens)

${checklist}

---

# Outputs dos agentes

${outputs || '(nenhum)'}

---

# Intake

${input.intake_resumo}

---

Avalie agora item-a-item. Retorne JSON com EXATAMENTE ${input.checklist.length} entries em "items" (uma por chave da checklist, na mesma ordem listada).`
}

function truncate(s: string, max: number): string {
  if (!s) return '(vazio)'
  return s.length > max ? s.slice(0, max) + '\n...[truncado]' : s
}

export async function validarCoverage(input: CoverageInput, analiseId?: string): Promise<CoverageOutput> {
  const { text } = await callLLM({
    task:        'coverage_check',
    context:     'validators',
    analiseId,
    system: [
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral', ttl: '1h' } },
    ],
    messages:    [{ role: 'user', content: buildUserPrompt(input) }],
    maxTokens:   6000,
    temperature: 0,
  })
  if (!text) throw new Error('Coverage Validator não retornou texto')

  const raw = text.trim()
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Coverage Validator não retornou JSON válido')

  let parsed: unknown
  try { parsed = JSON.parse(jsonMatch[0]) }
  catch { throw new Error('Coverage Validator retornou JSON malformado') }

  const obj = parsed as { items?: unknown }
  if (!Array.isArray(obj.items)) throw new Error('Resposta não tem array items')

  const VALID_STATUS: CoverageStatus[] = ['coberto', 'parcial', 'nao_coberto']

  // Merge com a checklist original para garantir todos os items + agentes_responsaveis
  const results: CoverageItemResult[] = []
  for (const checklistItem of input.checklist) {
    const fromIA = (obj.items as Partial<CoverageItemResult>[]).find(
      (i) => i?.key === checklistItem.key
    )

    if (fromIA && VALID_STATUS.includes(fromIA.status as CoverageStatus)) {
      results.push({
        key:                  checklistItem.key,
        label:                checklistItem.label,
        status:               fromIA.status as CoverageStatus,
        evidencia:            typeof fromIA.evidencia     === 'string' ? fromIA.evidencia     : '',
        justificativa:        typeof fromIA.justificativa === 'string' ? fromIA.justificativa : '',
        agentes_responsaveis: checklistItem.agentes_responsaveis,
      })
    } else {
      // IA não retornou ou retornou inválido — marca como nao_coberto por segurança
      results.push({
        key:                  checklistItem.key,
        label:                checklistItem.label,
        status:               'nao_coberto',
        evidencia:            '',
        justificativa:        'Não foi possível validar este item (resposta inválida da IA).',
        agentes_responsaveis: checklistItem.agentes_responsaveis,
      })
    }
  }

  const resumo = { coberto: 0, parcial: 0, nao_coberto: 0, nao_aplicavel: 0 }
  for (const r of results) resumo[r.status]++

  return { items: results, resumo }
}
