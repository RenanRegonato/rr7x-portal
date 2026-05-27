# Mandor, o caminho para virar padrão de mercado

_One-pager estratégico. Versão 1, 27/05/2026._

## Tese central

A Mandor quer ser a autoridade de referência do mercado privado brasileiro (middle-market, crédito privado, M&A, preparação de empresas para captação). O alvo realista e poderoso NÃO é virar **regulador formal** (isso depende de mandato legal do Estado, como CVM/Bacen), e sim virar **padrão de fato / selo de qualidade**, cuja autoridade vem da credibilidade do método e da adoção do mercado, não de lei.

Meta concreta: o **selo Mandor** que bancos, FIDCs, fundos e assessorias passam a exigir na due diligence de um deal.

| Modelo | Exemplo | Como se chega | Papel p/ Mandor |
| --- | --- | --- | --- |
| Regulador formal | CVM, Bacen | Mandato legal do Estado | Não é o alvo direto; no máximo ser reconhecido por um |
| Autorregulador / associação | ANBIMA, ABVCAP | Cria códigos/certificações, reconhecido pelo regulador | Possível no longo prazo (exige base associativa) |
| Padrão de fato / selo / rating | S&P, Moody's, GPTW | Credibilidade do método + adoção | **Caminho direto. O produto atual já o constrói.** |

## Frente 1, método publicado e auditável

Autoridade de método nasce de transparência: qualquer um precisa conseguir auditar como o número saiu.

**O que já existe**
- Fatos consolidados com proveniência completa (fonte, documento, página, citação) no `fact_bank`.
- Engines determinísticos e auditáveis para indicadores financeiros e gatilhos de risco (cálculo por fórmula, confiança 1.0, sem palpite de modelo).
- Versionamento da base de regras (ex.: `kb_version` do módulo de Reforma Tributária, ancorado na LC 214/2025).
- Observabilidade de custo e modelo por etapa (`llm_usage_log`).
- Golden-set / harness de avaliação da qualidade do pipeline.

**O que falta**
- Publicar a metodologia (documento aberto: o que é fato, como se consolida, como se calcula risco, o que é determinístico vs. inferido por IA).
- Carimbar cada análise com "metodologia Mandor vX" + hash, de ponta a ponta (Fase 4 da revisão de arquitetura).
- Tornar a trilha de auditoria visível ao cliente/terceiro na própria análise (de fato para conclusão).

## Frente 2, track record e benchmark

Como uma agência de rating: a autoridade se consolida quando o método é validado no tempo, sobre muitos casos.

**O que já existe**
- Estrutura de benchmarks no produto (embrião de um índice de mercado).
- Histórico de análises com fatos e diagnósticos estruturados (base para estatística agregada).

**O que falta**
- Acumular volume de deals e acompanhar desfecho (performance, inadimplência, fechamento) para fechar o ciclo "diagnóstico, resultado".
- Publicar, de forma anonimizada, estatísticas e benchmarks de mercado (o "índice Mandor": múltiplos, spreads, taxas de conversão, perfis de risco por setor).
- Medir e divulgar a calibração do método (o score previu o desfecho?).

## Frente 3, governança neutra

Ponto crítico e desconfortável: hoje a Mandor é, ao mesmo tempo, fornecedora da análise e originadora (o Invest Match conecta deals a investidores). Quem certifica a qualidade de um deal não pode ser visto como quem ganha escolhendo vencedores ou intermediando o match. É o mesmo conflito que agências de rating e a ANBIMA administram com muralhas de governança.

**O que já existe**
- Gating comercial por escritório (entitlement) com enforcement server-side, separando quem contrata o quê.
- Auditoria de eventos e papéis (admin, gestor, assessor).

**O que falta**
- Separar, na governança e talvez na marca, o braço de método/certificação (neutro, transparente) do braço comercial de originação.
- Regras explícitas de independência (quem certifica não participa do ganho da intermediação daquele deal).
- Política de conflito de interesse publicada, antes de o selo ganhar tração (mais fácil desenhar cedo do que corrigir depois).

## Sequência sugerida

1. **Publicar a metodologia v1** e carimbar as análises (Frente 1). É o passo de menor custo e maior retorno de reputação, e quase tudo já existe no código.
2. **Usar a Reforma Tributária como primeiro selo vertical.** Tema ancorado em lei pública e auditável (LC 214/2025), com valor imediato na DD de credor/investidor e sem achismo a esconder. Bom para construir reputação de padrão neutro.
3. **Começar a fechar o ciclo de track record** (Frente 2): instrumentar desfecho dos deals e desenhar o primeiro benchmark público.
4. **Desenhar a muralha de governança** (Frente 3) antes de o selo virar exigência de mercado.
5. **Longo prazo:** buscar reconhecimento/parceria (ANBIMA, ABVCAP, sandbox regulatório) quando houver adoção e track record.

## Riscos e tensões

- Conflito originador x certificador (Frente 3) é o maior risco reputacional do projeto.
- Selo sem adoção não vale nada: efeito de rede é pré-requisito (precisa de quem exija o padrão).
- Transparência de método versus proteção de IP: publicar o suficiente para gerar confiança sem entregar o diferencial.
- Track record exige tempo e volume; não há atalho para credibilidade estatística.
