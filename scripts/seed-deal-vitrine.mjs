// Seed do "Deal Vitrine" — análise demonstrativa institucional (Projeto Cobalto / Sinterra
// Especialidades Químicas), branded pelo escritório fictício Meridiano Capital Partners.
// Idempotente: pode rodar de novo sem duplicar. Uso: node scripts/seed-deal-vitrine.mjs
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

// ── env ──────────────────────────────────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, '')] }),
)
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DEMO_EMAIL = 'demo@meridianocapital.com.br'
const DEMO_PASS  = 'Meridiano@Demo2026'

// ── logo institucional fictício (SVG → PNG) ───────────────────────────────────
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="96" viewBox="0 0 420 96">
  <g transform="translate(8,16)">
    <rect x="0" y="0" width="64" height="64" rx="10" fill="#0F2A4A"/>
    <circle cx="32" cy="32" r="20" fill="none" stroke="#C8A24A" stroke-width="2.2"/>
    <ellipse cx="32" cy="32" rx="8" ry="20" fill="none" stroke="#C8A24A" stroke-width="2.2"/>
    <line x1="32" y1="12" x2="32" y2="52" stroke="#C8A24A" stroke-width="2.2"/>
    <line x1="12" y1="32" x2="52" y2="32" stroke="#C8A24A" stroke-width="2.2"/>
  </g>
  <text x="88" y="46" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="700" letter-spacing="3" fill="#0F2A4A">MERIDIANO</text>
  <text x="89" y="70" font-family="Helvetica, Arial, sans-serif" font-size="13" font-weight="400" letter-spacing="6.4" fill="#5A6B80">CAPITAL PARTNERS</text>
</svg>`

// ── conteúdo do deal (markdown por agente) ────────────────────────────────────
const O = {}

O.relatorio_consolidado = `# Sinterra Especialidades Químicas — Relatório Consolidado

Projeto Cobalto. Material confidencial preparado para apresentação a comitê de investimento.

## Resumo executivo

A Sinterra é uma fabricante de aditivos e resinas de performance para os mercados de tintas, adesivos e tratamento de água, com duas plantas industriais (Jundiaí/SP e Camaçari/BA) e quinze anos de operação. A companhia fechou 2025 com receita líquida de R$ 487,3 milhões e EBITDA ajustado de R$ 108,1 milhões, margem de 22,2%, sustentada por um portfólio de especialidades de maior valor agregado e contratos de fornecimento recorrentes com a indústria de revestimentos.

O Projeto Cobalto estrutura uma captação de R$ 280 milhões em crédito estruturado, com dois objetivos: alongar e baratear o endividamento atual e financiar a expansão da planta de Camaçari, que destrava capacidade para a linha de tratamento de água. Em paralelo, a tese contempla a avaliação de uma operação de M&A para consolidação de players regionais.

O ativo combina previsibilidade de fluxo, alavancagem controlada (dívida líquida de 1,8x EBITDA) e garantias reais de qualidade. Os pontos de atenção são a concentração nos dez maiores clientes e a exposição a matérias-primas derivadas de petróleo, ambos endereçáveis na estrutura proposta.

## Tese de investimento

A Sinterra ocupa um nicho defensável: especialidades químicas de baixo volume e alta especificação técnica, onde a substituição de fornecedor é cara e lenta para o cliente. Isso se traduz em poder de repasse de preço e em margens acima da média de químicos commodity.

Três vetores sustentam o crescimento dos próximos cinco anos. O primeiro é o novo marco do saneamento, que amplia a demanda por insumos de tratamento de água. O segundo é a substituição de importações, já que parte dos aditivos concorrentes é importada e está exposta a câmbio e frete. O terceiro é a consolidação: o setor tem dezenas de fabricantes regionais subescala, candidatos naturais a aquisições bolt-on.

## Destaques financeiros

| Indicador | 2023 | 2024 | 2025 |
| --- | --- | --- | --- |
| Receita líquida (R$ M) | 388,2 | 431,0 | 487,3 |
| EBITDA ajustado (R$ M) | 78,0 | 89,3 | 108,1 |
| Margem EBITDA | 20,1% | 20,7% | 22,2% |
| Dívida líquida / EBITDA | 2,4x | 2,1x | 1,8x |
| ROIC | 14,1% | 15,3% | 16,8% |

## Valuation

