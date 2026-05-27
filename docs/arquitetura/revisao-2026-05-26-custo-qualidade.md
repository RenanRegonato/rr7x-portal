# Revisão de Arquitetura: Custo, Qualidade e Padrão Institucional

> Data: 2026-05-26
> Escopo: pipeline de análise (ingestão, extração de fatos, agentes, risco, relatório) e módulo Invest Match.
> Origem: 10 melhorias propostas + visão de longo prazo (Mandor como padrão institucional do mercado privado brasileiro).

## 0. Princípio reitor (regra absoluta)

O objetivo NÃO é "baratear IA". O objetivo é **eliminar desperdício e processamento redundante**, trocando tarefas caras por mecanismos determinísticos mais confiáveis, e reservando modelo premium apenas onde ele agrega inteligência de verdade.

Regra inegociável que filtra toda decisão deste documento:

> Nenhuma otimização pode reduzir qualidade analítica, profundidade institucional, auditabilidade ou confiabilidade. Se houver dúvida, a otimização é rejeitada ou fica atrás de um mecanismo de prova (golden-set + métricas).

A consequência prática: **antes de cortar qualquer custo, precisamos de uma forma de provar que a qualidade não caiu.** Isso transforma o item "harness de avaliação" (seção 4) em pré-requisito, não em luxo.

## 1. Retrato do estado atual (verificado no código)

