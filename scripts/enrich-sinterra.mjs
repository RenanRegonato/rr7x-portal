// Enriquecimento do conteúdo da análise demo Sinterra (Projeto Cobalto).
// Reescreve os outputs com muito mais profundidade analítica (contexto, estratégia,
// riscos/oportunidades, indicadores comentados, sinergias e teses, insights e
// conclusões executivas), preservando o backbone numérico do demo e SEM travessão.
// Atualiza a análise a9388a50 (já reatribuída ao agenciarr7). Idempotente.
// Uso: node --env-file=.env.local scripts/enrich-sinterra.mjs
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})
const ANALISE = 'a9388a50-a2f6-43da-b53e-6fe06118fee9'

const O = {}

O.relatorio_consolidado = `# Sinterra Especialidades Químicas: Relatório Consolidado

Projeto Cobalto. Material confidencial preparado para apresentação a comitê de investimento e credores qualificados.

## Resumo executivo

A Sinterra é uma fabricante brasileira de aditivos e resinas de performance para os mercados de tintas e revestimentos, adesivos industriais e tratamento de água. Opera há mais de quinze anos (fundada em 2009), com duas plantas industriais (Jundiaí/SP e Camaçari/BA), cerca de 520 colaboradores e uma base de aproximadamente 380 clientes industriais. A companhia fechou 2025 com receita líquida de R$ 487,3 milhões e EBITDA ajustado de R$ 108,1 milhões, margem de 22,2%, o quinto ano consecutivo de expansão simultânea de receita e margem.

O Projeto Cobalto estrutura uma captação de R$ 280 milhões em crédito estruturado com dois objetivos centrais: alongar e baratear o endividamento de curto prazo e financiar a expansão da planta de Camaçari, que destrava capacidade para a linha de tratamento de água. Em paralelo, a tese contempla a entrada de um sócio minoritário (R$ 120 a 160 milhões, até 25% do capital) para capitalizar um programa de aquisições de players regionais subescala.

A leitura institucional do ativo é positiva. Combina previsibilidade de fluxo de caixa, alavancagem controlada (dívida líquida de 1,8x o EBITDA), garantias reais de boa qualidade e uma posição de mercado defensável em nichos técnicos. Os dois pontos de atenção, concentração nos dez maiores clientes e exposição a matérias-primas petroquímicas, são endereçáveis dentro da estrutura proposta e não comprometem a tese.

## Por que este ativo merece atenção

Três fatos sustentam a recomendação de avançar. Primeiro, a qualidade do resultado: a margem EBITDA de 22,2% está no terço superior dos comparáveis e foi construída por mix, não por corte de custo, o que a torna sustentável. Segundo, a previsibilidade: 40% da receita passa por formulações desenvolvidas sob especificação do cliente, com custo de troca elevado e contratos de longo prazo. Terceiro, a opcionalidade: a companhia é, ao mesmo tempo, um ativo de crédito sólido e uma plataforma de consolidação setorial, o que amplia o universo de contrapartes interessadas.

## Tese de investimento

A Sinterra ocupa um nicho defensável dentro da química brasileira: especialidades de baixo volume e alta especificação técnica, onde a substituição de fornecedor é cara e lenta para o cliente porque envolve reformulação, testes de campo e reaprovação. Isso se traduz em poder de repasse de preço e em margens estruturalmente acima da química de commodity.

Três vetores sustentam o crescimento dos próximos cinco anos. O primeiro é o novo marco regulatório do saneamento, que amplia de forma estrutural a demanda por insumos de tratamento de água rumo às metas de universalização de 2033. O segundo é a substituição de importações: parte relevante dos aditivos concorrentes é importada e está exposta a câmbio e frete, o que abre espaço para o produtor local. O terceiro é a consolidação: o setor reúne dezenas de fabricantes regionais subescala, candidatos naturais a aquisições bolt-on a múltiplos de entrada abaixo do múltiplo da plataforma.

## Destaques financeiros comentados

| Indicador | 2023 | 2024 | 2025 | Leitura |
| --- | --- | --- | --- | --- |
| Receita líquida (R$ M) | 388,2 | 431,0 | 487,3 | Crescimento de 14,2% a.a., acima do setor |
| EBITDA ajustado (R$ M) | 78,0 | 89,3 | 108,1 | Expansão puxada por mix de maior valor |
| Margem EBITDA | 20,1% | 20,7% | 22,2% | Ganho de 210 pontos-base em dois anos |
| Dívida líquida / EBITDA | 2,4x | 2,1x | 1,8x | Desalavancagem orgânica consistente |
| ROIC | 14,1% | 15,3% | 16,8% | Retorno acima do custo de capital (WACC 13,5%) |

A combinação de margem em alta com desalavancagem é o ponto mais relevante da leitura: a companhia gera caixa suficiente para crescer e reduzir dívida ao mesmo tempo, o que dá conforto de crédito ao serviço da dívida proposto.

## Valuation

O intervalo central de valor da firma (EV) está entre R$ 760 milhões e R$ 870 milhões, equivalente a 7,4x a 8,5x o EBITDA de 2025. O fluxo de caixa descontado, com WACC de 13,5% e crescimento na perpetuidade de 4,0%, aponta EV de R$ 815 milhões no cenário base. Descontada a dívida líquida de R$ 188 milhões, o valor do equity fica entre R$ 572 milhões e R$ 682 milhões. O desconto frente às listadas é explicado por liquidez e porte, e tende a comprimir numa operação de controle ou na consolidação da plataforma.

## Estrutura sugerida da operação

Emissão de debêntures ou CRI de R$ 280 milhões, em duas séries, prazo de sete anos com dois de carência de principal. Garantias: alienação fiduciária da planta de Jundiaí e cessão fiduciária de recebíveis performados. Covenants: dívida líquida sobre EBITDA limitada a 2,5x e índice de cobertura do serviço da dívida (DSCR) mínimo de 1,5x. A liberação da segunda série fica condicionada à obtenção da licença de operação de Camaçari, isolando o único risco fora do controle da companhia.

## Principais riscos e mitigações

- Concentração de clientes: os dez maiores respondem por 48% da receita. A perda do maior comprimiria o EBITDA em cerca de R$ 14 milhões ao ano. Mitigação: formalização de contratos de longo prazo e diversificação via saneamento.
- Matéria-prima: cerca de 30% dos insumos são importados e atrelados ao preço do petróleo, o que pressiona margem em ciclos de alta. Mitigação: cláusulas de repasse, hedge cambial parcial e dupla fonte de suprimento.
- Licenciamento ambiental: a expansão de Camaçari depende de licença de operação em análise no órgão estadual, com licença prévia e de instalação já concedidas. Mitigação: condicionar a liberação da segunda série à licença.

## Conclusão institucional

A operação é viável e bem garantida. O fluxo de caixa cobre com folga o serviço da dívida proposta, mesmo no cenário de estresse com queda de 15% no EBITDA e alta de 200 pontos-base no custo. A recomendação é avançar para a fase de estruturação, em paralelo à regularização documental, condicionando a liberação da segunda série à licença de Camaçari e à formalização dos contratos com os três maiores clientes.`