O intervalo central de valor da firma (EV) está entre R$ 760 milhões e R$ 870 milhões, equivalente a 7,4x a 8,5x o EBITDA de 2025. O fluxo de caixa descontado, com WACC de 13,5% e crescimento na perpetuidade de 4,0%, aponta EV de R$ 815 milhões no cenário base. Descontada a dívida líquida de R$ 188 milhões, o valor do equity fica entre R$ 572 milhões e R$ 682 milhões.

## Estrutura sugerida da operação

Emissão de debêntures ou CRI de R$ 280 milhões, em duas séries, prazo de sete anos e dois de carência de principal. Garantias: alienação fiduciária da planta de Jundiaí e cessão fiduciária de recebíveis. Covenant de dívida líquida sobre EBITDA limitado a 2,5x e índice de cobertura do serviço da dívida (DSCR) mínimo de 1,5x.

## Principais riscos

- Concentração: os dez maiores clientes respondem por 48% da receita. A perda do maior deles comprime o EBITDA em cerca de R$ 14 milhões ao ano.
- Matéria-prima: 30% dos insumos são importados e atrelados ao preço do petróleo, o que pressiona margem em ciclos de alta.
- Licenciamento ambiental: a expansão de Camaçari depende de licença de operação ainda em análise no órgão estadual.

## Conclusão institucional

A operação é viável e bem garantida. O fluxo de caixa cobre com folga o serviço da dívida proposto, mesmo no cenário de estresse com queda de 15% no EBITDA. A recomendação é avançar para a fase de estruturação, condicionada à obtenção da licença de Camaçari e à formalização dos contratos com os três maiores clientes.`

O.orchestration = `# Orquestração — Deal Readiness Score

## Veredito

Deal Readiness Score (DRS): **78 / 100** — Pronto com ressalvas.

O ativo tem qualidade de crédito e governança suficientes para avançar à estruturação. As ressalvas se concentram em dois itens documentais que não comprometem a tese, mas devem ser resolvidos antes da emissão.

## Composição do score

| Dimensão | Peso | Nota |
| --- | --- | --- |
| Qualidade financeira | 30% | 86 |
| Garantias e estrutura | 25% | 82 |
| Governança e compliance | 20% | 74 |
| Posição de mercado | 15% | 79 |
| Documentação | 10% | 58 |

## O que falta

A nota de documentação puxa o score para baixo. Pendem a licença de operação da expansão de Camaçari e a renovação formal de dois contratos de fornecimento que hoje operam por aditivo verbal. Ambos têm prazo estimado de resolução de 30 a 45 dias.

## Recomendação

Avançar à estruturação em paralelo à regularização documental. O cronograma da emissão não precisa esperar a licença, desde que a liberação dos recursos da segunda série fique condicionada a ela.`

O.pesquisa = `# Inteligência de Mercado

## Panorama do setor

O mercado brasileiro de especialidades químicas movimenta cerca de R$ 90 bilhões ao ano e cresce acima do PIB industrial, puxado por revestimentos, construção e saneamento. Diferente da química de commodity, o segmento de especialidades compete por desempenho técnico, não por preço, o que protege margem.

A Sinterra atua em três frentes: aditivos para tintas (54% da receita), resinas para adesivos (28%) e insumos para tratamento de água (18%). A terceira frente é a de maior crescimento, sustentada pelo novo marco regulatório do saneamento e pelas metas de universalização até 2033.

## Posicionamento competitivo

A companhia é uma das cinco maiores fabricantes nacionais do nicho de aditivos de performance, com participação estimada de 9% no mercado endereçável. A vantagem vem da proximidade técnica com o cliente: 40% da receita passa por formulações desenvolvidas sob especificação, o que cria troca custosa.

## Benchmark com comparáveis

| Comparável | Perfil | EV/EBITDA | Margem EBITDA |
| --- | --- | --- | --- |
| Comparável I | Especialidades, listada LatAm | 9,2x | 23% |
| Comparável II | Aditivos de performance, global | 8,4x | 21% |
| Comparável III | Química de revestimentos, Brasil | 7,1x | 19% |
| Transação precedente A | M&A, controle, 2024 | 8,8x | 22% |
| Transação precedente B | M&A, minoritário, 2023 | 6,5x | 18% |
| **Sinterra (implícito)** | **Projeto Cobalto** | **8,0x** | **22%** |

A Sinterra negocia dentro da faixa dos pares, com margem no terço superior da amostra. O desconto frente às listadas se justifica por liquidez e porte, e tende a comprimir em uma operação de controle.`

O.diagnostico = `# Diagnóstico Financeiro

