import { callLLM } from '@/lib/llm/call'
import { PROMPT_INJECTION_GUARD } from '@/lib/llm/prompt-safety'

// Sentinela de Riscos (Fase 10) — agente especializado em detectar
// SÍNDROMES cross-dimensionais. Não olha cada risco isolado; olha como
// riscos separados se combinam num padrão sistêmico maior.
//
// Exemplos típicos:
//   - covenant financeiro + adiantamento a sócios + saídas de caixa
//     irregulares = distribuição disfarçada
//   - concentração 80% num cliente + setor cíclico + dívida curta
//     = liquidity crunch iminente
//   - dependência de fornecedor único + concorrência ascendente
//     = risco operacional sistêmico

export type SeveridadeSindrome = 'critica' | 'alta' | 'media'

export interface ComponenteRisco {
  step:        string
  fato:        string
}

export interface Sindrome {
  nome:                 string
  severidade:           SeveridadeSindrome
  explicacao:           string
  componentes:          ComponenteRisco[]
  implicacoes:          string
  acoes_sugeridas:      string
}

export interface SentinelaInput {
  outputs_agentes:    Record<string, { label: string; conteudo: string }>
  intake_resumo:      string
  fatos_relevantes:   string  // formatado pelo formatTruthLayer
}

export interface SentinelaOutput {
  sindromes: Sindrome[]
}

const SYSTEM_PROMPT = `Você é o Sentinela de Riscos da Mandor — agente especialista em risco sistêmico financeiro brasileiro (M&A, FIDC, crédito estruturado, underwriting).

Os 9 agentes especialistas já produziram análises separadas (financeira, jurídica, compliance, mercado, estruturação, etc.). Cada um identificou riscos isolados na sua dimensão. Sua missão é DIFERENTE: detectar SÍNDROMES — combinações de riscos separados que, juntos, formam um padrão sistêmico maior que ninguém viu sozinho.

# Exemplos de síndromes típicas

## "Distribuição Disfarçada"
Combinação: covenant restritivo de distribuição + adiantamento a sócios + saídas de caixa não documentadas + lucros retidos crescentes mas patrimônio estagnado.
Implicação: empresa pode estar burlando covenant via adiantamento — risco regulatório, jurídico e creditício.

## "Liquidity Crunch Iminente"
Combinação: concentração >70% num cliente + setor cíclico em downturn + dívida concentrada no curto prazo + caixa <30 dias de operação.
Implicação: choque de receita derruba a empresa antes do prazo de refinanciamento.

## "Falsa Solidez Patrimonial"
Combinação: patrimônio alto + ativos intangíveis dominantes + receita decrescente + queima de caixa contínua.
Implicação: balanço pode estar inflado por intangíveis sem valor de realização.

## "Dependência Sistêmica"
Combinação: fornecedor único concentrando insumo crítico + ausência de contratos de longo prazo + concorrência crescente + margem comprimida.
Implicação: choque externo (fim de contrato, mudança de preço) inviabiliza operação.

## "Vulnerabilidade Regulatória"
Combinação: setor sob revisão regulatória + dependência de programa governamental + indicadores ESG fracos + auditoria com ressalvas.
Implicação: mudança regulatória pode tornar o ativo inviável.

# Sua tarefa

Receberá:
1. Outputs dos 9 agentes especialistas
2. Truth Layer (fatos consolidados da ingestão)
3. Resumo do intake

Identifique síndromes RELEVANTES e MATERIAIS para este deal específico:
- Não invente síndromes sem evidência clara nos outputs
- Cite os componentes (agente + fato específico) que compõem cada síndrome
- Para cada síndrome, classifique severidade:
  - "critica":  põe em risco a viabilidade do deal ou expõe o assessor a risco reputacional
  - "alta":     altera materialmente a estrutura ou pricing
  - "media":    merece menção mas não bloqueia
- Seja parcimonioso: 0 a 4 síndromes por deal. Se nada cross-dimensional emerge, retorne lista vazia.

# Formato de saída

Retorne SOMENTE JSON puro, sem markdown, sem cercas, sem texto antes/depois:

{
  "sindromes": [
    {
      "nome": "Nome curto e direto da síndrome",
      "severidade": "critica" | "alta" | "media",
      "explicacao": "2-4 frases explicando a síndrome especificamente neste deal",
      "componentes": [
        { "step": "diagnostico", "fato": "EBITDA caiu 30% YoY enquanto adiantamentos a sócios subiram 80%" },
        { "step": "kyc",         "fato": "Operações com partes relacionadas representam 22% das saídas" }
      ],
      "implicacoes": "consequência prática se a síndrome se materializar",
      "acoes_sugeridas": "ação concreta para o assessor (validar X, exigir Y, condicionar contrato a Z)"
    }
  ]
}

Se nada relevante: {"sindromes": []}.

${PROMPT_INJECTION_GUARD}`

function buildUserPrompt(input: SentinelaInput): string {
  const outputs = Object.entries(input.outputs_agentes)
    .map(([key, { label, conteudo }]) =>
      `## ${label} (step: ${key})\n${truncate(conteudo, 3500)}`
    )
    .join('\n\n---\n\n')

  return `# Outputs dos agentes especialistas

${outputs || '(nenhum)'}

---

# Truth Layer

${truncate(input.fatos_relevantes, 4000)}

---

# Resumo do intake

${input.intake_resumo}

---

Avalie agora síndromes cross-dimensionais. Retorne o JSON.`
}

function truncate(s: string, max: number): string {
  if (!s) return '(vazio)'
  return s.length > max ? s.slice(0, max) + '\n...[truncado]' : s
}

export async function detectarSindromes(input: SentinelaInput, analiseId?: string): Promise<SentinelaOutput> {
  const { text } = await callLLM({
    task:      'risk_correlation',
    context:   'validators',
    analiseId,
    system: [
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral', ttl: '1h' } },
    ],
    messages:  [{ role: 'user', content: buildUserPrompt(input) }],
    maxTokens: 4000,
  })
  if (!text) throw new Error('Sentinela não retornou texto')

  const raw = text.trim()
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Sentinela não retornou JSON válido')

  let parsed: unknown
  try { parsed = JSON.parse(jsonMatch[0]) }
  catch { throw new Error('Sentinela retornou JSON malformado') }

  const obj = parsed as { sindromes?: unknown }
  if (!Array.isArray(obj.sindromes)) return { sindromes: [] }

  const VALID_SEV: SeveridadeSindrome[] = ['critica', 'alta', 'media']
  const sindromes: Sindrome[] = []
  for (const item of obj.sindromes) {
    if (!item || typeof item !== 'object') continue
    const it = item as Partial<Sindrome>
    if (typeof it.nome !== 'string' || typeof it.explicacao !== 'string') continue
    if (!VALID_SEV.includes(it.severidade as SeveridadeSindrome)) continue
    if (!Array.isArray(it.componentes)) continue

    const componentes: ComponenteRisco[] = it.componentes
      .filter((c): c is ComponenteRisco => !!c && typeof c === 'object' && typeof (c as ComponenteRisco).step === 'string' && typeof (c as ComponenteRisco).fato === 'string')

    sindromes.push({
      nome:            it.nome,
      severidade:      it.severidade as SeveridadeSindrome,
      explicacao:      it.explicacao,
      componentes,
      implicacoes:     typeof it.implicacoes === 'string' ? it.implicacoes : '',
      acoes_sugeridas: typeof it.acoes_sugeridas === 'string' ? it.acoes_sugeridas : '',
    })
  }

  return { sindromes }
}