O.orchestration = `# Orquestração: Deal Readiness Score

## Veredito

Deal Readiness Score (DRS): **78 / 100**. Pronto com ressalvas.

O ativo tem qualidade de crédito, governança e posição de mercado suficientes para avançar à estruturação. As ressalvas se concentram em dois itens documentais que não comprometem a tese, mas devem ser resolvidos antes da emissão.

## Composição do score

| Dimensão | Peso | Nota | Comentário |
| --- | --- | --- | --- |
| Qualidade financeira | 30% | 86 | Margem alta, desalavancagem, fluxo previsível |
| Garantias e estrutura | 25% | 82 | Garantias reais de boa qualidade, LTV de 48% |
| Governança e compliance | 20% | 74 | Cadeia societária limpa, falta conselho formal |
| Posição de mercado | 15% | 79 | Nicho técnico defensável, concentração a tratar |
| Documentação | 10% | 58 | Licença de Camaçari e contratos verbais pendentes |

## Como ler o score

O DRS de 78 coloca o ativo na faixa de "pronto com ressalvas", a melhor faixa para iniciar estruturação sem esperar a regularização completa. A dimensão que mais puxa o score para baixo é Documentação (58), de peso pequeno (10%), o que significa que as pendências são endereçáveis e não estruturais. As dimensões de maior peso (financeira e garantias) estão acima de 80, o que sustenta o mérito de crédito.

## O que falta

Pendem a licença de operação da expansão de Camaçari e a renovação formal de dois contratos de fornecimento que hoje operam por aditivo verbal. Ambos têm prazo estimado de resolução de 30 a 45 dias e podem correr em paralelo à due diligence.

## Recomendação

Avançar à estruturação em paralelo à regularização documental. O cronograma da emissão não precisa esperar a licença, desde que a liberação dos recursos da segunda série fique condicionada a ela.`

O.pesquisa = `# Inteligência de Mercado e Posicionamento Estratégico

## Panorama do setor

O mercado brasileiro de especialidades químicas movimenta cerca de R$ 90 bilhões ao ano e cresce de forma consistente acima do PIB industrial, puxado por revestimentos, construção civil, saneamento e bens de consumo. Diferente da química de commodity, que compete por escala e preço e sofre com a volatilidade do petróleo, o segmento de especialidades compete por desempenho técnico e proximidade com o cliente, o que protege margem ao longo do ciclo.

A Sinterra atua em três frentes complementares: aditivos para tintas e revestimentos (54% da receita), resinas para adesivos industriais (28%) e insumos para tratamento de água (18%). A terceira frente é a de maior crescimento e a de maior potencial de reprecificação, sustentada pelo novo marco regulatório do saneamento e pelas metas de universalização até 2033.

## Dinâmica competitiva

O nicho de aditivos de performance no Brasil é fragmentado na base e concentrado no topo. Há um punhado de produtores nacionais de escala, um conjunto de multinacionais que atendem via importação e dezenas de fabricantes regionais subescala. A Sinterra figura entre as cinco maiores fabricantes nacionais do nicho, com participação estimada de 9% no mercado endereçável.

A vantagem competitiva vem de três fontes. A primeira é a proximidade técnica: cerca de 40% da receita passa por formulações desenvolvidas sob especificação do cliente, o que cria custo de troca elevado. A segunda é a base instalada e a homologação: ser fornecedor aprovado de uma grande fabricante de tintas leva anos e auditorias, o que protege a carteira. A terceira é a presença física no Nordeste (Camaçari), próxima do polo petroquímico e de clientes de saneamento, com vantagem de frete e prazo.

## Posicionamento de mercado

A Sinterra se posiciona como fornecedor técnico de segunda geração: não disputa volume com a química de commodity nem tenta cobrir todo o portfólio das multinacionais, mas se especializa em famílias de produtos onde a especificação importa mais que o preço. Esse posicionamento explica a margem acima da média e a baixa elasticidade de demanda a preço.

O vetor de saneamento muda o perfil de crescimento da companhia. A linha de tratamento de água, hoje 18% da receita, pode dobrar de participação em quatro a cinco anos com a expansão de Camaçari, deslocando o mix para produtos de maior valor e elevando a margem consolidada.

## Benchmark com comparáveis

| Comparável | Perfil | EV/EBITDA | Margem EBITDA |
| --- | --- | --- | --- |
| Comparável I | Especialidades, listada LatAm | 9,2x | 23% |
| Comparável II | Aditivos de performance, global | 8,4x | 21% |
| Comparável III | Química de revestimentos, Brasil | 7,1x | 19% |
| Transação precedente A | M&A, controle, 2024 | 8,8x | 22% |
| Transação precedente B | M&A, minoritário, 2023 | 6,5x | 18% |
| **Sinterra (implícito)** | **Projeto Cobalto** | **8,0x** | **22%** |

A Sinterra negocia dentro da faixa dos pares, com margem no terço superior da amostra. O múltiplo implícito de 8,0x é coerente com uma companhia de margem alta, fluxo previsível e tese de crescimento, e tende a comprimir o desconto numa operação de controle.

## Tendências que favorecem a tese

- Saneamento: o marco regulatório de 2020 e as metas de universalização de 2033 sustentam demanda estrutural por insumos de tratamento de água.
- Substituição de importações: parcela relevante do mercado endereçável ainda é atendida por produto importado, vulnerável a câmbio e frete.
- Agenda ESG e química verde: clientes com metas de descarbonização buscam fornecedores com linha de baixo impacto, frente em que a Sinterra já tem produtos.
- Consolidação: o número de fabricantes regionais subescala cria um pipeline natural de aquisições a múltiplos baixos.`

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

