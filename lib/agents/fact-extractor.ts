import { callLLM } from '@/lib/llm/call'
import { PROMPT_INJECTION_GUARD, truncateField } from '@/lib/llm/prompt-safety'
import type { FactType } from '@/lib/truth-layer'

// Fact Extractor — converte o output narrativo do drive_intake em fatos
// estruturados (JSON) que vão para a tabela analise_facts.
//
// Os agentes downstream consultam esses fatos antes de fazer afirmações,
// eliminando a fonte raiz dos problemas do tipo "DRE ausente vs EBITDA calculado".

export interface ExtractedFact {
  fact_type:    FactType
  key:          string
  value:        Record<string, unknown> | unknown[]
  source_doc?:  string | null
  source_page?: number | null
  source_quote?: string | null
  confidence:   number
  notes?:       string | null
}

interface ExtractorInput {
  intake_resumo:       string  // resumo do deal_intake (campos não sensíveis)
  drive_intake_output: string  // output narrativo do agente drive_intake
}

interface ExtractorOutput {
  facts: ExtractedFact[]
}

const SYSTEM_PROMPT = `Você é o Extrator de Fatos da Mandor — agente que converte o relatório narrativo da ingestão documental em FATOS ESTRUTURADOS (JSON), que comporão a "camada de verdade" da análise.

Sua missão: garantir que os agentes downstream NUNCA mais afirmem que um documento está ausente quando ele foi processado, nem citem números que não estão nos documentos.

Você receberá:
1. Resumo do intake do deal (contexto)
2. Output narrativo do agente drive_intake (relatório de leitura dos documentos)

Sua tarefa: extrair fatos estruturáveis e devolver JSON puro neste schema:

{
  "facts": [
    {
      "fact_type": "documento_disponivel" | "numero_financeiro" | "estrutura_societaria" | "contrato" | "garantia" | "passivo" | "evento_relevante" | "lacuna",
      "key": "chave_canonica_em_snake_case",
      "value": { ... },
      "source_doc": "nome_do_arquivo.pdf",
      "source_page": 3,
      "source_quote": "trecho literal opcional",
      "confidence": 0.85,
      "notes": "observação opcional"
    }
  ]
}

## Tipos de fato e exemplos

### documento_disponivel
Para cada documento que o drive_intake processou (com sucesso ou falha):
\`\`\`
{
  "fact_type": "documento_disponivel",
  "key": "dre_2024",
  "value": { "nome": "DRE 2024", "disponivel": true, "tipo_documento": "demonstrativo_resultado" },
  "source_doc": "balanco_2024.pdf",
  "source_page": 3,
  "confidence": 0.95
}
\`\`\`
Se um arquivo foi listado mas falhou na leitura: \`"disponivel": false, "status": "erro_leitura"\`.

### numero_financeiro
Para cada métrica financeira identificada (receita, EBITDA, dívida, fluxo de caixa, ativo total, patrimônio, etc.):
\`\`\`
{
  "fact_type": "numero_financeiro",
  "key": "ebitda_2024",
  "value": { "amount": 2300000, "unit": "BRL", "periodo": "2024", "descricao": "EBITDA 2024" },
  "source_doc": "balanco_2024.pdf",
  "source_page": 3,
  "source_quote": "EBITDA = R$ 2.300.000",
  "confidence": 0.90
}
\`\`\`

### estrutura_societaria
Para cada sócio/participação identificada:
\`\`\`
{
  "fact_type": "estrutura_societaria",
  "key": "socio_majoritario",
  "value": { "nome": "João Silva", "cpf_cnpj": "123.456.789-00", "participacao_pct": 60 },
  "source_doc": "contrato_social.pdf",
  "confidence": 0.95
}
\`\`\`

### contrato
Para cada contrato relevante (cessão, fornecimento, dívida, etc.):
\`\`\`
{
  "fact_type": "contrato",
  "key": "contrato_cessao_clienteX",
  "value": { "tipo": "cessao_recebiveis", "contraparte": "Cliente X", "valor_total": 5000000, "prazo_meses": 36 },
  "source_doc": "contratos.pdf",
  "confidence": 0.80
}
\`\`\`

### garantia
Colaterais identificados (imóveis, recebíveis, equipamentos, etc.):
\`\`\`
{
  "fact_type": "garantia",
  "key": "imovel_sede",
  "value": { "tipo": "imovel", "descricao": "Sede administrativa", "valor_avaliado": 8000000 },
  "confidence": 0.70
}
\`\`\`

### passivo
Dívidas, processos, obrigações descobertas:
\`\`\`
{
  "fact_type": "passivo",
  "key": "divida_bancaria_x",
  "value": { "tipo": "emprestimo_bancario", "credor": "Banco X", "saldo_devedor": 1200000, "vencimento": "2027-06" },
  "confidence": 0.85
}
\`\`\`

### evento_relevante
M&A history, processos judiciais, mudança de controle, eventos materiais:
\`\`\`
{
  "fact_type": "evento_relevante",
  "key": "ma_2022",
  "value": { "tipo": "aquisicao", "alvo": "Empresa Y", "ano": 2022 },
  "confidence": 0.75
}
\`\`\`

### lacuna
CRÍTICO: registre o que NÃO foi encontrado mas seria esperado para uma análise rigorosa:
\`\`\`
{
  "fact_type": "lacuna",
  "key": "balanco_2023",
  "value": { "descricao": "Balanço 2023 não foi fornecido", "criticidade": "alta", "impacto": "Comparação YoY impossível" },
  "confidence": 1.0,
  "notes": "Solicitar para análise completa"
}
\`\`\`

## Regras gerais

- **Confiança**: 0.9+ se citação textual clara; 0.7–0.9 se inferido com alta probabilidade; 0.5–0.7 se há ambiguidade; <0.5 raramente.
- **NÃO invente fatos**. Se o drive_intake não menciona claramente, registre como "lacuna" ou simplesmente não emita.
- **Keys** em snake_case, descritivas (\`ebitda_2024\`, não \`metric_1\`).
- **Source** sempre que possível — citação rastreável é o que distingue fato de alucinação.
- Se um documento foi listado mas falhou na leitura, registre como documento_disponivel com \`"disponivel": false\` e crie também uma \`lacuna\` correspondente.
- Retorne APENAS o JSON, sem markdown, sem cercas, sem texto antes/depois.

## Output

Retorne um JSON único: \`{ "facts": [...] }\`. Lista vazia é aceitável se nada foi extraído.

${PROMPT_INJECTION_GUARD}`

