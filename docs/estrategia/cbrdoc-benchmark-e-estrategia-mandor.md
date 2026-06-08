# CBRdoc: anatomia competitiva e plano de superação para o Mandor

> Documento de estratégia de produto. Data: 05/06/2026.
> Metodologia: pesquisa em 3 frentes (produto/jornada, API/integrações governamentais, mercado/IA/marca) sobre site, blog, central de suporte, imprensa e Reclame Aqui da CBRdoc.
> Ressalvas de honestidade: o domínio principal cbrdoc.com.br bloqueia coleta automatizada (HTTP 500/503), então parte do conteúdo veio de snippets indexados, blog e suporte. Números de cobertura (cartórios, municípios, tipos de documento) são inconsistentes entre páginas e devem ser lidos como ordem de grandeza, não dado auditado. Não há funding, valuation ou prêmios públicos da CBRdoc. A documentação da API é gated (só logado). O que é inferência está marcado.

---

# PARTE 1: O que é a CBRdoc, de verdade

## 1. Proposta de valor

A CBRdoc (Central Brasileira de Documentos) é uma camada de **infraestrutura de automação documental B2B**. Ela transforma um problema estruturalmente caótico no Brasil (obter certidões e documentos públicos pulverizados entre mais de 13 mil cartórios, 5.570 municípios, juntas comerciais, Receita, SEFAZ e tribunais) em um único ponto de pedido, rastreamento, recebimento e extração de dados.

A dor real que ela resolve não é "tirar uma certidão". É eliminar o trabalho operacional repetitivo, lento e auditável de grandes empresas que precisam de **volume** de documentos com **conformidade** (LGPD, prazos de validade, evidência de diligência). O cliente-núcleo declarado são instituições financeiras (cerca de metade da base seriam bancos, com clientes nomeados como Jive e ASA Investimentos), seguidos de escritórios de advocacia, incorporadoras, energia e contabilidade.

Leitura crítica: a CBRdoc deixou de ser "emissor self-service de certidões" e virou **plataforma de document operations enterprise**, com a originação de certidões funcionando como porta de entrada (aquisição) e a API + IA + diligências funcionando como expansão de receita.

## 2. Jornada do usuário

1. Cadastro gratuito, sem contrato nem setup.
2. Criação de múltiplos logins com níveis de permissão (estrutura de equipe).
3. "Fazer Pedido": seleciona o documento, informa os dados essenciais (CPF/CNPJ, dados do imóvel).
4. **Preço exibido antes da confirmação.** Esse é um detalhe de produto subestimado: remove a fricção de orçamento e a desconfiança.
5. Pagamento por créditos (pré-pago, contas menores) ou faturamento mensal (pós-pago, grandes contas).
6. A CBRdoc executa a obtenção junto ao órgão emissor.
7. Acompanhamento de status em tempo real no dashboard, com filtros e notificação por e-mail.
8. Recebimento digital/físico, centralizado em repositório com detecção de duplicatas.
9. Opcional: a IA extrai campos do documento e exporta para Excel; automações podem disparar novos pedidos com os dados extraídos.
10. Recorrência: re-emissão automática de certidões por periodicidade + alertas de vencimento.

O desenho da jornada tem três acertos que importam para o Mandor: **transparência de preço antes do commit**, **pedido em lote via planilha** e **recorrência automática** (o passo 10 é o que converte transação avulsa em receita recorrente).

## 3. Problemas que resolve

- Tempo: alegam reduzir em 80 a 90% o prazo de obtenção (número de marketing, não auditado).
- Pulverização: um ponto único para milhares de órgãos.
- Risco de compliance: certidão vencida gera penalidade; alertas e atualização automática mitigam.
- Dispersão interna: repositório central acaba com documentos espalhados entre setores.
- Escala: pedido em lote e API para quem processa milhares de documentos (citam teste de 9.000 notas em um dia).

## 4. Diferenciais competitivos

1. **Modelo sem fricção contratual**: sem mensalidade, sem setup, sem fidelidade, sem multa, pay-per-use. É a cunha anti-incumbente (contra concorrentes de assinatura) e reduz drasticamente o CAC e a barreira de primeira compra.
2. **Malha operacional de cartórios e órgãos**, construída ao longo de cerca de uma década, incluindo capilaridade física (a razão social inclui "Serviços de Malotes") onde não há canal digital.
3. **Camada de IA/OCR** sobre o documento, não só a emissão.
4. **API** que entrega certidões e dados extraídos direto no sistema do cliente, sem passar pela interface.
5. **Recorrência e monitoramento** como produto (re-emissão + alertas).

