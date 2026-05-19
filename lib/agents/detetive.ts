import { anthropic, HAIKU_MODEL } from '@/lib/anthropic'

// Agente "Detetive Dependência" — após uma regeneração executada,
// avalia quais OUTROS agentes da análise podem ter ficado inconsistentes
// com o novo output e recomenda reprocessamento.

export type Severidade = 'alta' | 'media' | 'baixa'

export interface ImpactoCascade {
  step_key:      string
  severidade:    Severidade
  justificativa: string
}

export interface DetetiveInput {
  step_regenerado_key:    string
  step_regenerado_label:  string
  output_anterior:        string
  output_novo:            string
  outputs_demais_agentes: Record<string, { label: string; conteudo: string }>
  intake:                 string
}

export interface DetetiveOutput {
  impactos: ImpactoCascade[]
}

const SYSTEM_PROMPT = `Você é o Detetive Dependência, agente que avalia o impacto de uma regeneração em um step da análise sobre os DEMAIS agentes da mesma análise.

Você recebe:
1. O step que foi regenerado, com a versão anterior e a nova versão
2. Os outputs atuais dos demais agentes da análise (que ainda não foram tocados)
3. O intake original do deal (para contexto)

Sua tarefa: identificar quais outros agentes possuem outputs que provavelmente ficaram inconsistentes com a nova versão do step regenerado, e portanto deveriam ser reprocessados.

Considere ao avaliar cada agente:
- O agente usa números, fatos ou conclusões que mudaram entre output_anterior e output_novo?
- O output do agente cita explicitamente dados do step regenerado?
- A coerência narrativa entre agentes ficou comprometida?
- Mudanças puramente cosméticas (estilo, ordem de parágrafos) NÃO devem disparar reprocessamento.

Severidade da recomendação:
- "alta": informação central foi alterada e o output do agente está claramente desatualizado/inconsistente. Reprocessar é fortemente recomendado.
- "media": parte do output do agente usa dados do step modificado; vale revisar para preservar coerência.
- "baixa": dependência marginal; reprocessar é opcional e provavelmente terá impacto mínimo.

IMPORTANTE: seja parcimonioso. Reprocessar um agente custa tokens e tempo; só recomende quando há diferença substantiva. Se nada mudou de relevante, retorne lista vazia.

Formato de resposta: SEMPRE retorne JSON puro válido neste schema exato, sem markdown, sem cercas, sem texto antes/depois:

{
  "impactos": [
    {
      "step_key": "<chave do agente impactado>",
      "severidade": "alta" | "media" | "baixa",
      "justificativa": "1 a 2 frases técnicas explicando o impacto específico (cite o dado que mudou e como o agente usa)"
    }
  ]
}

Se nenhum agente foi afetado significativamente, retorne {"impactos": []}.`

function truncate(s: string, max: number): string {
  if (!s) return '(vazio)'
  return s.length > max ? s.slice(0, max) + '\n...[truncado]' : s
}

function buildUserPrompt(input: DetetiveInput): string {
  const demais = Object.entries(input.outputs_demais_agentes)
    .map(([key, { label, conteudo }]) =>
      `## ${label} (step_key: ${key})\n${truncate(conteudo, 3500)}`
    )
    .join('\n\n')

  return `# Step regenerado

**Agente:** ${input.step_regenerado_label} (step_key: ${input.step_regenerado_key})

## Output ANTERIOR (versão antiga)
${truncate(input.output_anterior, 6000)}

## Output NOVO (versão regenerada)
${truncate(input.output_novo, 6000)}

---

# Outputs atuais dos demais agentes

${demais || '(nenhum)'}

---

# Intake original (contexto)
${truncate(input.intake, 3000)}

---

Avalie agora e retorne o JSON conforme instruído.`
}

export async function avaliarImpactoCascade(input: DetetiveInput): Promise<DetetiveOutput> {
  const resp = await anthropic.messages.create({
    model:       HAIKU_MODEL,
    max_tokens:  3000,
    temperature: 0,
    system:      SYSTEM_PROMPT,
    messages:    [{ role: 'user', content: buildUserPrompt(input) }],
  })

  const textBlock = resp.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Detetive não retornou texto')
  }

  const raw = textBlock.text.trim()
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Detetive não retornou JSON válido: ' + raw.slice(0, 200))
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    throw new Error('Detetive retornou JSON malformado: ' + jsonMatch[0].slice(0, 200))
  }

  const obj = parsed as { impactos?: unknown }
  if (!Array.isArray(obj.impactos)) {
    throw new Error('Detetive não retornou array de impactos')
  }

  const impactos: ImpactoCascade[] = []
  for (const item of obj.impactos) {
    if (!item || typeof item !== 'object') continue
    const it = item as { step_key?: unknown; severidade?: unknown; justificativa?: unknown }
    if (typeof it.step_key !== 'string') continue
    if (it.severidade !== 'alta' && it.severidade !== 'media' && it.severidade !== 'baixa') continue
    if (typeof it.justificativa !== 'string' || it.justificativa.length === 0) continue
    impactos.push({
      step_key:      it.step_key,
      severidade:    it.severidade,
      justificativa: it.justificativa,
    })
  }

  return { impactos }
}