## Demonstração de resultados

| R$ milhões | 2021 | 2022 | 2023 | 2024 | 2025 |
| --- | --- | --- | --- | --- | --- |
| Receita líquida | 286,4 | 331,9 | 388,2 | 431,0 | 487,3 |
| Lucro bruto | 100,2 | 119,5 | 143,6 | 162,9 | 185,2 |
| Margem bruta | 35,0% | 36,0% | 37,0% | 37,8% | 38,0% |
| EBITDA reportado | 50,1 | 62,3 | 75,0 | 87,9 | 102,4 |
| EBITDA ajustado | 51,8 | 64,0 | 78,0 | 89,3 | 108,1 |
| Margem EBITDA aj. | 18,1% | 19,3% | 20,1% | 20,7% | 22,2% |

A receita cresceu a uma taxa composta de 14,2% ao ano entre 2021 e 2025. A expansão de margem reflete a migração para produtos de maior valor e ganho de escala nas duas plantas.

## Ajustes ao EBITDA

O EBITDA ajustado incorpora a exclusão de despesas não recorrentes: R$ 3,8 milhões de rescisões na reestruturação de 2023, R$ 2,1 milhões de consultoria de implantação de ERP e R$ 1,7 milhão de perdas com um cliente em recuperação judicial. Nenhum ajuste é de natureza recorrente.

## Endividamento e capital de giro

A dívida líquida encerrou 2025 em R$ 188 milhões, ou 1,8x o EBITDA ajustado. O ciclo de caixa é de 71 dias, pressionado por estoques de matéria-prima importada. Há espaço para liberar cerca de R$ 22 milhões de capital de giro com uma política de compras mais coordenada entre as plantas.

## Projeções (cenário base)

| R$ milhões | 2026 | 2027 | 2028 | 2029 | 2030 |
| --- | --- | --- | --- | --- | --- |
| Receita líquida | 548,2 | 613,9 | 681,4 | 748,1 | 815,3 |
| EBITDA ajustado | 123,4 | 139,4 | 155,4 | 170,1 | 184,3 |
| Margem EBITDA | 22,5% | 22,7% | 22,8% | 22,7% | 22,6% |
| Capex | 44,0 | 38,0 | 34,0 | 33,0 | 33,5 |
| Fluxo de caixa livre | 51,2 | 64,8 | 78,3 | 89,7 | 99,1 |

## Valuation por fluxo de caixa descontado

Premissas: WACC de 13,5%, crescimento na perpetuidade de 4,0%, alíquota efetiva de 28%. O valor presente dos fluxos explícitos somado ao valor terminal resulta em EV de R$ 815 milhões no cenário base.

| Sensibilidade do EV (R$ M) | g 3,5% | g 4,0% | g 4,5% |
| --- | --- | --- | --- |
| WACC 13,0% | 812 | 851 | 896 |
| WACC 13,5% | 780 | 815 | 855 |
| WACC 14,0% | 751 | 783 | 818 |`

O.analise_ma = `# Análise de M&A

## Racional estratégico

A Sinterra é, ao mesmo tempo, plataforma de consolidação e alvo atraente. Para um comprador estratégico, a aquisição adiciona portfólio técnico, duas plantas bem localizadas e uma carteira de clientes de troca custosa. Para um fundo, é uma tese de buy-and-build em um setor pulverizado.

## Tese de investimento

O ponto de entrada é favorável: margem em expansão, alavancagem baixa e um pipeline claro de aquisições bolt-on que pode elevar o EBITDA combinado em 25% a 30% em três anos, com múltiplo de entrada dos alvos abaixo do múltiplo da plataforma.

## Estrutura da transação

A estrutura recomendada combina a captação de crédito do Projeto Cobalto com a abertura de até 25% do capital a um sócio financeiro, preservando o controle do fundador. O crédito financia a expansão orgânica e o equity primário capitaliza o programa de aquisições.

| Componente | Faixa | Observação |
| --- | --- | --- |
| Crédito estruturado | R$ 280 M | Debênture ou CRI, 7 anos |
| Equity primário (minoritário) | R$ 120–160 M | Até 25% do capital |
| Valuation de referência (EV) | R$ 760–870 M | 7,4x a 8,5x EBITDA 2025 |

## Cronograma indicativo