## 5. Funcionalidades core vs. complementares

**Core (o motor):**
- Solicitação e emissão de mais de 100 tipos de documentos de qualquer órgão público do país. A malha de cobertura é o ativo central.
- Pedido em lote via planilha.
- Kit de Documentos (conjunto reutilizável pré-configurado, posicionado para due diligence e M&A).
- Repositório central com deduplicação.
- Dashboard de rastreamento em tempo real.
- IA de extração (modelos pré-prontos ou campo + instrução em linguagem natural, export Excel).

**Complementar (suporte ao core):**
- API (diferencial enterprise, não core do usuário médio).
- Alertas de validade e atualização automática.
- Gestão multiusuário e centros de custo.
- Suporte multicanal.
- Blog/conteúdo (alavanca de SEO/aquisição, não funcionalidade).

## 6. Como a IA é usada (real vs. marketing)

**Real:** extração de campos de documentos em dois modos: "Modelo CBRdoc" (campos pré-definidos por tipo) e "Modelo Personalizado" (o usuário define o título do campo e dá uma instrução em linguagem natural). Saída em Excel. O padrão "campo + instrução em linguagem natural, sem treinar modelo" é assinatura de **LLM com prompting sobre OCR**, provavelmente OCR de prateleira (Document AI/Azure/Textract) + um LLM. Nenhuma fonte confirma fornecedor ou modelo proprietário.

**Marketing:** "due diligence automatizada com IA", "machine learning + NLP", "insights precisos". A IA entregue de fato é OCR + extração + sumarização; "due diligence por IA" é a aplicação desses blocos, não um motor autônomo de risco comprovado.

Conclusão crítica: **a IA da CBRdoc é replicável.** É tecnologia de prateleira. O moat dela não está na IA, está na malha operacional.

## 7. Integrações governamentais (arquitetura provável)

A cobertura abrange documentos cartorários, judiciais, fiscais, municipais, estaduais e federais. A arquitetura é quase certamente **híbrida**:
- **Canais oficiais eletrônicos** onde existem: registro de imóveis via ONR/RI Digital, atos notariais via e-Notariado (CNB), juntas via integrações estaduais, Receita/SEFAZ via emissão eletrônica. A CBRdoc atua como orquestradora desses canais.
- **RPA/robôs + diligência física/malote** onde não há canal eletrônico (a maioria dos cartórios). Isso explica os prazos variáveis e o componente logístico.

Atenção: a ligação CBRdoc x ONR/e-Notariado é inferência arquitetural, não parceria técnica documentada.

## 8. APIs próprias

Existe API REST em produção (o host api.cbrdoc.com.br responde a health-check). Permite "integração completa" para receber certidões e dados extraídos no sistema do cliente. Porém: **não há OpenAPI/Swagger público**, a documentação é gated (só logado), e **não há confirmação pública de webhooks**. Dado que o negócio é assíncrono (pedido leva horas/dias), a ausência de webhook documentado é o maior ponto cego, e possivelmente uma fraqueza real (polling em vez de callback).

## 9. Como transformam burocracia em fluxo automatizado

Pipeline: captura (UI/planilha/API) -> roteamento por órgão (decide canal eletrônico, RPA ou manual) -> acompanhamento de status -> recebimento -> OCR + extração por IA -> entrega/integração -> recorrência/monitoramento. O passo que "vira produto" é o último: a re-emissão automática por periodicidade transforma um ato pontual em assinatura de fato.

## 10. Barreiras de entrada (moats)

**Moats reais:**
- **Malha operacional de cartórios/órgãos** (a estimativa varia entre 15 e 22 mil), com capilaridade física. Não é software, é logística + relacionamento de uma década. É o mais difícil de copiar.
- **Cobertura de catálogo** (mais de 100 tipos x milhares de municípios): cada tipo novo exige RPA específico e manutenção contínua quando os portais mudam.
- **Volume de dados** (milhões de documentos) que alimenta extração e roteamento.
- **Lock-in de integração**: API + recorrência + centro de custo dentro do ERP do cliente cria custo de troca.

