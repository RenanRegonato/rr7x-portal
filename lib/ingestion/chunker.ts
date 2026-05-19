// Chunker semântico simples. Tenta quebrar em fronteiras naturais (parágrafos, sentenças)
// dentro do orçamento de tokens. Overlap entre chunks pra preservar contexto.
//
// Não usa tiktoken pra Anthropic — Claude tokenization é aproximadamente 4 chars = 1 token
// para português/inglês. Usamos chars como proxy direto.

export interface Chunk {
  index:       number
  text:        string
  char_start:  number
  char_end:    number
  token_count: number   // estimado (chars / 4)
}

const TARGET_TOKENS = 30_000        // alvo por chunk (~120k chars)
const TARGET_CHARS  = TARGET_TOKENS * 4
const OVERLAP_CHARS = 8_000         // 2k tokens de overlap = ~6% redundância
const MIN_CHARS     = 1_000         // chunks menores que isso são concatenados ao anterior

/**
 * Quebra o texto em chunks de ~30k tokens com overlap de ~2k tokens.
 * Prefere quebrar em fronteiras naturais (\n\n > \n > . > espaço).
 */
export function chunkText(rawText: string): Chunk[] {
  const text = rawText.trim()
  if (text.length === 0) return []
  if (text.length <= TARGET_CHARS) {
    return [{ index: 0, text, char_start: 0, char_end: text.length, token_count: Math.ceil(text.length / 4) }]
  }

  const chunks: Chunk[] = []
  let cursor = 0
  let idx = 0

  while (cursor < text.length) {
    const remaining = text.length - cursor
    if (remaining <= TARGET_CHARS + MIN_CHARS) {
      // Cabe tudo no último chunk
      chunks.push(makeChunk(idx++, text, cursor, text.length))
      break
    }

    const window = cursor + TARGET_CHARS
    const breakAt = findBreakpoint(text, window, cursor + MIN_CHARS)
    chunks.push(makeChunk(idx++, text, cursor, breakAt))
    cursor = Math.max(cursor + 1, breakAt - OVERLAP_CHARS)
  }

  return chunks
}

function makeChunk(index: number, full: string, start: number, end: number): Chunk {
  const slice = full.slice(start, end)
  return {
    index,
    text:        slice,
    char_start:  start,
    char_end:    end,
    token_count: Math.ceil(slice.length / 4),
  }
}

/**
 * Tenta encontrar um ponto de quebra natural perto do alvo.
 * Preferência: \n\n > \n > .  > espaço > qualquer char.
 * Sempre retorna pelo menos minPos pra evitar chunks vazios.
 */
function findBreakpoint(text: string, target: number, minPos: number): number {
  const cap = Math.min(target, text.length)
  if (cap <= minPos) return cap

  const window = text.slice(minPos, cap)

  // 1) último \n\n
  const para = window.lastIndexOf('\n\n')
  if (para !== -1) return minPos + para + 2

  // 2) último \n
  const nl = window.lastIndexOf('\n')
  if (nl !== -1) return minPos + nl + 1

  // 3) último . (final de sentença)
  const dot = window.lastIndexOf('. ')
  if (dot !== -1) return minPos + dot + 2

  // 4) último espaço
  const sp = window.lastIndexOf(' ')
  if (sp !== -1) return minPos + sp + 1

  // 5) corta no alvo mesmo
  return cap
}
