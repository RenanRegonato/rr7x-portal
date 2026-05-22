# Inteligência da Plataforma Mandor

**Documento técnico completo** · Maio/2026
Plataforma de análise institucional e originação de deals — RR7x Capital Hub
www.mandor.com.br

---

## Sumário executivo

A Mandor é uma plataforma de **análise institucional de operações** (crédito estruturado, M&A e captação) construída sobre um time de **agentes de IA auditáveis**. A tese central de engenharia é simples e exigente: *uma análise institucional não pode alucinar*. Por isso a inteligência da plataforma não é "um modelo respondendo perguntas" — é uma **arquitetura em camadas** que lê 100% da documentação, extrai fatos rastreáveis, raciocina em múltiplos agentes especializados, e submete tudo a verificações determinísticas antes de qualquer conclusão chegar ao usuário.

Este documento descreve, de ponta a ponta, **toda a inteligência da plataforma**: a ingestão de documentos, o time de agentes, as camadas de confiabilidade que previnem erros, o controle humano sobre o processo, o motor de originação InvestMatch e a economia de custo que torna tudo viável.

**Princípios de design:**
1. **Confiabilidade acima de fluência** — preferimos uma análise que admite uma lacuna a uma que inventa um número.
2. **Tudo rastreável** — cada afirmação crítica aponta para o documento, a página e a citação que a sustentam.
3. **Decisão final humana** — a IA estrutura, evidencia e alerta; o assessor decide.
4. **Custo sob controle** — leitura integral dos documentos sem explosão de custo, via cache, modelos certos para cada tarefa e processamento assíncrono.

---

## Parte I — Visão geral da arquitetura

O ciclo completo de uma análise percorre seis estágios:

1. **Ingestão inteligente** — documentos são lidos integralmente (incluindo PDFs escaneados via OCR), fatiados, indexados semanticamente e convertidos em **fatos estruturados**.
2. **Consolidação de fatos** — os fatos de todos os documentos são deduplicados, padronizados e checados por conflito, formando o *fact bank* — a base de verdade da análise.
3. **Análise multiagente** — 14 agentes especializados raciocinam em ondas, lendo as saídas uns dos outros.
4. **Verificação de confiabilidade** — Truth Layer, benchmarks, claims, motor de consistência, sentinela de riscos, mesa consolidadora e validador de cobertura.
5. **Controle humano** — regeneração assistida com revisor de IA, cascata de impacto e auditoria completa.
6. **Originação (InvestMatch)** — a análise vira uma tese viva que é cruzada com a base de investidores.

### Os dois cérebros: Sonnet 4.6 e Haiku 4.5

A plataforma usa dois modelos Claude, cada um onde rende mais:

| Modelo | ID | Usado para |
|---|---|---|
| **Claude Sonnet 4.6** | `claude-sonnet-4-6` | Raciocínio financeiro profundo: orquestração, pesquisa, diagnóstico, M&A, estruturação, maturidade, consolidação de fatos, mesa, sentinela, juiz de matching |
| **Claude Haiku 4.5** | `claude-haiku-4-5-20251001` | Tarefas estruturadas e de alto volume: extração de fatos por trecho, validação de cobertura, revisor de regeneração, detetive de dependências |

**Extended Thinking** (raciocínio estendido, orçamento de 8.000 tokens) é ativado nos três passos mais analíticos: **diagnóstico**, **análise M&A** e **estruturação**.

### Prompt caching — o que torna o custo viável

Blocos de instrução estáveis (a diretriz de escrita, a camada de verdade, os benchmarks, a diretriz de claims) são marcados com cache de 1 hora. A primeira chamada "escreve" o cache; as seguintes o "leem" a ~10% do custo. Como o pipeline de uma análise leva de 10 a 20 minutos, o cache permanece quente do início ao fim — e várias análises no mesmo período compartilham o mesmo cache.

---

## Parte II — Ingestão inteligente de documentos

O maior risco de custo e de erro está na entrada: dossiês com dezenas de documentos e centenas de páginas. A Mandor resolve isso com um **pipeline assíncrono map-reduce** orquestrado por **Inngest**, que lê **100% dos documentos** sem truncar conteúdo.

### Fluxo