Estruturação e due diligence em oito a dez semanas, road show com investidores em quatro semanas e fechamento em até quatro meses a partir do mandato.`

O.kyc = `# Compliance & KYC

## Estrutura societária

O controle é detido por uma holding familiar (72%), com um fundo de private equity como minoritário (21%) e executivos no plano de participação (7%). A cadeia de titularidade foi mapeada até as pessoas físicas beneficiárias finais, sem camadas opacas.

## Screening

A verificação dos sócios e administradores em listas de PEP, sanções e mídias adversas não retornou apontamentos. Não há processos de natureza penal econômica contra os beneficiários finais.

## Licenças e meio ambiente

As duas plantas têm licença de operação vigente. A exceção é a ampliação de Camaçari, cuja licença de operação está em análise no órgão ambiental estadual, com licença prévia e de instalação já concedidas. Não há passivo ambiental registrado ou área contaminada declarada.

## Red flags

Nenhum apontamento bloqueante. Há um ponto de atenção de governança: a ausência de conselho de administração formal, hoje suprida por um comitê consultivo. A profissionalização do conselho é recomendada como condição da entrada de um sócio minoritário.`

O.contratos = `# Análise Contratual

## Contratos relevantes

A receita está apoiada em 14 contratos de fornecimento de médio e longo prazo. Três deles, que somam 31% da receita, têm cláusula de exclusividade técnica e renovação automática. Dois contratos relevantes operam hoje por aditivo verbal e precisam ser formalizados antes da emissão.

## Cláusulas de change of control

Quatro contratos contêm cláusula de mudança de controle que exige anuência do cliente em caso de alienação superior a 50% do capital. A estrutura minoritária proposta no Projeto Cobalto não dispara essas cláusulas.

## Passivos contingentes

| Natureza | Valor estimado (R$ M) | Probabilidade de perda |
| --- | --- | --- |
| Trabalhista | 6,2 | Possível |
| Tributária (ICMS) | 9,8 | Possível |
| Ambiental | 1,4 | Remota |

O provisionamento atual cobre as contingências prováveis. As discussões tributárias de ICMS seguem a tese de exclusão da base, com jurisprudência favorável.

## Recomendações jurídicas

Formalizar os dois contratos verbais, constituir o conselho de administração e revisar as cláusulas de exclusividade para alinhar prazos de renovação com o horizonte da dívida.`

O.originacao = `# Estratégia de Originação

## Perfil de investidores-alvo

A operação atrai três perfis. Fundos de private equity com tese industrial e apetite para buy-and-build; family offices em busca de ativos reais com fluxo previsível; e investidores institucionais de crédito para a tranche estruturada.

## Pipeline de contrapartes

| Tipo | Quantidade mapeada | Fit |
| --- | --- | --- |
| Private equity (industrial) | 7 | Alto |
| Estratégico (química global) | 3 | Médio-alto |
| Crédito estruturado (gestoras) | 9 | Alto |
| Family office | 5 | Médio |

## Oportunidades estratégicas

- Consolidação: pipeline de quatro alvos regionais já identificados, com EBITDA somado de R$ 31 milhões e múltiplo médio de entrada de 5,5x.
- Saneamento: a linha de tratamento de água pode dobrar de tamanho em quatro anos com a expansão de Camaçari.
- Substituição de importações: 30% do mercado endereçável ainda é atendido por produto importado, vulnerável a câmbio.
- Agenda ESG: a linha de química verde abre acesso a clientes com metas de descarbonização e a linhas de crédito incentivadas.

## Posicionamento

A recomendação é conduzir um processo restrito, com no máximo seis contrapartes simultâneas, para preservar confidencialidade e poder de barganha.`

O.estruturacao = `# Estruturação de Capital

## Análise de crédito e capacidade financeira

A geração de caixa operacional cobre o serviço da dívida proposta com folga. No cenário base, o índice de cobertura do serviço da dívida (DSCR) fica em 1,9x. No estresse, com queda de 15% no EBITDA e alta de 200 pontos-base no custo, o DSCR permanece em 1,4x, acima do gatilho de covenant.

## Estrutura recomendada

| Parâmetro | Definição |
| --- | --- |
| Instrumento | Debênture (ou CRI) em duas séries |
| Volume | R$ 280 milhões |
| Prazo | 7 anos, 2 de carência de principal |
| Garantias | Alienação fiduciária da planta de Jundiaí + cessão fiduciária de recebíveis |
| LTV | 48% |
| DSCR mínimo (covenant) | 1,5x |
| Dívida líquida / EBITDA (covenant) | máx. 2,5x |