**Moats fracos e ameaças:**
- A **digitalização compulsória dos cartórios** (Provimentos do CNJ, ONR, e-Notariado, CNIB 2.0) erode a vantagem do malote físico. Conforme tudo vira central eletrônica, o acesso se comoditiza e o diferencial migra para UX, IA e preço.
- A **IA é replicável** (tecnologia de prateleira).
- **Atrito estrutural**: o Reclame Aqui mostra nota oscilando (cerca de 6,5 a 7,9), sem selo RA1000, com reclamações recorrentes de documento pago e não entregue, demora, reembolso difícil e sobrepreço (markup de conveniência). Esses atritos são estruturais ao modelo de intermediação: prazo e entrega ficam reféns do emissor terceiro.

## Os 3 motores de crescimento da CBRdoc (síntese)

1. **Motor de aquisição sem fricção**: cadastro grátis + preço transparente + sem contrato. Derruba a barreira da primeira compra. Land.
2. **Motor de recorrência**: monitoramento e re-emissão automática transformam transação em receita previsível. Expand.
3. **Motor de lock-in enterprise**: API + IA de extração + kits de due diligence embutidos no fluxo do cliente. Retain.

O moat defensável de longo prazo é **um só**: a malha operacional de acesso aos órgãos. Tudo o mais (IA, UX, API) é vantagem temporária e copiável. E esse único moat está sob erosão regulatória (cartório digital).

---

# PARTE 2: Estratégia para o Mandor virar referência absoluta do seu segmento

## Premissa: o Mandor NÃO está no segmento da CBRdoc

Isto é o ponto mais importante do documento. A CBRdoc automatiza a **obtenção de documentos**. O Mandor é a **rede cognitiva de originação, análise e estruturação de crédito e M&A** (a "mesa de crédito" como produto): ela lê o deal, diagnostica, estrutura, gera teaser e pitchbook, e conecta originadores a investidores via Invest Match.

Consequência estratégica dupla:
1. **A CBRdoc não é concorrente do Mandor. É um fornecedor potencial de camada.** O que para a CBRdoc é produto final (puxar matrícula, ônus, negativas, kit de M&A) é, para o Mandor, um **insumo** da etapa de due diligence e KYC. O Mandor pode consumir a API da CBRdoc (ou da Docket) em vez de reconstruir a malha de cartórios.
2. **O Mandor pode ter um moat que a CBRdoc nunca terá**: rede de dois lados (originadores x investidores), dataset proprietário de deals privados e o papel de padrão de mercado (o "selo Mandor"). A CBRdoc tem moat operacional sob erosão; o Mandor pode construir moat de rede e de dados, que se fortalece com o uso.

Portanto, "copiar a CBRdoc" não é copiar funcionalidades de certidão. É **copiar os três motores** (aquisição sem fricção, recorrência, lock-in) e aplicá-los ao negócio de crédito/M&A, onde o Mandor pode ir muito além.

## A. Funcionalidades a COPIAR (mecânica de crescimento)

1. **Preço transparente antes do commit.** A CBRdoc mostra o custo do pedido antes de confirmar. O Mandor deveria mostrar, antes de rodar uma análise, o custo estimado (já há instrumentação de custo de LLM via llm_usage_log e o painel /dashboard/admin/uso-llm). Transformar isso em "esta análise consome X créditos" remove a fricção e dá controle ao gestor.
2. **Entrada sem fricção contratual.** Permitir um primeiro deal analisado em modelo pay-per-use, sem contrato anual, com preço por análise visível. Isso ataca o CAC do mesmo jeito que a CBRdoc atacou. O modelo de assinatura de mesa vira upsell, não barreira de entrada.
3. **Pedido em lote.** A CBRdoc importa planilha para pedir N documentos. O Mandor deveria aceitar **ingestão em lote de deals** (uma carteira inteira de um FIDC ou de uma securitizadora analisada de uma vez), com fila e priorização. Isso é venda enterprise.
4. **Recorrência como produto (o motor que falta).** Este é o aprendizado mais valioso. A CBRdoc fatura recorrência re-emitindo certidões. O Mandor deveria faturar **monitoramento contínuo de deal e de carteira**: re-rating periódico, watch de covenants, alerta de deterioração de crédito, atualização de certidões e negativas das partes (aqui entra a API da CBRdoc). Uma análise hoje é um evento; deveria virar uma **assinatura de vigilância** sobre o ativo e o tomador.
5. **API própria com documentação pública e webhooks.** A CBRdoc tem API mas a esconde e não confirma webhooks. O Mandor deveria fazer o oposto: API documentada publicamente (OpenAPI), com webhooks de "análise concluída", "deal mudou de status", "match encontrado", para que mesas e fundos integrem o Mandor ao próprio fluxo. Webhook bem feito é o item onde o Mandor já nasce melhor que a CBRdoc.