1. **Disparo** (`POST /api/analise/[id]/ingest`) — lista os arquivos do storage (até 200 por análise), cria um registro por documento e dispara **N eventos paralelos** (um por documento). A resposta é imediata; o trabalho roda em segundo plano.
2. **Processamento por documento** (até **4 documentos simultâneos**, com 3 tentativas automáticas):
   - **Extração de texto** conforme o tipo: PDF nativo (camada de texto), **OCR Mistral** (`mistral-ocr-latest`) para PDFs escaneados e imagens, Mammoth para DOCX, XLSX para planilhas, UTF-8 para texto.
   - **Chunking semântico** — alvo de ~30 mil tokens por trecho, com sobreposição de ~2 mil tokens para preservar contexto, quebrando em fronteiras naturais (parágrafo, frase).
   - **Embeddings** — cada trecho é vetorizado com **voyage-3-large (1.024 dimensões)**, modelo multilíngue otimizado para português, armazenado em **pgvector** com índice **HNSW** (m=16, ef_construction=64).
   - **Extração de fatos por trecho** — **Claude Haiku 4.5** converte cada trecho em fatos estruturados em JSON (temperatura 0), com tipo, chave, valor, citação literal, página e confiança.
3. **Consolidação** — quando todos os documentos terminam, o **Consolidador (Claude Sonnet 4.6)** processa os fatos em **lotes de 40 por tipo**, deduplicando entradas idênticas, padronizando unidades (ex.: "R$ 2,3 mi" e "2.300.000 BRL" viram um único valor canônico em BRL) e **marcando conflitos** entre documentos.
4. **Fact bank** — o resultado consolidado é gravado na análise (~30 mil tokens compactos), substituindo a releitura bruta de centenas de páginas.

### Detecção de conflitos entre documentos

Na consolidação, valores divergentes para o mesmo fato (ex.: data de fundação 1990 em um documento e 1995 em outro) geram uma entrada com `status = conflict`, preservando **todas as variantes com suas fontes** e reduzindo a confiança ao mínimo entre elas. Em um teste real (38 documentos, 29,7 MB), o pipeline extraiu 340 fatos brutos, consolidou em 86 (75% de deduplicação) e detectou **7 conflitos cross-documento** automaticamente — divergências de datas de CNPJ, áreas de imóvel e endereços de sede.

### RAG sob demanda

Quando um agente precisa de um detalhe específico, ele não relê os PDFs: faz uma busca semântica (`match_document_chunks`) que devolve os trechos mais relevantes por similaridade de cosseno (padrão: 8 trechos, similaridade mínima 0,4). Leitura cirúrgica, custo mínimo.

---

## Parte III — O time de agentes de análise

O núcleo da plataforma é um time de **14 agentes especializados**, cada um com um papel definido e um prompt versionado e editável (sem necessidade de deploy) pela administração.

| # | Agente (apelido) | Papel |
|---|---|---|
| 0 | **Ingestão de Dados** | Lê os documentos e produz um diagnóstico documental (o que foi lido, qualidade, lacunas). |
| 1 | **Orquestrador** (Otto Orquestra) | Calcula o Deal Readiness Score (DRS), diagnostica aptidão inicial e mapeia riscos. |
| 2 | **Pesquisa** (Pedro Panorama) | Inteligência de mercado: benchmarks setoriais, múltiplos de transação, posição competitiva, timing. |
| 3 | **Diagnóstico** (Davi Diagnóstico) | Saúde financeira: demonstrações, normalização de EBITDA, valuation preliminar, estrutura de capital. |
| 4 | **KYC & Compliance** (Carmen Compliance) | Screening regulatório, KYC de sócios/PEP, red flags e conformidade CADE. |
| 5 | **Contratos** (Clara Cláusula) | Riscos jurídicos, estrutura societária, passivos contingentes, contratos críticos. |
| 6 | **Arquiteto M&A** (Arthur Aquisição) | Tese de M&A, compradores estratégicos, estrutura da transação e negociação. |
| 7 | **Originação** (Victor Valor) | Posicionamento comercial, perfil de comprador-alvo e pipeline de originação. |
| 8 | **Estruturação** (Estela Estrutura) | Operações de capital e crédito estruturado adequadas (FIDC, CRI, debêntures, PE). |
| 9 | **Maturidade** (Paulo Preparo) | Veredicto de maturidade (Apto / Apto com ajustes / Não apto) e roadmap de preparação. |
| 10 | **Revisão** (legado) | Coerência narrativa entre agentes — hoje incorporado ao relatório consolidado. |
| 11 | **Blind Teaser** | Documento anônimo de 1-2 páginas, padrão ANBIMA, para distribuição inicial. |
| 12 | **Sell-Side Pitchbook** | Information Memorandum completo (pós-NDA), padrão ANBIMA/ICVM. |
| 13 | **Relatório Consolidado** | Síntese cross-dimensional, contradições, bloqueantes e recomendação executiva. |