A receita cresceu a uma taxa composta de 14,2% ao ano entre 2021 e 2025, acima da média do setor de especialidades. O ponto mais relevante da leitura é a qualidade da expansão de margem: o ganho de mais de 400 pontos-base na margem EBITDA em quatro anos veio de mix (migração para produtos de maior valor e ramp-up da linha de tratamento de água) e de ganho de escala nas duas plantas, e não de corte de custo, o que o torna sustentável.

## Qualidade do lucro e ajustes ao EBITDA

O EBITDA ajustado incorpora a exclusão de despesas não recorrentes: R$ 3,8 milhões de rescisões na reestruturação de 2023, R$ 2,1 milhões de consultoria de implantação de ERP e R$ 1,7 milhão de perda com um cliente em recuperação judicial. Os ajustes somam R$ 5,7 milhões em 2025 (5,3% do EBITDA ajustado), magnitude baixa e de natureza claramente não recorrente, o que dá conforto sobre a qualidade do número. Não há ajustes recorrentes mascarados de não recorrentes.

## Endividamento e estrutura de capital

A dívida líquida encerrou 2025 em R$ 188 milhões, ou 1,8x o EBITDA ajustado, após dois anos de desalavancagem orgânica (de 2,4x em 2023). O perfil de vencimentos, porém, é o ponto a corrigir: parcela relevante da dívida é de curto prazo e custo elevado, o que justifica o refinanciamento proposto no Projeto Cobalto. O alongamento para sete anos reduz o risco de refinanciamento e libera caixa para capex e para o programa de aquisições.

## Capital de giro

O ciclo de caixa é de 71 dias, pressionado por estoques de matéria-prima importada mantidos como proteção contra ruptura de suprimento e câmbio. Uma política de compras coordenada entre as duas plantas e a renegociação de prazos com fornecedores liberam cerca de R$ 22 milhões de capital de giro, recurso que pode reduzir a necessidade de funding externo.

## Projeções (cenário base)

| R$ milhões | 2026 | 2027 | 2028 | 2029 | 2030 |
| --- | --- | --- | --- | --- | --- |
| Receita líquida | 548,2 | 613,9 | 681,4 | 748,1 | 815,3 |
| EBITDA ajustado | 123,4 | 139,4 | 155,4 | 170,1 | 184,3 |
| Margem EBITDA | 22,5% | 22,7% | 22,8% | 22,7% | 22,6% |
| Capex | 44,0 | 38,0 | 34,0 | 33,0 | 33,5 |
| Fluxo de caixa livre | 51,2 | 64,8 | 78,3 | 89,7 | 99,1 |

As projeções assumem crescimento orgânico das três linhas, ramp-up da expansão de Camaçari na frente de saneamento e estabilização da margem em torno de 22,6%. Não incorporam sinergias plenas do programa de aquisições, que representam potencial de alta não precificado.

## Valuation por fluxo de caixa descontado

Premissas: WACC de 13,5%, crescimento na perpetuidade de 4,0%, alíquota efetiva de 28%. O valor presente dos fluxos explícitos somado ao valor terminal resulta em EV de R$ 815 milhões no cenário base.

| Sensibilidade do EV (R$ M) | g 3,5% | g 4,0% | g 4,5% |
| --- | --- | --- | --- |
| WACC 13,0% | 812 | 851 | 896 |
| WACC 13,5% | 780 | 815 | 855 |
| WACC 14,0% | 751 | 783 | 818 |

A sensibilidade mostra um valuation razoavelmente estável: mesmo no canto conservador (WACC 14,0%, g 3,5%), o EV de R$ 751 milhões cobre com folga a dívida líquida e sustenta a estrutura de garantias proposta.

## Análise de estresse

No cenário de estresse com queda de 15% no EBITDA e alta de 200 pontos-base no custo da dívida, o índice de cobertura do serviço da dívida (DSCR) recua de 1,9x (base) para 1,4x, permanecendo próximo do gatilho de covenant de 1,5x. A leitura é que a estrutura resiste a um ciclo adverso moderado, e que o principal vetor de risco é a margem, não a alavancagem.`

O.analise_ma = `# Análise de M&A e Teses de Investimento

## Racional estratégico

A Sinterra é, ao mesmo tempo, plataforma de consolidação e alvo atraente. Para um comprador estratégico, a aquisição adiciona portfólio técnico, duas plantas bem localizadas (Sudeste e Nordeste) e uma carteira de clientes de troca custosa. Para um fundo, é uma tese clássica de buy-and-build num setor pulverizado, com margem alta e fluxo previsível para ancorar a alavancagem.

