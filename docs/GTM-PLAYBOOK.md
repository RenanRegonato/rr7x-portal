# GTM Playbook — Mandor
## Baseado em "O Manual do Fundador: Estágio da Escala" (p. 50, 52-54)

**Versão:** 0.1 (rascunho)  
**Data:** 2026-06-02  
**Objetivo:** Transformar infra técnica em motor de crescimento repetível

---

## 1. SEGMENTAÇÃO DE MERCADO

### Público Primário (ICP — Ideal Customer Profile)
- **Fundo de PE/VC de médio porte** (AUM $200M–$2B)
  - Critérios: origina deals 5–50/ano, análise hoje é manual/consultoria
  - Problema: due diligence lenta, risco de erro humano, custo alto de analista sênior
  - Solução: Mandor reduz tempo de análise de 40h → 8h, aumenta rigor
  
- **Originadoras independentes** (deal flow próprio)
  - Critérios: 2–10 deals/ano, querem institucionalizar metodologia
  - Problema: falta padrão, documentação, certificação de análise
  - Solução: Mandor vira certificado/padrão

- **Gestoras de ativos alternativos** (infra, energia, agro)
  - Critérios: due diligence de crédito paralela
  - Problema: dependem de consultoria cara ou fundos próprios fragmentados
  - Solução: Mandor integra em workflow, reduz custo

### Público Secundário
- **Equipes de originação de bancos privados**
- **Equity research desks** (análise comparativa)
- **Compliance/jurídico corporativo** (mapeamento de risco)

### Não-alvo (deliberado)
- Varejo/consumidor (massa)
- Plataformas de crédito peer-to-peer
- Consultoria de gestão (fora de escopo)

---

## 2. ARQUITETURA DE MENSAGENS

### Proposição de Valor por Segmento

#### Para Fundos de PE/VC
**Headline:** "De 40 horas a 8 horas: análise de crédito em escala"

**Pilares:**
1. **Rigor certificado** — metodologia publicada, auditável, defensável contra reguladores/LPs
2. **Velocidade institucional** — libertar analistas sênior de work manual, realocar para julgamento
3. **Padrão de mercado** — virar o benchmark contra o qual outros fundos se comparam

**Narrativa de uma página:**
> Mandor é a metodologia de análise de crédito que fundos de PE/VC maiores usam para validar originações antes de diligência completa. Reduz a carga de due diligence em 80% (mapeamento de risco + cobertura de conformidade automática), deixando analistas sênior livres para lidar com julgamento estratégico. Track record publicado: X deals analisados, Y taxa de acerto, Z dias de ciclo.

#### Para Originadoras Independentes
**Headline:** "Seu padrão de análise de crédito, documentado"

**Pilares:**
1. **Reprodutibilidade** — mesma análise, mesmas conclusões, toda vez
2. **Institucionalização** — empacotar expertise de 1 fundador em processo que escala
3. **Defensibilidade** — quando vendendo deal, poder dizer "foi analisado por Mandor" agrega valor

#### Para Gestoras de Ativos Alternativos
**Headline:** "Crédito integrado ao workflow de due diligence"

**Pilares:**
1. **Integração** — não substitui, complementa diligência existente
2. **Especialização** — lógica específica para infra/agro que generalists erram
3. **Auditoria contínua** — reavalia crédito pós-aquisição, detecta degradação

---

## 3. PLAYBOOKS POR SEGMENTO

### Playbook: Fundo de PE/VC (CAC ~$30K, LTV ~$180K/3 anos)

#### Phase 1: Educação (Semana 1–4)
- **Trigger:** LinkedIn post, referência, analista coverage → agendar 30min discovery
- **Output:** Enviar "Mesa de Crédito 101" (one-pager + case study anônimo de deal bem conhecido)
- **Métrica de sucesso:** Taxa de leitura > 70%, calendário marcado para demo técnica

#### Phase 2: Demo Técnica (Semana 5–8)
- **Preparação:** Escolher 1 deal real de fundo (obtido via referência ou público)
- **Executar:** 45min — carregar deal, rodar análise ao vivo, mostrar outputs
- **Métricas:** Engajamento durante demo, perguntas sobre preço/contrato
- **Próximo passo:** Se positivo → proposta + contrato. Se hesitante → agendar workshop interno com seu team

#### Phase 3: Onboarding (Semana 9–12)
- **Kickoff:** Explicar integração, dados necessários, SLAs de resposta
- **Primeiros 3 deals:** White-glove onboarding, feedback loops semanais
- **Métrica de sucesso:** Fundador/partner assinando reports, usando outputs em comitê de investimento

---

### Playbook: Originadoras Independentes (CAC ~$15K, LTV ~$80K/3 anos)

#### Phase 1: Positioning (Semana 1–2)
- **Trigger:** Outreach direto (encontro em evento ou LinkedIn)
- **Conversação:** "Você usa metodologia padrão? Documentada? Como transferir para novo analyst?"
- **Output:** Rascunhar "análise de 1 deal usando Mandor como sua metodologia"
- **Métrica de sucesso:** Founder interessado em conversa de estratégia

#### Phase 2: Prototipagem (Semana 3–4)
- **Executar:** Rodar 2–3 deals reais via Mandor, comparar contra análise atual
- **Resultado:** "Mandor chegou às mesmas conclusões que você, em 1/4 do tempo"
- **Próximo passo:** Contrato mensal (não anual — lower friction)