### Execução em ondas

Os agentes não rodam em fila linear — rodam em **ondas**, com paralelismo onde é seguro:

- **Onda 1** — Ingestão → Orquestração (sequencial; formam o contexto compartilhado e cacheado).
- **Onda 2** — Pesquisa, Diagnóstico, KYC, Contratos, M&A, Originação, Estruturação (**em paralelo**).
- **Onda 3** — Maturidade (lê tudo o que veio antes).
- **Onda 4** — Blind Teaser + Pitchbook (em paralelo).
- **Onda 5** — Relatório Consolidado.

### Leitura cruzada (cross-reading)

Para conectar riscos entre dimensões, agentes da Onda 2 leem as saídas uns dos outros segundo um mapa de dependências:

- **Análise M&A** lê: Diagnóstico, Contratos, Pesquisa.
- **Estruturação** lê: Diagnóstico, Pesquisa.
- **Originação** lê: Pesquisa, Diagnóstico, Contratos.
- **Maturidade** lê: todas as saídas anteriores.

### Estilo institucional

Uma diretriz de escrita compartilhada por todos os agentes (cacheada para custo zero recorrente) proíbe linguagem de "IA genérica" (palavras-clichê, hedging excessivo, emojis) e exige terminologia financeira técnica, posição clara quando os dados sustentam e foco no "porquê", não no "o quê".

---

## Parte IV — Arquitetura de confiabilidade

Esta é a camada que diferencia a Mandor de uma "IA genérica". São sete mecanismos que, juntos, tornam a análise auditável e resistente a alucinação.

### 1. Truth Layer (camada de verdade)

Os fatos extraídos dos documentos são consolidados e **injetados como verdade absoluta** no prompt de todos os agentes (exceto o de ingestão, que é a fonte). São oito tipos de fato: documento disponível, número financeiro, estrutura societária, contrato, garantia, passivo, evento relevante e **lacuna** (o que era esperado e não foi encontrado).

Cada fato carrega `source_doc`, `source_page`, `source_quote` e `confidence` (0–1). E há **regras absolutas** codificadas (chamadas internamente de *ERRO_FATO*):

- Afirmar que um documento está ausente quando ele consta no fact bank → erro.
- Citar um número financeiro diferente do consolidado sem justificar com nova fonte → erro.
- Recomendar uma ação que depende de documento ausente sem sinalizar a lacuna → erro.

### 2. Benchmark Registry (parâmetros de mercado)

Um registro versionado de parâmetros de referência por instrumento — **FIDC, CRI, CRA, CCB, debêntures, M&A e crédito bancário** — com faixas (mín/máx), unidade e fonte (ex.: ticket mínimo de FIDC, múltiplos EV/EBITDA setoriais, cobertura de juros). É injetado nos agentes de estruturação, M&A, pesquisa, originação e maturidade.

A função de **elegibilidade** bloqueia recomendações impossíveis: sugerir um FIDC para um ticket abaixo do mínimo viável gera uma violação. Cada escritório pode **sobrescrever** benchmarks globais para a própria realidade (com trava de versão para evitar edições simultâneas conflitantes) — o override vence o global apenas no parâmetro alterado.

### 3. Structured Claims (afirmações auditáveis)

Ao final de cada análise, **10 agentes** emitem um bloco invisível de "claims": cada afirmação crítica é declarada com tipo (número, fato, recomendação, risco, avaliação), os fatos e benchmarks que a sustentam, uma citação opcional e um nível de confiança. O bloco é removido do texto final e **persistido** para auditoria — é a matéria-prima do motor de consistência.

### 4. Consistency Engine (motor de consistência)

**Determinístico — não usa IA.** Aplica regras concretas sobre os claims, com tolerância numérica de **1%**:

- **Número divergente** — claim que contradiz o fact bank.
- **Número entre agentes** — dois agentes citam o mesmo fato com valores diferentes.
- **Benchmark violado** — recomendação cujo número sai da faixa do benchmark citado.
- **Lacuna crítica** — conclusão apoiada em um fato do tipo "lacuna".
- **Recomendação sem fonte** — recomendação sem nenhum fato ou benchmark de respaldo.

As inconsistências são classificadas como **bloqueante** ou **alerta** e exibidas em painel próprio.

### 5. Sentinela de riscos