## B. Funcionalidades a ADAPTAR ao mercado de crédito/M&A

1. **Kit de Due Diligence automatizado (adaptação do "Kit de Documentos").** A CBRdoc monta um kit de M&A com poucos dados. O Mandor deveria, ao abrir um deal, **montar e disparar automaticamente o kit documental de DD** (matrícula e ônus dos imóveis em garantia, negativas fiscais e trabalhistas das partes, certidões de protesto e falência, atos societários, quitação condominial), consumindo a API da CBRdoc/Docket. Hoje o Mandor tem os agentes de KYC & Compliance e Due Diligence Jurídica que **pedem** esses documentos ao usuário; eles deveriam **buscar sozinhos**.
2. **IA de extração aplicada a documentos do deal.** A extração de campos da CBRdoc, adaptada, vira: ler contrato social, escritura, contrato de garantia, alienação fiduciária e CPR, e popular o fact-bank automaticamente. O Mandor já tem fact-extraction; o ganho é alimentá-lo com documentos oficiais puxados das fontes, não só com o que o cliente sobe.
3. **Centro de custo / multi-escritório.** A CBRdoc agrupa pedidos por centro de custo. O Mandor já tem multi-escritório; deve expor relatório de consumo e rateio por escritório/cliente/deal, o que sustenta a venda enterprise para mesas grandes.
4. **Recorrência regulatória.** O módulo de Reforma Tributária já é opt-in premium. Adaptar a lógica de "alerta de validade" da CBRdoc: alertar quando uma mudança regulatória (LC 214, atos do BCB) impacta um deal já analisado. Re-análise disparada por mudança de lei é receita recorrente com altíssimo valor percebido.

## C. Funcionalidades INÉDITAS para superar a CBRdoc (onde o Mandor ganha de fato)

Aqui o Mandor não imita; cria moats que a CBRdoc estruturalmente não pode ter.

1. **Rede de dois lados como moat (Invest Match levado ao limite).** A CBRdoc é um fornecedor unilateral. O Mandor tem originadores **e** investidores. Cada deal analisado e cada tese de investidor cadastrada melhora o motor de matching para todos. Isso é efeito de rede: quanto mais deals e mais investidores, mais valioso para o próximo entrante, e mais caro de replicar. Este é o moat que a CBRdoc nunca terá.
2. **Benchmark proprietário de deals privados (o moat de dados).** Cada análise gera múltiplos, spreads, estruturas, taxas de aprovação e veredictos. Consolidados e anonimizados, viram um **índice de mercado privado** (o que um deal "deveria" custar/render por setor, porte e estrutura). Isso alimenta diretamente o norte estratégico de "padrão de mercado / selo Mandor": quem publica o benchmark define o padrão. A CBRdoc não tem acesso a esse dado; o Mandor gera por construção.
3. **Selo Mandor (governança neutra como produto).** Um deal "analisado e aprovado pelo Mandor" pode virar um selo que investidores reconhecem, reduzindo o custo de diligência do lado comprador. É o ativo de marca mais defensável: padrão de fato do mercado privado. Exige a muralha de governança entre originar e certificar (conflito já mapeado no norte estratégico).
4. **Deal room vivo e auditável.** Não um repositório estático (CBRdoc), mas uma sala de deal com trilha de auditoria, versionamento de fatos, e a cadeia de evidências de cada conclusão (o Mandor já tem fact-bank, coverage, consistency). Vender isso como o registro fiduciário do deal.
5. **Co-piloto de estruturação.** Em vez de só diagnosticar, sugerir e simular estruturas (cessão, FIDC, CRA/CRI, alienação fiduciária) com impacto em custo, risco e tributação, integrado ao módulo Reforma Tributária. A CBRdoc para no documento; o Mandor decide a operação.

