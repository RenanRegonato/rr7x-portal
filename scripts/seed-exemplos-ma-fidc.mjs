// Seed de 2 deals-exemplo institucionais (produção), no escritório RR7x - Capita Hub:
//   1) M&A   — Lumina Diagnósticos (venda de controle, medicina diagnóstica)
//   2) FIDC  — Vanguarda Consignado (estruturação de FIDC de recebíveis consignados)
//
// Faz TUDO de ponta a ponta e é destrutivo no começo:
//   A) APAGA todos os deals existentes (+ teses, matches, sugestões e storage)
//   B) cria os 2 deals ricos (deal_intake + outputs por agente + mesa de crédito)
//   C) cria/atualiza a carteira de investidores (aumentada p/ saúde-M&A e consignado-FIDC)
//   D) cria as teses (embeddings Voyage) e roda o MATCH real (RPCs + judge Claude)
//   E) gera as SUGESTÕES DO ATLAS (Mapa público) de cada tese
//
// Idempotente após o wipe. Uso: node --env-file=.env.local scripts/seed-exemplos-ma-fidc.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY
const VOYAGE_KEY    = process.env.VOYAGE_API_KEY
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
for (const [k, v] of Object.entries({ SUPABASE_URL, SERVICE_KEY, VOYAGE_KEY, ANTHROPIC_KEY })) {
  if (!v) { console.error(`Falta env ${k}`); process.exit(1) }
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

// --- Ambiente: RR7x - Capita Hub (Invest Match ligado, carteira de investidores) ---
const ESCRITORIO_ID = 'cfd1727b-431e-4112-88df-764affb5c4e9'
const OWNER_USER_ID = '16fc2589-0d2b-42ce-8151-ef6194a8c6fc'

// ---------- Helpers de IA ----------
async function voyageEmbed(text) {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${VOYAGE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: text, model: 'voyage-3-large', input_type: 'query' }),
  })
  if (!res.ok) throw new Error(`Voyage ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return (await res.json()).data?.[0]?.embedding
}

async function judge(invNome, empresaContexto, scoreEstrut, scoreSem) {
  const prompt = `Você é analista sênior de M&A e crédito estruturado. Avalie a sinergia entre o investidor "${invNome}" e o ativo a seguir.
ATIVO: ${empresaContexto}
Score estrutural calculado: ${scoreEstrut}; similaridade semântica: ${scoreSem}.
Retorne SOMENTE JSON: {"synergy_score":0-100,"llm_resumo":"1-2 frases em português","strengths":["..."],"concerns":["..."],"talking_points":["..."],"close_probability":0-100,"recommendation":"strong_match|review|skip"}`
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1200, temperature: 0.2, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const text = (await res.json()).content?.find(b => b.type === 'text')?.text ?? '{}'
  const m = text.match(/\{[\s\S]*\}/)
  return JSON.parse(m ? m[0] : '{}')
}

// ---------- Sugestões do Atlas (espelha lib/invest-match/sugestoes-mercado.ts) ----------
const TIPOS_INVESTIDOR = ['gestora', 'asset', 'family_office', 'boutique_investimento', 'securitizadora', 'banco', 'escritorio_credito_estruturado']
const TIPO_LABEL = {
  gestora: 'Gestora', asset: 'Asset', family_office: 'Family Office', boutique_investimento: 'Boutique de Investimento',
  securitizadora: 'Securitizadora', banco: 'Banco', escritorio_credito_estruturado: 'Crédito Estruturado',
  administrador: 'Administrador', custodiante: 'Custodiante', distribuidor: 'Distribuidor',
}
const DEAL_PARA_VEICULOS = {
  credito_estruturado: ['FIDC'], debt: ['FIDC'], convertible: ['FIDC', 'FIP'], special_situations: ['FIDC', 'FIP'],
  earn_out: ['FIP'], equity: ['FIP'], growth_equity: ['FIP'], m_and_a_sale: ['FIP'], m_and_a_acquisition: ['FIP'],
}
function veiculosDoMandato(tipoDeal, setor, subSetores) {
  const base = new Set(DEAL_PARA_VEICULOS[tipoDeal ?? ''] ?? ['FIDC', 'FIP'])
  const txt = `${setor} ${(subSetores ?? []).join(' ')}`.toLowerCase()
  if (txt.includes('imob') || txt.includes('real estate')) base.add('FII')
  if (txt.includes('agro')) base.add('FIAGRO')
  return [...base]
}
async function gerarSugestoesMercado(tese) {
  const agg = new Map()
  if (tese.tese_embedding) {
    const { data, error } = await sb.rpc('mercado_busca_semantica', {
      p_query_embedding: tese.tese_embedding, p_tipos: TIPOS_INVESTIDOR, p_uf: null, p_limit: 20, p_min: 0.35,
    })
    if (error) console.log('   [sugestoes] semântica falhou:', error.message)
    for (const r of data ?? []) agg.set(r.id, {
      entidade_id: r.id, razao_social: r.razao_social, nome_fantasia: r.nome_fantasia,
      tipos: r.tipos ?? [], uf: r.uf, sim: r.similaridade, veiculos_no_mandato: null,
    })
  }
  const tiposVeiculo = veiculosDoMandato(tese.tipo_deal, tese.setor_primario, tese.sub_setores)
  const { data: alvos } = await sb.rpc('mercado_alvos_captacao', { p_tipos_veiculo: tiposVeiculo, p_papeis: ['gestor'], p_uf: null, p_limit: 20 })
  for (const a of alvos ?? []) {
    const cur = agg.get(a.entidade_id)
    if (cur) cur.veiculos_no_mandato = a.veiculos_no_mandato
    else agg.set(a.entidade_id, {
      entidade_id: a.entidade_id, razao_social: a.razao_social, nome_fantasia: a.nome_fantasia,
      tipos: a.tipos ?? [], uf: a.uf, sim: null, veiculos_no_mandato: a.veiculos_no_mandato,
    })
  }
  await sb.from('mercado_sugestoes').delete().eq('tese_id', tese.id)
  if (agg.size === 0) return 0
  const setor = tese.setor_primario
  const isCredito = ['credito_estruturado', 'debt', 'special_situations', 'convertible'].includes(tese.tipo_deal ?? '')
  const estrutCap = isCredito ? 35 : 18, estrutMult = isCredito ? 7 : 4, baseEstrutOnly = isCredito ? 58 : 40
  const linhas = [...agg.values()].map(s => {
    const semScore = s.sim != null ? s.sim * 100 : 0
    const temEstrut = s.veiculos_no_mandato != null && s.veiculos_no_mandato > 0
    const estrutBonus = temEstrut ? Math.min(estrutCap, Math.log1p(s.veiculos_no_mandato) * estrutMult) : 0
    const origem = []
    if (s.sim != null) origem.push('semantico')
    if (temEstrut) origem.push('estrutural')
    let aderencia = s.sim != null ? semScore + estrutBonus : baseEstrutOnly + estrutBonus
    aderencia = Math.max(0, Math.min(100, Math.round(aderencia * 100) / 100))
    const partes = []
    const tiposTxt = (s.tipos || []).map(t => TIPO_LABEL[t] ?? t).slice(0, 2).join(' · ')
    if (tiposTxt) partes.push(tiposTxt)
    if (temEstrut) partes.push(`opera ${s.veiculos_no_mandato} veículo(s) do mandato (${tiposVeiculo.join('/')})`)
    if (s.sim != null) partes.push(`aderência setorial à tese (${setor})`)
    return {
      tese_id: tese.id, escritorio_id: tese.escritorio_id, entidade_id: s.entidade_id,
      razao_social: s.razao_social, nome_fantasia: s.nome_fantasia, tipos: s.tipos, uf: s.uf,
      aderencia, origem_sinal: origem, motivo: partes.join(' · '),
    }
  }).sort((a, b) => b.aderencia - a.aderencia).slice(0, 12)
  const { error } = await sb.from('mercado_sugestoes').insert(linhas)
  if (error) { console.log('   [sugestoes] insert falhou:', error.message); return 0 }
  return linhas.length
}

// ============================================================================
// DEAL 1 — M&A: Lumina Diagnósticos (venda de controle)
// ============================================================================
const O_MA = {}
O_MA.relatorio_consolidado = `# Lumina Diagnósticos — Relatório Consolidado

Projeto Aurora. Material confidencial preparado para apresentação a comitê de investimento.

## Resumo executivo

A Lumina Diagnósticos é uma rede regional de medicina diagnóstica (análises clínicas e diagnóstico por imagem) com 38 unidades de atendimento e 3 laboratórios centrais (núcleos técnicos de operação — NTOs) distribuídos por Paraná, Santa Catarina e Rio Grande do Sul. Em 18 anos de operação consolidou marca de confiança no Sul, com forte penetração junto a operadoras de saúde regionais e hospitais.

A companhia fechou 2025 com receita líquida de R$ 612,4 milhões e EBITDA ajustado de R$ 142,1 milhões, margem de 23,2%, sustentada por escala laboratorial, verticalização de exames de maior complexidade e contratos de longo prazo com as principais operadoras do Sul.

O Projeto Aurora estrutura a venda do controle (até 100% do capital) a um consolidador estratégico ou a um fundo com tese de buy-and-build em saúde. O racional é claro: o setor de medicina diagnóstica no Brasil vive uma onda de consolidação, e a Lumina é a maior plataforma independente do Sul ainda não capturada pelos grandes grupos nacionais.

O ativo combina liderança regional, margem acima da média de redes regionais, fluxo recorrente vindo de convênios e um pipeline próprio de quatro aquisições bolt-on já mapeadas. Os pontos de atenção são a dependência de reajustes junto a operadoras e a sucessão da fundadora, ambos endereçáveis na transação.

## Tese de investimento

A medicina diagnóstica é um setor de demanda resiliente e crescente, puxado por envelhecimento populacional, expansão da medicina preventiva e incorporação de exames de maior complexidade (biologia molecular, genética). A Lumina ocupa a posição de líder independente no Sul, em um mercado onde escala laboratorial define margem: quanto mais exames processados no mesmo NTO, menor o custo unitário.

Três vetores sustentam a tese. O primeiro é a consolidação: o setor tem centenas de laboratórios regionais subescala, e a Lumina é tanto alvo quanto plataforma. O segundo é o mix: a migração para exames de alta complexidade eleva o ticket médio e a margem. O terceiro é a sinergia para um comprador estratégico, que captura ganho imediato de compras (reagentes), logística e back-office.

## Destaques financeiros

| Indicador | 2023 | 2024 | 2025 |
| --- | --- | --- | --- |
| Receita líquida (R$ M) | 471,8 | 538,9 | 612,4 |
| EBITDA ajustado (R$ M) | 99,2 | 118,6 | 142,1 |
| Margem EBITDA | 21,0% | 22,0% | 23,2% |
| Dívida líquida / EBITDA | 1,9x | 1,6x | 1,3x |
| Exames/ano (milhões) | 18,4 | 21,1 | 24,0 |
| ROIC | 16,2% | 17,9% | 19,4% |

## Valuation

O intervalo central de valor da firma (EV) está entre R$ 1,42 bilhão e R$ 1,71 bilhão, equivalente a 10,0x a 12,0x o EBITDA de 2025, faixa coerente com transações de controle no setor de diagnósticos no Brasil. O fluxo de caixa descontado, com WACC de 13,0% e crescimento na perpetuidade de 4,5%, aponta EV de R$ 1,56 bilhão no cenário base. Descontada a dívida líquida de R$ 185 milhões, o valor do equity fica entre R$ 1,24 e R$ 1,53 bilhão.

## Estrutura sugerida da operação

Venda de controle, com duas alternativas: (i) alienação de 100% a um estratégico, com earn-out de até 20% do preço atrelado ao EBITDA de dois anos; ou (ii) alienação de controle (51% a 70%) a um fundo de private equity, com a fundadora mantendo participação minoritária e assento no conselho durante a transição. Recomenda-se cláusula de não concorrência de cinco anos e retenção dos executivos-chave por meio de plano de incentivo de longo prazo.

## Principais riscos

- Reajuste de operadoras: 64% da receita vem de convênios, e o reajuste anual é negociado. Defasagem frente à inflação médica comprime margem.
- Sucessão: a fundadora acumula CEO e direção técnica. A transação precisa endereçar a continuidade da liderança técnica.
- Glosa e auditoria: o ciclo de recebimento das operadoras tem glosa média de 4,1%, dentro do padrão do setor, mas sensível a mudanças de protocolo.

## Conclusão institucional

O ativo é maduro, líder no seu mercado e altamente sinérgico para um consolidador. A recomendação é avançar para um processo competitivo restrito, com no máximo seis contrapartes, condicionado à formalização do plano de sucessão técnica e à renovação dos três maiores contratos de operadora antes do fechamento.`

O_MA.orchestration = `# Orquestração — Deal Readiness Score

## Veredito

Deal Readiness Score (DRS): **83 / 100** — Pronto para o mercado.

O ativo tem qualidade financeira, governança e posição competitiva consistentes com uma operação de controle. As ressalvas são pontuais e endereçáveis no curso da transação, sem comprometer a tese.

## Composição do score

| Dimensão | Peso | Nota |
| --- | --- | --- |
| Qualidade financeira | 30% | 88 |
| Posição de mercado | 20% | 90 |
| Governança e compliance | 20% | 78 |
| Estrutura e sinergia | 15% | 84 |
| Documentação | 15% | 72 |

## O que falta

A documentação puxa o score: pendem a formalização do plano de sucessão técnica e a renovação de dois contratos de operadora que vencem em 2026. A governança tem um ponto de atenção na concentração de funções na fundadora.

## Recomendação

Avançar à preparação do processo competitivo em paralelo à regularização. A renovação dos contratos de operadora deve ser priorizada, pois ancora a previsibilidade de receita que sustenta o múltiplo-alvo.`

O_MA.pesquisa = `# Inteligência de Mercado

## Panorama do setor

O mercado brasileiro de medicina diagnóstica movimenta cerca de R$ 45 bilhões ao ano e cresce acima do PIB, puxado por envelhecimento populacional, medicina preventiva e incorporação de exames de alta complexidade. É um setor em consolidação acelerada: os quatro maiores grupos nacionais detêm menos de 40% do mercado, o que deixa amplo espaço para aquisições de plataformas regionais.

A Lumina lidera o segmento independente no Sul, com participação estimada de 14% no mercado endereçável das três capitais e forte densidade em cidades médias, onde os grandes grupos têm presença rarefeita.

## Posicionamento competitivo

A vantagem da Lumina é a densidade regional: 38 unidades de coleta alimentando 3 NTOs com alta taxa de ocupação, o que diluí custo fixo e sustenta margem acima de redes regionais comparáveis. A marca tem reconhecimento junto a médicos prescritores e operadoras, o que reduz custo de captação de demanda.

## Benchmark com comparáveis

| Comparável | Perfil | EV/EBITDA | Margem EBITDA |
| --- | --- | --- | --- |
| Grupo nacional listado I | Diagnósticos, Brasil | 11,8x | 24% |
| Grupo nacional listado II | Medicina diagnóstica, Brasil | 10,4x | 22% |
| Rede regional (privada) | Sudeste | 9,2x | 20% |
| Transação precedente A | M&A controle, 2024 | 11,5x | 23% |
| Transação precedente B | M&A controle regional, 2023 | 9,8x | 21% |
| **Lumina (implícito)** | **Projeto Aurora** | **11,0x** | **23%** |

A Lumina negocia no terço superior da amostra de margem e dentro da faixa de múltiplos de transações de controle, com prêmio justificado por liderança regional e pipeline de consolidação próprio.`

O_MA.diagnostico = `# Diagnóstico Financeiro

## Demonstração de resultados

| R$ milhões | 2021 | 2022 | 2023 | 2024 | 2025 |
| --- | --- | --- | --- | --- | --- |
| Receita líquida | 352,1 | 408,6 | 471,8 | 538,9 | 612,4 |
| Lucro bruto | 144,4 | 171,6 | 202,9 | 237,1 | 273,3 |
| Margem bruta | 41,0% | 42,0% | 43,0% | 44,0% | 44,6% |
| EBITDA reportado | 67,0 | 80,5 | 95,1 | 114,2 | 137,4 |
| EBITDA ajustado | 70,4 | 84,2 | 99,2 | 118,6 | 142,1 |
| Margem EBITDA aj. | 20,0% | 20,6% | 21,0% | 22,0% | 23,2% |

A receita cresceu a uma taxa composta de 14,8% ao ano entre 2021 e 2025. A expansão de margem reflete ganho de escala nos NTOs e migração de mix para exames de maior complexidade (genética e biologia molecular, hoje 17% da receita contra 9% em 2021).

## Ajustes ao EBITDA

O EBITDA ajustado exclui despesas não recorrentes: R$ 2,9 milhões de integração de duas aquisições de 2024, R$ 1,8 milhão de write-off de equipamento de imagem substituído e R$ 0,9 milhão de honorários de reorganização societária. Nenhum ajuste é recorrente.

## Endividamento e capital de giro

A dívida líquida encerrou 2025 em R$ 185 milhões, ou 1,3x o EBITDA ajustado. O ciclo de caixa é alongado pelo prazo de recebimento das operadoras (média de 58 dias) e pela glosa de 4,1%. Há oportunidade de liberar capital de giro com a profissionalização da gestão de glosas e a renegociação de prazos com as três maiores operadoras.

## Projeções (cenário base)

| R$ milhões | 2026 | 2027 | 2028 | 2029 | 2030 |
| --- | --- | --- | --- | --- | --- |
| Receita líquida | 691,0 | 773,9 | 858,0 | 943,8 | 1.029,7 |
| EBITDA ajustado | 162,4 | 185,7 | 209,3 | 233,1 | 257,4 |
| Margem EBITDA | 23,5% | 24,0% | 24,4% | 24,7% | 25,0% |
| Capex | 41,0 | 38,0 | 36,0 | 35,0 | 35,0 |
| Fluxo de caixa livre | 78,2 | 96,4 | 114,8 | 132,5 | 149,0 |

## Valuation por fluxo de caixa descontado

Premissas: WACC de 13,0%, crescimento na perpetuidade de 4,5%, alíquota efetiva de 30%. O valor presente dos fluxos explícitos somado ao valor terminal resulta em EV de R$ 1,56 bilhão no cenário base.

| Sensibilidade do EV (R$ bi) | g 4,0% | g 4,5% | g 5,0% |
| --- | --- | --- | --- |
| WACC 12,5% | 1,58 | 1,66 | 1,75 |
| WACC 13,0% | 1,49 | 1,56 | 1,64 |
| WACC 13,5% | 1,41 | 1,47 | 1,54 |`

O_MA.analise_ma = `# Análise de M&A

## Racional estratégico

A Lumina é o ativo de consolidação mais relevante disponível no Sul. Para um comprador estratégico nacional, a aquisição entrega densidade imediata em três estados, 24 milhões de exames/ano e sinergias de compras, logística e back-office estimadas em R$ 22 a R$ 30 milhões de EBITDA adicional em 24 meses. Para um fundo, é uma plataforma pronta para buy-and-build regional.

## Tese de investimento

O ponto de entrada é atraente: margem em expansão, alavancagem baixa (1,3x) e um pipeline de quatro aquisições bolt-on já mapeado, com EBITDA somado de R$ 19 milhões a múltiplo médio de entrada de 6,0x — abaixo dos 11,0x da plataforma, criando arbitragem de múltiplo na consolidação.

## Estrutura da transação

| Componente | Faixa | Observação |
| --- | --- | --- |
| Valuation de referência (EV) | R$ 1,42–1,71 bi | 10,0x a 12,0x EBITDA 2025 |
| Modalidade | Controle (51%–100%) | Estratégico (100%) ou PE (51%–70%) |
| Earn-out | até 20% do preço | Atrelado ao EBITDA de 24 meses |
| Rollover da fundadora (cenário PE) | 15%–30% | Com assento no conselho |

## Pipeline de compradores

| Tipo | Quantidade mapeada | Fit |
| --- | --- | --- |
| Estratégico (grupos nacionais de diagnóstico) | 4 | Alto |
| Private equity (saúde / buy-and-build) | 6 | Alto |
| Family office (saúde) | 3 | Médio |
| Estratégico internacional | 2 | Médio |

## Cronograma indicativo

Preparação e data room em seis a oito semanas, processo competitivo com cartas de intenção (LOI) em quatro semanas, due diligence confirmatória em oito semanas e fechamento em até cinco meses a partir do mandato.`

O_MA.kyc = `# Compliance & KYC

## Estrutura societária

O controle é detido pela fundadora (61%), por um grupo de médicos sócios (24%) e por um fundo regional minoritário (15%). A cadeia de titularidade foi mapeada até as pessoas físicas beneficiárias finais, sem camadas opacas.

## Screening

A verificação dos sócios e administradores em listas de PEP, sanções e mídias adversas não retornou apontamentos. Não há processos de natureza penal econômica contra os beneficiários finais. Os registros junto aos conselhos de medicina estão regulares.

## Licenças e regulação sanitária

As 38 unidades e os 3 NTOs têm alvará sanitário vigente e acreditação PALC (Programa de Acreditação de Laboratórios Clínicos) em dois dos três núcleos. O terceiro NTO, incorporado em 2024, está em processo de acreditação, com conclusão prevista em quatro meses.

## Red flags

Nenhum apontamento bloqueante. Há um ponto de atenção de governança: a concentração de funções de CEO e diretora técnica na fundadora, que deve ser endereçada com a contratação de um diretor técnico independente como condição da transição.`

O_MA.contratos = `# Análise Contratual

## Contratos relevantes

A receita está apoiada em 22 contratos com operadoras de saúde. Os três maiores, que somam 41% da receita, têm cláusula de reajuste anual indexado e renovação automática. Dois deles vencem em 2026 e precisam ser renovados antes do fechamento para preservar a previsibilidade que sustenta o múltiplo-alvo.

## Cláusulas de change of control

Cinco contratos de operadora contêm cláusula de mudança de controle que exige notificação prévia. Nenhum permite rescisão unilateral por mudança de controle, mas três preveem renegociação de condições, o que deve ser endereçado no cronograma da transação.

## Passivos contingentes

| Natureza | Valor estimado (R$ M) | Probabilidade de perda |
| --- | --- | --- |
| Trabalhista | 8,4 | Possível |
| Cível (responsabilidade técnica) | 5,1 | Possível |
| Tributária (ISS) | 6,7 | Possível |

O provisionamento atual cobre as contingências prováveis. A discussão de ISS sobre base de cálculo segue tese com jurisprudência majoritariamente favorável.

## Recomendações jurídicas

Renovar os dois contratos de operadora que vencem em 2026, contratar diretor técnico independente, formalizar plano de retenção dos executivos-chave e revisar as cláusulas de reajuste para alinhar os indexadores ao horizonte do comprador.`

O_MA.originacao = `# Estratégia de Originação

## Perfil de compradores-alvo

A operação atrai três perfis. Grupos estratégicos nacionais de diagnóstico em busca de densidade no Sul; fundos de private equity com tese de buy-and-build em saúde; e, em segundo plano, estratégicos internacionais avaliando entrada no Brasil.

## Oportunidades estratégicas

- Consolidação: pipeline de quatro alvos regionais já identificados, com EBITDA somado de R$ 19 milhões e múltiplo médio de entrada de 6,0x.
- Verticalização de alta complexidade: a expansão de genética e biologia molecular pode elevar o ticket médio e a margem.
- Medicina preventiva: parcerias com operadoras para programas de rastreamento ampliam volume recorrente.
- Sinergia de compras: integração a um grupo nacional captura ganho imediato em reagentes e equipamentos.

## Posicionamento

A recomendação é conduzir um processo competitivo restrito, com no máximo seis contrapartes simultâneas, equilibrando tensão competitiva e confidencialidade. A presença de estratégicos e financeiros no mesmo processo tende a maximizar o preço.`

O_MA.estruturacao = `# Estruturação da Operação

## Modalidades de saída

A operação é de equity (venda de controle), não de dívida. A estruturação foca em maximizar valor e mitigar risco de transição.

| Alternativa | Comprador típico | Estrutura | Veredito |
| --- | --- | --- | --- |
| Venda de 100% | Estratégico nacional | Caixa + earn-out 20% | Recomendada (maximiza sinergia) |
| Venda de controle 51–70% | Private equity | Caixa + rollover da fundadora | Recomendada (preserva transição) |
| Venda parcial (minoritária) | Fundo growth | Aumento de capital | Não recomendada (não resolve sucessão) |

## Mecanismos de proteção

Earn-out de até 20% atrelado ao EBITDA de 24 meses, escrow de 10% do preço por 18 meses para contingências, cláusula de não concorrência de cinco anos e plano de retenção dos executivos-chave. No cenário PE, rollover de 15% a 30% da fundadora com assento no conselho durante a transição.

## Uso dos recursos (vendedores)

Liquidez para a fundadora e os médicos sócios, com reinvestimento parcial no cenário de private equity. Não há captação primária: a operação é de cash-out, com eventual aporte primário condicionado ao plano de aquisições do comprador.`

O_MA.maturidade = `# Veredicto de Maturidade

## Conclusão institucional

A Lumina está madura para uma operação de controle. A combinação de liderança regional, margem em expansão, alavancagem baixa e fluxo recorrente de convênios sustenta um processo competitivo com estratégicos e financeiros.

## Gaps a endereçar

1. Renovar os dois contratos de operadora que vencem em 2026.
2. Formalizar o plano de sucessão técnica e contratar diretor técnico independente.
3. Concluir a acreditação PALC do terceiro NTO.

## Roadmap pré-operação

Os três gaps têm prazo estimado de 60 a 90 dias e podem correr em paralelo à preparação do data room. Nenhum é impeditivo para iniciar a abordagem de compradores.

## Recomendação final

Avançar. A operação tem tese de equity consistente e alta sinergia para consolidadores. A renovação dos contratos de operadora é a prioridade, pois é o item que mais protege o múltiplo-alvo no processo competitivo.`

O_MA.blind_teaser = `# Blind Teaser — Projeto Aurora

Material de divulgação anônima. A identidade da companhia é revelada exclusivamente mediante assinatura de acordo de confidencialidade (NDA).

## Resumo da oportunidade

Rede regional líder de medicina diagnóstica (análises clínicas e imagem) no Sul do Brasil, com 18 anos de operação, 38 unidades de atendimento, 3 laboratórios centrais e 24 milhões de exames realizados por ano. Atende as principais operadoras e hospitais da região, com 64% da receita em contratos recorrentes de convênio.

A operação é de venda de controle (até 100% do capital), com forte sinergia para consolidadores nacionais e tese de buy-and-build para fundos.

## Indicadores-chave (2025)

| Métrica | Valor |
| --- | --- |
| Receita líquida | R$ 612 milhões |
| EBITDA ajustado | R$ 142 milhões |
| Margem EBITDA | 23% |
| Crescimento médio 2021–2025 | 15% a.a. |
| Dívida líquida / EBITDA | 1,3x |
| Unidades de atendimento | 38 |
| Exames/ano | 24 milhões |

## Destaques do investimento

- Líder independente do Sul em um setor de demanda resiliente e em consolidação.
- Margem EBITDA de 23%, no terço superior dos pares regionais e em expansão por cinco anos.
- Escala laboratorial (3 NTOs de alta ocupação) que dilui custo fixo.
- Pipeline de quatro aquisições bolt-on mapeado, a múltiplo de entrada abaixo do da plataforma.
- Sinergias relevantes para um comprador estratégico (compras, logística, back-office).

## A operação

| Componente | Faixa |
| --- | --- |
| Valor da firma (referência) | 10,0x a 12,0x EBITDA |
| Modalidade | Controle (51%–100%) |
| Estrutura | Caixa + earn-out / rollover |

## Próximos passos

Contrapartes qualificadas podem solicitar o Confidential Information Memorandum (CIM) e o acesso ao data room mediante assinatura de NDA junto à assessoria responsável.`

O_MA.sell_side_pitchbook = `# Pitchbook — Projeto Aurora

Lumina Diagnósticos S.A. Material confidencial para uso restrito de potenciais compradores qualificados.

## 1. Sumário executivo

A Lumina é a maior rede independente de medicina diagnóstica do Sul do Brasil, com 18 anos de operação, 38 unidades de atendimento, 3 laboratórios centrais e 24 milhões de exames/ano. Fechou 2025 com receita líquida de R$ 612,4 milhões e EBITDA ajustado de R$ 142,1 milhões (margem de 23,2%), após cinco anos de expansão consecutiva de receita e margem. O Projeto Aurora estrutura a venda do controle a um consolidador estratégico ou a um fundo com tese de buy-and-build.

## 2. Visão geral da companhia

| Perfil | |
| --- | --- |
| Fundação | 2007 |
| Sede | Curitiba (PR) |
| Estados | PR, SC, RS |
| Unidades de atendimento | 38 |
| Laboratórios centrais (NTOs) | 3 |
| Exames/ano | 24 milhões |

## 3. Destaques do investimento

- Liderança independente regional em setor resiliente e em consolidação.
- Margem EBITDA de 23,2%, acima de redes regionais comparáveis e em expansão há cinco anos.
- Crescimento composto de 14,8% ao ano (2021–2025) com alavancagem baixa (1,3x).
- Escala laboratorial com alta ocupação dos NTOs.
- Pipeline de quatro aquisições bolt-on mapeado.
- ROIC de 19,4% em 2025, bem acima do custo de capital.

## 4. Modelo de negócio e receita

A receita se divide entre análises clínicas (68%) e diagnóstico por imagem (32%). Cerca de 64% vem de contratos com operadoras (recorrente) e o restante de particulares e hospitais. Exames de alta complexidade (genética, biologia molecular) já são 17% da receita e crescem acima da média.

## 5. Desempenho financeiro

| R$ milhões | 2021 | 2022 | 2023 | 2024 | 2025 |
| --- | --- | --- | --- | --- | --- |
| Receita líquida | 352,1 | 408,6 | 471,8 | 538,9 | 612,4 |
| EBITDA ajustado | 70,4 | 84,2 | 99,2 | 118,6 | 142,1 |
| Margem EBITDA aj. | 20,0% | 20,6% | 21,0% | 22,0% | 23,2% |
| Dívida líquida / EBITDA | — | — | 1,9x | 1,6x | 1,3x |
| ROIC | — | — | 16,2% | 17,9% | 19,4% |

## 6. Projeções (cenário base)

| R$ milhões | 2025 | 2030E |
| --- | --- | --- |
| Receita líquida | 612 | 1.030 |
| EBITDA ajustado | 142 | 257 |
| Margem EBITDA | 23,2% | ~25,0% |

## 7. Mercado e posicionamento

O mercado brasileiro de medicina diagnóstica movimenta cerca de R$ 45 bilhões ao ano e cresce acima do PIB. A Lumina lidera o segmento independente no Sul, com participação estimada de 14% no mercado endereçável das três capitais.

| Comparável | Perfil | EV/EBITDA | Margem EBITDA |
| --- | --- | --- | --- |
| Grupo nacional listado I | Diagnósticos, Brasil | 11,8x | 24% |
| Grupo nacional listado II | Medicina diagnóstica | 10,4x | 22% |
| Precedente A | M&A controle, 2024 | 11,5x | 23% |
| Lumina (implícito) | Projeto Aurora | 11,0x | 23% |

## 8. Tese de consolidação

Pipeline de quatro alvos regionais, EBITDA somado de R$ 19 milhões a múltiplo médio de 6,0x, abaixo dos 11,0x da plataforma. A integração a um grupo nacional adiciona R$ 22 a R$ 30 milhões de EBITDA de sinergia em 24 meses.

## 9. Valuation

| Metodologia | Faixa de EV |
| --- | --- |
| Múltiplos (10,0x–12,0x EBITDA 2025) | R$ 1,42–1,71 bi |
| Fluxo de caixa descontado (WACC 13,0%, g 4,5%) | R$ 1,56 bi (base) |

Descontada a dívida líquida de R$ 185 milhões, o equity situa-se entre R$ 1,24 e R$ 1,53 bilhão.

## 10. Estrutura proposta da transação

| Componente | Termos |
| --- | --- |
| Modalidade | Controle (51%–100%) |
| Estratégico | Caixa + earn-out de até 20% (EBITDA 24 meses) |
| Private equity | Caixa + rollover da fundadora (15%–30%) + conselho |
| Proteções | Escrow 10% por 18 meses, não concorrência 5 anos, retenção de executivos |

## 11. Governança e estrutura societária

| Acionista | Participação |
| --- | --- |
| Fundadora (controladora) | 61% |
| Médicos sócios | 24% |
| Fundo regional (minoritário) | 15% |

## 12. Riscos e mitigações

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Reajuste de operadoras | Compressão de margem | Renovação antecipada dos 3 maiores contratos |
| Sucessão (fundadora acumula funções) | Risco de transição | Diretor técnico independente + retenção |
| Glosa de operadoras (4,1%) | Pressão de capital de giro | Gestão profissional de glosas |

## 13. Próximos passos

Data room e CIM mediante NDA, sessões de Q&A com a administração, processo competitivo com LOIs, due diligence confirmatória e fechamento em 4 a 5 meses.

## 14. Aviso

Material confidencial preparado exclusivamente para avaliação preliminar por compradores qualificados. As informações não foram objeto de auditoria independente e não constituem oferta de valores mobiliários nos termos da regulamentação aplicável.`

const MESA_MA = {
  aprovacao: 'aprovado',
  diagnostico_final: 'Ativo maduro, líder regional e altamente sinérgico para consolidadores. Margem em expansão, alavancagem baixa e fluxo recorrente de convênios sustentam um processo competitivo de controle. As ressalvas são de governança e documentação, endereçáveis no curso da transação.',
  pontos_fortes: [
    'Líder independente de medicina diagnóstica no Sul, setor resiliente e em consolidação.',
    'Margem EBITDA de 23%, em expansão consistente há cinco anos.',
    'Alavancagem baixa (1,3x) e ROIC de 19,4%.',
    'Pipeline de quatro aquisições bolt-on a múltiplo de entrada abaixo do da plataforma.',
  ],
  pontos_fracos: [
    'Dois contratos de operadora relevantes vencem em 2026.',
    'Concentração de funções de CEO e direção técnica na fundadora.',
    'Acreditação PALC pendente no terceiro NTO.',
  ],
  contradicoes_detectadas: [],
  recomendacao_assessor: 'Avançar ao processo competitivo restrito, priorizando a renovação dos contratos de operadora e a formalização do plano de sucessão técnica antes do fechamento.',
}

const INTAKE_MA = {
  nomeAtivo: 'Lumina Diagnósticos',
  tipoAtivo: 'Empresa (M&A)',
  estagio: 'Estruturado',
  objetivo: 'Vender 100%, Vender participação',
  nivelInformacao: 'Alto (DRE, balanço e documentos disponíveis)',
  operacaoEmAndamento: 'Sim: já há operação/receita',
  localizacao: 'Curitiba – PR, Brasil',
  ticketEstimado: 'R$ 1,4 bi a R$ 1,7 bi (EV)',
  resumoAtivo: 'Maior rede independente de medicina diagnóstica do Sul (38 unidades, 3 laboratórios centrais, 24 milhões de exames/ano). Receita de R$ 612M e EBITDA de R$ 142M em 2025. Venda de controle, com tese de consolidação. A fundadora acumula CEO e direção técnica; a transação prevê plano de sucessão técnica.',
  informacoesAdicionais: 'Operação de demonstração (Projeto Aurora). Conteúdo fictício para fins de apresentação institucional.',
  escritorio: 'RR7x - Capita Hub',
  nomeProprietario: 'Holding Lumina Participações Ltda.',
}

const TESE_MA = {
  origem: 'mandor',
  empresa_nome: 'Lumina Diagnósticos',
  empresa_descricao_curta: 'Maior rede independente de medicina diagnóstica do Sul do Brasil. 38 unidades, 3 laboratórios centrais, 24 milhões de exames/ano. Receita de R$ 612M e EBITDA de R$ 142M em 2025.',
  setor_primario: 'Saúde',
  sub_setores: ['Medicina Diagnóstica', 'Análises Clínicas', 'Diagnóstico por Imagem', 'Serviços de Saúde'],
  modelos_negocio: ['Serviços', 'B2B', 'B2B2C'],
  vertical_tags: ['saude', 'diagnostico', 'laboratorio', 'servicos_saude', 'sul', 'consolidacao'],
  estagio: 'mature',
  maturity_score: 86,
  anos_operacao: 18,
  receita_anual_brl: 612000000,
  ebitda_brl: 142000000,
  margem_ebitda_pct: 23,
  crescimento_yoy_pct: 14,
  capital_buscado_brl: 1000000000,
  capital_minimo_ticket_brl: 500000000,
  uso_capital: 'Venda de controle (cash-out dos acionistas), com possível aporte primário pelo comprador para acelerar o programa de aquisições bolt-on no setor de medicina diagnóstica.',
  valuation_pre_money_brl: 1560000000,
  equity_oferecido_pct: 100,
  governance_score: 78,
  tem_conselho: true,
  tem_auditoria: true,
  nivel_compliance: 'alto',
  risk_overall_score: 34,
  risk_factors: ['Dependência de reajustes de operadoras', 'Sucessão da fundadora (acumula CEO e direção técnica)', 'Glosa de operadoras (4,1%)'],
  operational_score: 84,
  team_size: 2100,
  key_dependencies: ['Contratos com operadoras de saúde', 'Acreditação sanitária dos laboratórios'],
  hq_estado: 'PR',
  hq_cidade: 'Curitiba',
  regioes_operacao: ['PR', 'SC', 'RS', 'NACIONAL'],
  tipo_deal: 'm_and_a_sale',
  controle_oferecido: 'majority',
  horizonte_saida_anos: 5,
  urgencia: 'media',
  documentacao_score: 80,
  pronto_para_dd: true,
  tipos_investidor_excluidos: [],
  esg_compliant: true,
  tese_investimento: 'Lumina é a maior rede independente de medicina diagnóstica do Sul (receita R$ 612M, EBITDA R$ 142M, margem 23%), líder em um setor resiliente e em consolidação. Vende controle a um consolidador estratégico ou a um fundo com tese de buy-and-build, com pipeline próprio de quatro aquisições bolt-on mapeadas.',
  value_proposition: 'Plataforma regional líder de diagnósticos com escala laboratorial, marca consolidada junto a operadoras e mix crescente de exames de alta complexidade.',
  competitive_moat: 'Densidade regional (38 unidades alimentando 3 NTOs de alta ocupação), marca reconhecida por prescritores e operadoras, e barreira de acreditação sanitária.',
  risk_narrative: 'Riscos principais: dependência de reajustes de operadoras, sucessão da fundadora e glosa. Mitigados por contratos de longo prazo, plano de sucessão técnica e gestão profissional de glosas.',
  exit_story: 'Saída via venda estratégica a grupo nacional de diagnósticos, consolidação por fundo de private equity com posterior IPO, ou venda secundária a estratégico internacional.',
  status: 'lead',
}

// ============================================================================
// DEAL 2 — FIDC / Securitização: Vanguarda Consignado (estruturação de FIDC)
// ============================================================================
const O_FIDC = {}
O_FIDC.relatorio_consolidado = `# Vanguarda Consignado — Relatório Consolidado

Projeto Âncora. Material confidencial preparado para apresentação a comitê de investimento.

## Resumo executivo

A Vanguarda Promotora de Crédito é uma originadora especializada em crédito consignado, com 12 anos de operação, atuação nacional e foco em servidores públicos e aposentados/pensionistas do INSS. Originou R$ 1,8 bilhão em crédito em 2025, com carteira ativa de R$ 2,3 bilhões e inadimplência (NPL acima de 90 dias) de 1,9%, bem abaixo da média do crédito pessoal.

O Projeto Âncora estrutura um FIDC (Fundo de Investimento em Direitos Creditórios) de R$ 400 milhões para dar funding recorrente à originação, substituindo linhas bancárias mais caras e curtas por uma estrutura de mercado de capitais. A operação securitiza recebíveis consignados pulverizados, com averbação em folha e desconto direto no benefício, o que confere previsibilidade de fluxo e baixíssima perda esperada.

O ativo-lastro tem qualidade de crédito alta: consignado com desconto em folha e averbação prévia, devedores pulverizados (mais de 240 mil contratos), e taxa de pré-pagamento monitorada. A estrutura proposta protege a cota sênior com subordinação robusta e gatilhos de aceleração.

## Tese de investimento

O crédito consignado é o segmento de menor risco do crédito pessoal no Brasil: o pagamento é descontado diretamente da folha ou do benefício, antes de chegar ao devedor. A Vanguarda originou uma carteira saudável, pulverizada e com baixa inadimplência, mas seu funding hoje é caro e dependente de poucos bancos. O FIDC destrava escala: funding de mercado de capitais, mais barato e estável, com a originadora retendo a cota subordinada (skin in the game).

Para o investidor da cota sênior, é uma exposição a um lastro de altíssima qualidade, com subordinação de 25%, spread atrativo sobre CDI e liquidez via mercado secundário. Para a cota mezanino, é um prêmio adicional com proteção ainda relevante.

## Estrutura do lastro (carteira elegível)

| Indicador da carteira | Valor |
| --- | --- |
| Carteira ativa | R$ 2,3 bilhões |
| Contratos ativos | ~240 mil |
| Ticket médio | R$ 9,6 mil |
| Prazo médio remanescente | 52 meses |
| Convênios | INSS (58%), SIAPE/Federal (22%), Governos estaduais e municipais (20%) |
| Inadimplência (NPL 90+) | 1,9% |
| Taxa de pré-pagamento (anualizada) | 14,3% |

## Estrutura proposta do FIDC

| Parâmetro | Definição |
| --- | --- |
| Volume da emissão | R$ 400 milhões |
| Cota sênior | 75% — alvo CDI + 3,0% a.a. |
| Cota mezanino | 12% — alvo CDI + 7,5% a.a. |
| Cota subordinada | 13% — retida integralmente pela cedente |
| Subordinação à sênior | 25% |
| Prazo | 60 meses (revolvente nos primeiros 24 meses) |
| Concentração máx. por convênio | 60% (INSS) |
| Gatilhos de aceleração | NPL 90+ acima de 4%; subordinação abaixo de 20%; razão de garantia abaixo de 1,15x |

## Principais riscos

- Risco de convênio: mudança regulatória no consignado INSS (teto de juros, regras de portabilidade) pode reduzir margem de originação. Mitigado por diversificação de convênios.
- Risco de originação: a qualidade do FIDC depende da política de crédito da cedente. Mitigado pela retenção integral da cota subordinada e por critérios de elegibilidade rígidos.
- Risco de pré-pagamento: portabilidade eleva o pré-pagamento e encurta a duration. Mitigado pela estrutura revolvente e pelo spread.

## Conclusão institucional

A operação é robusta e o lastro é de alta qualidade. A subordinação de 25%, a pulverização da carteira e a averbação em folha conferem à cota sênior um perfil de risco compatível com investidores institucionais conservadores. A recomendação é avançar à estruturação, condicionada à due diligence da carteira (data tape) e à definição do agente fiduciário e do administrador.`

O_FIDC.orchestration = `# Orquestração — Deal Readiness Score

## Veredito

Deal Readiness Score (DRS): **80 / 100** — Pronto com ressalvas.

O lastro tem qualidade de crédito alta e a estrutura proposta é sólida. As ressalvas se concentram na formalização da governança da operação (agente fiduciário, administrador, custodiante) e na due diligence da carteira.

## Composição do score

| Dimensão | Peso | Nota |
| --- | --- | --- |
| Qualidade do lastro | 30% | 90 |
| Estrutura e subordinação | 25% | 84 |
| Originador (política de crédito e histórico) | 20% | 78 |
| Governança da operação | 15% | 66 |
| Documentação (data tape) | 10% | 72 |

## O que falta

A governança da operação puxa o score: ainda não estão definidos o administrador, o custodiante e o agente fiduciário do FIDC. A due diligence da carteira (data tape com performance histórica por safra) precisa ser concluída.

## Recomendação

Avançar à estruturação em paralelo à seleção dos prestadores de serviço do fundo. A due diligence da carteira é o caminho crítico e deve ser priorizada, pois valida as premissas de inadimplência e pré-pagamento.`

O_FIDC.pesquisa = `# Inteligência de Mercado

## Panorama do setor

O crédito consignado é o maior e mais seguro segmento do crédito pessoal no Brasil, com estoque superior a R$ 600 bilhões. A modalidade combina baixo risco (desconto em folha) com demanda estrutural de aposentados, pensionistas e servidores. O funding via FIDC cresceu fortemente, e securitizadoras e gestoras de crédito têm apetite por lastros consignados pulverizados e bem originados.

A Vanguarda é uma originadora de porte médio, com presença nacional e mix diversificado de convênios, o que a diferencia de promotoras mono-convênio mais expostas a risco regulatório.

## Posicionamento competitivo

A vantagem da Vanguarda é a diversificação de convênios e a tecnologia de originação digital, que reduz custo de aquisição e tempo de averbação. A inadimplência de 1,9% está abaixo da média do consignado privado, refletindo política de crédito conservadora e foco em INSS e servidores estáveis.

## Benchmark de estruturas comparáveis

| Estrutura comparável | Lastro | Spread sênior | Subordinação |
| --- | --- | --- | --- |
| FIDC consignado A | INSS + servidores | CDI + 2,6% | 22% |
| FIDC consignado B | Multi-convênio | CDI + 3,2% | 26% |
| FIDC consignado C | Estadual/municipal | CDI + 3,8% | 28% |
| **Vanguarda (proposto)** | **INSS + SIAPE + estaduais** | **CDI + 3,0%** | **25%** |

A estrutura proposta está alinhada à prática de mercado, com subordinação no terço superior da amostra, coerente com o perfil de lastro e a fase inicial do programa.`

O_FIDC.diagnostico = `# Diagnóstico Financeiro (Originador e Carteira)

## Originação e carteira

| R$ milhões | 2022 | 2023 | 2024 | 2025 |
| --- | --- | --- | --- | --- |
| Originação anual | 980 | 1.240 | 1.520 | 1.800 |
| Carteira ativa (fim do ano) | 1.310 | 1.680 | 2.010 | 2.300 |
| Receita de intermediação | 188 | 241 | 296 | 352 |
| NPL 90+ (%) | 2,3% | 2,1% | 2,0% | 1,9% |
| Custo de funding médio | CDI + 4,8% | CDI + 4,5% | CDI + 4,2% | CDI + 4,0% |

A originação cresceu a 22,5% ao ano entre 2022 e 2025, com melhora consistente da inadimplência. O custo de funding atual (CDI + 4,0%, via linhas bancárias) é o principal limitador de escala e margem, e é exatamente o que o FIDC endereça.

## Performance por safra (vintage)

A análise de safras mostra perda esperada estável: as safras de 2022 a 2024 convergem para perda acumulada de 2,0% a 2,4% em 24 meses, com baixa dispersão. A previsibilidade do consignado se confirma na curva de inadimplência por safra.

## Impacto do FIDC na estrutura de capital

| Indicador | Antes (linhas bancárias) | Depois (FIDC) |
| --- | --- | --- |
| Custo de funding médio | CDI + 4,0% | CDI + 3,4% (blended) |
| Prazo do funding | 18–24 meses | 60 meses (revolvente) |
| Dependência de bancos | Alta (4 bancos) | Diversificada (mercado de capitais) |
| Capacidade de originação | Limitada por linha | Escalável com a cota sênior |

A migração para o FIDC reduz o custo de funding em cerca de 60 pontos-base e alonga o prazo, liberando margem e capacidade de originação.

## Capacidade de pagamento da estrutura

No cenário base, a razão de garantia (carteira sobre passivo sênior+mezanino) fica em 1,33x, acima do gatilho de 1,15x. No estresse, com inadimplência dobrando para 3,8% e pré-pagamento subindo para 22%, a razão de garantia permanece em 1,21x e a cota sênior segue integralmente coberta.`

O_FIDC.estruturacao = `# Estruturação de Crédito

## Estrutura recomendada

| Parâmetro | Definição |
| --- | --- |
| Veículo | FIDC (condomínio fechado), CVM 175/22 |
| Volume | R$ 400 milhões |
| Cota sênior | 75% — CDI + 3,0% a.a. |
| Cota mezanino | 12% — CDI + 7,5% a.a. |
| Cota subordinada | 13% — retida pela cedente |
| Subordinação à sênior | 25% |
| Prazo | 60 meses, revolvente nos primeiros 24 |
| Garantia | Cessão fiduciária dos direitos creditórios consignados |
| Razão de garantia mínima | 1,15x |

## Critérios de elegibilidade dos recebíveis

- Contratos de consignado com averbação confirmada e desconto em folha/benefício.
- Convênios elegíveis: INSS, SIAPE/Federal e governos estaduais/municipais com histórico.
- Prazo remanescente entre 6 e 84 meses; ticket máximo por contrato de R$ 50 mil.
- Concentração máxima por convênio: 60% (INSS); por ente estadual/municipal: 10%.
- Vedados contratos com mais de 30 dias de atraso na cessão.

## Gatilhos de aceleração (eventos de avaliação)

- NPL 90+ da carteira acima de 4%.
- Razão de subordinação abaixo de 20%.
- Razão de garantia abaixo de 1,15x.
- Descumprimento de índices pela cedente ou interrupção de averbação por convênio relevante.

## Comparação de alternativas de funding

| Alternativa | Custo estimado | Prazo | Veredito |
| --- | --- | --- | --- |
| FIDC (cota sênior CDI + 3,0%) | CDI + 3,4% blended | 60 meses | Recomendada |
| Linhas bancárias atuais | CDI + 4,0% | 18–24 meses | Cara e curta |
| CRI/CRA | Não aplicável | — | Lastro não imobiliário/agro |
| Debênture da promotora | CDI + 6,0% | 4 anos | Mais cara, sem isolamento de risco |

## Uso dos recursos

Substituição das linhas bancárias caras (R$ 260 milhões), expansão da originação (R$ 110 milhões) e reserva de liquidez/estruturação (R$ 30 milhões).`

O_FIDC.diagnostico_credito = `# Análise de Crédito do Lastro

## Qualidade do lastro

O lastro consignado tem três camadas de proteção: desconto em folha (o pagamento ocorre antes de o devedor receber), averbação prévia (a margem consignável é reservada) e pulverização (mais de 240 mil contratos, nenhum relevante isoladamente). A perda esperada é estruturalmente baixa.

## Estresse da cota sênior

Mesmo no cenário severo (NPL 90+ a 3,8%, pré-pagamento a 22%, atraso de repasse de um convênio estadual), a subordinação de 25% absorve as perdas e a cota sênior permanece integralmente honrada, com razão de garantia de 1,21x. O ponto de ruptura da sênior exigiria perda acumulada acima de 25% da carteira, mais de dez vezes a perda histórica.`

O_FIDC.kyc = `# Compliance & KYC

## Estrutura societária da cedente

A Vanguarda Promotora de Crédito é controlada por dois sócios fundadores (78%) e por um fundo de venture debt (22%). A cadeia de titularidade foi mapeada até as pessoas físicas, sem camadas opacas.

## Screening

A verificação dos sócios e administradores em listas de PEP, sanções e mídias adversas não retornou apontamentos. A promotora possui os registros e habilitações exigidos para operar consignado junto aos convênios.

## Regulatório e averbação

Os convênios de averbação (INSS, SIAPE, estaduais) estão regulares. A operação observa as regras do consignado (teto de juros, margem consignável, portabilidade) e a estrutura do FIDC segue a CVM 175/22, com administrador e custodiante a definir entre prestadores habilitados.

## Red flags

Nenhum apontamento bloqueante. Ponto de atenção: a concentração de 58% da carteira no convênio INSS, mitigada pelo gatilho de concentração máxima de 60% e pela diversificação progressiva para convênios de servidores.`

O_FIDC.contratos = `# Análise Contratual e Documental

## Documentos da operação

A estruturação exige: regulamento do FIDC, contrato de cessão de direitos creditórios, contrato de custódia, contrato de administração, instrumento de constituição das cotas e termos de averbação por convênio. O contrato de cessão prevê recompra obrigatória de recebíveis inelegíveis identificados após a cessão (cláusula de revolvência e substituição).

## Cessão e isolamento de risco

A cessão fiduciária dos direitos creditórios isola o risco da carteira do risco corporativo da cedente: em caso de insolvência da promotora, os recebíveis cedidos pertencem ao fundo. A retenção integral da cota subordinada pela cedente alinha incentivos e funciona como primeira camada de absorção de perdas.

## Passivos e contingências da cedente

| Natureza | Valor estimado (R$ M) | Probabilidade de perda |
| --- | --- | --- |
| Cível (relação de consumo) | 3,2 | Possível |
| Trabalhista | 2,1 | Remota |
| Regulatória | 0,8 | Remota |

As contingências da cedente não afetam a carteira cedida, dado o isolamento de risco da estrutura.

## Recomendações jurídicas

Definir administrador, custodiante e agente fiduciário habilitados; concluir a due diligence da carteira (data tape); formalizar os critérios de elegibilidade no regulamento; e estruturar os gatilhos de aceleração com clareza de mensuração.`

O_FIDC.originacao = `# Estratégia de Distribuição

## Perfil de investidores-alvo

A operação atrai quatro perfis. Gestoras de crédito estruturado especializadas em FIDC; securitizadoras e estruturadores que montam e distribuem a operação; fundos de crédito privado em busca de lastro consignado de qualidade; e mesas de DCM de bancos para a colocação da cota sênior.

## Pipeline de contrapartes

| Tipo | Quantidade mapeada | Fit |
| --- | --- | --- |
| Gestoras de FIDC / crédito estruturado | 8 | Alto |
| Securitizadoras / estruturadores | 4 | Alto |
| Fundos de crédito privado | 6 | Alto |
| Bancos (DCM / distribuição) | 3 | Médio-alto |

## Posicionamento

Cota sênior (75%) colocada junto a fundos de crédito e tesourarias institucionais conservadoras; cota mezanino (12%) junto a gestoras com apetite por prêmio e proteção; cota subordinada (13%) retida pela cedente. A recomendação é um processo de book restrito, com âncora institucional na cota sênior.`

O_FIDC.maturidade = `# Veredicto de Maturidade

## Conclusão institucional

A operação está madura para a estruturação. O lastro consignado é de alta qualidade, a originadora tem histórico consistente e a estrutura de subordinação protege adequadamente a cota sênior. O FIDC reduz o custo de funding e destrava a escala de originação.

## Gaps a endereçar

1. Selecionar administrador, custodiante e agente fiduciário habilitados.
2. Concluir a due diligence da carteira (data tape por safra).
3. Formalizar os critérios de elegibilidade e os gatilhos no regulamento.

## Roadmap pré-operação

Os gaps têm prazo estimado de 45 a 60 dias e podem correr em paralelo à montagem do book. A due diligence da carteira é o caminho crítico.

## Recomendação final

Avançar. A operação tem mérito de crédito sólido e lastro de qualidade. A colocação deve ancorar a cota sênior em investidores institucionais conservadores antes de abrir a mezanino.`

O_FIDC.blind_teaser = `# Blind Teaser — Projeto Âncora

Material de divulgação anônima. A identidade da originadora é revelada exclusivamente mediante assinatura de acordo de confidencialidade (NDA).

## Resumo da oportunidade

Originadora nacional de crédito consignado, com 12 anos de operação, carteira ativa de R$ 2,3 bilhões e inadimplência de 1,9%, estrutura um FIDC de R$ 400 milhões para dar funding de mercado de capitais à sua originação. O lastro é composto por recebíveis consignados pulverizados (mais de 240 mil contratos), com averbação em folha e desconto direto no benefício.

## Indicadores-chave

| Métrica | Valor |
| --- | --- |
| Carteira ativa | R$ 2,3 bilhões |
| Originação 2025 | R$ 1,8 bilhão |
| Contratos ativos | ~240 mil |
| Inadimplência (NPL 90+) | 1,9% |
| Volume do FIDC | R$ 400 milhões |
| Subordinação à sênior | 25% |

## Destaques do investimento

- Lastro de altíssima qualidade: consignado com desconto em folha e averbação prévia.
- Carteira pulverizada e diversificada por convênios (INSS, SIAPE, estaduais).
- Inadimplência de 1,9%, abaixo da média do consignado privado.
- Subordinação robusta de 25% e gatilhos de aceleração protegendo a cota sênior.
- Cedente retém integralmente a cota subordinada (alinhamento de incentivos).

## A operação

| Cota | Participação | Remuneração-alvo |
| --- | --- | --- |
| Sênior | 75% | CDI + 3,0% a.a. |
| Mezanino | 12% | CDI + 7,5% a.a. |
| Subordinada | 13% | Retida pela cedente |

## Próximos passos

Contrapartes qualificadas podem solicitar o data tape da carteira e a minuta de estrutura mediante NDA junto à assessoria responsável.`

O_FIDC.sell_side_pitchbook = `# Pitchbook — Projeto Âncora

Vanguarda Promotora de Crédito. Material confidencial para uso restrito de investidores e estruturadores qualificados.

## 1. Sumário executivo

A Vanguarda é uma originadora nacional de crédito consignado com 12 anos de operação, carteira ativa de R$ 2,3 bilhões, originação de R$ 1,8 bilhão em 2025 e inadimplência de 1,9%. O Projeto Âncora estrutura um FIDC de R$ 400 milhões para substituir funding bancário caro por funding de mercado de capitais, reduzindo o custo médio em cerca de 60 pontos-base e alongando o prazo.

## 2. Visão geral da originadora

| Perfil | |
| --- | --- |
| Fundação | 2013 |
| Atuação | Nacional |
| Convênios | INSS, SIAPE/Federal, estaduais e municipais |
| Carteira ativa | R$ 2,3 bilhões |
| Contratos ativos | ~240 mil |

## 3. Destaques do investimento

- Lastro consignado com desconto em folha e averbação prévia (perda esperada estruturalmente baixa).
- Carteira pulverizada (240 mil contratos) e diversificada por convênios.
- Inadimplência de 1,9%, abaixo da média do consignado privado.
- Estrutura com subordinação de 25% e gatilhos de aceleração.
- Cedente retém a cota subordinada (skin in the game).

## 4. Estrutura do lastro

| Indicador | Valor |
| --- | --- |
| Ticket médio | R$ 9,6 mil |
| Prazo médio remanescente | 52 meses |
| Convênios | INSS 58% · SIAPE/Federal 22% · estaduais/municipais 20% |
| NPL 90+ | 1,9% |
| Pré-pagamento (anual) | 14,3% |

## 5. Performance histórica (vintages)

As safras de 2022 a 2024 convergem para perda acumulada de 2,0% a 2,4% em 24 meses, com baixa dispersão, confirmando a previsibilidade do consignado.

## 6. Estrutura proposta do FIDC

| Cota | Participação | Remuneração-alvo | Proteção |
| --- | --- | --- | --- |
| Sênior | 75% | CDI + 3,0% a.a. | Subordinação de 25% |
| Mezanino | 12% | CDI + 7,5% a.a. | Subordinação de 13% |
| Subordinada | 13% | Retida pela cedente | Primeira perda |

Prazo de 60 meses, revolvente nos primeiros 24, com cessão fiduciária dos direitos creditórios e razão de garantia mínima de 1,15x.

## 7. Critérios de elegibilidade e gatilhos

Averbação confirmada, prazo remanescente de 6 a 84 meses, ticket máximo de R$ 50 mil, concentração máxima de 60% no INSS. Gatilhos de aceleração: NPL 90+ acima de 4%, subordinação abaixo de 20%, razão de garantia abaixo de 1,15x.

## 8. Impacto na estrutura de capital

| Indicador | Antes | Depois (FIDC) |
| --- | --- | --- |
| Custo de funding médio | CDI + 4,0% | CDI + 3,4% blended |
| Prazo do funding | 18–24 meses | 60 meses |
| Capacidade de originação | Limitada | Escalável |

## 9. Análise de estresse

No cenário severo (NPL 90+ a 3,8%, pré-pagamento a 22%), a razão de garantia permanece em 1,21x e a cota sênior segue integralmente coberta. O ponto de ruptura da sênior exigiria perda acumulada acima de 25%, mais de dez vezes a perda histórica.

## 10. Governança da operação

Administrador, custodiante e agente fiduciário a definir entre prestadores habilitados. A cessão fiduciária isola o risco da carteira do risco corporativo da cedente.

## 11. Riscos e mitigações

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Risco de convênio (regulatório) | Margem de originação | Diversificação de convênios; gatilhos |
| Risco de originação | Qualidade do lastro | Retenção da cota subordinada; elegibilidade rígida |
| Pré-pagamento (portabilidade) | Encurta duration | Estrutura revolvente; spread |

## 12. Uso dos recursos

Substituição de linhas bancárias caras (R$ 260 M), expansão da originação (R$ 110 M) e reserva de liquidez (R$ 30 M).

## 13. Próximos passos

Due diligence da carteira (data tape), seleção dos prestadores do fundo, formalização do regulamento e montagem do book, com âncora institucional na cota sênior. Cronograma estimado de 60 a 90 dias até o primeiro fechamento.

## 14. Aviso

Material confidencial preparado exclusivamente para avaliação preliminar por investidores e estruturadores qualificados. As informações não foram objeto de auditoria independente e não constituem oferta pública de valores mobiliários nos termos da regulamentação aplicável.`

const MESA_FIDC = {
  aprovacao: 'aprovado_com_ressalvas',
  diagnostico_final: 'Operação de crédito estruturado com lastro de alta qualidade (consignado com desconto em folha e averbação prévia), carteira pulverizada e baixa inadimplência. A subordinação de 25% e os gatilhos de aceleração protegem adequadamente a cota sênior. As ressalvas são de governança da operação (prestadores de serviço a definir) e due diligence da carteira.',
  pontos_fortes: [
    'Lastro consignado de altíssima qualidade, com perda esperada estruturalmente baixa.',
    'Carteira pulverizada (240 mil contratos) e inadimplência de 1,9%.',
    'Subordinação de 25% e gatilhos de aceleração robustos.',
    'Cedente retém integralmente a cota subordinada (alinhamento de incentivos).',
  ],
  pontos_fracos: [
    'Concentração de 58% no convênio INSS (mitigada por gatilho de 60%).',
    'Administrador, custodiante e agente fiduciário ainda a definir.',
    'Due diligence da carteira (data tape) pendente.',
  ],
  contradicoes_detectadas: [],
  recomendacao_assessor: 'Avançar à estruturação, priorizando a due diligence da carteira e a seleção dos prestadores de serviço, e ancorar a colocação na cota sênior junto a investidores institucionais conservadores.',
}

const INTAKE_FIDC = {
  nomeAtivo: 'Vanguarda Consignado — FIDC de Recebíveis',
  tipoAtivo: 'FIDC / Crédito Estruturado',
  estagio: 'Estruturando',
  objetivo: 'Estruturar crédito, Captar investimento',
  nivelInformacao: 'Alto (DRE, balanço e documentos disponíveis)',
  operacaoEmAndamento: 'Sim: já há operação/receita',
  localizacao: 'São Paulo – SP, Brasil',
  ticketEstimado: 'R$ 400M',
  resumoAtivo: 'Estruturação de FIDC de R$ 400M para dar funding de mercado de capitais à originação de crédito consignado da Vanguarda Promotora. Lastro pulverizado (240 mil contratos), averbação em folha, inadimplência de 1,9%. Cotas sênior 75% (CDI+3,0%), mezanino 12% (CDI+7,5%) e subordinada 13% retida pela cedente.',
  informacoesAdicionais: 'Operação de demonstração (Projeto Âncora). Conteúdo fictício para fins de apresentação institucional.',
  // Campos de estrutura de crédito (entrada de deal FIDC/Sec — v1.23)
  cedente: 'Vanguarda Promotora de Crédito S.A.',
  tipoRecebivel: 'Consignado',
  estruturaCotas: 'Sênior 75% (CDI+3,0%) / Mezanino 12% (CDI+7,5%) / Subordinada 13% (retida pela cedente). Subordinação à sênior: 25%.',
  serieEmissao: '1ª série / 1ª emissão',
  escritorio: 'RR7x - Capita Hub',
  nomeProprietario: 'Vanguarda Promotora de Crédito S.A.',
}

const TESE_FIDC = {
  origem: 'mandor',
  empresa_nome: 'Vanguarda Consignado — FIDC de Recebíveis',
  empresa_descricao_curta: 'FIDC de R$ 400M lastreado em recebíveis de crédito consignado (INSS, SIAPE, estaduais) originados pela Vanguarda Promotora. Carteira de R$ 2,3 bi, 240 mil contratos, inadimplência de 1,9%.',
  setor_primario: 'Serviços Financeiros',
  sub_setores: ['Crédito Consignado', 'Crédito Estruturado', 'Securitização', 'FIDC', 'Recebíveis'],
  modelos_negocio: ['Crédito', 'Securitização', 'B2B'],
  vertical_tags: ['credito', 'consignado', 'fidc', 'securitizacao', 'recebiveis', 'servicos_financeiros'],
  estagio: 'mature',
  maturity_score: 80,
  anos_operacao: 12,
  receita_anual_brl: 352000000,
  ebitda_brl: null,
  margem_ebitda_pct: null,
  crescimento_yoy_pct: 22,
  capital_buscado_brl: 400000000,
  capital_minimo_ticket_brl: 25000000,
  uso_capital: 'Funding de mercado de capitais (FIDC) para substituir linhas bancárias caras, alongar prazo e escalar a originação de crédito consignado, com cessão fiduciária dos direitos creditórios.',
  valuation_pre_money_brl: null,
  equity_oferecido_pct: null,
  governance_score: 72,
  tem_conselho: true,
  tem_auditoria: true,
  nivel_compliance: 'alto',
  risk_overall_score: 28,
  risk_factors: ['Risco regulatório do consignado (teto de juros, portabilidade)', 'Concentração no convênio INSS', 'Risco de pré-pagamento (portabilidade)'],
  operational_score: 80,
  team_size: 320,
  key_dependencies: ['Convênios de averbação (INSS, SIAPE, estaduais)', 'Política de crédito da originadora'],
  hq_estado: 'SP',
  hq_cidade: 'São Paulo',
  regioes_operacao: ['NACIONAL'],
  tipo_deal: 'credito_estruturado',
  controle_oferecido: 'none',
  horizonte_saida_anos: 5,
  urgencia: 'media',
  documentacao_score: 72,
  pronto_para_dd: true,
  tipos_investidor_excluidos: [],
  esg_compliant: true,
  tese_investimento: 'FIDC de R$ 400M lastreado em consignado de alta qualidade (desconto em folha, averbação prévia, 240 mil contratos, inadimplência de 1,9%). Cotas sênior (75%, CDI+3,0%), mezanino (12%, CDI+7,5%) e subordinada (13%, retida pela cedente). Subordinação de 25% e gatilhos de aceleração protegem a sênior.',
  value_proposition: 'Exposição a lastro consignado pulverizado e de baixíssima perda esperada, com subordinação robusta, spread atrativo sobre CDI e alinhamento de incentivos da originadora.',
  competitive_moat: 'Originadora com diversificação de convênios, originação digital de baixo custo e inadimplência abaixo da média; estrutura com isolamento de risco via cessão fiduciária.',
  risk_narrative: 'Riscos principais: regulatório do consignado, concentração em INSS e pré-pagamento por portabilidade. Mitigados por diversificação, gatilhos de concentração e estrutura revolvente.',
  exit_story: 'Amortização programada das cotas ao longo de 60 meses, com liquidez da cota sênior via mercado secundário e possibilidade de novas séries do FIDC.',
  status: 'lead',
}

// ============================================================================
// Investidores adicionais (aumentam a carteira p/ saúde-M&A e consignado-FIDC)
// ============================================================================
const baseInv = {
  escritorio_id: ESCRITORIO_ID, status: 'ativo', estado: 'SP', cidade: 'São Paulo',
  geografias_aceitas: ['SP', 'NACIONAL'], geografias_excluidas: [], setores_excluidos: [],
  requer_esg: false, requer_audited_financials: false, requer_pronto_para_dd: false,
  horizonte_saida_min_anos: 3, horizonte_saida_max_anos: 8, criado_por: OWNER_USER_ID,
}
const INVESTIDORES_NOVOS = [
  // --- Saúde / M&A ---
  { nome: 'DNA Capital Health', tipo: 'private_equity',
    setores_alvo: ['Saúde', 'Serviços', 'Bens de Consumo'], sub_setores: ['Medicina Diagnóstica', 'Serviços de Saúde', 'Hospitais'],
    vertical_tags: ['saude', 'diagnostico', 'servicos_saude', 'buyout'], geografias_aceitas: ['NACIONAL', 'SP', 'PR', 'SC', 'RS'],
    estagios_aceitos: ['growth', 'mature'], ticket_min_brl: 300000000, ticket_max_brl: 2000000000,
    tipos_deal_aceitos: ['m_and_a_sale', 'm_and_a_acquisition', 'equity', 'growth_equity'], controle_aceito: ['minority', 'majority'],
    maturity_min_score: 70, governance_min_score: 70, risk_max_score: 55, documentacao_min_score: 70,
    tese_resumo: 'Private equity dedicado a saúde, com tese de consolidação em serviços de saúde e medicina diagnóstica, tickets de R$ 300M a R$ 2bi.',
    tese_completa: 'Fundo de buyout focado exclusivamente em saúde no Brasil, com tese de buy-and-build em medicina diagnóstica, hospitais e serviços. Adquire controle de plataformas regionais líderes para consolidação nacional.' },

  { nome: 'Dasa Desenvolvimento (M&A Estratégico)', tipo: 'estrategico_corporativo',
    setores_alvo: ['Saúde'], sub_setores: ['Medicina Diagnóstica', 'Análises Clínicas', 'Diagnóstico por Imagem'],
    vertical_tags: ['saude', 'diagnostico', 'consolidacao', 'estrategico'], geografias_aceitas: ['NACIONAL', 'PR', 'SC', 'RS', 'SP'],
    estagios_aceitos: ['mature'], ticket_min_brl: 400000000, ticket_max_brl: 3000000000,
    tipos_deal_aceitos: ['m_and_a_sale', 'm_and_a_acquisition'], controle_aceito: ['majority'],
    maturity_min_score: 75, governance_min_score: 68, risk_max_score: 50, documentacao_min_score: 70,
    tese_resumo: 'Consolidador estratégico nacional de medicina diagnóstica; adquire redes regionais líderes para densidade e sinergia.',
    tese_completa: 'Braço de M&A de grupo estratégico nacional de diagnósticos, com apetite por adquirir o controle de redes regionais líderes que adicionem densidade geográfica e sinergias de compras, logística e back-office.' },

  { nome: 'Kinea Private Equity Saúde & Consumo', tipo: 'gestora',
    setores_alvo: ['Saúde', 'Bens de Consumo', 'Serviços'], sub_setores: ['Serviços de Saúde', 'Medicina Diagnóstica'],
    vertical_tags: ['saude', 'consumo', 'growth'], geografias_aceitas: ['NACIONAL', 'SP', 'PR'],
    estagios_aceitos: ['growth', 'mature'], ticket_min_brl: 250000000, ticket_max_brl: 1200000000,
    tipos_deal_aceitos: ['m_and_a_sale', 'equity', 'growth_equity'], controle_aceito: ['minority', 'majority'],
    maturity_min_score: 72, governance_min_score: 72, risk_max_score: 50, documentacao_min_score: 75,
    tese_resumo: 'Private equity para plataformas líderes em saúde e consumo, tickets de R$ 250M a R$ 1,2bi.',
    tese_completa: 'Gestora de private equity com apetite por plataformas de saúde e consumo com marca forte, fluxo recorrente e tese de consolidação, em controle ou co-controle.' },

  { nome: 'Pátria Saúde Family Office', tipo: 'family_office',
    setores_alvo: ['Saúde', 'Imobiliário', 'Serviços'], sub_setores: ['Medicina Diagnóstica', 'Serviços de Saúde'],
    vertical_tags: ['saude', 'family_office'], geografias_aceitas: ['NACIONAL', 'SP', 'PR', 'SC', 'RS'],
    estagios_aceitos: ['mature'], ticket_min_brl: 150000000, ticket_max_brl: 600000000,
    tipos_deal_aceitos: ['m_and_a_sale', 'equity', 'co_investimento'], controle_aceito: ['minority'],
    maturity_min_score: null, governance_min_score: null, risk_max_score: null, documentacao_min_score: null,
    tese_resumo: 'Family office com co-investimento de longo prazo em saúde, tickets de R$ 150M a R$ 600M.',
    tese_completa: 'Family office com horizonte longo e apetite por co-investir em ativos de saúde maduros e resilientes, em posição minoritária ao lado de gestores especializados.' },

  // --- Consignado / FIDC / Securitização ---
  { nome: 'Solis Investimentos FIDC', tipo: 'gestora',
    setores_alvo: ['Serviços Financeiros', 'Crédito'], sub_setores: ['Crédito Consignado', 'Crédito Estruturado', 'FIDC', 'Recebíveis'],
    vertical_tags: ['credito', 'consignado', 'fidc', 'recebiveis'], geografias_aceitas: ['NACIONAL', 'SP'],
    estagios_aceitos: ['growth', 'mature'], ticket_min_brl: 50000000, ticket_max_brl: 500000000,
    tipos_deal_aceitos: ['credito_estruturado', 'divida'], controle_aceito: ['none'],
    maturity_min_score: 65, governance_min_score: 65, risk_max_score: 55, documentacao_min_score: 65,
    tese_resumo: 'Gestora especializada em FIDC e crédito estruturado, com forte apetite por lastro consignado pulverizado.',
    tese_completa: 'Gestora dedicada a FIDC e direitos creditórios, com foco em lastros pulverizados e de baixa perda esperada como consignado, antecipação e recebíveis comerciais. Investe em cotas sênior e mezanino com subordinação adequada.' },

  { nome: 'Empírica Crédito Estruturado', tipo: 'gestora',
    setores_alvo: ['Serviços Financeiros', 'Crédito', 'Indústria'], sub_setores: ['Crédito Consignado', 'FIDC', 'Recebíveis', 'Securitização'],
    vertical_tags: ['credito', 'fidc', 'securitizacao', 'consignado'], geografias_aceitas: ['NACIONAL', 'SP'],
    estagios_aceitos: ['growth', 'mature'], ticket_min_brl: 40000000, ticket_max_brl: 400000000,
    tipos_deal_aceitos: ['credito_estruturado', 'divida'], controle_aceito: ['none'],
    maturity_min_score: 60, governance_min_score: 62, risk_max_score: 58, documentacao_min_score: 60,
    tese_resumo: 'Gestora de FIDC multicarteira, especialista em estruturação e gestão de direitos creditórios.',
    tese_completa: 'Casa de crédito estruturado que estrutura e gere FIDC de recebíveis diversos, incluindo consignado e antecipação, com expertise em modelagem de subordinação e gatilhos.' },

  { nome: 'Gaia Securitizadora', tipo: 'securitizadora',
    setores_alvo: ['Serviços Financeiros', 'Crédito', 'Imobiliário'], sub_setores: ['Securitização', 'Recebíveis', 'Crédito Estruturado', 'FIDC'],
    vertical_tags: ['securitizacao', 'recebiveis', 'credito', 'fidc'], geografias_aceitas: ['NACIONAL', 'SP'],
    estagios_aceitos: ['growth', 'mature'], ticket_min_brl: 50000000, ticket_max_brl: 600000000,
    tipos_deal_aceitos: ['credito_estruturado', 'divida', 'debenture'], controle_aceito: ['none'],
    maturity_min_score: null, governance_min_score: 60, risk_max_score: 60, documentacao_min_score: 60,
    tese_resumo: 'Securitizadora que estrutura e emite operações lastreadas em recebíveis, incluindo consignado e crédito estruturado.',
    tese_completa: 'Securitizadora independente com plataforma de estruturação e emissão de operações de crédito estruturado e recebíveis, atuando como estruturadora e distribuidora de FIDC e CRI/CRA.' },

  { nome: 'BTG Pactual Crédito Corporativo', tipo: 'banco',
    setores_alvo: ['Serviços Financeiros', 'Crédito', 'Indústria', 'Saúde'], sub_setores: ['Crédito Estruturado', 'FIDC', 'Debênture', 'Recebíveis'],
    vertical_tags: ['credito', 'fidc', 'dcm', 'banco'], geografias_aceitas: ['NACIONAL', 'SP'],
    estagios_aceitos: ['mature'], ticket_min_brl: 150000000, ticket_max_brl: 1500000000,
    tipos_deal_aceitos: ['credito_estruturado', 'debenture', 'divida'], controle_aceito: ['none'],
    maturity_min_score: 72, governance_min_score: 70, risk_max_score: 52, documentacao_min_score: 72,
    tese_resumo: 'Mesa de crédito corporativo e estruturação de FIDC/debêntures para emissores de médio e grande porte.',
    tese_completa: 'Banco de investimento com mesa de crédito estruturado que estrutura e distribui FIDC, debêntures e crédito corporativo para emissores e originadoras com lastro de qualidade.' },
]

// ============================================================================
// EXECUÇÃO
// ============================================================================
async function upsertInvestidor(it) {
  const inv = { ...baseInv, ...it }
  inv.tese_embedding = await voyageEmbed([
    `Investidor: ${inv.nome} (${inv.tipo})`,
    `Setores: ${inv.setores_alvo.join(', ')}`,
    `Sub-setores: ${(inv.sub_setores || []).join(', ')}`,
    `Estágios: ${inv.estagios_aceitos.join(', ')}`,
    `\nResumo da tese: ${inv.tese_resumo}`,
    `\nTese completa: ${inv.tese_completa}`,
  ].join('\n'))
  inv.tese_embedding_model = 'voyage-3-large'
  inv.tese_embedding_at = new Date().toISOString()
  const { data: ex } = await sb.from('investidores').select('id').eq('escritorio_id', ESCRITORIO_ID).eq('nome', inv.nome).maybeSingle()
  if (ex?.id) { await sb.from('investidores').update(inv).eq('id', ex.id); return ex.id }
  const { data, error } = await sb.from('investidores').insert({ ...inv, criado_em: new Date().toISOString() }).select('id').single()
  if (error) throw new Error(`insert investidor ${inv.nome}: ${error.message}`)
  return data.id
}

async function criarTese(teseBase) {
  const tese = { ...teseBase, escritorio_id: ESCRITORIO_ID, criado_por: OWNER_USER_ID }
  tese.tese_embedding = await voyageEmbed([
    `Setor: ${tese.setor_primario}`,
    `Sub-setores: ${tese.sub_setores.join(', ')}`,
    `Estágio: ${tese.estagio}`,
    `Tese: ${tese.tese_investimento}`,
    `Proposta de valor: ${tese.value_proposition}`,
    `Moat: ${tese.competitive_moat}`,
  ].join('\n'))
  tese.tese_embedding_model = 'voyage-3-large'
  tese.tese_embedding_at = new Date().toISOString()
  const { data, error } = await sb.from('teses').insert({ ...tese, criado_em: new Date().toISOString() }).select('id, tese_embedding, tipo_deal, setor_primario, sub_setores, escritorio_id').single()
  if (error) throw new Error(`insert tese ${tese.empresa_nome}: ${error.message}`)
  return data
}

async function rodarMatch(teseId, analiseId, empresaContexto) {
  const { data: candidatos, error: candErr } = await sb.rpc('invest_match_buscar_candidatos', { p_tese_id: teseId, p_limit: 100, p_min_score: 0 })
  if (candErr) throw new Error(`RPC candidatos: ${candErr.message}`)
  const { data: sem } = await sb.rpc('invest_match_busca_semantica', { p_tese_id: teseId, p_match_count: 100, p_similarity_min: 0 })
  const semBy = Object.fromEntries((sem ?? []).map(s => [s.investidor_id, Math.round(s.similarity * 100 * 100) / 100]))
  let auto = 0, sug = 0
  const linhas = []
  for (const cand of (candidatos ?? [])) {
    const scoreSem = semBy[cand.investidor_id] ?? null
    const v = await judge(cand.nome, empresaContexto, cand.score_estruturado, scoreSem ?? 0)
    const synergy = typeof v.synergy_score === 'number' ? v.synergy_score : 80
    const scoreFinal = scoreSem != null
      ? Math.round((cand.score_estruturado * 0.5 + scoreSem * 0.2 + synergy * 0.3) * 100) / 100
      : Math.round((cand.score_estruturado * 0.65 + synergy * 0.35) * 100) / 100
    const status = scoreFinal >= 85 ? 'aprovado_auto' : 'sugerido'
    if (status === 'aprovado_auto') auto++; else sug++
    const payload = {
      investidor_id: cand.investidor_id, tese_id: teseId, analise_id: analiseId, escritorio_id: ESCRITORIO_ID,
      score_final: scoreFinal, score_estruturado: cand.score_estruturado, score_semantico: scoreSem, score_llm: synergy,
      score_breakdown: { ...cand.breakdown, _semantic: { score: scoreSem ?? 0, peso: 0.2 }, _llm: { score: synergy, peso: 0.3 } },
      passou_hard_filter: true, motivos_bloqueio: [],
      llm_recommendation: v.recommendation ?? 'review',
      llm_strengths: Array.isArray(v.strengths) ? v.strengths : [],
      llm_concerns: Array.isArray(v.concerns) ? v.concerns : [],
      llm_talking_points: Array.isArray(v.talking_points) ? v.talking_points : [],
      llm_close_probability: typeof v.close_probability === 'number' ? v.close_probability : null,
      llm_resumo: v.llm_resumo ?? `Match ${cand.nome}.`,
      llm_model_id: 'claude-sonnet-4-6',
      status, calculado_em: new Date().toISOString(), motor_versao: 'v2.0-seed', atualizado_em: new Date().toISOString(),
    }
    const { error: mErr } = await sb.from('matches').upsert(payload, { onConflict: 'investidor_id,tese_id' })
    if (mErr) throw new Error(`upsert match ${cand.nome}: ${mErr.message}`)
    linhas.push(`     ${cand.nome.padEnd(42)} estrut=${cand.score_estruturado} sem=${scoreSem ?? '-'} llm=${synergy} → ${scoreFinal} (${status})`)
  }
  return { auto, sug, total: (candidatos ?? []).length, linhas, candidatosTotal: (candidatos ?? []).length }
}

async function main() {
  console.log('========== SEED EXEMPLOS M&A + FIDC (produção) ==========\n')

  // garante invest match ligado
  await sb.from('escritorios').update({ invest_match_enabled: true }).eq('id', ESCRITORIO_ID)

  // ===== A) WIPE — apaga TODOS os deals e dependências =====
  console.log('A) Apagando todos os deals existentes + dependências...')
  const { data: todasAnalises } = await sb.from('analises').select('id, nome_ativo')
  console.log(`   deals encontrados: ${todasAnalises?.length ?? 0}`)
  // ordem: sugestões → matches → teses → análises (+ storage)
  await sb.from('mercado_sugestoes').delete().not('id', 'is', null)
  await sb.from('matches').delete().not('id', 'is', null)
  await sb.from('teses').delete().not('id', 'is', null)
  for (const a of todasAnalises ?? []) {
    // storage do deal (best-effort)
    try {
      const { data: files } = await sb.storage.from('analises').list(a.id, { limit: 1000 })
      if (files?.length) await sb.storage.from('analises').remove(files.map(f => `${a.id}/${f.name}`))
    } catch {}
    await sb.from('analises').delete().eq('id', a.id)
    console.log(`   apagado: ${a.nome_ativo}`)
  }

  // ===== B) cria os 2 deals =====
  console.log('\nB) Criando os 2 deals...')
  const { data: dealMA, error: eMA } = await sb.from('analises').insert({
    user_id: OWNER_USER_ID, nome_ativo: INTAKE_MA.nomeAtivo, deal_intake: INTAKE_MA, outputs: O_MA,
    status: 'concluido', mesa_revisao: MESA_MA, mesa_revisao_at: new Date().toISOString(), atualizado_em: new Date().toISOString(),
  }).select('id').single()
  if (eMA) throw new Error(`insert deal M&A: ${eMA.message}`)
  console.log(`   deal M&A criado: ${dealMA.id} (Lumina Diagnósticos)`)

  const { data: dealFIDC, error: eF } = await sb.from('analises').insert({
    user_id: OWNER_USER_ID, nome_ativo: INTAKE_FIDC.nomeAtivo, deal_intake: INTAKE_FIDC, outputs: O_FIDC,
    status: 'concluido', mesa_revisao: MESA_FIDC, mesa_revisao_at: new Date().toISOString(), atualizado_em: new Date().toISOString(),
  }).select('id').single()
  if (eF) throw new Error(`insert deal FIDC: ${eF.message}`)
  console.log(`   deal FIDC criado: ${dealFIDC.id} (Vanguarda Consignado)`)

  // ===== C) carteira de investidores (aumenta) =====
  console.log(`\nC) Garantindo carteira de investidores (+${INVESTIDORES_NOVOS.length} novos)...`)
  for (const it of INVESTIDORES_NOVOS) { await upsertInvestidor(it); console.log(`   ok: ${it.nome}`) }
  const { count: totalInv } = await sb.from('investidores').select('*', { count: 'exact', head: true }).eq('escritorio_id', ESCRITORIO_ID)
  console.log(`   carteira total no escritório: ${totalInv}`)

  // ===== D) teses + match =====
  console.log('\nD) Criando teses e rodando o MATCH real (RPCs + judge Claude)...')
  const teseMA = await criarTese({ ...TESE_MA, analise_id: dealMA.id })
  console.log(`   tese M&A criada: ${teseMA.id}`)
  const ctxMA = 'Lumina Diagnósticos — maior rede independente de medicina diagnóstica do Sul (PR/SC/RS), 38 unidades, receita R$ 612M e EBITDA R$ 142M em 2025, margem 23%, madura. Venda de CONTROLE (M&A), EV de referência R$ 1,42–1,71 bi (10–12x EBITDA), com tese de consolidação/buy-and-build em saúde.'
  const resMA = await rodarMatch(teseMA.id, dealMA.id, ctxMA)
  console.log(`   matches M&A: ${resMA.total} (auto ${resMA.auto} / sugeridos ${resMA.sug})`)
  resMA.linhas.forEach(l => console.log(l))

  const teseFIDC = await criarTese({ ...TESE_FIDC, analise_id: dealFIDC.id })
  console.log(`   tese FIDC criada: ${teseFIDC.id}`)
  const ctxFIDC = 'Vanguarda Consignado — FIDC de R$ 400M lastreado em crédito consignado (INSS/SIAPE/estaduais), carteira de R$ 2,3 bi, 240 mil contratos, inadimplência de 1,9%. Cotas sênior 75% (CDI+3,0%), mezanino 12% (CDI+7,5%), subordinada 13% retida. Subordinação de 25%. Crédito estruturado / securitização.'
  const resFIDC = await rodarMatch(teseFIDC.id, dealFIDC.id, ctxFIDC)
  console.log(`   matches FIDC: ${resFIDC.total} (auto ${resFIDC.auto} / sugeridos ${resFIDC.sug})`)
  resFIDC.linhas.forEach(l => console.log(l))

  // ===== E) sugestões do Atlas =====
  console.log('\nE) Gerando Sugestões do Atlas (Mapa público)...')
  const sugMA = await gerarSugestoesMercado(teseMA)
  console.log(`   sugestões M&A: ${sugMA}`)
  const sugFIDC = await gerarSugestoesMercado(teseFIDC)
  console.log(`   sugestões FIDC: ${sugFIDC}`)

  console.log('\n==================== PRONTO ====================')
  console.log(`M&A   — Lumina Diagnósticos`)
  console.log(`  Análise: https://www.mandor.com.br/dashboard/analise/${dealMA.id}`)
  console.log(`  Tese:    https://www.mandor.com.br/dashboard/invest-match/teses/${teseMA.id}`)
  console.log(`FIDC  — Vanguarda Consignado`)
  console.log(`  Análise: https://www.mandor.com.br/dashboard/analise/${dealFIDC.id}`)
  console.log(`  Tese:    https://www.mandor.com.br/dashboard/invest-match/teses/${teseFIDC.id}`)
  console.log('================================================')
}

main().catch((e) => { console.error('ERRO:', e); process.exit(1) })
