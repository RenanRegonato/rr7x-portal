import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// Sonnet 4.6: agentes principais de raciocínio profundo (análises financeiras,
// M&A, estruturação, revisão narrativa, mesa consolidadora, sentinela).
export const MODEL       = 'claude-sonnet-4-6'

// Haiku 4.5: agentes auxiliares com tarefa estruturada (extração JSON,
// classificação, validação de checklist, compressão). 3x mais barato no input,
// 3x mais barato no output que Sonnet 4.6.
export const HAIKU_MODEL = 'claude-haiku-4-5-20251001'
