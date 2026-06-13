# Mapa Inteligente do Mercado — Relatório Executivo

> Módulo proprietário de inteligência de mercado para a plataforma Mandor.
> Avaliação de viabilidade de integração das fontes Coponto e ANBIMA Data.
> Documento 1 de 3. Ver também: [02 — Arquitetura e Dados](mapa-inteligente-mercado-02-arquitetura-e-dados.md) · [03 — Produto e Roadmap](mapa-inteligente-mercado-03-produto-e-roadmap.md).
>
> Data: 12/06/2026 · Status: proposta para decisão · Autor: time de produto Mandor

---

## 1. Sumário para a diretoria

A Mandor pode construir um painel proprietário de inteligência do mercado de capitais ("Mapa Inteligente do Mercado") com altíssimo valor para gestores, bancos, assessorias, family offices e escritórios de crédito estruturado. A oportunidade é real e diferenciada: hoje não existe um "PitchBook do crédito estruturado brasileiro" focado em originação.

Há, porém, uma decisão jurídica que precede qualquer linha de código e que define toda a arquitetura:

- **A base do produto deve ser construída sobre dados públicos abertos** (CVM Dados Abertos sob licença ODbL, Banco Central, B3, rankings públicos da ANBIMA). Essa camada pode ser capturada, estruturada, reprocessada e **redistribuída** dentro da Mandor com segurança, desde que com atribuição de fonte.
- **ANBIMA Feed (a API paga) e Coponto NÃO podem ser redistribuídos.** Os termos de uso da ANBIMA proíbem expressamente comercializar, publicar, distribuir, dar acesso, criar produtos derivados ou sublicenciar os dados acessados sem autorização escrita. Coponto é acesso contratado e seus painéis curados também não podem ser reexpostos. Esses serviços servem para **enriquecimento e validação internos**, não como conteúdo do painel ao usuário final — a menos que se negocie uma licença comercial de redistribuição.

Em uma frase: **construímos o ativo proprietário sobre dado aberto; usamos ANBIMA Feed e Coponto como inteligência interna e benchmark; e tratamos qualquer redistribuição de dado licenciado como uma decisão comercial/jurídica separada.**

**Recomendação:** aprovar um MVP de 8–10 semanas sobre dados abertos (CVM + BCB + B3), entregando busca, fichas de participantes e rankings proprietários. Em paralelo, iniciar conversa comercial com a ANBIMA sobre licença de redistribuição do Feed. Coponto entra como fonte de inspiração de UX e como camada de cruzamento privado para a equipe interna.

---

## 2. Mapeamento de dados por fonte

### 2.1 ANBIMA Data / ANBIMA Feed

Há dois produtos distintos sob o guarda-chuva ANBIMA, e a confusão entre eles é a maior fonte de erro neste tipo de projeto:

| | **ANBIMA Data** (`data.anbima.com.br`) | **ANBIMA Feed** (`feed.anbima.com.br`) |
|---|---|---|
| O que é | Portal web de consulta e documentos | Plataforma de APIs para integração em sistemas |
| Acesso | Navegação no site | REST/OpenAPI, OAuth2, Sandbox + Produção |
| Custo | Consulta pública (com áreas restritas) | Contratado por pacotes |
| Uso | Leitura humana | Integração máquina-a-máquina |

**Dados disponíveis (consolidados, atualização diária) — Fundos:**

- Mais de 16.000 fundos regulados (universo ICVM 555 / RCVM 175).
- Identificação: CNPJ, código ANBIMA (11 caracteres), nome comercial e legal, tipo (ETF, FIDC, FII, FIP, FIF, OFFSHORE, FIAGRO).
- **Prestadores de serviço** (o dado mais valioso para o nosso caso): Administrador, Gestor, Co-gestor, Distribuidor, Custodiante, Controladoria.
- Taxas: administração (fixa/escalonada), performance (múltiplas faixas), entrada/saída.
- Movimentação de cotas: aplicação mínima, prazos de resgate, volumes de aplicação/resgate.
- Classificação: categoria CVM, tipo ANBIMA (gestão ativa/passiva), 3 níveis de categorização, indicadores ESG.
- **Séries históricas diárias**: patrimônio líquido, captação, número de cotistas — até 5 anos por consulta.
- Regulamentos dos fundos.

