# Plano de medição: trocar Anthropic por Gemini Flash, sem perder qualidade

Data: 2026-05-27. Companheiro de `revisao-2026-05-26-custo-qualidade.md`.

Contexto: uma tabela externa (outra IA) propôs trocar várias camadas de Claude por
Gemini 2.5 Flash, com economias de 40 a 90%. A maior parte dessa economia vem de
trocas Anthropic to Gemini. Este documento define COMO decidir cada troca sem violar
a regra absoluta (nunca reduzir qualidade analítica, profundidade, auditabilidade
ou confiabilidade).

## Por que não basta olhar o preço de tabela

O preço de tabela do Gemini Flash é menor que o do Sonnet, mas o pipeline da Mandor
usa `cache_control` da Anthropic de forma pesada (system prompts, benchmarks). Leitura
de cache custa 0,1x do input. Um step com cache-hit alto já tem custo EFETIVO baixo,
e migrar para Gemini (que tem regras de caching diferentes) pode render pouco e ainda
arriscar qualidade. A comparação honesta é custo efetivo (pós-cache) da Anthropic
contra o custo real do Gemini, por step, não preço de tabela contra preço de tabela.

## Critério de aprovação (por step, não global)

Um step só migra para Gemini se as DUAS condições valerem ao mesmo tempo:

1. Custo efetivo cai com margem real, líquido de cache.
2. Qualidade não regride no golden-set, nem na média nem na cauda (pior caso).

Falhou uma, o step fica em Anthropic. Sem exceção.

## Pré-requisitos (bloqueiam o início)

- Tráfego real instrumentado. Em 2026-05-27 a `llm_usage_log` tem 1 linha (um teste
  mínimo). Sem pelo menos 1 deal real rodado ponta a ponta (idealmente 2 a 3 de perfis
  diferentes), não há baseline de custo. Este é o gargalo: o plano só começa quando
  entrar deal.
- Gabarito confiável. O atual (Resort_v2, em `eval/goldenset/`) é fraco (claims sem
  `fact_id`, qualidade questionável). Conclusões de qualidade ficam frágeis até curar
  um gabarito melhor. Pode valer priorizar isso antes da Fase C.

## Fase A: baseline de custo efetivo da Anthropic, por step

Sobre a `llm_usage_log`, agregar por `(context, step, model)`:

- cache-hit ratio = `cache_read_tokens / (cache_read_tokens + input_tokens)` (fração do
  input servida pelo cache).
- custo efetivo = somar `cost_usd` (o `lib/llm/pricing.ts` já aplica os multiplicadores:
  read 0,1x, write 2x no TTL 1h, output cheio).
- custo por análise (somar por `analise_id`) e ranking de steps por custo real.

Saída: onde o dinheiro realmente está. A leitura crítica é separar steps SUSTENTADOS
por cache (cache-hit alto, custo efetivo já baixo, migrar rende pouco) dos steps CAROS
de verdade (cache-hit baixo + muitos tokens, alvo legítimo). Queries-base em
`docs/arquitetura/queries-custo.sql`.

## Fase B: custo hipotético em Gemini sobre os MESMOS tokens (sem trocar nada)

Para cada step candidato, recalcular o custo com o preço do Gemini Flash usando os
tokens já medidos. Comparar:

- Anthropic com cache (real) contra Gemini sem cache (pior caso pró-Gemini) e contra
  Gemini com seu próprio context caching (melhor caso).
- Se nem no melhor caso o Gemini ganha com folga, descartar o step aqui (não chega na
  Fase C). É só planilha/SQL sobre dados existentes; filtra candidatos antes de gastar
  com A/B de qualidade.

## Fase C: A/B de qualidade no golden-set (só os sobreviventes de B)

Rodar o mesmo input (mesmo `fact_bank`/contexto) em Anthropic e Gemini, em shadow/replay
(sem afetar a análise do cliente), e comparar:

- Métricas objetivas onde dá: extração (precisão/recall contra CNPJs e valores
  conhecidos), validadores (concordância no checklist), agentes narrativos (cobertura de
  claims ancorados em `fact_id`, ausência de alucinação, fidelidade às fontes).
- Julgamento estruturado com rubrica onde for narrativa.
- Regra "falha pra cima": medir a cauda, não só a média. Se o Gemini erra em caso
  crítico, reprova mesmo com média boa.

## Fase D: gate de decisão, documentado

Aprova o step só se A+B+C baterem; grava o número (economia % e delta de qualidade)
neste diretório. Caso contrário, mantém Anthropic e registra o porquê.

## Ordem de ataque (menor risco para maior)

1. Validadores estruturados (coverage validator, revisor de regeneração): saída é
   checklist/JSON, concordância fácil de medir, baixo risco.
2. Cross-reading via claims: o ganho aqui é estrutural (menos tokens) e independe de
   trocar provider. Pode render mais que trocar de modelo, com risco menor. Medir
   separado.
3. Extração factual: a parte LLM que o determinístico (Fase 1, `lib/extract/`) não cobre.
4. Agentes operacionais Sonnet to Flash: só os de menor criticidade, e só se B+C passarem.

NUNCA migrar: diagnóstico profundo, estruturação financeira, sentinela de riscos e
match judge (classificados "Muito Alto"). Ficam em Sonnet.

## Armadilhas do próprio método

- 1 deal dá pouca estatística e o cache-hit muda muito entre a 1a chamada e as
  repetições; precisa de volume.
- Para rodar Gemini em shadow, o `lib/llm/call.ts` (`callLLM`) precisaria ganhar suporte
  a Gemini, e os agentes do step route usam streaming direto (não `callLLM`). Isso é
  trabalho de código, fica para DEPOIS da aprovação do plano.
- Sem gabarito decente, a Fase C não conclui nada confiável.

## Resumo operacional

O plano está pronto, mas o relógio só começa quando entrar um deal real (a
`llm_usage_log` vazia é o bloqueio). Fases A+B são read-only sobre dados que vão se
acumular; Fase C exige o gabarito e um pouco de código de shadow. Até lá, toda troca
Anthropic to Gemini fica BLOQUEADA.
