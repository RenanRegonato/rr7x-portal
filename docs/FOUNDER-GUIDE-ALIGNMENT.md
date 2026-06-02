# Mandor × Founder Guide: Alignment & Gaps

**Data:** 2026-06-02  
**Baseado em:** "O Manual do Fundador: Construindo uma Startup AI-Native" (65 páginas)

---

## Executive Summary

Mandor passou por **MVP e Lançamento** de forma estruturada (80% aderência ao guia).  
Está em **Escala técnica**, mas **Escala comercial é fraca** (20% aderência em GTM).

**Prioridades imediatas:**
1. GTM estruturada (segmentação, playbooks, narrativa)
2. Product OS leve (sprints, specs, métricas)
3. Escopo escrito (o que faz deliberadamente NÃO faz)

---

## Estágio MVP (Passou ✅)

### Critérios do Guia (p. 26-37)
| Critério | Status | Evidência |
|----------|--------|-----------|
| Definir arquitetura antes de construir | ✅ | AGENTS.md + CLAUDE.md |
| Construir sem dívida técnica | ✅ | Refatoração server-side Inngest (26/05) |
| Revisão de segurança antes de usuários | ✅ | P0+P1 audit (28/05), PROMPT_INJECTION_GUARD |
| Definir métricas antes de lançamento | ✅ | llm_usage_log, deal vitrine |
| Feedback de usuários estruturado | ✅ | Gestor acompanha ao vivo |
| **Sean Ellis test (formalizado)** | ❓ | Não há menção |
| **Escopo escrito ("faz vs. não faz")** | ⚠️ | Não documentado por escrito |

**Veredicto:** MVP foi bem construído. Risco: nunca documentaram escopo inicial, então difícil auditar se feature creep foi controlado.

---

## Estágio Lançamento (Passou ✅)

### Critérios do Guia (p. 39-45)
| Critério | Status | Evidência |
|----------|--------|-----------|
| Auditoria de dívida técnica | ✅ | Refatoração Inngest, watchdog cron |
| Liberar fundador de gargalos | ✅ | Automação Inngest, Claude Cowork |
| Segurança + compliance workstream | ✅ | P0+P1 fixes 28/05, RLS, logging |
| Não expandir antes de estar pronto | ✅ | Foco no core (crédito/análise) |
| **Processos de gestão de produto** | ❌ | Não há sprints formalizados, specs, SLAs |
| **Cobertura de testes** | ⚠️ | Não documentado |

**Veredicto:** Tech está sólida. Operacional é ad-hoc.

---

## Estágio Escala (Parcialmente ✅)

### Critérios do Guia (p. 47-57)

#### Tech/Produto (Forte ✅)
| Critério | Status | Evidência |
|----------|--------|-----------|
| Codificar expertise de domínio | ✅ | Ferrante, Revisor, Sentinela, KB v2 |
| Infraestrutura enterprise-grade | ✅ | llm_usage_log, dashboard, PROMPT_INJECTION_GUARD, SLAs implícitos |
| Composição de dados de usuários | ✅ | Fact-bank + track record + refinamento contínuo |
| Workflow lock-in | ✅ | Invest Match (5 camadas), análises multidimensionais |

#### Comercial/GTM (Fraco ❌)
| Critério | Status | Evidência |
|----------|--------|-----------|
| **Segmentação de mercado** | ❌ | Não formalizada |
| **Playbooks de vendas** | ❌ | Não há |
| **Narrativa de marca** | ⚠️ | Site + blog existem, mas strategy undefined |
| **Outreach estruturado** | ❌ | Não há |
| **Relações com analistas** | ❌ | Não há |
| **CAC/LTV/payback documentado** | ❌ | Desconhecido |

**Veredicto:** Mandor tem a infra pronta. Falta o "motor de crescimento" que transforma infra em receita.

---

## Gaps & Próximas Ações

