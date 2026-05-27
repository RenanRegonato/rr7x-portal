// Base de conhecimento (v2) da Reforma Tributária do Consumo, Adequação (Ferrante).
//
// Âncora legal: EC 132/2023 (alterou a Constituição) + LC 214/2025 (lei que
// regulamenta IBS, CBS e Imposto Seletivo). É injetada no system prompt do
// agente como base de regras/critérios factuais.
//
// Fontes desta destilação:
//   1) Lei Complementar nº 214/2025, via "Cartilha da Reforma Tributária" do
//      Observatório da Reforma Tributária da FIESP (ago/2025), fonte primária,
//      com artigos citados.
//   2) e-book do CFC "Reforma Tributária: o novo Sistema Tributário Brasileiro"
//      (Fellipe Guerra, jun/2024), exemplos numéricos (Simples Nacional).
//   3) Projeções oficiais do governo (alíquota de referência estimada).
//
// IMPORTANTE: a EC 132/2023 e a LC 214/2025 já estão em vigor, mas vários pontos
// dependem de regulamento e atos infralegais (Comitê Gestor do IBS + RFB), de
// anexos e das alíquotas de referência definitivas. Toda análise é PRELIMINAR.
// Quando vier material técnico mais detalhado, esta base é enriquecida (ou
// migrada para RAG) sem mudar a estrutura do agente.

export const REFORMA_TRIBUTARIA_KB_VERSION = 'lc214-fiesp-2025-08'