### 1.1 Ingestão e OCR
- OCR via Mistral `mistral-ocr-latest` ([lib/ingestion/mistral-ocr.ts](../../lib/ingestion/mistral-ocr.ts)). PDF nativo é tentado antes via `pdf-parse`; se o texto extraído tem `>= 200` chars, marca `ocr_provider='native'`, senão cai para Mistral ([process-document.ts:282-293](../../lib/ingestion/process-document.ts#L282-L293)).
- DOCX via `mammoth`, XLSX via `xlsx` (vira CSV por aba), imagens via Mistral base64, TXT/CSV/MD nativo.
- **Não existe confidence score de OCR** por página, tabela ou entidade. A única heurística de qualidade é o limiar de 200 chars. Não há `structured_tables` nem `parser_metadata` persistidos.

### 1.2 Chunking e embeddings
- Chunking heurístico de ~30k tokens com 8k de overlap ([chunker.ts](../../lib/ingestion/chunker.ts)).
- Embeddings Voyage `voyage-3-large` (1024 dim) em pgvector com índice HNSW cosine ([20260519_documents_chunks_pgvector.sql](../../supabase/migrations/20260519_documents_chunks_pgvector.sql)).
- **ACHADO CRÍTICO: o RAG está órfão.** `retrieveRelevantChunks` / `match_document_chunks` / `formatChunksForPrompt` existem em [rag-retrieval.ts](../../lib/ingestion/rag-retrieval.ts) mas **nenhum agente os chama**. Pagamos embeddings em 100% dos chunks e os agentes recebem texto integral via `drive_intake` + shared context. Construímos a infraestrutura de retrieval e não a ligamos.

### 1.3 Fatos (fact bank / truth layer)
- Estrutura de fato já é institucional: `fact_type`, `key`, `value` (JSONB), **`confidence` (0-1), `source_doc`, `source_page`, `source_quote`, `asserted_by`** ([truth-layer.ts:19-32](../../lib/truth-layer.ts#L19-L32), tabela `analise_facts` em [20260515_truth_layer.sql](../../supabase/migrations/20260515_truth_layer.sql)). Ou seja: **confidence + source tracking por fato já existem.**
- Filtragem de fatos por agente já existe (`RELEVANT_TYPES`, máx 150 fatos, ordenado por confidence) em [fact-bank-for-agent.ts](../../lib/fact-bank-for-agent.ts).
- **Extração é 100% LLM.** Haiku extrai fatos por chunk ([chunk-fact-extractor.ts](../../lib/ingestion/chunk-fact-extractor.ts)), Sonnet consolida em batches. Não há parser determinístico de CNPJ, data, moeda, EBITDA etc. na fase de extração. Regex só aparece na **validação** ([consistency-engine.ts:40](../../lib/consistency-engine.ts#L40)).

### 1.4 Cross-reading e claims
- **ACHADO: os claims estruturados já existem.** Agentes emitem JSON em bloco `<!--CLAIMS-START-->...<!--CLAIMS-END-->` ([claims.ts](../../lib/claims.ts)), persistido em `agent_claims`, com `fact_ids`, `benchmark_ids`, `confidence`.
- **Mas o cross-reading não usa os claims.** `CROSS_READING_DEPS` ([step/route.ts:36-47](../../app/api/analise/[id]/step/route.ts#L36-L47)) injeta o **texto narrativo COMPLETO** do agente upstream no prompt do downstream ("## OUTPUT DO AGENTE [STEP]"). É exatamente o ponto de maior consumo de tokens no pipeline caro (Sonnet).

### 1.5 Consistência e risco
- `consistency-engine.ts` já roda **5 checagens determinísticas sem IA** (número vs truth layer, número inter-agente, benchmark violado, lacuna citada, recomendação sem fonte). É a prova de que o padrão "determinístico primeiro" funciona aqui.
- **Sentinela (risco sistêmico) é 100% LLM.** Não há scorecard quantitativo, árvore de decisão ou trigger numérico. O DRS (Deal Readiness Score) também é calculado por IA, não por código.

### 1.6 Memória
- **Não existe memória cross-deal.** Cada `analises.id` é uma ilha. Sem entity graph de empresa/sócio/CNPJ, sem histórico, sem reaproveitamento. (O CRM de investidores do Invest Match é outra coisa.)

### 1.7 Modelos e providers
- Ponto central parcial: [lib/anthropic.ts](../../lib/anthropic.ts) define `MODEL` (sonnet-4-6) e `HAIKU_MODEL` (haiku-4-5). Roteador embrionário `modelForStep()` com `HAIKU_STEPS={orchestration, blind_teaser}` ([step/route.ts:23-26](../../app/api/analise/[id]/step/route.ts#L23-L26)).
- **Não há wrapper `callLLM()`.** São 12 pontos de chamada instanciando o client direto. Model IDs hardcoded em 8+ arquivos. Streaming nos 13 steps do route; extended thinking em `diagnostico`, `analise_ma`, `estruturacao`; prompt caching com trava de 4 blocos.
- Config: só `ANTHROPIC_API_KEY` no pipeline. Sem `OPENAI`/`GEMINI`. Já pagamos `MISTRAL` (OCR) e `VOYAGE` (embeddings).

## 2. Tese central: o eixo é o item #10 (fact-centric)

As 10 melhorias não são 10 projetos independentes. Elas são facetas de **uma única mudança de arquitetura**: sair de *document-centric* (jogar texto inteiro em cada agente) para *fact-centric* (extrair fatos confiáveis, ligá-los num grafo, calcular o que é calculável, e fazer a IA raciocinar sobre fatos, não sobre PDFs).

```
HOJE:   PDF -> texto integral -> cada agente relê tudo -> relatório
ALVO:   PDF -> fatos (determinístico + IA) -> grafo + regras -> claims -> IA raciocina sobre fatos
```

Essa mudança ataca os quatro objetivos ao mesmo tempo: menos tokens (custo), menos releitura/contradição (consistência), menos espaço para invenção (hallucination) e rastreabilidade nativa (auditabilidade). Por isso o sequenciamento abaixo organiza as 10 melhorias em torno dela, e não na ordem em que foram listadas.

## 3. Avaliação das 10 melhorias

Legenda: **Tipo** = custo / qualidade / ambos. **ROI** = retorno por esforço. **Risco** = risco à qualidade se mal feito.

| # | Melhoria | Já existe? | Gap real | Tipo | ROI | Risco | Esforço |
|---|----------|-----------|----------|------|-----|-------|---------|
| 10 | Fact-centric | Fatos e claims existem; arquitetura ainda é doc-centric | Ligar tudo (grafo, RAG, regras) e fazer agentes consumirem fatos, não texto | Ambos | Alto | Médio | Alto (guarda-chuva) |
| 2 | Extração híbrida determinística + IA | Extração 100% LLM; regex só na validação | Parsers de CNPJ/data/moeda/EBITDA + classificador pré-LLM | Ambos | **Muito alto** | Baixo | Médio |
| 8 | Risk engine determinístico | consistency-engine já é determinístico; sentinela 100% LLM | Scorecards, DSCR/alavancagem/concentração, triggers; IA vira intérprete | Ambos | **Muito alto** | Baixo | Médio |
| 5 | Cross-reading via claims | Claims já emitidos; cross-reading usa texto integral | Trocar injeção de narrativa por claims/scores filtrados | **Custo** | **Muito alto** | Baixo | Baixo-Médio |
| 6 | Modelo por criticidade | Roteador embrionário (2 steps Haiku) | Wrapper callLLM + roteamento por step + Gemini Flash nos operacionais | Custo | Alto | Médio | Médio |
| 4 | Profundidade adaptativa (3 tiers) | Pipeline é sempre completo | Classificador de complexidade + tiers | Custo | Alto | Médio-Alto | Médio |
| 7 | Memória institucional cross-deal | Não existe (cada deal é ilha) | Entity graph versionado, dedup, histórico | Qualidade (moat) | Alto (estratégico) | Médio | Alto |
| 9 | Self-consistency (2 baratos -> premium) | Não existe | Orquestração de voto + roteamento de divergência | Qualidade | Médio | Médio | Médio |
| 1 | OCR híbrido (Google Doc AI + Mistral fallback) | Mistral único; sem confidence | Doc AI principal, confidence por página/tabela, fallback | **Qualidade** (não custo) | Médio | Baixo | Médio-Alto |
| 3 | Embeddings locais (BGE-M3 etc.) | Voyage 1024d em pgvector/HNSW | Servir modelo local + reindexar tudo | Custo (marginal) | **Baixo** | Médio | Alto (infra) |

### Comentários por item

**#10 Fact-centric (guarda-chuva).** Correto e é a direção certa. Não é um item isolado: é o resultado de #2 + #5 + #7 + #8 bem feitos. Tratar como visão arquitetural, não como tarefa.

**#2 Extração determinística.** O maior ganho de custo+qualidade do conjunto. Hoje Haiku lê 37+ docs chunk a chunk só para extrair CNPJ, datas e valores que um parser resolve com 100% de precisão e custo zero. Parser determinístico é **mais auditável** que IA (a fonte é o regex + a citação literal), o que serve diretamente à visão. O classificador pré-LLM ("este chunk exige raciocínio semântico?") decide o que vai para IA. Meta de -60% de chamadas Haiku é realista. **Ressalva:** parser de português financeiro (R$ 2,3 mi, 1.234.567,89, datas pt-BR, CNPJ com/sem máscara) precisa de uma suíte de teste robusta; um parser errado é pior que IA.

**#8 Risk engine determinístico.** Casa com a visão: o "selo Mandor" exige risco **calculado e auditável**, não opinado. Métricas como DSCR, alavancagem (dívida/EBITDA), liquidez corrente, concentração de cliente, cobertura de garantia, descasamento de prazo são fórmulas. O código calcula o número e dispara triggers; a IA (sentinela) passa a **interpretar** o padrão combinatório, não a inventar a conta. Reduz hallucination de número de risco a zero. Aproveita o pattern já provado no consistency-engine.

**#5 Cross-reading via claims.** O ganho de custo mais barato de obter, porque o lado produtor já existe (`agent_claims`). Hoje `analise_ma` recebe os textos completos de `diagnostico` + `contratos` + `pesquisa`. Trocar por claims/scores/key-findings filtrados corta tokens dos steps Sonnet (os caros) sem perder coerência, desde que os claims sejam ricos o suficiente. **Ressalva:** validar que nenhum agente downstream perde nuance que só estava na narrativa. Fazer com golden-set antes de cravar.

**#6 Modelo por criticidade.** O lever óbvio de custo, mas com dois pré-requisitos: (a) o wrapper `callLLM()` (seção 4.1), senão vira gambiarra em 12 lugares; (b) golden-set para provar que Gemini Flash não degrada `coverage_validator`/`revisor`. **Ressalva importante de provider-switch:** mover steps Haiku para outro provider **perde o prompt caching da Anthropic**. O HUMANIZER_DIRECTIVE e o shared context são cacheados a 0.1x; sem cache equivalente, o "modelo mais barato" pode sair **mais caro** em steps que hoje têm alto cache-hit. Medir cache-hit por step antes de migrar (seção 4.3).

**#4 Profundidade adaptativa.** Bom, mas é o de maior risco à regra absoluta. O tiering só é seguro se **falhar para cima**: o default é o pipeline profundo, e só rebaixa quando o classificador tem alta confiança de que o deal é trivial. Nunca o contrário. Deal crítico classificado como leve por engano viola a regra inegociável. Sugestão: tier leve só para casos inequívocos (poucos docs, volume baixo, operação simples, zero conflito detectado) e sempre com carimbo no relatório ("analisado em profundidade Tier 1") para auditabilidade.

**#7 Memória institucional.** Este é o **moat**, não uma economia. Entity graph de empresa/sócio/CNPJ/garantia versionado transforma a Mandor de "ferramenta" em "instituição com memória". Permite detectar que o mesmo sócio apareceu em deal anterior com ressalva, reaproveitar fatos já validados (economia real em re-análises) e flagrar inconsistência histórica. Já temos a base: fatos com confidence + source. Precisa de tabelas de entidade persistentes + resolução de entidade (dedup semântico). Alinhado 100% com a visão de padrão de mercado.

**#9 Self-consistency.** Útil, mas com nuance de custo: rodar 2 modelos sempre **dobra** o custo desses steps. O valor aparece quando aplicado **seletivamente**: em campos verificáveis (números, classificações) onde divergência entre 2 baratos é sinal barato de "manda para o premium". Não usar em geração narrativa longa. Melhor ainda: para campos determinísticos, o "segundo modelo" é o **parser/regra** (#2/#8), não outro LLM. Ou seja, #9 é parcialmente subsumido por #2 e #8 onde houver verdade calculável.

**#1 OCR híbrido (Google Doc AI).** Reposicionar: **isto é qualidade/auditabilidade, não custo.** Mistral OCR já é barato; trocar por Google Doc AI não economiza, pode até custar mais. O ganho real é: confidence por página/tabela/entidade (auditabilidade, alinhado à visão), melhor extração tabular de balanços/DREs escaneados, e fallback inteligente. Vale fazer, mas vender como "qualidade documental + confidence score", não como corte de custo. O confidence de OCR alimenta o classificador do #2 (chunk de baixa confiança vai para revisão IA).

**#3 Embeddings locais.** O de **pior ROI do conjunto.** Voyage-3-large custa uma fração do que os LLMs custam; embeddings não são o gargalo financeiro. Servir BGE-M3/Qwen3 em produção exige GPU (Vercel serverless não roda isso; precisaria Modal/Replicate/HF Endpoint/box dedicado), e trocar embedding **obriga reindexar todos os chunks existentes** e validar que a qualidade de retrieval em português financeiro não caiu. Alto esforço, economia marginal, risco de qualidade. **Recomendação: adiar.** Só faz sentido depois de (a) medir que Voyage é material no custo total (provavelmente não é) e (b) o RAG estar de fato em uso (hoje está órfão). O benchmark proposto (precision@k/recall@k) é ótimo e deve ser construído de qualquer forma, mas para validar o RAG, não para justificar troca de embedding.

## 4. Sugestões agressivas além das 10

Estas não estavam na lista e, em vários casos, são pré-requisito para fazer as 10 com segurança.

### 4.1 Camada `callLLM()` com abstração de provider (PRÉ-REQUISITO de #6, #9)
Um único módulo `lib/llm/` que expõe `callLLM({ task, system, messages, stream, thinking })` e resolve internamente provider + modelo + features. Normaliza Anthropic (caching, thinking, streaming, vision) e Gemini/OpenAI atrás de uma interface. Sem isso, trocar provider é editar 12 arquivos e duplicar tratamento de streaming/erro. Mata também o débito do model ID hardcoded em 8 lugares.

### 4.2 Roteamento de modelo data-driven (não hardcoded)
Mover a escolha de modelo por step para configuração (estender a tabela `agent_prompts` com colunas `provider`/`model`/`thinking_budget`). Permite trocar modelo de um step **sem deploy**, fazer A/B e canary por escritório, e versionar a decisão. O `modelForStep()` vira leitura de config.

### 4.3 Harness de avaliação (golden-set) — O ITEM MAIS IMPORTANTE
Sem isto, **toda** otimização de custo é uma aposta cega contra a regra absoluta. Precisamos de:
- Um conjunto congelado de deals reais anonimizados (incluir o caso "Resort Campo Alegre" 37 docs e o deal vitrine "Cobalto") com outputs/fatos esperados.
- Score automático por análise: acurácia factual (fatos extraídos vs gabarito), taxa de hallucination (claims sem fonte), aderência de número (vs determinístico), cobertura, consistência inter-run.
- Rodar o harness antes/depois de **cada** mudança (troca de modelo, claims no cross-reading, tiering). Aprovação = custo cai e score não cai.
Este harness também é o que sustenta o discurso de "padrão institucional auditável": a Mandor consegue **provar** sua qualidade com números.

### 4.4 Observabilidade de custo e qualidade por step
Tabela `analise_step_metrics`: tokens in/out, custo, latência, cache-hit, provider/modelo, por step por análise. Hoje só rastreamos `model_id` em alguns lugares. "Não se otimiza o que não se mede." Isto também revela onde o custo realmente está (provavelmente os 3 steps com extended thinking + relatório + consolidação), evitando otimizar o lugar errado (ex.: embeddings).

### 4.5 Engine financeiro determinístico (núcleo de #8 e #2)
Módulo `lib/financeiro/` que, a partir dos fatos numéricos, calcula em código: DSCR, dívida líquida/EBITDA, margem, liquidez corrente, capital de giro, concentração de receita, cobertura de garantia, cronograma de amortização vs geração de caixa. Esses números viram fatos de primeira classe (com fórmula como source) e entram nos prompts já calculados. Reduz tokens (a IA não recalcula), elimina erro aritmético e é auditável por construção.

### 4.6 Ligar o RAG que já existe (quick win)
Antes de qualquer reindexação ou troca de embedding: **usar** `retrieveRelevantChunks`. Em vez de despejar o texto integral dos documentos nos agentes, recuperar só os trechos relevantes por step. Corte de tokens imediato nos steps caros, com a infraestrutura que já pagamos. É o primeiro passo concreto do fact-centric.

### 4.7 Deduplicação de documentos por hash (entra na #7)
Hash de conteúdo do arquivo: se o mesmo documento (ou empresa) já foi processado, reaproveitar extração/fatos. Economia direta em re-análises e em deals do mesmo grupo. Ponte natural para a memória institucional.

### 4.8 "Metodologia Mandor" versionada e carimbada (jogada institucional)
Versionar prompts + regras + benchmarks + scorecards como uma release de metodologia (`methodology_version`) e carimbar em cada análise: "analisado sob Metodologia Mandor v2.3". É o que torna o selo **auditável e defensável** ("este deal seguiu o padrão vigente"). Transforma melhorias técnicas em ativo institucional comunicável ao mercado.

### 4.9 Batch API da Anthropic nos steps assíncronos (corte de ~50% sem trocar provider)
A Batch API da Anthropic oferece 50% de desconto para trabalho não-realtime. A ingestão (`chunk_fact_extract` e `consolidate_fact_bank`) já roda assíncrona via Inngest e tolera latência de minutos: é candidata ideal. Corte de ~50% nesses steps sem trocar de provider nem perder uma vírgula de qualidade (mesmo modelo, mesmo prompt). Quando a #2 (extração determinística) reduzir o volume de chunks que vão à IA, o que sobrar pode ainda ir em batch. Combina com a Fase 1.

## 5. Sequenciamento em fases (com dependências)

A ordem segue: primeiro o que torna seguro cortar custo, depois os cortes de maior ROI e menor risco, depois o moat. Não segue a numeração original.

### Fase 0 — Fundação de segurança (sem ela, nada é seguro)
- 4.3 Harness de avaliação (golden-set) + métricas de qualidade.
- 4.4 Observabilidade de custo/tokens/cache por step.
- 4.1 Camada `callLLM()` + 4.2 roteamento data-driven.
- Resolver débito: model ID hardcoded; `chunk-fact-extractor.ts:3` importando de `lib/anthropic.ts`.
- **Resultado:** sabemos quanto cada step custa e temos como provar que qualidade não caiu.

### Fase 1 — Ganhos determinísticos (custo + qualidade, baixo risco)
- #2 Extração determinística + classificador pré-LLM (parsers pt-BR financeiros com suíte de teste).
- 4.5 Engine financeiro determinístico.
- #8 Risk engine determinístico (scorecards + triggers; sentinela vira intérprete).
- **Resultado:** menos chamadas Haiku, números auditáveis, risco calculado. Tudo a favor da visão.

### Fase 2 — Estrutura de tokens (fact-centric na prática)
- 4.6 Ligar o RAG (texto relevante, não integral).
- #5 Cross-reading via claims em vez de narrativa completa.
- Consolidar como #10 fact-centric.
- **Resultado:** corte de tokens nos steps Sonnet caros, validado por golden-set.

### Fase 3 — Roteamento e adaptação
- #6 Modelo por criticidade (Gemini Flash nos operacionais, medindo cache-hit perdido).
- #4 Profundidade adaptativa (tiers que falham para cima).
- #9 Self-consistency seletivo (só onde não houver verdade determinística).

### Fase 4 — Moat institucional
- #7 Memória institucional / entity graph cross-deal + 4.7 dedup por hash.
- 4.8 Metodologia versionada e carimbada.
- #1 OCR híbrido com confidence (vendido como qualidade/auditabilidade).

### Adiado / condicional
- #3 Embeddings locais: só reavaliar após Fase 0 mostrar que Voyage é material e o RAG estar em uso.

## 6. Riscos e ressalvas transversais

1. **Provider-switch x prompt caching:** medir cache-hit por step antes de migrar; um step com alto cache-hit pode ficar mais caro fora da Anthropic.
2. **Tiering só falha para cima:** default profundo; rebaixa só com alta confiança. Carimbar o tier no relatório.
3. **Parser determinístico precisa de teste:** um regex de moeda/CNPJ errado é pior que IA. Suíte de teste é parte do entregável, não opcional.
4. **Self-consistency pode dobrar custo:** usar seletivamente; preferir parser/regra como "segundo voto" onde houver verdade calculável.
5. **Embeddings locais exigem infra GPU:** Vercel serverless não serve; reindexação total é obrigatória.
6. **Tudo passa pelo golden-set:** nenhuma troca vai para produção sem custo-cai-e-qualidade-não-cai comprovado.

## 7. Próximo passo de decisão

A recomendação é começar pela **Fase 0** (fundação de segurança), porque ela é o que permite atacar tudo o mais sem violar a regra absoluta, e porque a observabilidade provavelmente vai mostrar que o custo está concentrado em poucos steps (os 3 com extended thinking + relatório + consolidação), o que pode reordenar as prioridades com base em dados reais.

Decisão pendente do Renan: aprovar este sequenciamento ou priorizar um item específico primeiro.