**API de Fundos v2 (RCVM 175) — endpoints:**

- `/feed/fundos/v2/fundos` — lista paginada
- `/feed/fundos/v2/fundos/{codigo}` — detalhes completos
- `/feed/fundos/v2/fundos/{codigo}/historico` — alterações cadastrais
- `/feed/fundos/v2/fundos/{codigo}/serie-historica` — PL e cota
- `/feed/fundos/v2/fundos/instituicoes` — instituições prestadoras de serviço
- Endpoints de batch diário para carga cadastral e séries históricas

**Pacotes de Preços e Índices (Feed):** títulos públicos, títulos corporativos (debêntures), recebíveis imobiliários e do agronegócio (CRI/CRA), índices de mercado ANBIMA, e **preços de FIDC**.

- **Frequência:** diária (com atualizações ao longo do dia para batches).
- **Profundidade histórica:** séries de até 5 anos por consulta na API; o portal traz histórico do último ano em destaque.

### 2.2 Coponto — "Dashboard Mapa da Captação"

Coponto é, na origem, uma consultoria/formação em estruturação financeira ("Viver de Estruturação"; fundador com R$ 9 bi+ em operações estruturadas). O produto de dados é o **Dashboard Mapa da Captação**, que se posiciona como "o ponto de encontro de quem move o capital".

**O que mapeia (acesso contratado já existente):**

- **21 painéis** cobrindo **mais de 8.000 fontes** de crédito e investimento (Brasil e global).
- **Bancos** — carteiras PJ a partir de dados do Banco Central.
- **Gestoras de fundos** — ranking e detalhes.
- **Fundos** — FIDC, fundos imobiliários, fundos em geral.
- **Investidores alternativos** — aceleradoras, venture capital, family offices, investidores-anjo.
- **Plataformas** — equity crowdfunding reguladas.

**Filtros / segmentação:** modalidade de crédito, prazo, porte de empresa, setor (CNAE), região geográfica, instrumento financeiro (CCB, CRI, debêntures etc.), segmento e tipo de fundo.

**Dados exibidos:** patrimônio líquido, saldos de carteira, evolução histórica, composição de portfólio, rankings, deal flow imobiliário.

**Observação crítica:** Coponto **agrega dados públicos** (BCB, CVM, ANBIMA) com curadoria e visualização próprias. Não há indicação de API pública nem de exportação estruturada licenciada. O valor de Coponto para a Mandor é triplo: (a) **referência de UX** para o nosso painel; (b) **fonte de cruzamento privada** para a equipe interna de originação; (c) **prova de que o mesmo resultado é reconstruível a partir das fontes públicas que o alimentam** — que é o caminho legalmente limpo.

### 2.3 Fontes públicas que sustentam o produto proprietário

Esta é a camada que **podemos redistribuir** — e é mais rica do que parece:

| Fonte | O que traz | Licença / uso | Atualização |
|---|---|---|---|
| **CVM Dados Abertos** (`dados.cvm.gov.br`) | Cadastro de fundos (CNPJ, status, adequação RCVM 175), informe mensal de FIDC (classes, cotas, carteira), securitizadoras (CRI/CRA, demonstrações), ofertas públicas de distribuição, cadastro de regulados | **ODbL** — uso comercial e derivados permitidos com atribuição e *share-alike* | Ter–Sáb 08:00 |
| **Banco Central (BCB)** | IF.data (carteiras PJ por banco/modalidade), cadastro de instituições, dados SCR agregados | Dados abertos públicos | Mensal/trimestral |
| **B3** | Emissores, instrumentos listados, fundos listados (FII/FIAGRO/ETF), debêntures | Dados públicos / termos B3 | Diária |
| **ANBIMA — rankings públicos** | Rankings públicos de gestão, administração, distribuição (`anbima.com.br/.../ranking`) | Conteúdo público (atribuir fonte; não confundir com Feed) | Periódica |
| **Receita Federal (CNPJ)** | Razão social, QSA, situação cadastral, CNAE | Dados públicos (já usamos no auto-pull KYC via BrasilAPI) | Mensal |

---

## 3. Viabilidade técnica

### 3.1 Existem APIs oficiais?