## Teses de investimento por perfil de contraparte

- Crédito estruturado: o ativo oferece um perfil de crédito sólido, com garantias reais, covenants e DSCR confortável. Tese de carrego com proteção de downside.
- Private equity industrial: tese de buy-and-build, com arbitragem de múltiplo entre a plataforma (8,0x) e os alvos regionais (5,5x). Potencial de elevar o EBITDA combinado em 25% a 30% em três anos.
- Estratégico global: tese de entrada no mercado brasileiro de especialidades com ativos prontos e carteira homologada, evitando o tempo de construção orgânica.
- Family office e co-investimento: tese de ativo real com fluxo previsível, horizonte longo e baixa correlação com mercados líquidos.

## Sinergias potenciais

- Sinergias de receita: cross-sell das três linhas para a base de clientes de um adquirente com canal complementar, e acesso a contratos de saneamento via relacionamento institucional.
- Sinergias de custo: compras coordenadas de matéria-prima petroquímica em maior escala, redução de frete pela presença no Nordeste e diluição de overhead corporativo.
- Sinergias de capital: rating combinado mais forte e acesso a funding mais barato após a consolidação, reduzindo o custo médio da dívida da plataforma.

## Estrutura da transação

A estrutura recomendada combina a captação de crédito do Projeto Cobalto com a abertura de até 25% do capital a um sócio financeiro, preservando o controle do fundador. O crédito financia a expansão orgânica e o refinanciamento, e o equity primário capitaliza o programa de aquisições.

| Componente | Faixa | Observação |
| --- | --- | --- |
| Crédito estruturado | R$ 280 M | Debênture ou CRI, 7 anos, 2 de carência |
| Equity primário (minoritário) | R$ 120 a 160 M | Até 25% do capital |
| Valuation de referência (EV) | R$ 760 a 870 M | 7,4x a 8,5x EBITDA 2025 |

## Programa de consolidação (buy-and-build)

O pipeline atual reúne quatro alvos regionais já identificados, com EBITDA somado de R$ 31 milhões e múltiplo médio de entrada de 5,5x, abaixo dos 8,0x da plataforma. A execução do programa cria valor por três vias: arbitragem de múltiplo na entrada, sinergias de custo e receita, e reprecificação da plataforma consolidada num eventual evento de liquidez futuro.

## Cronograma indicativo

Estruturação e due diligence em oito a dez semanas, road show com investidores em quatro semanas e fechamento em até quatro meses a partir do mandato. O programa de aquisições é faseado ao longo de 24 a 36 meses após o fechamento.`

O.kyc = `# Compliance, KYC e Governança

## Estrutura societária

O controle é detido por uma holding familiar (72%), com um fundo de private equity como minoritário (21%) e executivos no plano de participação (7%). A cadeia de titularidade foi mapeada até as pessoas físicas beneficiárias finais, sem camadas opacas, sem participações em paraísos fiscais e sem estruturas de difícil rastreabilidade.

## Screening de integridade

A verificação dos sócios e administradores em listas de pessoas politicamente expostas (PEP), sanções nacionais e internacionais e mídias adversas não retornou apontamentos. Não há processos de natureza penal econômica contra os beneficiários finais. O screening foi conduzido sobre controladores, administradores e o minoritário relevante.

## Licenças e meio ambiente

As duas plantas têm licença de operação vigente. A exceção é a ampliação de Camaçari, cuja licença de operação está em análise no órgão ambiental estadual, com licença prévia e de instalação já concedidas, o que reduz o risco de indeferimento. Não há passivo ambiental registrado, área contaminada declarada ou termo de ajustamento de conduta em aberto.

## Avaliação de governança

A governança é adequada para o porte, mas tem um gap relevante para a entrada de um sócio institucional: a ausência de um conselho de administração formal, hoje suprida por um comitê consultivo sem poder deliberativo. Há auditoria independente das demonstrações e controles internos razoáveis, porém sem um comitê de auditoria estruturado.

## Red flags e pontos de atenção

Nenhum apontamento bloqueante. Os pontos de atenção são de governança e não de integridade: profissionalização do conselho, formalização de políticas (alçadas, partes relacionadas, conflito de interesses) e estruturação de um comitê de auditoria. Todos são condições naturais da entrada de um sócio minoritário e podem ser tratados como compromissos pós-closing.`

O.contratos = `# Análise Contratual e Passivos

## Carteira de contratos

A receita está apoiada em 14 contratos de fornecimento de médio e longo prazo, que cobrem a maior parte da receita recorrente. Três deles, que somam 31% da receita, têm cláusula de exclusividade técnica e renovação automática, o que reforça a previsibilidade. Dois contratos relevantes, porém, operam hoje por aditivo verbal e precisam ser formalizados antes da emissão, pois representam risco de descontinuidade e fragilidade probatória.

## Cláusulas de mudança de controle

Quatro contratos contêm cláusula de change of control que exige anuência do cliente em caso de alienação superior a 50% do capital. A estrutura minoritária proposta no Projeto Cobalto (até 25%) não dispara essas cláusulas, o que preserva a carteira na operação desenhada. Uma eventual operação de controle futura exigiria gestão ativa dessas anuências.

## Passivos contingentes

| Natureza | Valor estimado (R$ M) | Probabilidade de perda | Comentário |
| --- | --- | --- | --- |
| Trabalhista | 6,2 | Possível | Reclamações pulverizadas, sem tese sistêmica |
| Tributária (ICMS) | 9,8 | Possível | Tese de exclusão da base, jurisprudência favorável |
| Ambiental | 1,4 | Remota | Sem auto de infração relevante em aberto |