Um agente (Sonnet 4.6) que roda após todos os especialistas e busca **síndromes cross-dimensionais** — combinações de riscos que, isolados, parecem inofensivos, mas juntos formam um padrão sistêmico (ex.: covenant apertado + saída de sócio + caixa curto = distribuição disfarçada). Parcimonioso por design: aponta de 0 a 4 síndromes por deal.

### 6. Mesa Consolidadora

O **revisor final institucional**, no tom de um diretor de crédito sênior revisando o material que iria a comitê. Emite um veredito — **aprovado / aprovado com ressalvas / revisão necessária** — com diagnóstico final, pontos fortes e fracos, contradições detectadas e recomendação ao assessor.

### 7. Coverage Validator (validador de cobertura)

Garante que nada essencial ficou de fora. Há **checklists obrigatórios por tipo de operação**, detectado automaticamente a partir do objetivo do deal:

| Tipo de operação | Itens |
|---|---|
| FIDC | 12 |
| M&A (venda) | 10 |
| M&A (captação) | 8 |
| Crédito bancário | 8 |
| Geral (fallback) | 6 |

Cada item é avaliado como **coberto** (com profundidade e números), **parcial** (mencionado sem profundidade) ou **não coberto** — e, para os não cobertos, a plataforma indica qual agente é responsável e oferece regeneração dirigida.

### Dados regulatórios e de mercado

A análise é enriquecida com fontes oficiais em tempo real:

- **Banco Central (BCB)** — SELIC, IPCA, câmbio PTAX e PIB, injetados nos agentes de pesquisa e estruturação.
- **CVM** — emissões recentes de debêntures, CRI e CRA e empresas abertas comparáveis (cache de 24h), para benchmarking de mercado.
- **CADE** — verificação automática de obrigatoriedade de notificação concorrencial (Lei 12.529/2011): faturamento do grupo adquirente ≥ R$ 750 mi **e** do alvo ≥ R$ 75 mi. A análise classifica a operação em obrigatória / provável / não obrigatória e injeta o alerta no agente de KYC.

---

## Parte V — Controle humano: regeneração e cascata

A IA não tem a palavra final — o assessor tem. E o processo de revisão também é assistido por IA:

- **Regeneração assistida** — ao pedir para refazer um trecho da análise, o assessor escreve um briefing (o quê e por quê). O **Revisor** (Haiku 4.5, temperatura 0) avalia se o pedido faz sentido técnico antes de executar — mas, mesmo quando contra-argumenta, a decisão final é sempre humana (compatível com a ICVM 598/2018).
- **Cascata de impacto** — depois de refazer um trecho, o **Detetive de Dependências** compara as versões e identifica quais outros agentes ficaram inconsistentes, sugerindo (com severidade alta/média/baixa) o que reprocessar.
- **Auditoria** — cada passo executado é registrado com modelo, tokens, duração e contexto usado; cada regeneração guarda o briefing, o argumento da IA e os riscos apontados. A trilha completa fica disponível em painel administrativo.

---

## Parte VI — InvestMatch: originação inteligente

A análise consolidada não termina em um relatório — ela vira uma **tese viva** que é cruzada com a base de investidores do escritório. O InvestMatch é um motor de matching de **cinco camadas**.

### Da análise à tese

O construtor de tese (`thesis-builder`, Sonnet 4.6) combina **mapeamento determinístico** (números extraídos direto do fact bank: receita, EBITDA, capital buscado, valuation) com **extração por IA** dos campos narrativos (tese de investimento, proposta de valor, *moat* competitivo, narrativa de risco, história de saída) e de scores qualitativos (maturidade, governança, solidez operacional).

O `risk_overall_score` é determinístico: parte de uma base e soma penalidades por inconsistências bloqueantes/alertas, pelo veredito da mesa e por contradições semânticas. A tese recebe um **embedding voyage-3-large (1.024d)** que captura sua essência semântica.

### As cinco camadas

1. **Hard filter (SQL)** — exclusões categóricas: ticket fora da faixa, setor excluído, geografia incompatível, exigências de ESG/DD não atendidas.
2. **Score estruturado (SQL)** — média ponderada de 10 dimensões:

| Dimensão | Peso |
|---|---|
| Setorial | 0,20 |
| Ticket | 0,15 |
| Estágio | 0,10 |
| Maturidade | 0,10 |
| Governança | 0,10 |
| Risco | 0,10 |
| Documentação | 0,10 |
| Geografia | 0,05 |
| Horizonte de saída | 0,05 |
| Urgência | 0,05 |