## Comparação de alternativas

| Alternativa | Custo estimado | Prazo | Veredito |
| --- | --- | --- | --- |
| Debênture com garantia real | CDI + 2,2% | 7 anos | Recomendada |
| CRI | IPCA + 6,8% | 8 anos | Viável, depende de lastro |
| Crédito bancário tradicional | CDI + 3,5% | 4 anos | Mais caro e curto |

## Uso dos recursos

Refinanciamento da dívida cara de curto prazo (R$ 150 milhões), expansão de Camaçari (R$ 90 milhões) e reforço de capital de giro para o programa de aquisições (R$ 40 milhões).`

O.maturidade = `# Veredicto de Maturidade

## Conclusão institucional

A Sinterra está madura para uma operação estruturada. A combinação de margem em expansão, alavancagem baixa, garantias reais de qualidade e fluxo de caixa previsível sustenta tanto a captação de crédito quanto a entrada de um sócio minoritário.

## Gaps a endereçar

1. Obter a licença de operação da expansão de Camaçari.
2. Formalizar os dois contratos de fornecimento que operam por aditivo verbal.
3. Constituir conselho de administração antes da entrada de sócio minoritário.

## Roadmap pré-operação

Os três gaps têm prazo estimado de 30 a 45 dias e podem correr em paralelo à estruturação. Nenhum deles é impeditivo para iniciar a due diligence e o road show.

## Recomendação final

Avançar. A operação tem mérito de crédito e tese de equity consistentes. A liberação da segunda série da dívida deve ficar condicionada à licença de Camaçari, o único item de fora do controle direto da companhia.`

O.blind_teaser = `# Blind Teaser — Projeto Cobalto

Material de divulgação anônima. A identidade da companhia é revelada mediante assinatura de acordo de confidencialidade.

## A oportunidade

Fabricante nacional de especialidades químicas de performance, com quinze anos de operação, duas plantas industriais no Sudeste e no Nordeste e posição de liderança em um nicho técnico de alta barreira de entrada. A companhia atende cerca de 380 clientes industriais nos mercados de tintas, adesivos e tratamento de água.

## Destaques do investimento

- Receita líquida de R$ 487 milhões e EBITDA ajustado de R$ 108 milhões em 2025.
- Margem EBITDA de 22%, em expansão consistente nos últimos cinco anos.
- Crescimento composto de 14% ao ano desde 2021, acima da média do setor.
- Alavancagem conservadora, em 1,8x dívida líquida sobre EBITDA.
- Carteira recorrente, com contratos de longo prazo e custo de troca elevado.
- 40% da receita vinculada a formulações desenvolvidas sob especificação do cliente.

## Síntese financeira

| Indicador | 2023 | 2024 | 2025 |
| --- | --- | --- | --- |
| Receita líquida (R$ M) | 388 | 431 | 487 |
| EBITDA ajustado (R$ M) | 78 | 89 | 108 |
| Margem EBITDA | 20% | 21% | 22% |

## Contexto de mercado

O mercado de especialidades químicas cresce acima do PIB industrial. A frente de tratamento de água ganha tração com o novo marco do saneamento e as metas de universalização até 2033, o que amplia a demanda pela linha de maior valor agregado da companhia.

## A operação

A companhia busca captação de R$ 280 milhões em crédito estruturado, com garantias reais, e avalia a entrada de um sócio minoritário para acelerar um programa de aquisições em um setor pulverizado. O controle permanece com os atuais acionistas.

## Perfil de investidor buscado

Fundos com tese industrial e apetite para consolidação, family offices em busca de ativos reais com fluxo previsível e investidores institucionais para a tranche de crédito.

## Próximos passos

Contrapartes qualificadas podem solicitar o Confidential Information Memorandum mediante assinatura de acordo de confidencialidade junto à assessoria responsável.`

O.sell_side_pitchbook = `# Pitchbook — Projeto Cobalto

Sinterra Especialidades Químicas S.A. Material confidencial para uso restrito de potenciais investidores.

## Visão geral da companhia

Fundada em 2009 e sediada em Jundiaí, a Sinterra fabrica aditivos e resinas de performance para os mercados de tintas, adesivos e tratamento de água. Opera duas plantas, em Jundiaí (SP) e Camaçari (BA), com cerca de 520 colaboradores, e atende aproximadamente 380 clientes industriais.