- **ANBIMA Feed:** sim. REST sobre HTTP, especificação OpenAPI, autenticação OAuth2, ambientes Sandbox e Produção, aviso de novos dados via API. Integração madura — porém **paga e com restrição de redistribuição** (ver §4).
- **CVM Dados Abertos:** não há API REST transacional, mas há **arquivos estruturados (CSV/TXT) versionados e estáveis** via portal CKAN, ideais para ingestão batch. É a forma mais confiável e barata de carga.
- **BCB:** APIs e datasets abertos (IF.data, SGS, Olinda).
- **B3:** dados públicos via arquivos e algumas APIs; alguns conjuntos premium.
- **Coponto:** sem API pública identificada. Captura só seria possível por exportação manual (se permitida pelo contrato) — não recomendado como pipeline de produção.

### 3.2 Formas de ingestão viáveis

1. **Batch de arquivos abertos (recomendado para o MVP):** ETL agendado puxando CSVs da CVM/BCB/B3, normalizando para o nosso schema. Robusto, barato, redistribuível. Encaixa no stack atual (Supabase + Inngest cron — o mesmo padrão do watchdog de ingestão e do monitoramento de CNPJ já em produção).
2. **API ANBIMA Feed (enriquecimento interno / fase 2):** OAuth2 + sync diário para tabelas internas. **Só expor ao usuário final mediante licença de redistribuição.**
3. **Receita/CNPJ:** reaproveitar o auto-pull já existente (BrasilAPI com User-Agent explícito — ver gotchas conhecidos do projeto).

### 3.3 Encaixe no stack atual da Mandor

O módulo reaproveita a infraestrutura já provada do rr7x-portal:

- **Supabase (Postgres + RLS)** para o data warehouse de mercado e o catálogo de entidades.
- **Inngest cron** para ETLs agendados (mesmo padrão do `ingestionWatchdogFn */15` e do monitoramento contínuo de deals).
- **Next.js (App Router)** para as telas do painel, dentro de `app/dashboard`.
- **Camada de IA (callLLM + llm_usage_log)** para busca semântica, resumos de entidade e scores proprietários — com custo já observável no painel admin de uso de LLM.

Nenhuma tecnologia nova obrigatória no MVP. Postgres `pg_trgm`/full-text resolve a busca inicial; `pgvector` (busca semântica) e um grafo de relacionamentos entram na V2.

---

## 4. Riscos jurídicos e de licenciamento

> Esta seção deve ser validada com o jurídico antes do go-live. O resumo abaixo orienta a arquitetura.

| Fonte | Pode redistribuir no painel Mandor? | Condição |
|---|---|---|
| **CVM Dados Abertos** | ✅ Sim | Licença ODbL: uso comercial e derivados OK, **com atribuição** e cláusula *share-alike* (bancos de dados derivados públicos devem manter ODbL — relevante se algum dataset derivado for tornado público). |
| **BCB / B3 / Receita** | ✅ Sim (em regra) | Dados públicos; atribuir fonte; respeitar termos específicos de cada portal. |
| **ANBIMA — rankings públicos** | ⚠️ Com cuidado | Conteúdo público pode ser citado com fonte; **não** usar marca/logo ANBIMA sem autorização escrita. |
| **ANBIMA Feed (API paga)** | ❌ Não, sem licença | Termos proíbem comercializar, publicar, distribuir, dar acesso a terceiros, criar produtos derivados, fazer engenharia reversa ou sublicenciar. Obrigação de apagar os dados ao fim do contrato. Uso da marca proibido sem autorização. → **uso interno apenas**, ou negociar licença de redistribuição. |
| **Coponto** | ❌ Não | Acesso contratado; reexpor painéis/dados curados viola o contrato. → **referência de UX e cruzamento interno**. |

**Diretrizes de conformidade para o produto:**

1. **Atribuição de fonte sempre visível** ("Fonte: CVM Dados Abertos / BCB / B3") — inclusive como recurso de credibilidade institucional (área de logos das fontes, no design).
2. **Separação física de camadas:** tabelas de dado aberto (redistribuível) vs. tabelas de dado licenciado ANBIMA/Coponto (flag `redistribuivel=false`, nunca servidas à API pública do painel).
3. **LGPD:** dados de QSA/sócios são pessoais. Tratar com a mesma criptografia/criptografia de PII já usada no intake; expor só o que é público e necessário; respeitar finalidade.
4. **Logos de instituições pesquisadas:** uso nominativo/informativo é defensável, mas curar de fonte oficial e ter política de remoção sob pedido.
5. **Marca ANBIMA:** não usar logo/sinal ANBIMA no painel sem autorização escrita — mesmo que o dado de origem seja público.