## D. Integrações (públicas e privadas) que sustentam a estratégia

**Documentos e diligência (consumir, não construir):**
- API da CBRdoc ou da Docket para certidões e kits de DD. Decisão de "comprar em vez de construir" a malha de cartórios.
- ONR/RI Digital e e-Notariado para garantias imobiliárias e registro de atos.

**Dados de crédito e cadastrais:**
- Receita Federal (CND, situação cadastral CNPJ/CPF), SEFAZ, PGFN.
- Serasa/Boa Vista/Quod para score e negativações.
- Juntas comerciais para atos societários.
- TJ/tribunais para distribuição e processos.

**Mercado de capitais e crédito:**
- B3 e CVM (registros de FIDC, securitizadoras, debêntures, fundos).
- BCB (SCR/registro de operações, taxas, séries) e Open Finance (com consentimento, dados financeiros do tomador direto da fonte).
- Cartórios de registro de garantias e CNIB (indisponibilidade de bens).

**Saída/integração:**
- API + webhooks para ERPs e sistemas das mesas/fundos.
- Export para Excel/PDF/PPTX (já existe) e conectores para os CRMs dos clientes.

## E. Recursos de IA que geram vantagem competitiva

A IA da CBRdoc é OCR + extração. A do Mandor já é mais avançada (10 agentes especialistas, fact-bank, coverage, consistency, risk-correlation, mesa de revisão). Para abrir distância:
1. **Scoring de risco proprietário calibrado pelo benchmark interno** (não só o LLM opinando, mas ancorado no histórico de deals reais da própria base).
2. **Extração de covenants e cláusulas de risco** de contratos, com alerta automático de quebra.
3. **Detecção de anomalia em demonstrações financeiras** (inconsistência DRE x balancete x fluxo), alimentando o Diagnóstico Financeiro.
4. **Valuation assistido por comparáveis reais** da base (o Mandor já puxa CVM comps; somar o histórico interno).
5. **Veredicto explicável e auditável**: cada conclusão com a cadeia de fatos que a sustenta (diferencial fiduciário). O Mandor já caminha nisso; é o que a CBRdoc não tem.

A vantagem aqui não é "ter IA". É **ter IA ancorada em dados que só o Mandor possui** (deals privados, veredictos, matches). Isso é o que torna a IA um moat, e não um commodity.

## F. Fluxos automatizados que eliminam trabalho humano

Estado-alvo do deal "do zero ao investidor", com mínimo toque humano:
1. Intake do deal (upload ou ingestão em lote).
2. **Auto-pull documental**: KYC e DD disparam a API de certidões e montam o kit sozinhos.
3. Ingestão e fact-extraction automáticos (já existe server-side via Inngest).
4. Pipeline dos 10 agentes (já automatizado).
5. Coverage, consistency, risk-correlation e mesa de revisão (já existe).
6. Geração automática de teaser e pitchbook (já existe como step 13).
7. **Auto-matching** com investidores (Invest Match) e disparo de NDA/aproximação.
8. **Monitoramento contínuo** pós-deal (re-rating, covenants, certidões), com alerta humano só na exceção.

Os passos 2, 7 e 8 são os que faltam fechar para o fluxo ser de fato "humano só na exceção". O passo 8 é o que cria recorrência.

## G. Dashboards e indicadores estratégicos

- **Funil de originação**: deals em cada estágio, taxa de conversão, tempo por etapa, gargalos.
- **Risco de carteira**: distribuição de DRS, exposição por setor/tomador, deterioração no tempo.
- **Demanda do lado investidor**: heatmap de teses ativas, apetite por setor/ticket/estrutura (transforma o Invest Match em sinal de mercado).
- **Benchmark de mercado**: múltiplos, spreads e taxas de aprovação por setor/porte (vira produto vendável e o selo).
- **Consumo e unit economics**: custo de LLM por análise, margem por deal, rateio por escritório (já tem base no llm_usage_log e no painel de uso-llm).
- **Saúde operacional**: ingestões travadas, deals parados, SLA de análise (a fragilidade de ingestão já endereçada com onFailure + watchdog deve virar métrica visível).

## H. Oportunidades de monetização

