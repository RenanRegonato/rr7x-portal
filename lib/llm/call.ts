import { anthropic } from '@/lib/anthropic'
import { routeFor } from '@/lib/llm/models'
import { logLlmUsage, type LlmContext } from '@/lib/llm/usage-logger'

// callLLM — chokepoint ÚNICO para chamadas NÃO-streaming de LLM (Fase 0.2).
//
// Resolve provider + modelo a partir do registro central (routeFor), executa,
// loga uso/custo (best-effort) e devolve o texto já extraído. É AQUI que, no
// futuro, entra o roteamento para outro provider (Gemini/OpenAI) — em um lugar
// só, sem tocar nos agentes.
//
// Streaming (step route com thinking/cache/vision) NÃO passa por aqui ainda:
// a mecânica de stream difere por provider e o route é sensível. Por ora o route
// só consome o MODELO do registro (routeFor); a migração de streaming fica para
// quando formos de fato trocar o provider de um step streaming.

// Tipos frouxos para acompanhar o SDK sem acoplar demais.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SystemParam = string | any[]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MessageParam = { role: 'user' | 'assistant'; content: any }

export interface CallLLMOpts {
  task:         string          // chave no registro (lib/llm/models.ts)
  system:       SystemParam
  messages:     MessageParam[]
  maxTokens:    number
  temperature?: number
  thinking?:    boolean         // só ativa se a task tiver thinkingBudget no registro
  // observabilidade
  context:      LlmContext
  analiseId?:   string | null
  logStep?:     string          // default = task
  meta?:        Record<string, unknown> | null
}

export interface CallLLMResult {
  text:  string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  usage: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw:   any
}

export async function callLLM(opts: CallLLMOpts): Promise<CallLLMResult> {
  const route = routeFor(opts.task)
  const useThinking = !!opts.thinking && route.thinkingBudget != null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any = {
    model:      route.model,
    max_tokens: opts.maxTokens,
    system:     opts.system,
    messages:   opts.messages,
  }
  if (opts.temperature != null) params.temperature = opts.temperature
  if (useThinking) params.thinking = { type: 'enabled', budget_tokens: route.thinkingBudget }

  const t0 = Date.now()
  // Só Anthropic por enquanto. Quando houver outro provider, ramificar por route.provider.
  const resp = await anthropic.messages.create(params)

  void logLlmUsage({
    analiseId: opts.analiseId ?? null,
    context:   opts.context,
    step:      opts.logStep ?? opts.task,
    provider:  route.provider,
    model:     route.model,
    usage:     resp.usage,
    latencyMs: Date.now() - t0,
    thinking:  useThinking,
    meta:      opts.meta ?? null,
  })

  const block = resp.content.find((b) => b.type === 'text')
  const text = block && block.type === 'text' ? block.text : ''
  return { text, usage: resp.usage, raw: resp }
}
