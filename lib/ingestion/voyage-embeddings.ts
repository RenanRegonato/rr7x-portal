// Voyage AI client via fetch direto. SDK oficial tem bundling quebrado no Next.js
// (directory imports não suportados). API REST é simples e estável.
// Docs: https://docs.voyageai.com/reference/embeddings-api

const MODEL = 'voyage-3-large'   // 1024 dim, top performance multilingual incluindo PT-BR
const BATCH_SIZE = 128            // limite da API
const MAX_TOKENS_PER_BATCH = 120_000
const API_URL = 'https://api.voyageai.com/v1/embeddings'

interface VoyageEmbedResponse {
  data?:  Array<{ embedding?: number[]; index?: number }>
  model?: string
  usage?: { total_tokens?: number }
}

/**
 * Gera embeddings em lote pra `texts`. Quebra automaticamente em batches que respeitam
 * os limites da API. Retorna na mesma ordem dos inputs.
 */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const apiKey = process.env.VOYAGE_API_KEY
  if (!apiKey) throw new Error('VOYAGE_API_KEY not set')

  const batches = batchByLimits(texts)
  const results: number[][] = new Array(texts.length)

  for (const batch of batches) {
    const json = await callVoyage(apiKey, {
      input:      batch.texts,
      model:      MODEL,
      input_type: 'document',
    })

    const items = json.data ?? []
    for (let i = 0; i < items.length; i++) {
      const embedding = items[i]?.embedding
      if (!embedding) throw new Error(`Embedding vazio no índice ${batch.startIndex + i}`)
      results[batch.startIndex + i] = embedding
    }
  }

  for (let i = 0; i < texts.length; i++) {
    if (!results[i]) throw new Error(`Embedding ${i} não foi preenchido`)
  }
  return results
}

/** Embedding único pra query de busca (input_type: 'query'). */
export async function embedQuery(text: string): Promise<number[]> {
  const apiKey = process.env.VOYAGE_API_KEY
  if (!apiKey) throw new Error('VOYAGE_API_KEY not set')

  const json = await callVoyage(apiKey, {
    input:      text,
    model:      MODEL,
    input_type: 'query',
  })
  const emb = json.data?.[0]?.embedding
  if (!emb) throw new Error('Embedding vazio na query')
  return emb
}

async function callVoyage(
  apiKey: string,
  body:   { input: string | string[]; model: string; input_type: 'document' | 'query' },
): Promise<VoyageEmbedResponse> {
  const res = await fetch(API_URL, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '<sem body>')
    throw new Error(`Voyage API ${res.status}: ${text.slice(0, 500)}`)
  }
  return await res.json() as VoyageEmbedResponse
}

interface Batch { texts: string[]; startIndex: number }

function batchByLimits(texts: string[]): Batch[] {
  const batches: Batch[] = []
  let current: string[] = []
  let currentTokens = 0
  let startIndex = 0
  let i = 0

  for (const t of texts) {
    const estTokens = Math.ceil(t.length / 4)
    const wouldOverflow =
      current.length >= BATCH_SIZE ||
      currentTokens + estTokens > MAX_TOKENS_PER_BATCH

    if (current.length > 0 && wouldOverflow) {
      batches.push({ texts: current, startIndex })
      current = []
      currentTokens = 0
      startIndex = i
    }
    current.push(t)
    currentTokens += estTokens
    i++
  }
  if (current.length > 0) batches.push({ texts: current, startIndex })
  return batches
}