## Destaques do investimento

- Nicho técnico defensável, com poder de repasse de preço e baixo risco de substituição.
- Margem EBITDA de 22%, acima da média de químicos de commodity e em expansão.
- Crescimento composto de 14% ao ano com alavancagem conservadora.
- Vetor de crescimento estrutural na frente de saneamento.
- Plataforma pronta para consolidação, com pipeline de quatro alvos mapeado.

## Modelo de negócio

A receita se divide em três linhas: aditivos para tintas (54%), resinas para adesivos (28%) e insumos para tratamento de água (18%). Cerca de 40% do faturamento passa por formulações desenvolvidas sob especificação, o que eleva o custo de troca e sustenta contratos de longo prazo.

## Desempenho financeiro

| R$ milhões | 2023 | 2024 | 2025 |
| --- | --- | --- | --- |
| Receita líquida | 388,2 | 431,0 | 487,3 |
| EBITDA ajustado | 78,0 | 89,3 | 108,1 |
| Margem EBITDA | 20,1% | 20,7% | 22,2% |
| Dívida líquida / EBITDA | 2,4x | 2,1x | 1,8x |

No cenário base, a projeção aponta receita de R$ 815 milhões e EBITDA de R$ 184 milhões em 2030, com margem estável em torno de 22,6%.

## Mercado e posicionamento

Mercado endereçável de especialidades químicas em crescimento acima do PIB industrial. A Sinterra figura entre as cinco maiores fabricantes nacionais do nicho de aditivos de performance, com participação estimada de 9% no mercado endereçável.

## Estratégia de crescimento

O plano combina crescimento orgânico, com a expansão de Camaçari e a linha de saneamento, e um programa de aquisições bolt-on. O pipeline atual reúne quatro alvos regionais, com EBITDA somado de R$ 31 milhões e múltiplo médio de entrada de 5,5x, abaixo do múltiplo da plataforma.

## Governança

O controle é detido por uma holding familiar (72%), com fundo de private equity minoritário (21%) e executivos no plano de participação (7%). A constituição de um conselho de administração formal está prevista como parte da operação.

## Estrutura proposta e valuation

| Componente | Faixa |
| --- | --- |
| Crédito estruturado | R$ 280 milhões |
| Equity primário (minoritário) | R$ 120–160 M, até 25% do capital |
| Valor da firma (referência) | R$ 760–870 M (7,4x a 8,5x EBITDA) |

## Uso dos recursos

Refinanciamento da dívida de curto prazo, expansão da planta de Camaçari e capital para o programa de aquisições bolt-on.

## Aviso

