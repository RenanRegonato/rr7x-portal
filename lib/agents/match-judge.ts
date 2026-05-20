import { anthropic, MODEL as SONNET_MODEL } from '@/lib/anthropic'

// Match Judge — Camada 4 do motor de matching v2.
//
// Recebe um par (Investidor × Tese) com os scores parciais já calculados
// (estruturado + semântico) e emite o veredito qualitativo:
//   - synergy_score 0-100 (recalibração do score automático após análise narrativa)
//   - strengths / concerns / talking_points
//   - close_probability 0-100 (probabilidade de avanço para NDA/proposta)
//   - recommendation: strong_match | review | skip
//
// É chamado apenas para o TOP 20 de candidatos após Camadas 1-3, pra economizar
// tokens. O judge pode REBAIXAR um match "tecnicamente bom" mas estrategicamente
// fraco — esse é o ponto: reduzir falso positivo.

export type MatchRecommendation = 'strong_match' | 'review' | 'skip'

export interface MatchJudgeOutput {
  synergy_score:          number   // 0-100
  llm_resumo:             string   // 1-2 frases pra card de match
  strengths:              string[] // 2-4 pontos
  concerns:               string[] // 0-4 pontos
  talking_points:         string[] // 2-4 pontos pra primeira reunião
  close_probability:      number   // 0-100
  recommendation:         MatchRecommendation
}

export interface MatchJudgeInput {
  investidor: {
    nome:                   string
    tipo:                   string
    setores_alvo:           string[]
    sub_setores:            string[]
    modelos_negocio:        string[]
    vertical_tags:          string[]
    estagios_aceitos:       string[]
    ticket_min_brl:         number | null
    ticket_max_brl:         number | null
    tipos_deal_aceitos:     string[]
    controle_aceito:        string[]
    horizonte_saida_min_anos: number | null
    horizonte_saida_max_anos: number | null
    geografias_aceitas:     string[]
    requer_esg:             boolean
    requer_pronto_para_dd:  boolean
    tese_resumo:            string | null
    tese_completa:          string | null
    exemplos_deals_passados: string | null
  }
  tese: {
    empresa_nome:           string
    setor_primario:         string
    sub_setores:            string[]
    modelos_negocio:        string[]
    vertical_tags:          string[]
    estagio:                string
    receita_anual_brl:      number | null
    ebitda_brl:             number | null
    crescimento_yoy_pct:    number | null
    capital_buscado_brl:    number
    valuation_pre_money_brl: number | null
    equity_oferecido_pct:   number | null
    governance_score:       number | null
    risk_overall_score:     number | null
    documentacao_score:     number | null
    pronto_para_dd:         boolean
    esg_compliant:          boolean
    hq_estado:              string | null
    tipo_deal:              string | null
    controle_oferecido:     string | null
    horizonte_saida_anos:   number | null
    urgencia:               string
    tese_investimento:      string | null
    value_proposition:      string | null
    competitive_moat:       string | null
    risk_narrative:         string | null
    exit_story:             string | null
    risk_factors:           string[]
    key_dependencies:       string[]
  }
  // Scores parciais já calculados (entram no contexto pro juiz calibrar)
  score_estruturado:        number  // 0-100
  score_semantico:          number  // 0-100
}