O provisionamento atual cobre as contingências de perda provável. A discussão tributária de ICMS segue tese de mercado com jurisprudência majoritariamente favorável, o que reduz o risco efetivo. O passivo total contingente é de magnitude administrável frente ao EBITDA e ao valuation.

## Recomendações jurídicas

Formalizar os dois contratos que operam por aditivo verbal antes da emissão, constituir o conselho de administração, estruturar políticas formais de governança e revisar as cláusulas de exclusividade para alinhar prazos de renovação ao horizonte de sete anos da dívida.`

O.originacao = `# Estratégia de Originação

## Perfil de investidores-alvo

A operação atrai três perfis de contraparte, cada um com uma porta de entrada distinta. Fundos de private equity com tese industrial e apetite para buy-and-build entram pelo equity primário. Family offices em busca de ativos reais com fluxo previsível entram por equity ou co-investimento. Investidores institucionais de crédito (gestoras, asset, bancos e o BNDES) entram pela tranche estruturada.

## Pipeline de contrapartes

| Tipo | Quantidade mapeada | Fit | Porta de entrada |
| --- | --- | --- | --- |
| Crédito estruturado (gestoras) | 9 | Alto | Tranche de dívida |
| Private equity (industrial) | 7 | Alto | Equity primário / buy-and-build |
| Family office | 5 | Médio | Equity / co-investimento |
| Estratégico (química global) | 3 | Médio-alto | Controle futuro |

## Sequenciamento da abordagem

A recomendação é conduzir um processo restrito, com no máximo seis contrapartes simultâneas, para preservar confidencialidade e poder de barganha. A tranche de crédito é colocada primeiro, por ser a de execução mais rápida e a que resolve o passivo de curto prazo. O equity minoritário e o programa de aquisições seguem em paralelo, com janela de fechamento mais longa.

## Oportunidades estratégicas

- Consolidação: pipeline de quatro alvos regionais já identificados, com EBITDA somado de R$ 31 milhões e múltiplo médio de entrada de 5,5x.
- Saneamento: a linha de tratamento de água pode dobrar de tamanho em quatro a cinco anos com a expansão de Camaçari.
- Substituição de importações: parcela relevante do mercado endereçável ainda é atendida por produto importado, vulnerável a câmbio.
- Agenda ESG: a linha de química verde abre acesso a clientes com metas de descarbonização e a linhas de crédito incentivadas.

## Mensagem de posicionamento

A narrativa de venda combina três ângulos: ativo de crédito sólido e bem garantido para o investidor de dívida, plataforma de consolidação com arbitragem de múltiplo para o investidor de equity, e tese de saneamento de longo prazo para o investidor com horizonte estrutural.`

O.estruturacao = `# Estruturação de Capital

## Análise de crédito e capacidade financeira

A geração de caixa operacional cobre o serviço da dívida proposta com folga. No cenário base, o índice de cobertura do serviço da dívida (DSCR) fica em 1,9x. No estresse, com queda de 15% no EBITDA e alta de 200 pontos-base no custo, o DSCR permanece em 1,4x, próximo do gatilho de covenant. A leitura de crédito é confortável: o ativo suporta a alavancagem proposta mesmo num ciclo adverso moderado.

## Estrutura recomendada

| Parâmetro | Definição |
| --- | --- |
| Instrumento | Debênture (ou CRI) em duas séries |
| Volume | R$ 280 milhões |
| Prazo | 7 anos, 2 de carência de principal |
| Garantias | Alienação fiduciária da planta de Jundiaí mais cessão fiduciária de recebíveis |
| LTV | 48% |
| DSCR mínimo (covenant) | 1,5x |
| Dívida líquida / EBITDA (covenant) | máx. 2,5x |

## Comparação de alternativas

| Alternativa | Custo estimado | Prazo | Veredito |
| --- | --- | --- | --- |
| Debênture com garantia real | CDI + 2,2% | 7 anos | Recomendada |
| CRI | IPCA + 6,8% | 8 anos | Viável, depende de lastro |
| Crédito bancário tradicional | CDI + 3,5% | 4 anos | Mais caro e curto |

A debênture com garantia real é a alternativa recomendada por equilibrar custo, prazo e flexibilidade de covenants. O CRI é viável e alonga o prazo, mas depende da qualificação do lastro imobiliário ou do agronegócio. O crédito bancário tradicional resolve o curto prazo, mas mantém o perfil de refinanciamento que se quer eliminar.

## Estrutura de garantias

A alienação fiduciária da planta de Jundiaí, somada à cessão fiduciária de recebíveis performados, resulta em LTV de 48%, conservador para o perfil do ativo. A estrutura de garantias é o principal mitigador de risco de crédito e o que sustenta o spread proposto.

## Uso dos recursos

| Destinação | Valor (R$ M) | Racional |
| --- | --- | --- |
| Refinanciamento de dívida de curto prazo | 150 | Elimina risco de rolagem e reduz custo médio |
| Expansão de Camaçari (saneamento) | 90 | Destrava capacidade na linha de maior crescimento |
| Capital de giro para o programa de aquisições | 40 | Funding-ponte do buy-and-build |

A alocação prioriza primeiro a saúde do balanço (refinanciamento), depois o crescimento orgânico de maior retorno (Camaçari) e por fim a opcionalidade de consolidação.`

O.maturidade = `# Veredicto de Maturidade

## Conclusão institucional

A Sinterra está madura para uma operação estruturada. A combinação de margem em expansão, alavancagem baixa, garantias reais de qualidade e fluxo de caixa previsível sustenta tanto a captação de crédito quanto a entrada de um sócio minoritário. O ativo está na fronteira entre uma empresa familiar consolidada e uma plataforma institucional, e a operação proposta é precisamente o passo que faz essa transição.

