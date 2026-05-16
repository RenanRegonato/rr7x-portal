import { anthropic, MODEL } from '@/lib/anthropic'

// Agente "Revisor Régis" — avalia pedidos de regeneração de step.
// Não regenera nada; apenas analisa se o briefing faz sentido técnico.

export interface RevisorInput {
  step_key:        string
  step_label:      string
  briefing_o_que:  string
  briefing_motivo: string
  intake:          string        // resumo do deal intake
  output_atual:    string        // output atual do step a ser regenerado
  outputs_upstream?: Record<string, string>  // outputs de agentes upstream relevantes
}

export type RevisorDecisao = 'aprovou' | 'contra_argumentou'

export interface RevisorOutput {
  decisao:    RevisorDecisao
  argumento:  string
  riscos:     string[]
}

const SYSTEM_PROMPT = `Você é o Revisor Régis, um agente que avalia pedidos de regeneração de steps de análises financeiras institucionais (M&A, crédito estruturado, due diligence).

Receberá um briefing do assessor explicando o que quer alterar e por quê, junto com o contexto técnico da análise (intake, output atual do step, outputs de agentes upstream).

Sua tarefa é decidir se a alteração faz sentido tecnicamente, considerando:
- O briefing é coerente com os dados de origem (intake, documentos)?
- A mudança proposta contradiz fatos hard (números, datas, contratos)?
- Ela introduz inconsistência com análises de outros agentes (upstream)?
- O motivo apresentado é técnico/substantivo ou cosmético/preferência?
- Existem riscos relevantes na alteração (perda de rigor, viés, omissão de informação importante)?

Política da decisão:
- "aprovou" quando o pedido é tecnicamente sólido e a mudança melhora a análise.
- "contra_argumentou" quando você identifica problemas — mas a decisão final SEMPRE será do assessor; sua argumentação serve como "double check" técnico, não como bloqueio.

Tom: direto, técnico, em português do Brasil. Sem hedging excessivo. Cite dados específicos quando possível.

Formato de resposta: SEMPRE retorne JSON puro válido neste schema exato, sem markdown, sem cercas de código, sem texto antes/depois:

{
  "decisao": "aprovou" | "contra_argumentou",
  "argumento": "1 a 3 parágrafos explicando a decisão. Se aprovou: o que vai melhorar. Se contra_argumentou: quais são os problemas técnicos identificados e por que a alteração pode prejudicar a coerência da análise.",
  "riscos": ["risco 1", "risco 2"]
}

O campo "riscos" pode ser vazio ([]) se você aprovou sem ressalvas.`

function buildUserPrompt(input: RevisorInput): string {
  const upstream = input.outputs_upstream && Object.keys(input.outputs_upstream).length > 0
    ? Object.entries(input.outputs_upstream)
        .map(([key, val]) => `## ${key}\n${truncate(val, 4000)}`)
        .join('\n\n')
    : '(nenhum output upstream relevante)'

  return `# Pedido de regeneração de step

**Step solicitado:** ${input.step_label} (${input.step_key})

## Briefing do assessor

**O que ele quer alterar:**
${input.briefing_o_que}

**Motivo:**
${input.briefing_motivo}

## Contexto técnico

### Deal intake (resumo)
${truncate(input.intake, 5000)}

### Output atual do step "${input.step_label}"
${truncate(input.output_atual, 8000)}

### Outputs de agentes upstream
${upstream}

---

Avalie agora e retorne o JSON conforme instruído.`
}

function truncate(s: string, max: number): string {
  if (!s) return '(vazio)'
  return s.length > max ? s.slice(0, max) + '\n...[truncado]' : s
}

export async function avaliarPedidoRegeneracao(input: RevisorInput): Promise<RevisorOutput> {
  const resp = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(input) }],
  })

  const textBlock = resp.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Revisor não retornou texto')
  }

  const raw = textBlock.text.trim()

  // Tenta extrair JSON (mesmo se vier com cercas ou texto extra)
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Revisor não retornou JSON válido: ' + raw.slice(0, 200))
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    throw new Error('Revisor retornou JSON malformado: ' + jsonMatch[0].slice(0, 200))
  }

  const obj = parsed as { decisao?: string; argumento?: string; riscos?: unknown }

  if (obj.decisao !== 'aprovou' && obj.decisao !== 'contra_argumentou') {
    throw new Error(`Revisor retornou decisao inválida: ${obj.decisao}`)
  }
  if (typeof obj.argumento !== 'string' || obj.argumento.length === 0) {
    throw new Error('Revisor retornou argumento vazio')
  }

  const riscos = Array.isArray(obj.riscos)
    ? obj.riscos.filter((r): r is string => typeof r === 'string')
    : []

  return {
    decisao:   obj.decisao,
    argumento: obj.argumento,
    riscos,
  }
}