const SYSTEM_PROMPT = `Você é o Match Judge do Invest Match — analista sênior de M&A/Private Equity revisando uma sugestão de match entre investidor e empresa/projeto.

# Contexto

O motor já filtrou candidatos por hard filters (ticket, geografia, exclusões) e calculou:
- score_estruturado (0-100): média ponderada de 10 dimensões (setorial, ticket, stage, maturity, governance, risk, geography, documentation, exit_horizon, urgency)
- score_semantico (0-100): cosine similarity entre embeddings das teses

Seu trabalho é a CAMADA 4: avaliação qualitativa que essas camadas anteriores não pegam.

# Critérios

## synergy_score (0-100)
Calibre o score automático considerando:
- A narrativa do investidor (tese declarada) realmente bate com a tese da empresa?
- Há sinergias estratégicas não-óbvias (modelo de negócio, tags, exemplos de deals passados)?
- Há red flags qualitativos que reduzem o match apesar do score automático alto?
- Há green flags qualitativos (perfeita aderência narrativa) que justificam elevar?

Use o synergy_score pra REFINAR — não pra duplicar — os scores. Tipicamente fica próximo
da média ponderada (0.4×estruturado + 0.6×semantico), mas pode divergir até ±20 pontos
quando a narrativa contradiz os números (ou vice-versa).

## recommendation
- **strong_match**: alta convicção. Vale notificar o investidor IMEDIATAMENTE com material premium.
- **review**: bom em papel, mas precisa olhar humano. Vai pra fila de curadoria do admin.
- **skip**: descartar. Algum aspecto qualitativo bloqueia, mesmo que números pareçam OK.

## strengths (2-4 itens curtos)
Pontos fortes específicos da sinergia. NÃO genéricos ("ambos no setor X" não vale —
foque em sinergia estratégica única).

## concerns (0-4 itens curtos)
Red flags qualitativos. Pode estar vazio se não houver. NÃO repita coisas que o
filtro rígido já trata (ticket, geografia, etc).

## talking_points (2-4 itens)
Pontos concretos pra primeira reunião — perguntas, hipóteses, dados a validar.
São o que o assessor mandaria no convite pra reunião.

## close_probability (0-100)
Estimativa qualitativa: dada esta combinação, qual a chance de fechar em 6 meses?
Considere: maturidade do projeto, documentação, urgência, alinhamento estratégico,
histórico narrativo do investidor.

## llm_resumo (1-2 frases)
Síntese pra mostrar no card de match. Direto, sem hedging. Cita o motivo central.

# Tom
Institucional, técnico, direto. Análise crítica honesta. Sem hedging vazio. Se está
em dúvida, marque "review" — não force "strong_match" pra agradar.

# Formato de saída

JSON puro, sem markdown, sem cercas:

{
  "synergy_score": 0-100,
  "llm_resumo": "...",
  "strengths": ["..."],
  "concerns": ["..."],
  "talking_points": ["..."],
  "close_probability": 0-100,
  "recommendation": "strong_match" | "review" | "skip"
}`


