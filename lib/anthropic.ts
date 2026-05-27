import Anthropic from '@anthropic-ai/sdk'
import { MODELS } from '@/lib/llm/models'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// IDs de modelo agora têm fonte única em lib/llm/models.ts (registro central de
// roteamento). Estes re-exports ficam por compatibilidade com importadores
// existentes; código novo deve usar callLLM({ task }) (lib/llm/call.ts).
export const MODEL       = MODELS.sonnet
export const HAIKU_MODEL = MODELS.haiku