## Gaps a endereçar

1. Obter a licença de operação da expansão de Camaçari.
2. Formalizar os dois contratos de fornecimento que operam por aditivo verbal.
3. Constituir conselho de administração formal e estruturar políticas de governança antes da entrada do sócio minoritário.

## Roadmap pré-operação

Os três gaps têm prazo estimado de 30 a 45 dias e podem correr em paralelo à estruturação. Nenhum deles é impeditivo para iniciar a due diligence e o road show. A sequência recomendada é formalizar os contratos primeiro (menor prazo, maior impacto na previsibilidade de receita), depois constituir o conselho e, por fim, acompanhar a licença, cujo prazo depende do órgão estadual.

## Matriz de prontidão

| Frente | Prontidão | Ação |
| --- | --- | --- |
| Crédito | Alta | Avançar à estruturação |
| Garantias | Alta | Formalizar instrumentos |
| Governança | Média | Conselho e políticas antes do equity |
| Documentação | Média | Resolver contratos e licença |

## Recomendação final

Avançar. A operação tem mérito de crédito e tese de equity consistentes. A liberação da segunda série da dívida deve ficar condicionada à licença de Camaçari, o único item fora do controle direto da companhia, isolando esse risco sem travar o cronograma da emissão.`

O.blind_teaser = `# Blind Teaser: Projeto Cobalto

Material de divulgação anônima preparado pela assessoria responsável. A identidade da companhia é revelada exclusivamente mediante assinatura de acordo de confidencialidade (NDA).

## Resumo da oportunidade

Fabricante nacional de especialidades químicas de performance, em operação há mais de quinze anos, com duas plantas industriais (Sudeste e Nordeste) e posição entre os cinco maiores players do nicho de aditivos de alta especificação técnica. Atende cerca de 380 clientes industriais nos mercados de tintas, adesivos e tratamento de água, com 40% da receita vinculada a formulações desenvolvidas sob especificação do cliente, o que eleva o custo de troca e sustenta contratos de longo prazo.

A Companhia capta R$ 280 milhões em crédito estruturado com garantias reais e avalia a entrada de um sócio minoritário para acelerar um programa de consolidação setorial. O controle permanece com os atuais acionistas.

## Indicadores-chave (2025)

| Métrica | Valor |
| --- | --- |
| Receita líquida | R$ 487 milhões |
| EBITDA ajustado | R$ 108 milhões |
| Margem EBITDA | 22% |
| Crescimento médio 2021 a 2025 | 14% a.a. |
| Dívida líquida / EBITDA | 1,8x |
| Colaboradores | cerca de 520 |
| Clientes ativos | cerca de 380 |

## Destaques do investimento

- Nicho técnico defensável: especialidades de baixo volume e alta especificação, com poder de repasse de preço e baixo risco de substituição.
- Margem EBITDA de 22%, no terço superior dos pares e em expansão por cinco anos consecutivos.
- Crescimento composto de 14% ao ano desde 2021, acima da média do setor.
- Alavancagem conservadora (1,8x dívida líquida sobre EBITDA) e geração de caixa previsível.
- Carteira recorrente, com contratos de longo prazo e custo de troca elevado.
- Vetor de crescimento estrutural na frente de saneamento, puxado pelo novo marco regulatório.
- Plataforma de consolidação: pipeline de quatro alvos regionais mapeado, a múltiplo de entrada abaixo do da plataforma.

## Composição da receita

| Linha de produto | Participação |
| --- | --- |
| Aditivos para tintas | 54% |
| Resinas para adesivos | 28% |
| Insumos para tratamento de água | 18% |

A frente de tratamento de água é a de maior crescimento, sustentada pelas metas de universalização do saneamento até 2033.

## Síntese financeira

| R$ milhões | 2023 | 2024 | 2025 |
| --- | --- | --- | --- |
| Receita líquida | 388 | 431 | 487 |
| EBITDA ajustado | 78 | 89 | 108 |
| Margem EBITDA | 20% | 21% | 22% |
| Dívida líquida / EBITDA | 2,4x | 2,1x | 1,8x |

## Contexto de mercado

O mercado brasileiro de especialidades químicas movimenta cerca de R$ 90 bilhões ao ano e cresce acima do PIB industrial, puxado por revestimentos, construção e saneamento. Diferentemente da química de commodity, o segmento compete por desempenho técnico, não por preço, o que protege margem. A substituição de importações é um vetor adicional: parte dos aditivos concorrentes é importada e exposta a câmbio e frete.

## A operação

| Componente | Faixa |
| --- | --- |
| Crédito estruturado | R$ 280 milhões, com garantias reais |
| Equity primário (minoritário) | R$ 120 a 160 milhões, até 25% do capital |
| Valor da firma (referência) | 7,4x a 8,5x EBITDA |

Os recursos destinam-se ao refinanciamento de dívida de curto prazo, à expansão da segunda planta e ao programa de aquisições bolt-on.

## Perfil de investidor buscado

Fundos com tese industrial e apetite para consolidação, family offices em busca de ativos reais com fluxo previsível e investidores institucionais para a tranche de crédito estruturado.

## Próximos passos

Contrapartes qualificadas podem solicitar o Confidential Information Memorandum (CIM) e o acesso ao data room mediante assinatura de NDA junto à assessoria responsável.`

O.sell_side_pitchbook = `# Pitchbook: Projeto Cobalto

Sinterra Especialidades Químicas S.A. Material confidencial para uso restrito de potenciais investidores e credores qualificados.

## 1. Sumário executivo