function fmtBRL(v: number | null): string {
  if (v == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

function fmtPct(v: number | null): string {
  if (v == null) return '—'
  return `${v.toFixed(1)}%`
}

function fmtList(arr: string[]): string {
  return arr.length === 0 ? '—' : arr.join(', ')
}


function buildUserPrompt(input: MatchJudgeInput): string {
  const { investidor: i, tese: t } = input
  return `# Sugestão de match

## Scores parciais já calculados
- score_estruturado: ${input.score_estruturado.toFixed(1)} (filtro + 10 dimensões)
- score_semantico:   ${input.score_semantico.toFixed(1)} (similaridade narrativa)

---

## Investidor: ${i.nome} (${i.tipo})

### Tese declarada (campos estruturados)
- Setores alvo:         ${fmtList(i.setores_alvo)}
- Sub-setores:          ${fmtList(i.sub_setores)}
- Modelos de negócio:   ${fmtList(i.modelos_negocio)}
- Tags livres:          ${fmtList(i.vertical_tags)}
- Estágios aceitos:     ${fmtList(i.estagios_aceitos)}
- Ticket:               ${fmtBRL(i.ticket_min_brl)} – ${fmtBRL(i.ticket_max_brl)}
- Tipos de deal:        ${fmtList(i.tipos_deal_aceitos)}
- Controle aceito:      ${fmtList(i.controle_aceito)}
- Horizonte saída:      ${i.horizonte_saida_min_anos ?? '—'}–${i.horizonte_saida_max_anos ?? '—'} anos
- Geografias:           ${fmtList(i.geografias_aceitas)}
- Requer ESG:           ${i.requer_esg ? 'sim' : 'não'}
- Requer DD-ready:      ${i.requer_pronto_para_dd ? 'sim' : 'não'}

### Tese narrativa
${i.tese_resumo    ? `**Resumo:** ${i.tese_resumo}\n`    : ''}${i.tese_completa  ? `**Completa:** ${i.tese_completa}\n` : ''}${i.exemplos_deals_passados ? `**Deals passados:** ${i.exemplos_deals_passados}` : ''}

---

## Tese da empresa: ${t.empresa_nome}

### Estruturado (Mandor + intake)
- Setor primário:       ${t.setor_primario}
- Sub-setores:          ${fmtList(t.sub_setores)}
- Modelos:              ${fmtList(t.modelos_negocio)}
- Tags:                 ${fmtList(t.vertical_tags)}
- Estágio:              ${t.estagio}
- Receita anual:        ${fmtBRL(t.receita_anual_brl)}
- EBITDA:               ${fmtBRL(t.ebitda_brl)}
- Crescimento YoY:      ${fmtPct(t.crescimento_yoy_pct)}
- Capital buscado:      ${fmtBRL(t.capital_buscado_brl)}
- Valuation pre-money:  ${fmtBRL(t.valuation_pre_money_brl)}
- Equity oferecido:     ${fmtPct(t.equity_oferecido_pct)}
- Governança (score):   ${t.governance_score ?? '—'} / 100
- Risco (score):        ${t.risk_overall_score ?? '—'} / 100 (menor=melhor)
- Documentação:         ${t.documentacao_score ?? '—'} / 100
- Pronto p/ DD:         ${t.pronto_para_dd ? 'sim' : 'não'}
- ESG-compliant:        ${t.esg_compliant ? 'sim' : 'não'}
- Sede:                 ${t.hq_estado ?? '—'}
- Tipo de deal:         ${t.tipo_deal ?? '—'}
- Controle oferecido:   ${t.controle_oferecido ?? '—'}
- Horizonte saída:      ${t.horizonte_saida_anos ?? '—'} anos
- Urgência:             ${t.urgencia}
- Fatores de risco:     ${fmtList(t.risk_factors)}
- Dependências-chave:   ${fmtList(t.key_dependencies)}

### Narrativa (Mandor)
${t.tese_investimento  ? `**Tese:** ${t.tese_investimento}\n`           : ''}${t.value_proposition  ? `**Proposta de valor:** ${t.value_proposition}\n`  : ''}${t.competitive_moat  ? `**Moat:** ${t.competitive_moat}\n`                : ''}${t.risk_narrative    ? `**Riscos:** ${t.risk_narrative}\n`               : ''}${t.exit_story        ? `**Hipótese de saída:** ${t.exit_story}`         : ''}

---

Avalie agora o match conforme instruído. Retorne SOMENTE o JSON.`
}


const VALID_REC: MatchRecommendation[] = ['strong_match', 'review', 'skip']


export async function judgeMatch(input: MatchJudgeInput): Promise<MatchJudgeOutput> {
  const resp = await anthropic.messages.create({
    model:       SONNET_MODEL,
    max_tokens:  2000,
    temperature: 0.2,
    system: [
      // Cache 1h — system prompt idêntico em todas chamadas do batch (20 chamadas
      // pra cada tese). Primeira paga 1.25x input, demais leem a 0.1x.
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral', ttl: '1h' } },
    ],
    messages: [{ role: 'user', content: buildUserPrompt(input) }],
  })

  const textBlock = resp.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('[match-judge] resposta sem texto')
  }

  const raw = textBlock.text.trim()
  const fenced = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  const candidate = fenced ? fenced[1] : raw
  const first = candidate.indexOf('{')
  const last  = candidate.lastIndexOf('}')
  if (first < 0 || last < 0) {
    throw new Error('[match-judge] JSON não encontrado: ' + raw.slice(0, 300))
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(candidate.slice(first, last + 1))
  } catch {
    throw new Error('[match-judge] JSON malformado: ' + raw.slice(0, 300))
  }

  const o = parsed as Partial<MatchJudgeOutput>

  return {
    synergy_score:      clampScore(o.synergy_score),
    llm_resumo:         typeof o.llm_resumo === 'string' ? o.llm_resumo.trim() : '',
    strengths:          arrStr(o.strengths).slice(0, 6),
    concerns:           arrStr(o.concerns).slice(0, 6),
    talking_points:     arrStr(o.talking_points).slice(0, 6),
    close_probability:  clampScore(o.close_probability),
    recommendation:     VALID_REC.includes(o.recommendation as MatchRecommendation)
                          ? (o.recommendation as MatchRecommendation)
                          : 'review',
  }
}


function clampScore(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

function arrStr(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
}