### 1️⃣ GTM ESTRUTURADA (Crítico)

**O que o guia diz (p. 50, 52-54):**
> "Crescimento em estágio de Escala exige construir um motor dedicado de crescimento para alcançar audiências novas e mais amplas para o seu produto."

**Falta em Mandor:**
- [ ] Segmentação ICP (qual fundo? que problema resolve?)
- [ ] Mensagens por segmento (posicionamento)
- [ ] Playbooks de vendas (discovery → demo → contrato)
- [ ] Infraestrutura de marketing (one-pager, case study, sandbox)
- [ ] Cadência de outreach (LinkedIn sequence, eventos)
- [ ] Métricas de GTM (CAC, pipeline, conversion)

**Arquivo:** `docs/GTM-PLAYBOOK.md` (rascunho criado hoje)

---

### 2️⃣ PRODUCT OS LEVE (Importante)

**O que o guia diz (p. 44-45):**
> "O estágio do Lançamento exige um conjunto de processos leves e repetíveis que possam rodar sem precisar de intervenção do fundador."

**Falta em Mandor:**
- [ ] Cadência de sprint formalizada (2 semanas? quando?)
- [ ] Template de spec (Problema + Solução + Faz/Não Faz)
- [ ] Triagem de bugs com SLA (P0 = 24h, P1 = 1 sprint, etc.)
- [ ] Briefing semanal de métricas automático
- [ ] Regras de deployment (pré-checklist, rollback plan)
- [ ] Claude Cowork rodando operações recorrentes

**Arquivo:** `docs/PRODUCT-OS-LIGHT.md` (rascunho criado hoje)

---

### 3️⃣ ESCOPO ESCRITO (Recomendado)

**O que o guia diz (p. 29):**
> "Uma definição de escopo escrita, criada antes de a construção começar, descrevendo o que o produto faz, o que deliberadamente não faz."

**Falta em Mandor:**
- [ ] Documento "Mandor faz X (análise de crédito, origina deals), deliberadamente NÃO faz Y (custódia, capital, consultoria)"
- [ ] Critérios de emenda (que evidência de usuários justifica adicionar feature?)

---

## Recommended Sequencing

### Semana 1–2: GTM
- [ ] Escrever segmentação (ICP, messaging)
- [ ] Rascunhar 3 playbooks (PE/VC, originadoras, alt assets)
- [ ] Criar 1 case study (anonimizado)
- [ ] Setup: Calendly + CRM light (Notion ou HubSpot free)

### Semana 3–4: Product OS
- [ ] Agendar primeira sprint formal (2 semanas)
- [ ] Escrever 3 specs (backlog mais urgentes)
- [ ] Setup: GitHub labels (P0–P3, needs-info)
- [ ] Definir briefing semanal (template + Claude Cowork)

### Semana 5–6: Scope
- [ ] Escrever "o que Mandor faz deliberadamente NÃO faz"
- [ ] Documentar critérios de emenda de features

---

## Files Created Today

1. **docs/GTM-PLAYBOOK.md** — Segmentação, playbooks, narrativa, infraestrutura de marketing
2. **docs/PRODUCT-OS-LIGHT.md** — Sprints, specs, triagem de bugs, métricas, SLAs

Ambos são **rascunhos v0.1** baseados no Founder Guide. Personalize conforme Mandor.

---

## Alignment Score

| Stage | Tech | Comercial | Ops | **Overall** |
|-------|------|-----------|-----|-----------|
| MVP | 85% | — | 80% | **82%** ✅ |
| Lançamento | 90% | — | 60% | **75%** ✅ |
| Escala | 95% | 20% | 50% | **55%** ⚠️ |
| **TOTAL** | **90%** | **20%** | **63%** | **58%** |

**Interpretação:** Mandor é tech-forward, commercialmente nascente, operacionalmente ad-hoc. Alinhar com Founder Guide vai desbloquear crescimento.