A Sinterra é uma fabricante de aditivos e resinas de performance para os mercados de tintas, adesivos e tratamento de água, com mais de quinze anos de operação, duas plantas industriais (Jundiaí/SP e Camaçari/BA) e posição entre as cinco maiores do nicho de especialidades de alta especificação no Brasil. Fechou 2025 com receita líquida de R$ 487,3 milhões e EBITDA ajustado de R$ 108,1 milhões (margem de 22,2%), após cinco anos de expansão consecutiva de receita e margem.

O Projeto Cobalto estrutura uma captação de R$ 280 milhões em crédito estruturado e avalia a entrada de um sócio minoritário (R$ 120 a 160 milhões), com dois objetivos: alongar e baratear o endividamento atual e financiar a expansão de Camaçari e um programa de aquisições num setor pulverizado.

## 2. Visão geral da companhia

Fundada em 2009 e sediada em Jundiaí (SP), a Sinterra desenvolve formulações proprietárias e mantém laboratório de P&D dedicado ao atendimento técnico sob especificação.

| Perfil | |
| --- | --- |
| Fundação | 2009 |
| Sede | Jundiaí (SP) |
| Plantas | Jundiaí (SP) e Camaçari (BA) |
| Colaboradores | cerca de 520 |
| Clientes ativos | cerca de 380 |
| Segmento | Especialidades químicas de performance |

## 3. Destaques do investimento

- Nicho técnico defensável, com poder de repasse de preço e baixo risco de substituição.
- Margem EBITDA de 22,2%, acima da média de químicos de commodity e em expansão há cinco anos.
- Crescimento composto de 14,2% ao ano (2021 a 2025) com alavancagem conservadora (1,8x).
- 40% da receita vinculada a formulações sob especificação, sustentando contratos de longo prazo.
- Vetor de crescimento estrutural na frente de saneamento (marco regulatório, universalização até 2033).
- Plataforma pronta para consolidação, com pipeline de quatro alvos mapeado.
- ROIC de 16,8% em 2025, acima do custo de capital.

## 4. Modelo de negócio e portfólio

A receita se divide em três linhas. Cerca de 40% do faturamento passa por formulações desenvolvidas sob especificação do cliente, o que eleva o custo de troca. Os dez maiores clientes respondem por 48% da receita, com relacionamento médio superior a oito anos.

| Linha de produto | Receita | Margem relativa | Dinâmica |
| --- | --- | --- | --- |
| Aditivos para tintas | 54% | Alta | Estável, base de caixa |
| Resinas para adesivos | 28% | Média-alta | Crescimento moderado |
| Tratamento de água | 18% | Alta | Maior crescimento (saneamento) |

## 5. Desempenho financeiro

| R$ milhões | 2021 | 2022 | 2023 | 2024 | 2025 |
| --- | --- | --- | --- | --- | --- |
| Receita líquida | 286,4 | 331,9 | 388,2 | 431,0 | 487,3 |
| Lucro bruto | 100,2 | 119,5 | 143,6 | 162,9 | 185,2 |
| Margem bruta | 35,0% | 36,0% | 37,0% | 37,8% | 38,0% |
| EBITDA ajustado | 51,8 | 64,0 | 78,0 | 89,3 | 108,1 |
| Margem EBITDA aj. | 18,1% | 19,3% | 20,1% | 20,7% | 22,2% |
| Dívida líquida / EBITDA | n.d. | n.d. | 2,4x | 2,1x | 1,8x |
| ROIC | n.d. | n.d. | 14,1% | 15,3% | 16,8% |

Ajustes ao EBITDA de 2025 (não recorrentes): R$ 3,8 M de rescisões, R$ 2,1 M de consultoria de implantação de ERP e R$ 1,7 M de perda com cliente em recuperação judicial. A dívida líquida encerrou 2025 em R$ 188 milhões. O ciclo de caixa de 71 dias oferece cerca de R$ 22 milhões de capital de giro liberável via gestão coordenada de compras entre as plantas.

## 6. Projeções (cenário base)

| R$ milhões | 2025 | 2030E |
| --- | --- | --- |
| Receita líquida | 487,3 | 815 |
| EBITDA ajustado | 108,1 | 184 |
| Margem EBITDA | 22,2% | cerca de 22,6% |

As projeções assumem crescimento orgânico das três linhas, ramp-up da expansão de Camaçari na frente de saneamento e contribuição parcial do programa de aquisições. Não incorporam sinergias plenas dos alvos de M&A, que representam potencial de alta não precificado.

## 7. Mercado e posicionamento

O mercado brasileiro de especialidades químicas movimenta cerca de R$ 90 bilhões ao ano e cresce acima do PIB industrial. A Sinterra figura entre as cinco maiores fabricantes nacionais do nicho de aditivos de performance, com participação estimada de 9% no mercado endereçável.

| Comparável | Perfil | EV/EBITDA | Margem EBITDA |
| --- | --- | --- | --- |
| Comparável I | Especialidades, listada LatAm | 9,2x | 23% |
| Comparável II | Aditivos de performance, global | 8,4x | 21% |
| Comparável III | Química de revestimentos, Brasil | 7,1x | 19% |
| Precedente A | M&A controle, 2024 | 8,8x | 22% |
| Precedente B | M&A minoritário, 2023 | 6,5x | 18% |
| Sinterra (implícito) | Projeto Cobalto | 8,0x | 22% |

## 8. Tese de consolidação (M&A)

O setor reúne dezenas de fabricantes regionais subescala, candidatos naturais a aquisições bolt-on. O pipeline atual reúne quatro alvos, com EBITDA somado de R$ 31 milhões e múltiplo médio de entrada de 5,5x, abaixo dos 8,0x da plataforma, o que cria arbitragem de múltiplo na consolidação.

## 9. Valuation

| Metodologia | Faixa de EV |
| --- | --- |
| Múltiplos de mercado (7,4x a 8,5x EBITDA 2025) | R$ 760 a 870 milhões |
| Fluxo de caixa descontado (WACC 13,5%, g 4,0%) | R$ 815 milhões (cenário base) |