export const REFORMA_TRIBUTARIA_KB = `# Base de conhecimento, Reforma Tributária do Consumo (EC 132/2023 + LC 214/2025)

Âncora legal: EC 132/2023 (alterou a Constituição) e LC 214/2025 (regulamenta IBS, CBS e Imposto Seletivo). Escopo desta base: tributação sobre o CONSUMO (a tributação da renda fica para fase futura). Fontes: Cartilha da Reforma Tributária do Observatório da FIESP (ago/2025, sobre a LC 214/2025), e-book do CFC (jun/2024) e projeções oficiais. Pontos ainda pendentes: regulamento e atos infralegais (CGIBS e RFB), anexos e alíquotas de referência definitivas.

## 1. Modelo: IVA Dual
A reforma unifica os tributos sobre consumo em um IVA de caráter dual (inspirado em Canadá e Índia):
- **CBS** (Contribuição sobre Bens e Serviços), FEDERAL, administrada pela Receita Federal (RFB). Substitui **PIS e Cofins**. Alíquota única nacional.
- **IBS** (Imposto sobre Bens e Serviços), competência compartilhada de ESTADOS e MUNICÍPIOS, administrado de forma centralizada pelo **Comitê Gestor do IBS (CGIBS)**. Substitui **ICMS e ISS**. Cada ente fixa sua alíquota; cobrança no DESTINO.
- **Imposto Seletivo (IS)**, FEDERAL (RFB). Substitui em parte o **IPI**. Incide sobre bens/serviços prejudiciais à saúde ou ao meio ambiente.
IBS e CBS têm as MESMAS regras gerais (fato gerador, base, não incidência, imunidades, regimes, creditamento). Nota fiscal eletrônica única com as alíquotas destacadas "por fora". Crédito amplo. Fim da guerra fiscal (cobrança no destino).

## 2. Carga e alíquota
Alíquota padrão = CBS (União) + IBS (Estado) + IBS (Município). Estimativa oficial do governo: **26,5%** no total, sendo **17,7% de IBS e 8,8% de CBS** (entre as mais altas do mundo). Há trava de referência (revisões para não aumentar a carga total). A CBS é única nacional; o IBS varia conforme Estado e Município de destino.

## 3. Incidência (LC 214/2025, arts. 4 e 5)
Incide sobre operações ONEROSAS com bens (materiais ou imateriais, móveis ou imóveis, inclusive direitos) e serviços (definição residual ampla: tudo que não é bem). Exemplos: compra e venda, permuta, locação, licenciamento, mútuo oneroso, arrendamento (inclusive mercantil), prestação de serviços.
Também alcança hipóteses NÃO onerosas específicas: brindes e bonificações (condicionado), transferência de bens a sócios/acionistas quando houve apropriação de crédito (inclusive devolução de capital ou dividendos in natura), fornecimento gratuito ou abaixo do mercado a partes relacionadas.
A incidência INDEPENDE da forma jurídica, da existência de lucro e do cumprimento de exigências regulatórias. Alcança fornecimentos eventuais e bens do ativo não circulante/permanente.

## 4. Não incidência (relevante para M&A e reorganização societária)
NÃO incidem IBS/CBS sobre:
- serviços de PF em relação de emprego; administradores, conselheiros e membros de comitês legais.
- transferência de bens entre estabelecimentos da MESMA empresa (com documento fiscal eletrônico).
- transmissão de bens por FUSÃO, CISÃO, INCORPORAÇÃO e por integralização/devolução de capital; baixa, liquidação ou alienação de participação societária (salvo onerosidade).
- rendimentos financeiros, dividendos, juros sobre capital próprio, avaliação de participações e operações com títulos/valores mobiliários (salvo regime específico de serviços financeiros).
Leitura para adequação: reorganizações societárias e operações de M&A via participação NÃO geram IBS/CBS, mas a essência onerosa de bem ou serviço pode atrair a incidência (a lei olha a substância, não a forma).

## 5. Contribuinte (art. 21)
É contribuinte o fornecedor que realiza operações em atividade econômica (PF ou PJ, ainda que eventual ou em profissão não regulamentada). O conceito abrange entidades sem personalidade jurídica: sociedade em comum, SCP, consórcio, condomínio e fundo de investimento. Importador é contribuinte mesmo sendo PF e sem atividade econômica. Em leilão/licitação, o adquirente pode ser o responsável. NÃO é contribuinte o nanoempreendedor (PF com receita bruta inferior a 50% do limite do MEI e fora do MEI). Todo contribuinte (inclusive estrangeiro que opere no Brasil) deve se inscrever nos cadastros do IBS/CBS e compor o Domicílio Tributário Eletrônico (DTE).

## 6. Alíquotas reduzidas e regimes diferenciados (art. 11 e Anexos)
Sobre a alíquota padrão, há reduções de 30%, 60% e 100% (zero):
- **30%**: 18 profissões regulamentadas fiscalizadas por conselho (administradores, advogados, arquitetos e urbanistas, assistentes sociais, bibliotecários, biólogos, contabilistas, economistas, profissionais de educação física, engenheiros e agrônomos, estatísticos, médicos veterinários e zootecnistas, museólogos, químicos, relações públicas, técnicos industriais e técnicos agrícolas).
- **60%**: educação; saúde; dispositivos médicos e de acessibilidade; medicamentos; alimentos para consumo humano; produtos de higiene e limpeza majoritariamente consumidos por baixa renda; produtos agropecuários, aquícolas, pesqueiros, florestais e extrativistas vegetais in natura; insumos agropecuários e aquícolas; produções nacionais artísticas, culturais, de eventos, jornalísticas e audiovisuais; comunicação institucional; atividades desportivas; bens/serviços de soberania, segurança nacional, da informação e cibernética.
- **zero (100%)**: cesta básica nacional de alimentos; certos dispositivos médicos e de acessibilidade e medicamentos; produtos de cuidados à saúde menstrual; hortícolas, frutas e ovos; automóveis para PcD, autistas e taxistas; serviços de ICT sem fins lucrativos.
Há ainda **regimes específicos** (Título V) com base de cálculo e alíquotas próprias: combustíveis (monofásico), serviços financeiros, hotéis e restaurantes, bens imóveis (incorporação, locação).

## 7. Local do fato gerador (destino)
A alíquota é a do DESTINO da operação. Regras (art. 11): bem móvel material no local da entrega; bem imóvel e serviço sobre/relativo a imóvel no local do imóvel; serviço prestado sobre/fruído presencialmente por PF no local da prestação; eventos no local do evento; transporte de passageiros no início; transporte de carga na entrega; demais serviços e bens imateriais no DOMICÍLIO PRINCIPAL do adquirente (operação onerosa) ou do destinatário (não onerosa). No e-commerce/venda não presencial, vale o destino final indicado pelo adquirente. Isso encerra a guerra fiscal (não há mais incentivo a sediar a empresa onde o imposto é menor).

## 8. Créditos e não cumulatividade (arts. 47 e 57)
- Crédito AMPLO sobre praticamente todas as aquisições vinculadas à atividade econômica (inclusive bens de capital e serviços).
- Crédito CONDICIONADO ao efetivo PAGAMENTO (extinção) do tributo na etapa anterior (art. 47). Há apuração assistida (CGIBS e RFB) que registra débitos e créditos e libera o crédito ao adquirente só quando comprovado o pagamento. Mudança relevante: o crédito não nasce só com a nota, depende do recolhimento.
- NÃO geram crédito os bens/serviços de USO E CONSUMO PESSOAL (art. 57): joias, obras de arte, bebidas alcoólicas, derivados de tabaco, armas e munições, itens recreativos/esportivos/estéticos; e fornecimentos gratuitos ou abaixo do mercado ao próprio contribuinte PF, a sócios, acionistas, administradores, conselheiros, empregados e parentes. Exceções que GERAM crédito: uniformes e EPI; alimentação, saúde e creche no estabelecimento durante a jornada; planos de saúde, vale-transporte, vale-refeição/alimentação e benefícios educacionais previstos em acordo ou convenção coletiva.
- Crédito PRESUMIDO em casos definidos (ex.: aquisição de produtor rural não contribuinte, transporte de carga de autônomo/MEI, revenda de usados de PF).

## 9. Split payment (arts. 27 e 32 a 35)
Pagamento dividido na liquidação financeira: ao receber a fatura, o prestador de serviço de pagamento (PSP) separa automaticamente três parcelas, valor do fornecedor, IBS (conta do CGIBS) e CBS (conta da União). É uma das cinco modalidades de extinção do débito (compensação; pagamento do saldo devedor; split payment; recolhimento pelo adquirente; terceiro responsável). Há split simplificado para vendas B2C (percentual médio, art. 33) e tratamento próprio para parcelamentos e adiantamentos (arts. 32 e 34). Só se aplica a pagamentos eletrônicos. O crédito do adquirente só é liberado após a extinção do débito.
Leitura para adequação: o split payment muda o FLUXO DE CAIXA (parte do recebível vai direto ao fisco no recebimento) e exige ERP, meios de pagamento e conciliação fiscal adaptados. Prazo de início ainda não oficial (implementação gradual por ato do CGIBS e RFB); até lá vale o crédito por destaque no documento fiscal.

## 10. Ressarcimento de saldos credores (arts. 39 e 40)
Modelo novo e mais ágil que o do ICMS/PIS-Cofins (que leva anos). Prazos: até 30 dias (contribuinte em programa de conformidade que atenda ao art. 40), até 60 dias (atendendo só ao art. 40), até 180 dias (demais casos). Silêncio da administração obriga a devolução em 15 dias. Atualização pela Selic acumulada mais 1% no mês do pagamento. Prazos céleres para créditos de ativo imobilizado/investimentos e para pedidos de até 150% da média mensal de créditos dos últimos 24 meses (foco em quem acumula crédito de forma estrutural: exportadores, agro sazonal, predominância de alíquota reduzida). Saída para Simples/MEI/não contribuinte suspende os prazos por até 5 anos (sem Selic).
Leitura para adequação: dá liquidez ao crédito e ao capital de giro; favorece exportador e negócios intensivos em capital, desde que haja gestão de saldos credores.

## 11. Bens de capital (arts. 108 e 109)
Crédito INTEGRAL e IMEDIATO do IBS/CBS na aquisição (não há mais apropriação parcelada ao longo de anos). Possível regime de SUSPENSÃO que se converte em ALÍQUOTA ZERO após a incorporação do bem ao ativo imobilizado (se não incorporar no prazo: recolhe os tributos com juros e multa). Alíquota zero direta para tratores, máquinas e implementos agrícolas adquiridos por produtor rural não contribuinte e para veículos de carga de transportador autônomo. Aplica-se também ao Simples Nacional que esteja no regime regular do IBS/CBS. Mantidos os regimes Reporto, REIDI e Renaval.
Leitura para adequação: desonera investimento/capex e melhora o fluxo de caixa de quem investe em ativos.

## 12. Exportações (imunidade)
Exportações de bens e serviços são imunes ao IBS/CBS, com manutenção do crédito (desoneração plena). A empresa comercial exportadora (ECE) pode comprar com SUSPENSÃO se for certificada no Programa OEA, tiver patrimônio líquido maior ou igual a R$ 1 milhão (ou maior ou igual aos tributos suspensos), optar pelo DTE, manter escrituração contábil digital e estar em regularidade fiscal (federal, estadual e municipal). A suspensão vira alíquota zero após a exportação efetiva. Se não exportar em 180 dias, redestinar ao mercado interno, industrializar ou houver perda do bem, a ECE recolhe os tributos suspensos com multa e juros. Há suspensão equivalente na compra de produto agropecuário por industrial exportador (mais de 50% da receita vinda de exportação nos 3 anos anteriores).

## 13. Imposto Seletivo (IS), art. 153, VIII, da CF
Imposto FEDERAL, MONOFÁSICO (por ser monofásico, é VEDADO o aproveitamento de crédito), extrafiscal (regulatório, "imposto do pecado"/sin tax), apuração mensal, arrecadação compartilhada com Estados, Municípios e DF. Incide sobre produção, extração, comercialização e importação dos bens e serviços listados no Anexo XVII da LC 214/2025 (por NCM/SH):
- veículos automotores, AERONAVES e EMBARCAÇÕES;
- produtos fumígenos (tabaco);
- bebidas alcoólicas e bebidas AÇUCARADAS;
- bens minerais (em especial os de alto impacto ambiental);
- serviços de concursos de prognósticos e fantasy sports.
NÃO incide sobre energia elétrica e serviços de telecomunicação, nem sobre bens/serviços com alíquota reduzida. Alíquotas por lei ordinária, podendo ser ad valorem, específicas, graduadas (por critério ambiental/social) ou progressivas (bebidas alcoólicas e fumígenos).
Leitura para adequação: o IS é muito mais amplo que o antigo IPI seletivo, atingindo indústria de veículos, mineração, bebidas (inclusive açucaradas) e fumo. Quem produz/comercializa esses itens ganha nova carga e, por ser monofásico, não credita.

## 14. Simples Nacional (impacto competitivo)
O optante pode recolher IBS/CBS POR DENTRO do regime único (DAS) ou POR FORA (regime regular):
- Por dentro: NÃO se apropria de créditos de IBS/CBS e transfere ao adquirente um crédito menor (equivalente só ao cobrado no DAS).
- Por fora (regime regular): apura IBS/CBS normalmente, gera e transfere crédito cheio.
Efeito competitivo: um adquirente no Lucro Real que compra de optante do Simples "por dentro" credita-se menos. No exemplo do CFC, numa venda de R$ 1.000, o crédito do adquirente cai de cerca de R$ 97,50 para cerca de R$ 12 (queda de cerca de R$ 85,50), reduzindo a atratividade comercial da empresa do Simples em vendas B2B. A decisão "por dentro vs. por fora" é ESTRATÉGICA e depende do perfil dos clientes (B2B Lucro Real x B2C). Os benefícios de bens de capital (suspensão/alíquota zero) só alcançam o Simples no regime regular.

## 15. Fornecedores estrangeiros e plataformas digitais (arts. 22, 23 e 72)
Se o consumo ocorre no Brasil, há incidência (princípio do destino), mesmo que o fornecedor esteja no exterior. Na importação de bens imateriais e serviços, o contribuinte é o ADQUIRENTE nacional; o fornecedor estrangeiro e a plataforma digital são responsáveis solidários e devem se inscrever no IBS/CBS. Plataformas digitais (que controlam cobrança, pagamento, definição de termos ou entrega) respondem solidariamente ou em substituição ao fornecedor e devem informar as operações e os dados para o split payment.

## 16. Zona Franca de Manaus, ZFM (arts. 439 a 457)
O diferencial competitivo da ZFM foi preservado (ADCT 92-B), inclusive mantendo o IPI com alíquota não zero para produtos que tenham similar fabricado na ZFM. A LC 214/2025 traz um conjunto detalhado de créditos presumidos de IBS/CBS, suspensões que se convertem em isenção e alíquotas zero, com percentuais que variam por tipo de bem (consumo final, capital, intermediário, informática) e por região de origem. Relevante para deals com operação, insumos ou industrialização na ZFM.

## 17. Transição 2026 a 2033 (convívio de dois sistemas)
- **2026**: cobrança-teste. Destaque de CBS 0,9% e IBS 0,1% na nota fiscal, compensável com PIS/Cofins, sem recolhimento efetivo se cumpridas as obrigações acessórias.
- **2027**: extinção de PIS e Cofins; CBS em alíquota plena; IPI a zero (exceto ZFM); entra em vigor o Imposto Seletivo; IBS permanece em 0,1%.
- **2029 a 2032**: ICMS e ISS reduzidos em 1/10 ao ano (e os benefícios/incentivos fiscais na mesma proporção), enquanto o IBS sobe proporcionalmente.
- **2033**: extinção total de ICMS, ISS e IPI; vigora apenas CBS, IBS e Imposto Seletivo.
Custo de transição: por cerca de 7 anos a empresa opera os DOIS regimes em paralelo (apuração dupla, dois conjuntos de créditos, atualização anual de alíquotas, revisão de contratos para cálculo "por fora", reprogramação de ERP). Os benefícios e incentivos de ICMS vão sendo extintos.

## 18. Sinais que afetam adequação, captação, valuation, M&A e crédito (uso analítico)
- Dependência de benefícios/incentivos de ICMS, que serão reduzidos de 2029 a 2032 e extintos em 2033 (risco de erosão de margem e de valuation apoiado em benefício temporário).
- Contratos longos com preço "por dentro" que cruzam a transição sem cláusula de repactuação tributária.
- Empresa do Simples vendendo B2B para Lucro Real (perda de crédito do adquirente, logo perda de competitividade).
- Exposição ao Imposto Seletivo (veículos, mineração, bebidas, açúcar, fumo): nova carga e ausência de crédito (monofásico).
- Modelo intensivo em capital ou exportador: oportunidade (crédito imediato de bens de capital, ressarcimento célere, imunidade de exportação), porém com necessidade de gestão de saldos credores e de adaptação ao split payment.
- Impacto no fluxo de caixa pelo split payment e pela troca do regime de créditos (crédito condicionado ao pagamento na cadeia).
- Prontidão de ERP, escrituração e documento fiscal eletrônico, e cadastro no IBS/CBS e DTE.

## Ressalva obrigatória
A EC 132/2023 e a LC 214/2025 já estão em vigor, mas pontos centrais (alíquotas de referência definitivas, anexos por NCM/SH, regimes específicos, regulamento do split payment e do ressarcimento) dependem de regulamento e atos infralegais do CGIBS e da RFB ainda em edição. A alíquota de 26,5% é estimativa oficial, sujeita a revisão. Qualquer diagnóstico é PRELIMINAR e deve ser revisto conforme a regulamentação evolui. NÃO constitui parecer jurídico-tributário.`