---

### Playbook: Gestoras de Ativos Alternativos (CAC ~$50K, LTV ~$250K/3 anos)

#### Phase 1: Mapping (Semana 1–2)
- **Trigger:** Outreach via CEO/CFO de fundo conhecido
- **Conversação:** "Vocês analisam crédito de holdings pós-aquisição? Como?"
- **Output:** Entender workflow, identificar ponto de integração (pré ou pós-aquisição)
- **Métrica de sucesso:** Agenda bloqueada com head of portfolio

#### Phase 2: Integração Piloto (Semana 3–8)
- **Escopo:** 2 holdings em análise contínua por Mandor
- **Interface:** Relatório mensal, alerts se degradação de crédito
- **Métrica de sucesso:** Head of portfolio marcando review mensal dos reports

---

## 4. NARRATIVA PARA INVESTIDORES PÚBLICOS

> **"Mandor é a metodologia que o mercado privado usa para certificar crédito."**
>
> Temos track record publicado: X análises, Y taxa de acerto no seu portfólio. Estamos codificando expertise de crédito que custava consultoria $50K/deal em software $500/deal. Efeito de rede: quanto mais deals analisamos, mais refinado fica nosso modelo. Criamos lock-in ao integrar Mandor no workflow de diligência dos fundos.
>
> Defensibilidade: não há plataforma genérica de análise de crédito; todas são "ferramentas" de visualização. Mandor é metodologia opiniada, auditável, documentada. É para crédito o que Pitchbook é para equity — padrão de fato.

---

## 5. INFRAESTRUTURA DE MARKETING DE PRODUTO

### One-Pager Técnico
- **Formato:** 1 página, PDF
- **Conteúdo:** 
  - Input: que dados você precisa enviar (JSON schema)
  - Output: que relatórios você recebe (screenshots)
  - Integrações: Google Workspace, Supabase, webhooks, API
  - SLAs: tempo de resposta, uptime, retenção de dados
- **Público:** Equipes de engenharia de fundos

### Demo Sandbox
- **Acesso:** Conta de demo com 3 deals públicos (Case Cobalto, etc.)
- **Objetivo:** Que prospects testem antes de assinar
- **Interface:** Same UI que cliente pagante

### Case Study Publicado
- **Exemplo:** "Como o Fundo X comprimiu ciclo de DD de 40h a 8h"
- **Elementos:**
  - Breve background do fundo
  - O challenge (antes: manual, lento)
  - Como Mandor resolveu (antes/depois: métricas)
  - Depoimento de CIO/CRO
- **Distribuição:** Blog, LinkedIn, site

### Briefing com Analistas
- **Alvo:** Analistas de software/fintech de bancos de investimento
- **Pauta:**
  - O mercado: quanto PE/VC gasta em due diligence?
  - Oportunidade: consolidação de análise de crédito como SaaS
  - Traction: X clientes, Y ARR, Z growth rate
  - Diferencial: metodologia proprietária vs. generalist tools
  - Roadmap: próximos 12 meses

---

## 6. CADÊNCIA DE OUTREACH

### LinkedIn/Email Sequência (5 toques, 6 semanas)
1. **Dia 1:** Mensagem personalizada (1 parágrafo, refência if possible)
2. **Dia 5:** Artigo do blog relevante ("Como PE reduz risco de crédito")
3. **Dia 12:** Convite para webinar/workshop (se aplica)
4. **Dia 21:** Case study anônimo relevante ao setor
5. **Dia 35:** Proposta direta + calendário para demo

### Eventos (Roadshow)
- Aparecer em **2–3 eventos de PE/VC por trimestre**
  - LACP Summit
  - Anual de PE/VC (Brasil, LaFrance, etc.)
  - Fóruns de crédito alternativo

### Conteúdo de Atração
- **Blog:** 2 posts/mês
  - "Metodologia" (SEO: "como analisar crédito de private equity")
  - "Trends" (mercado, regulação, benchmark)
- **Newsletter:** Insights semanais (track record, trends, método)
- **Podcast:** Entrevistas com CROs/CFOs de fundos (1x/trimestre)

---

## 7. METRICAS DE GTM

### Funil de Vendas
- **Leads qualificados/mês:** Target 20
- **Demos agendadas/leads:** 50% (pipeline health)
- **Taxa de closed/demos:** 25% (conversion)
- **ARR por deal:** $60K (média ponderada)

### Métricas de Ciclo
- **Sales cycle:** 8 semanas (de discovery a contrato)
- **CAC payback:** 8 meses
- **Net retention:** > 120% (upsell + poucas churns)

### Content/Engagement
- **LinkedIn reach:** 10K/mês (vanity, mas sinal de brand)
- **Blog traffic:** 2K visitors/mês
- **Case study downloads:** 50+/trimestre

---

## 8. PRÓXIMAS AÇÕES (Próximas 2 Semanas)

- [ ] Documentar "One-pager técnico" (Mandor API + outputs)
- [ ] Escolher 2 case studies reais (anonimizar, obter permissão)
- [ ] Rascunhar "Segmentação de mercado" (este documento) como conversa com CRO
- [ ] Setup: Calendly para demo booking + CRM (HubSpot light)
- [ ] Primeiro "roadshow" (aparecer em 1 evento ou webinar)
