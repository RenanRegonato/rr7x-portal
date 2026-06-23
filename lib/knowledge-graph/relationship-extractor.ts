/**
 * Extrai entidades e relacionamentos de chunks usando Haiku.
 * Fonte única de verdade estruturada para KYC, estrutura societária, garantias.
 */

import { callLLM } from '@/lib/llm/call'

export type TipoEntidade = 'pessoa_fisica' | 'pessoa_juridica' | 'imovel' | 'veiculo' | 'direitos' | 'outro'
export type TipoRelacionamento = 'socio' | 'proprietario' | 'garante' | 'avalista' | 'beneficiario' | 'cedente' | 'sacado' | 'administrador' | 'outro'

export interface ExtractedEntity {
  tipo: TipoEntidade
  nome: string
  identificador?: string  // CPF, CNPJ, matrícula, etc
  dados: Record<string, unknown>
  confianca: number
}

export interface ExtractedRelationship {
  entidade_origem_nome: string
  entidade_origem_tipo: TipoEntidade
  tipo: TipoRelacionamento
  entidade_destino_nome: string
  entidade_destino_tipo: TipoEntidade
  percentual?: number  // para participação
  confianca: number
}

export interface ExtractionResult {
  entidades: ExtractedEntity[]
  relacionamentos: ExtractedRelationship[]
  raw_text?: string
}

const EXTRACTION_SYSTEM = `Você é um extrator jurídico-financeiro especializado em estrutura societária, garantias e KYC.

Seu trabalho é extrair de um documento:
1. ENTIDADES: pessoas (física/jurídica), imóveis, veículos, direitos creditórios
2. RELACIONAMENTOS: quem é sócio de quem, quem é proprietário, quem é garante, etc.

## Entidades

Tipos:
- pessoa_fisica: nome, CPF, RG, nacionalidade, profissão
- pessoa_juridica: razão social, CNPJ, tipo de empresa
- imovel: endereço, matrícula cartório, área, tipo (residencial, comercial)
- veiculo: marca, modelo, placa, chassi, ano
- direitos: recebíveis, duplicatas, CRIs, FIDCs
- outro: qualquer outra entidade mencionada

Dados: capture TODOS os campos mencionados no documento (não invente).

## Relacionamentos

Tipos:
- socio: A é sócio de B (com percentual se disponível)
- proprietario: A é proprietário de B
- garante: A garante/hipoteca sobre B
- avalista: A é avalista de B
- beneficiario: A é beneficiário de B
- cedente: A cede direitos a B (recebíveis, duplicatas)
- sacado: A é sacado em operação com B
- administrador: A administra B
- outro: qualquer outra relação

Confiança: 1.0 se explícito, 0.8 se inferido, 0.6 se ambíguo.

## Output JSON

{
  "entidades": [
    {"tipo": "pessoa_juridica", "nome": "XYZ Ltda", "identificador": "12.345.678/0001-90", "dados": {"cnpj": "...", "razao_social": "..."}, "confianca": 0.95}
  ],
  "relacionamentos": [
    {"entidade_origem_nome": "João Silva", "entidade_origem_tipo": "pessoa_fisica", "tipo": "socio", "entidade_destino_nome": "XYZ Ltda", "entidade_destino_tipo": "pessoa_juridica", "percentual": 70, "confianca": 0.95}
  ]
}

Responda APENAS com JSON válido, sem markdown nem prosa.`;

/**
 * Extrai entidades e relacionamentos de um chunk via Haiku.
 */
export async function extractRelationships(chunkText: string): Promise<ExtractionResult> {
  const prompt = `Extraia entidades e relacionamentos do seguinte trecho:\n\n"""${chunkText.slice(0, 3000)}"""`;

  try {
    const response = await callLLM({
      task: 'kg_relationship_extract',
      system: EXTRACTION_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 2000,
      temperature: 0,
      context: 'ingestion',
    });

    try {
      const parsed = JSON.parse(response.text) as {
        entidades?: ExtractedEntity[]
        relacionamentos?: ExtractedRelationship[]
      }
      return {
        entidades: parsed.entidades ?? [],
        relacionamentos: parsed.relacionamentos ?? [],
        raw_text: response.text,
      }
    } catch (parseErr) {
      console.error('JSON parse error em kg extraction:', parseErr, response.text)
      return {
        entidades: [],
        relacionamentos: [],
        raw_text: response.text,
      }
    }
  } catch (err) {
    console.error('Erro ao extrair relacionamentos:', err)
    return { entidades: [], relacionamentos: [] }
  }
}

/**
 * Extrai relacionamentos de múltiplos chunks em paralelo.
 */
export async function extractRelationshipsBatch(
  chunks: Array<{ id: string; text: string }>,
): Promise<Map<string, ExtractionResult>> {
  const results = new Map<string, ExtractionResult>()

  const CONCURRENCY = 3
  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    const batch = chunks.slice(i, i + CONCURRENCY)
    const promises = batch.map(async (chunk) => {
      const result = await extractRelationships(chunk.text)
      return { id: chunk.id, result }
    })

    const batchResults = await Promise.all(promises)
    batchResults.forEach(({ id, result }) => results.set(id, result))
  }

  return results
}