Descontada a dívida líquida de R$ 188 milhões, o valor do equity situa-se entre R$ 572 e R$ 682 milhões.

## 10. Estrutura proposta da transação

| Componente | Termos |
| --- | --- |
| Crédito estruturado | R$ 280 M, debêntures ou CRI, duas séries, 7 anos, 2 de carência |
| Garantias | Alienação fiduciária da planta de Jundiaí mais cessão fiduciária de recebíveis |
| Covenants | Dívida líquida/EBITDA até 2,5x; DSCR mínimo de 1,5x |
| Equity primário (minoritário) | R$ 120 a 160 M, até 25% do capital |

Uso dos recursos: refinanciamento da dívida de curto prazo, expansão da planta de Camaçari (linha de saneamento) e capital para o programa de aquisições bolt-on.

## 11. Governança e estrutura societária

| Acionista | Participação |
| --- | --- |
| Holding familiar (controladora) | 72% |
| Fundo de private equity (minoritário) | 21% |
| Executivos (plano de participação) | 7% |

A constituição de um conselho de administração formal, com membros independentes, está prevista como parte da operação.

## 12. Riscos e mitigações

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Concentração de clientes (10 maiores = 48%) | Perda do maior reduz EBITDA em cerca de R$ 14 M/ano | Formalização de contratos de longo prazo; diversificação via saneamento |
| Matéria-prima importada (30%, atrelada ao petróleo) | Pressão de margem em ciclos de alta | Cláusulas de repasse; hedge cambial; dupla fonte |
| Licença ambiental de Camaçari pendente | Atraso na expansão | Liberação da segunda série condicionada à obtenção da licença |
| Dois contratos por aditivo verbal | Risco de descontinuidade de receita | Renovação formal antes da emissão (prazo de 30 a 45 dias) |

## 13. Próximos passos

Disponibilização do data room e do Confidential Information Memorandum mediante NDA, sessões de Q&A com a administração, due diligence confirmatória e estruturação jurídica da emissão. Cronograma estimado de 60 a 90 dias até o closing da tranche de crédito.

## 14. Aviso

Material confidencial preparado exclusivamente para avaliação preliminar por investidores e credores qualificados. As informações não foram objeto de auditoria independente e não constituem oferta de valores mobiliários nos termos da regulamentação aplicável.`

const MESA = {
  aprovacao: 'aprovado_com_ressalvas',
  diagnostico_final: 'A operação tem mérito de crédito e tese de equity consistentes. O fluxo de caixa cobre o serviço da dívida proposta mesmo no cenário de estresse (queda de 15% no EBITDA e alta de 200 pontos-base no custo, com DSCR de 1,4x), e as garantias são de boa qualidade (LTV de 48%). A margem EBITDA de 22,2% é sustentável porque veio de mix, não de corte de custo. As ressalvas são documentais (licença de Camaçari e dois contratos verbais) e não comprometem a tese, mas devem ser resolvidas antes da emissão da segunda série.',
  pontos_fortes: [
    'Margem EBITDA de 22,2%, em expansão consistente há cinco anos e construída por mix de maior valor.',
    'Alavancagem baixa (1,8x) com desalavancagem orgânica de 2,4x para 1,8x em dois anos.',
    'Fluxo de caixa previsível, ancorado em contratos de longo prazo e 40% da receita sob especificação.',
    'Garantias reais de boa qualidade, com LTV conservador de 48%.',
    'Pipeline de aquisições bolt-on com múltiplo de entrada (5,5x) abaixo do da plataforma (8,0x).',
    'Vetor estrutural de saneamento, que tende a elevar o mix e a margem consolidada.',
  ],
  pontos_fracos: [
    'Concentração: os dez maiores clientes respondem por 48% da receita.',
    'Exposição a matéria-prima petroquímica importada (cerca de 30% dos insumos).',
    'Licença de operação da expansão de Camaçari ainda em análise no órgão estadual.',
    'Dois contratos de fornecimento relevantes operam por aditivo verbal.',
    'Ausência de conselho de administração formal, a estruturar antes da entrada do sócio minoritário.',
  ],
  contradicoes_detectadas: [],
  recomendacao_assessor: 'Avançar à estruturação em paralelo à regularização documental. Colocar a tranche de crédito primeiro (resolve o passivo de curto prazo) e conduzir o equity minoritário e o programa de aquisições em paralelo. Condicionar a liberação da segunda série da dívida à obtenção da licença de Camaçari, isolando o único risco fora do controle da companhia.',
}

// ── execução ──────────────────────────────────────────────────────────────────
const { data: cur, error: gErr } = await sb.from('analises').select('outputs').eq('id', ANALISE).single()
if (gErr) { console.error('erro ao ler análise:', gErr.message); process.exit(1) }

const merged = { ...(cur?.outputs ?? {}), ...O }
const { error: uErr } = await sb.from('analises')
  .update({ outputs: merged, mesa_revisao: MESA, mesa_revisao_at: new Date().toISOString(), atualizado_em: new Date().toISOString() })
  .eq('id', ANALISE)
if (uErr) { console.error('erro ao atualizar:', uErr.message); process.exit(1) }

// Verificação rápida: nenhum travessão e tamanho dos textos
const dash = Object.entries(O).filter(([, v]) => v.includes('—')).map(([k]) => k)
console.log('• outputs enriquecidos:', Object.keys(O).join(', '))
console.log('• seções com travessão (deve ser vazio):', dash.length ? dash.join(', ') : 'nenhuma ✓')
for (const [k, v] of Object.entries(O)) console.log(`   ${k}: ${v.length} chars`)
console.log('• mesa_revisao atualizada ✓')