Material confidencial preparado exclusivamente para avaliação preliminar por investidores qualificados. As informações não foram objeto de auditoria independente e não constituem oferta de valores mobiliários.`

const MESA = {
  aprovacao: 'aprovado_com_ressalvas',
  diagnostico_final: 'A operação tem mérito de crédito e tese de equity consistentes. O fluxo de caixa cobre o serviço da dívida proposta mesmo no cenário de estresse, e as garantias são de boa qualidade. As ressalvas são documentais e não comprometem a tese, mas devem ser resolvidas antes da emissão da segunda série.',
  pontos_fortes: [
    'Margem EBITDA de 22%, em expansão consistente há cinco anos.',
    'Alavancagem baixa (1,8x) e garantias reais de qualidade.',
    'Fluxo de caixa previsível, ancorado em contratos de longo prazo.',
    'Pipeline de aquisições bolt-on com múltiplo de entrada abaixo do da plataforma.',
  ],
  pontos_fracos: [
    'Concentração: os dez maiores clientes respondem por 48% da receita.',
    'Licença de operação da expansão de Camaçari ainda em análise.',
    'Dois contratos de fornecimento relevantes operam por aditivo verbal.',
  ],
  contradicoes_detectadas: [],
  recomendacao_assessor: 'Avançar à estruturação em paralelo à regularização documental. Condicionar a liberação da segunda série da dívida à obtenção da licença de Camaçari.',
}

const DEAL_INTAKE = {
  nomeAtivo:        'Sinterra Especialidades Químicas',
  tipoAtivo:        'Indústria Química',
  estagio:          'Madura',
  objetivo:         'Crédito estruturado + M&A',
  nivelInformacao:  'Completo',
  localizacao:      'Jundiaí / SP',
  ticketEstimado:   'R$ 280M',
  resumoAtivo:      'Fabricante de especialidades químicas de performance para tintas, adesivos e tratamento de água. Duas plantas, receita de R$ 487M e EBITDA de R$ 108M em 2025.',
  informacoesAdicionais: 'Operação de demonstração (Projeto Cobalto). Conteúdo fictício para fins de apresentação comercial.',
  escritorio:       'Meridiano Capital Partners',
  nomeProprietario: 'Holding Vasconcelos Participações Ltda.',
}

// ── execução ──────────────────────────────────────────────────────────────────
async function main() {
  // 1) usuário demo (idempotente)
  let userId
  {
    let page = 1, found = null
    for (;;) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
      const u = data.users.find((x) => x.email === DEMO_EMAIL)
      if (u) { found = u; break }
      if (data.users.length < 1000) break
      page++
    }
    if (found) {
      userId = found.id
      await admin.auth.admin.updateUserById(userId, { password: DEMO_PASS, email_confirm: true })
      console.log('• usuário demo já existia:', userId)
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: DEMO_EMAIL, password: DEMO_PASS, email_confirm: true,
        user_metadata: { nome: 'Meridiano Capital — Demonstração' },
      })
      if (error) throw error
      userId = data.user.id
      console.log('• usuário demo criado:', userId)
    }
  }

  // 2) logo → PNG → bucket logos
  // Achata sobre branco (remove canal alpha): PNG RGB sem transparência decodifica de
  // forma confiável no react-pdf do browser (PNGs RGBA travavam o toBlob). O rodapé é
  // branco, então o fundo branco do logo fica invisível.
  const png = await sharp(Buffer.from(LOGO_SVG))
    .flatten({ background: '#ffffff' })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer()
  const logoPath = `${userId}/logo.png`
  const { data: bucket } = await admin.storage.getBucket('logos')
  if (!bucket) await admin.storage.createBucket('logos', { public: true })
  const up = await admin.storage.from('logos').upload(logoPath, png, { contentType: 'image/png', upsert: true })
  if (up.error) throw up.error
  const { data: { publicUrl } } = admin.storage.from('logos').getPublicUrl(logoPath)
  console.log('• logo:', publicUrl)

  // 3) escritório (unique por user_id)
  const escPayload = {
    user_id: userId,
    nome: 'Meridiano Capital Partners',
    cnpj: '41.882.704/0001-65',
    cidade_uf: 'São Paulo / SP',
    telefone: '+55 11 3030-4500',
    email_contato: 'contato@meridianocapital.com.br',
    site: 'meridianocapital.com.br',
    tagline: 'Assessoria em M&A e Crédito Estruturado',
    logo_url: publicUrl,
    atualizado_em: new Date().toISOString(),
  }
  const { data: escRow, error: escErr } = await admin
    .from('escritorios').upsert(escPayload, { onConflict: 'user_id' }).select('id').single()
  if (escErr) throw escErr
  console.log('• escritório:', escRow.id)

  // 4) perfil
  await admin.from('perfis').upsert({
    user_id: userId, nome: 'Meridiano Capital — Demonstração',
    role: 'gerente', escritorio_id: escRow.id, atualizado_em: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  // 5) análise (idempotente por user_id + nome_ativo)
  const analisePayload = {
    user_id: userId,
    nome_ativo: 'Sinterra Especialidades Químicas',
    deal_intake: DEAL_INTAKE,
    outputs: O,
    status: 'concluido',
    mesa_revisao: MESA,
    mesa_revisao_at: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  }
  const { data: existing } = await admin
    .from('analises').select('id').eq('user_id', userId).eq('nome_ativo', analisePayload.nome_ativo).maybeSingle()

  let analiseId
  if (existing) {
    await admin.from('analises').update(analisePayload).eq('id', existing.id)
    analiseId = existing.id
    console.log('• análise atualizada:', analiseId)
  } else {
    const { data, error } = await admin.from('analises').insert(analisePayload).select('id').single()
    if (error) throw error
    analiseId = data.id
    console.log('• análise criada:', analiseId)
  }

  console.log('\n==================== DEAL VITRINE PRONTO ====================')
  console.log('Login demo : ' + DEMO_EMAIL)
  console.log('Senha      : ' + DEMO_PASS)
  console.log('Análise    : https://www.mandor.com.br/dashboard/analise/' + analiseId)
  console.log('============================================================')
}

main().catch((e) => { console.error('ERRO:', e); process.exit(1) })