1. **Pay-per-deal**: análise avulsa com preço transparente (motor de aquisição da CBRdoc).
2. **Assinatura de mesa**: volume mensal de análises + acesso aos módulos.
3. **Success fee**: percentual sobre deals fechados via Invest Match (monetiza a rede de dois lados; é a margem mais alta).
4. **Módulos premium**: Reforma Tributária (já existe), co-piloto de estruturação, due diligence documental automatizada (markup sobre a API da CBRdoc, exatamente o modelo dela).
5. **Assinatura de monitoramento**: vigilância contínua de deal/carteira (a recorrência que falta).
6. **Data/benchmark**: assinatura do índice de mercado privado para fundos e bancos (o moat de dados virando receita).
7. **API/white-label**: acesso programático para mesas e fundos integrarem o Mandor; white-label para escritórios.

## I. Roadmap de produto (12 meses)

**T1 (meses 1 a 3): fechar o fluxo e a recorrência.**
- API do Mandor documentada (OpenAPI) + webhooks de análise/deal/match.
- Auto-pull documental no KYC/DD via integração com CBRdoc ou Docket (comprar a malha, não construir).
- Preço/custo transparente por análise exposto ao gestor (em cima do llm_usage_log).
- MVP de monitoramento contínuo de deal (re-rating + alerta de vencimento de certidões).

**T2 (meses 4 a 6): rede e dados.**
- Invest Match com auto-matching e disparo de aproximação/NDA.
- Primeiro corte do benchmark proprietário (múltiplos/spreads anonimizados) em dashboard interno.
- Ingestão em lote de carteiras (venda enterprise).
- Extração de covenants e detecção de anomalia financeira.

**T3 (meses 7 a 9): padrão de mercado.**
- Selo Mandor v1 (com a muralha de governança originar x certificar).
- Benchmark publicado externamente como produto (assinatura de dados).
- Co-piloto de estruturação (simulação de estruturas + impacto tributário).
- Deal room auditável como entregável fiduciário.

**T4 (meses 10 a 12): escala e lock-in.**
- White-label/API enterprise para mesas e fundos.
- Monitoramento de carteira completo (covenants, re-rating, regulatório) como assinatura.
- Conectores para CRMs/ERPs dos clientes.
- Métricas de selo (quantos deals aprovados, taxa de fechamento dos deals com selo) para provar o padrão.

## J. O que torna o Mandor a referência absoluta (a tese de moat)

A CBRdoc ensinou os **mecanismos de crescimento** (aquisição sem fricção, recorrência, lock-in por integração), mas o moat dela é **operacional e está sob erosão regulatória**. O Mandor deve copiar os mecanismos e plantar moats de natureza superior:

1. **Efeito de rede de dois lados** (originadores x investidores): cada deal e cada tese aumentam o valor para todos. Isso não comoditiza com o tempo; fortalece.
2. **Dataset proprietário de deals privados**: a matéria-prima do benchmark e do scoring, que só o Mandor acumula por construção. Quanto mais roda, melhor decide, mais difícil de alcançar.
3. **Padrão de fato (selo Mandor)**: quem publica o método e o benchmark define o que é "um deal bem feito". Esse é o ativo mais defensável e o norte declarado da empresa.

Resumo de uma linha: **a CBRdoc vende acesso a documentos; o Mandor deve vender o julgamento confiável sobre um deal, e transformar esse julgamento no padrão que o mercado privado adota.** O primeiro é copiável e está sob erosão; o segundo, bem executado, é um moat que se aprofunda a cada deal.

## Riscos e ressalvas honestas

- **Não reconstruir a malha de cartórios.** Seria queimar capital competindo com CBRdoc/Docket no moat deles, que ainda por cima está sob erosão. Comprar via API.
- **O selo tem conflito de interesse embutido** (originar x certificar). Sem muralha de governança crível, o selo não tem valor. Isso já está mapeado e precisa de estrutura real, não só discurso.
- **A IA não é o diferencial sozinha.** É commodity. O diferencial é a IA ancorada nos dados proprietários. Investir no dado, não só no modelo.
- **Recorrência exige confiança operacional.** O motor de monitoramento só vende se a ingestão for robusta (a fragilidade "1 doc trava e o deal morre" já foi endereçada com onFailure + watchdog; isso precisa estar provado ao vivo antes de vender vigilância contínua).
