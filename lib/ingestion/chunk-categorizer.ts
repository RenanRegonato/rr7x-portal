/**
 * Categoriza chunks em: financeiro, juridico, tributario, garantias, estrutura, outro.
 * Usa Haiku (barato) + cache/batch processing.
 */

import { callLLM } from '@/lib/llm/call'

export type ChunkCategory = 'financeiro' | 'juridico' | 'tributario' | 'garantias' | 'estrutura' | 'outro'

const CATEGORIZER_SYSTEM = `Você é um classificador de conteúdo jurídico-financeiro. Analise o seguinte trecho e classifique-o em UMA única categoria.

Categorias:
- financeiro: DRE, balanço, demonstração de fluxo de caixa, extratos bancários, números financeiros, EBITDA, receita, custos, lucro, passivos financeiros
- juridico: contratos, cláusulas, matrículas imobiliárias, certidões, procurações, documentos cartoriais, atos societários
- tributario: Imposto de Renda, DARF, certidão de regularização fiscal, CNPJ, regime tributário, apurações
- garantias: garantias imobiliárias (hipotecas), penhoras, notas promissórias como garantia, aval, fiança
- estrutura: sócios, participações acionárias, composição societária, cedentes, originadores, administradores
- outro: informações gerais que não se encaixam nas categorias acima

Responda APENAS com a palavra da categoria (sem pontuação, sem explicação).`;

interface CategorizeResult {
  categoria: ChunkCategory
  confianca: number
}

/**
 * Categoriza um chunk via Haiku.
 * Retorna categoria + score de confiança (0-1).
 */
export async function categorizeChunk(chunkText: string): Promise<CategorizeResult> {
  const userPrompt = `Classifique este trecho:\n\n"""${chunkText.slice(0, 2000)}"""`;

  try {
    const response = await callLLM({
      task: 'chunk_categorizer', // vai usar default ou fallback (Haiku)
      system: CATEGORIZER_SYSTEM,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 20, // resposta será só "financeiro" ou similar
      temperature: 0,
      context: 'ingestion',
    });

    const resultado = response.text.toLowerCase().trim();

    // Validação: resposta tem que ser uma das categorias
    const validCategories: ChunkCategory[] = ['financeiro', 'juridico', 'tributario', 'garantias', 'estrutura', 'outro'];
    const categoria: ChunkCategory = validCategories.includes(resultado as ChunkCategory)
      ? (resultado as ChunkCategory)
      : 'outro';

    // Confiança: se foi exato, alta; senão, média
    const confianca = resultado === categoria ? 0.95 : 0.70;

    return { categoria, confianca };
  } catch (err) {
    console.error('Erro ao categorizar chunk:', err);
    return { categoria: 'outro', confianca: 0.5 }; // fallback conservador
  }
}

/**
 * Categoriza múltiplos chunks em batch (mais eficiente para Inngest).
 * Retorna mapa de chunk_id -> categoria.
 */
export async function categorizeChunksBatch(chunks: Array<{ id: string; text: string }>): Promise<Map<string, ChunkCategory>> {
  const results = new Map<string, ChunkCategory>();

  // Processa em paralelo (limite de concorrência pra não explodir a API)
  const CONCURRENCY = 5;
  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    const batch = chunks.slice(i, i + CONCURRENCY);
    const promises = batch.map(async (chunk) => {
      const { categoria } = await categorizeChunk(chunk.text);
      return { id: chunk.id, categoria };
    });

    const batchResults = await Promise.all(promises);
    batchResults.forEach(({ id, categoria }) => results.set(id, categoria));
  }

  return results;
}