3. **Busca semântica (pgvector)** — similaridade de cosseno entre os embeddings da tese e dos investidores (índice HNSW, similaridade mínima 0,3).
4. **Juiz de IA** (`match-judge`, Sonnet 4.6) — só os **20 melhores** candidatos do pré-ranking vão ao juiz, que produz: score de sinergia, resumo, pontos fortes, ressalvas, *talking points* para a primeira reunião, probabilidade de fechamento e uma **recomendação** (strong_match / review / **skip**). Um "skip" **descarta o match mesmo com score alto** — é a trava anti-falso-positivo.
5. **Score composto** — combina as camadas:
   - Com embedding: **0,50 estruturado + 0,20 semântico + 0,30 IA**.
   - Sem embedding: **0,65 estruturado + 0,35 IA** (renormalizado).

### Decisão

| Score final | Resultado |
|---|---|
| < 70 | Descartado (não persiste) |
| 70–84 | **Sugerido** — aguarda curadoria |
| ≥ 85 | **Aprovado automaticamente** |

(Um "skip" do juiz descarta independentemente do score.)

### Originação reversa

O motor roda também no sentido inverso — **do investidor para as teses** — com a mesma matemática e papéis trocados (versão `v2.0-reverse`), persistindo na mesma base de matches. Cadastrar um investidor com tese declarada dispara automaticamente a busca de oportunidades aderentes.

### Loop de feedback e calibração

Cada match gera aprendizado: avaliações manuais (muito bom → muito ruim) e *outcomes* automáticos (NDA, proposta, due diligence, fechado, abandonado). A plataforma mede a **conversão por faixa de score** e o **poder discriminativo** de cada dimensão (diferença entre a média dos sucessos e a dos fracassos) e **sugere** novos pesos — mas a recalibração é **manual e deliberada** (mistura 30% do dado novo com 70% do peso atual, e exige no mínimo 8 resultados), justamente para evitar overfitting com amostra pequena.

---

## Parte VII — Modelos, custo e infraestrutura

### Qual modelo faz o quê

| Tarefa | Modelo |
|---|---|
| Raciocínio analítico (agentes principais) | Claude Sonnet 4.6 |
| Consolidação de fatos | Claude Sonnet 4.6 |
| Sentinela, mesa, juiz de matching, construtor de tese | Claude Sonnet 4.6 |
| Extração de fatos por trecho | Claude Haiku 4.5 |
| Validador de cobertura, revisor, detetive | Claude Haiku 4.5 |
| OCR de documentos escaneados | Mistral OCR |
| Embeddings (RAG e matching) | voyage-3-large (1.024d) |

### Como o custo é controlado

A motivação foi concreta: uma análise antiga chegou a custar dezenas de dólares em um único dia por jogar o pipeline em *long-context* (preço dobrado) com cache que expirava antes de ser lido. A redesenho atacou isso em quatro frentes:

1. **Prompt caching de 1 hora** nos blocos estáveis — reduz drasticamente o custo de input recorrente.
2. **Modelo certo para cada tarefa** — Haiku (cerca de 3x mais barato) nas tarefas estruturadas de alto volume; Sonnet só onde há raciocínio.
3. **Batching** — fatos consolidados em lotes de 40; embeddings em lote; busca vetorial indexada (HNSW) em vez de varredura completa.
4. **Fact bank consolidado** — comprime centenas de páginas em ~30 mil tokens, evitando a releitura bruta dos documentos (a maior fonte de desperdício anterior).

### Stack

| Camada | Tecnologia |
|---|---|
| Aplicação | Next.js 16 (App Router), Tailwind v4 |
| Banco de dados | Supabase (PostgreSQL) + pgvector |
| Processamento assíncrono | Inngest |
| IA (raciocínio) | Anthropic Claude — Sonnet 4.6 e Haiku 4.5 |
| OCR | Mistral OCR |
| Embeddings | voyage-3-large (1.024 dimensões) |
| Pagamentos | Stripe |
| E-mail | Resend |
| Hospedagem | Vercel (produção em www.mandor.com.br) |

---

## Encerramento

A inteligência da Mandor não está em um único modelo, mas na **orquestração disciplinada** de muitos: agentes que se especializam e se leem, fatos que viajam rastreáveis do documento à conclusão, regras determinísticas que pegam o que a IA deixaria passar, e um motor de originação que transforma a análise em negócio. Tudo desenhado em torno de uma convicção: em finanças institucionais, **confiança não é um recurso — é o produto**.

*Documento gerado em 20/05/2026. Os parâmetros descritos (pesos, faixas, modelos) refletem a configuração de produção nesta data e evoluem com a calibração contínua da plataforma.*