function buildUserPrompt(input: ExtractorInput): string {
  return `# Contexto do deal

${input.intake_resumo}

# Relatório do agente de ingestão (drive_intake)

${input.drive_intake_output.length > 60000
  ? input.drive_intake_output.slice(0, 60000) + '\n\n[truncado em 60k chars]'
  : input.drive_intake_output}

---

Extraia agora os fatos conforme instruído. Retorne SOMENTE o JSON.`
}

export async function extractFacts(input: ExtractorInput, analiseId?: string): Promise<ExtractorOutput> {
  const { text } = await callLLM({
    task:        'fact_extract_post',
    context:     'validators',
    analiseId,
    system: [
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral', ttl: '1h' } },
    ],
    messages:    [{ role: 'user', content: buildUserPrompt(input) }],
    maxTokens:   8000,
    temperature: 0,
  })
  if (!text) throw new Error('Fact Extractor não retornou texto')

  const raw = text.trim()
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Fact Extractor não retornou JSON válido: ' + raw.slice(0, 300))
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    throw new Error('Fact Extractor retornou JSON malformado')
  }

  const obj = parsed as { facts?: unknown }
  if (!Array.isArray(obj.facts)) {
    throw new Error('Fact Extractor não retornou array facts')
  }

  const VALID_TYPES: FactType[] = [
    'documento_disponivel', 'numero_financeiro', 'estrutura_societaria',
    'contrato', 'garantia', 'passivo', 'evento_relevante', 'lacuna',
  ]

  const valid: ExtractedFact[] = []
  // Anti-DoS: cap no nº de facts. Cliente malicioso pode tentar retornar
  // 100k facts inflando contexto downstream e custo.
  const MAX_FACTS = 500
  for (const item of obj.facts) {
    if (valid.length >= MAX_FACTS) break
    if (!item || typeof item !== 'object') continue
    const it = item as Partial<ExtractedFact>
    if (typeof it.fact_type !== 'string' || !VALID_TYPES.includes(it.fact_type as FactType)) continue
    if (typeof it.key !== 'string' || it.key.length === 0 || it.key.length > 200) continue
    if (!it.value || (typeof it.value !== 'object')) continue
    if (typeof it.confidence !== 'number' || it.confidence < 0 || it.confidence > 1) continue

    // Anti-DoS: trunca valores grandes vindos do LLM (que vieram de doc do cliente).
    // value é JSON; truncamos o string serializado e parseamos de volta como string-fallback
    // se exceder. source_quote/notes são strings simples.
    const valueStr = JSON.stringify(it.value)
    const valueSafe: Record<string, unknown> | unknown[] = valueStr.length > 2000
      ? { _truncated: true, preview: valueStr.slice(0, 1500) }
      : it.value as Record<string, unknown> | unknown[]

    valid.push({
      fact_type:    it.fact_type as FactType,
      key:          it.key,
      value:        valueSafe,
      source_doc:   typeof it.source_doc === 'string' ? truncateField(it.source_doc, 300) : null,
      source_page:  typeof it.source_page === 'number' ? it.source_page : null,
      source_quote: typeof it.source_quote === 'string' ? truncateField(it.source_quote, 500) : null,
      confidence:   it.confidence,
      notes:        typeof it.notes === 'string' ? truncateField(it.notes, 1000) : null,
    })
  }

  return { facts: valid }
}