---

## 5. Benchmark internacional

O objetivo não é copiar terminais de US$ 25k/ano, e sim **adaptar os mecanismos certos** para o nicho de crédito estruturado e originação brasileira.

| Plataforma | Foco | O que roubar (adaptar) para a Mandor |
|---|---|---|
| **PitchBook** (Morningstar) | Private capital: empresas, deals, fundos, LPs, **advisors e prestadores de serviço** | A ficha de "service providers" e o grafo deal↔fundo↔gestora↔assessor. É exatamente o nosso caso de uso de prestadores ANBIMA. |
| **Preqin** | Alternativos; inteligência de LPs, *dry powder*, fundraising | Indicadores de "capital disponível para alocar" e *fundraising tracker* — vira nosso "quem está captando / com apetite agora". |
| **Crunchbase** | Empresas e rodadas; busca acessível | Busca leve, perfis navegáveis, alertas e *freemium* — modelo de UX de entrada. |
| **Capital IQ** (S&P) | Financials profundos, screening | *Screening* multifator e comparáveis — base dos nossos filtros avançados e comparadores. |
| **Bloomberg / Refinitiv** | Terminais de mercado | Não competir; inspirar a densidade de informação por tela e os atalhos de poweruser. |
| **Dealogic** | League tables ECM/DCM | **League tables / rankings** por volume originado, por classe, por período — base dos nossos rankings proprietários. |

**Lacuna de mercado que a Mandor ocupa:** nenhuma dessas plataformas resolve, em português e com profundidade, o **ecossistema brasileiro de crédito estruturado e originação** (FIDCs, securitizadoras, escritórios de crédito estruturado, distribuidores, boutiques) conectado à esteira de análise de deals que a Mandor já tem. O "Mapa Inteligente do Mercado" não é um clone de PitchBook — é o **PitchBook do crédito estruturado brasileiro acoplado ao motor de originação (Invest Match)**.

---

## 6. Recomendação e próximos passos

1. **Aprovar o MVP sobre dados abertos** (CVM + BCB + B3 + Receita) — 8 a 10 semanas. Entregáveis: busca, catálogo de entidades, fichas, rankings proprietários. Zero risco de redistribuição. Detalhe em [03 — Produto e Roadmap](mapa-inteligente-mercado-03-produto-e-roadmap.md).
2. **Abrir negociação comercial com a ANBIMA** sobre licença de redistribuição do Feed (enriquecimento exibível ao usuário). Decisão de fase 2.
3. **Validar §4 com o jurídico** antes do go-live (ODbL share-alike, LGPD de QSA, uso de logos/marcas).
4. **Usar Coponto como referência de UX e cruzamento interno** da equipe de originação — não como pipeline de produção.
5. **Conectar ao Invest Match** desde o desenho: o Mapa alimenta o motor de matching (quem é o investidor/fundo certo para cada tese) e vice-versa — é o que torna o módulo único.

---

### Fontes consultadas

- ANBIMA Data — https://data.anbima.com.br/
- ANBIMA Developers (API de Fundos v2 / RCVM 175, Preços e Índices, FIDC) — https://developers.anbima.com.br/
- ANBIMA Feed — https://feed.anbima.com.br/ e https://www.anbima.com.br/pt_br/produtos-servicos/anbima-feed/anbima-feed.htm
- ANBIMA — Termos de uso ANBIMA Feed — https://www.anbima.com.br/pt_br/informar/termos-de-uso-anbima-feed-segmento-do-investidor.htm
- ANBIMA — Rankings públicos — https://www.anbima.com.br/pt_br/informar/ranking/fundos-de-investimento/fundos-de-investimento.htm
- Coponto — https://www.coponto.com.br/ e https://www.coponto.com.br/dashboard-mapa/
- CVM Dados Abertos (FI cadastro, FIDC, securitizadoras, ofertas) — https://dados.cvm.gov.br/
- PitchBook / Preqin / Crunchbase / Capital IQ — comparativos públicos de mercado
