# Mandor — Arquivo Âncora Mestre

Documentação centralizada de todas as fases de implementação da plataforma Mandor.

---

## 📋 Changelog de Versões

### v2.0.0 — Asset Preparation (Diagnóstico de Prontidão para Mercados de Capital)

**Data:** 2026-06-24  
**Status:** ✅ Produção (www.mandor.com.br)  
**Deploy:** Vercel (rr7x-portal-mc3n10sla-rr7x-deal-inteligences-projects.vercel.app)

#### 📊 Resumo Executivo

Implementação completa do módulo **Asset Preparation** — um diagnostic system que avalia se ativos corporativos (empresas, imóveis, recebíveis, ativos agrícolas) estão prontos para acessar mercados de capital. Sistema de scoring multidimensional (7 dimensões), gate inteligente, e recomendações de estruturação via Market Fit GPS.

**Valor Entregue:**
- Avaliação objetiva de 7 dimensões de prontidão (Jurídico, Financeiro, Operacional, Governança, Garantias, Compliance, Atratividade para Investidores)
- Identificação inteligente de 10 tipos de bloqueadores críticos
- Elegibilidade para 9 tipos de estruturas de captação (FIDC, CRI, CRA, Debênture, Private Equity, Growth Equity, Family Office, Crowdfunding, CPP)
- "GPS de Captação": roadmap de preparação com timeline fase-por-fase
- Integração com Invest Match para recomendação de investidores

**Arquitetura:**
- 3 agentes Claude em paralelo (Eligibility Analyzer, Bottleneck Identifier, Market Fit Recommender)
- LLM context: `validators` (tarefa: asset_prep_*)
- Scoring: base 70 + bonuses para dados (receita, EBITDA, patrimônio, governança) - deductions para gargalos
- Gate: bloqueia se gargalos_críticos > 0 ou score < 30
- Timeline: max(críticos) + ceil(importantes/2) para paralelismo

---

## 🏗️ Implementação Completa (P1-P5)

### P1: Ingestão de Dados e Directives (14 campos + Directives)

**Arquivo:** `app/dashboard/(main)/nova-analise/page.tsx` (step 8)

**Campos de Ingestão (14 novos):**
```typescript
type_ativo: string                // "empresa" | "imovel" | "recebiveis" | "agricola"
receita_anual: number            // em R$ (para cálculo de score)
ebitda: number                   // em R$ (para avaliação de saúde)
patrimonio_liquido: number       // em R$ (indicador de solidez)
alavancagem: number              // ratio de dívida/patrimônio
posicao_mercado: string          // "lider" | "participante" | "emergente"
atratividade: number             // 1-10 (percepção de atratividade)
maturidade: number               // 1-10 (maturidade operacional)
temGovernanca: boolean           // tem estrutura de governança?
temBoard: boolean                // tem board/conselho?
historico: string                // histórico de operação (em anos/descrição)
objetivo: string                 // objetivo de captação
volume: number                   // volume buscado (em R$)
horizonte: number                // horizonte em meses
```

**Directives (lib/asset-prep/directives.ts):**
- Tone consultativo (não alarmista)
- Output JSON estruturado
- Contexto de ativos brasileiros (ANBIMA, CVM, Banco Central)
- 3 agentes: consultores especializados em estruturação

**Schema Validation:** `lib/schemas.ts` - AnaliseCreateSchema com 14 novos campos validados

**UI:** Step 8 "Asset Preparation" com 4 seções:
1. Tipo de Ativo e Dados Financeiros
2. Posicionamento de Mercado
3. Estrutura de Governança
4. Objetivos de Captação

---

### P2: Injeção nos Agentes (3 Agentes Paralelos)

**Arquivos Criados:**

#### `lib/asset-prep/eligibility-analyzer.ts` (Agente 1)
- Tarefa: `asset_prep_elegibilidade`
- Analisa 9 tipos de captação:
  - FIDC (Fundo de Investimento em Direitos Creditórios)
  - CRI (Certificado de Recebíveis Imobiliários)
  - CRA (Certificado de Recebíveis Agrícolas)
  - Debênture (Valores Mobiliários)
  - Private Equity (Participação Acionária)
  - Growth Equity (Crescimento)
  - Family Office (Investidores Pessoa Física)
  - Crowdfunding (Arrecadação Coletiva)
  - CPP (Concessões Públicas Parcerias)
  
- Output: ElegibilidadeResult
  ```typescript
  interface Elegibilidade {
    tipo: string
    elegivel: "sim" | "nao" | "condicional"
    razao: string
    condicao?: string
  }
  ```

#### `lib/asset-prep/bottleneck-identifier.ts` (Agente 2)
- Tarefa: `asset_prep_gargalos`
- Identifica 10 tipos de bloqueadores:
  1. Jurídico/Documentação (passivos legais, falta de documentos)
  2. Financeiro (indicadores frágeis, histórico curto)
  3. Operacional (processos frágeis, histórico curto de operação)
  4. Governança (falta de estrutura de governança)
  5. Garantias (falta de garantias suficientes)
  6. Regulatório/Compliance (não conforme a regulação)
  7. Alavancagem (dívida excessiva)
  8. Histórico de Recebimento (histórico curto ou irregular)
  9. Atratividade para Investidores (baixo potencial de atratividade)
  10. Transparência (falta de informações públicas)

- Severidade: critico | importante | menor
- Output: GarganlosResult com arrays separados por severidade
  ```typescript
  interface Gargalo {
    id: string
    tipo: string
    severidade: "critico" | "importante" | "menor"
    descricao: string
    impacto: string
    acao: string
    prazo_dias: number
  }
  ```

#### `lib/asset-prep/market-fit-recommender.ts` (Agente 3)
- Tarefa: `asset_prep_market_fit`
- Recomenda tipo de capital ideal
- Output: MarketFitResult
  ```typescript
  interface MarketFitRecomendacao {
    tipo_capital_ideal: string              // "FIDC", "CRI", etc
    fit_score: number                       // 0-100
    rationale: string                       // justificativa
    estrutura_recomendada: string           // como estruturar
    timeline_dias: number                   // dias para fechar
    probabilidade_sucesso: number           // 0-100
    proximos_passos: string[]
  }
  ```

**Orquestrador:** `lib/asset-prep/service.ts`
- `executarAssetPrepAnalysis()`: chama 3 agentes via `Promise.all()` (paralelismo máximo)
- Consolida resultados em `AssetPrepAnalysisResult`

**LLM Context:** 
- Todos usam `callLLM({ context: 'validators', task: 'asset_prep_*' })`
- Format: JSON estruturado, mensagens com histórico de dados do ativo

---

### P3: Validação (Scoring + Gate Inteligente)

#### `lib/asset-prep/scoring.ts`

**7 Dimensões de Prontidão (0-100 cada):**
1. **Jurídico:** documentação completa, sem passivos, estrutura legal clara
2. **Financeiro:** saúde financeira, receita/EBITDA, alavancagem saudável
3. **Operacional:** processos maduros, histórico de operação > 24 meses
4. **Governança:** board, compliance, estrutura de decisão clara
5. **Garantias:** garantias suficientes, colateral adequado
6. **Compliance:** regras regulatórias atendidas, conformidade com CVM/BC
7. **Atratividade para Investidores:** potencial de retorno, mercado atrativo

**Algoritmo de Scoring:**
```
score_dimensão = MIN(100, MAX(0, 70 + bonuses - deductions))

bonuses:
  + receita anual > 0: +5
  + EBITDA > 0 e saudável: +5
  + patrimônio > 0: +5
  + tem governança: +5
  + alavancagem < 3: +5
  
deductions:
  - per gargalo crítico: -25
  - per gargalo importante: -10
  
score_consolidado = avg(7 dimensões)
```

**Matriz de Elegibilidade:**
```typescript
// Mapeamento de 9 tipos para SIM/NÃO/CONDICIONAL
// Regra: sim se score_dimensao >= 60, condicional se >= 40, nao se < 40
```

#### `lib/asset-prep/validation.ts`

**Gate de Validação (3 Bloqueadores Críticos):**
1. **Score crítico:** qualquer dimensão < 30
2. **Gargalos críticos:** > 2 gargalos críticos não resolvidos
3. **Market fit:** fit_score < 40%

**Status Final:**
- **PRONTO:** score >= 75 + 0 gargalos críticos + elegível para >= 1 tipo
- **PRONTO_CONDICIONAL:** score >= 50 + <= 2 gargalos críticos + elegível para >= 2 tipos
- **NÃO_PRONTO:** qualquer outro caso

---

### P4: Gate + Documentação de Preparação

#### `lib/asset-prep/gate.ts`

**Funções Principais:**

1. **`avaliarGateAssetPrep()`** 
   - Retorna: GateCheckResult { pode_prosseguir, motivo_bloqueio, gargalos_criticos, timeout_minutos }
   - Bloqueia se gargalos_críticos > 0 ou score < 30
   - Timeout: 15 min (críticos) ou 30 min (score baixo)

2. **`calcularStatusAssetPrep()`**
   - Retorna percentual de preparação (0-100)
   - Estima dias para ficar pronto
   - Próximo check em 24h

3. **`simularResolucaoGargalo()`**
   - Prediz novo score se um bloqueador for resolvido
   - Crítico: +12 pts, Importante: +6 pts
   - Útil para planejamento

#### `lib/asset-prep/plano-preparacao.ts`

**Plano de Preparação Executável:**

```typescript
interface PlanodePreparacao {
  total_acoes: number              // total de ações
  acoes_criticas: number           // ações de severidade crítica
  acoes_concluidas: number         // já feitas
  percentual_conclusao: number     // 0-100
  prazo_total_dias: number         // max(críticos) + ceil(importantes/2)
  acoes: AcaoPreparacao[]
  timeline_fases: TimelineFase[]   // agrupado em semanas
}

interface TimelineFase {
  nome: string                     // "Semana 1", "Semana 2", etc
  semana: number
  acoes: AcaoPreparacao[]
  objetivo: string                 // resumo da semana
}
```

**Timeline Inteligente:**
- Agrupa ações em semanas de 14 dias
- Prioriza críticas > importantes > menores
- Prazo = max(críticos) + ceil(importantes/2) — reflete paralelismo

---

### P5: Market Fit GPS (Conexão com Invest Match)

**Arquivo:** `lib/asset-prep/market-fit-gps.ts`

**"GPS de Captação"** — recomenda roadmap completo com investidores:

```typescript
interface MarketFitGPS {
  recomendacao_principal: MarketFitRecomendacao
  alternativas: MarketFitRecomendacao[]
  investidores_recomendados: InvestidorRecomendado[]  // tipos + exemplos
  proximo_passo_roadshow: {
    titulo: string
    descricao: string
    checklist: string[]            // materiais + documentos
  }
  tempo_estimado_ciclo: {
    preparacao_dias: number        // prep (15-30d)
    pitch_dias: number             // roadshow (20-45d)
    negociacao_dias: number        // due diligence (30-90d)
    total_ciclo_dias: number       // total (65-165d)
  }
}
```

**Investidores Recomendados por Tipo de Capital:**

| Capital | Tipos de Investidor | Exemplos |
|---------|-------------------|----------|
| FIDC | Gestoras | Bradesco Asset, Tercon, SRM Empírica, Ouro Preto |
| CRI | Securitizadoras | Vórtx, Bradesco, Itaú |
| CRA | Gestoras + Securitizadoras | Compass, Terra, Ouro Preto Agro |
| PE | PE Firms | 3G Capital, GP Investments, Tarpon |
| Family Office | FO/Patrimônios | BTG Pactual Wealth, Banco Modal Family |

**Checklist de Roadshow (Customizado por Tipo):**

*FIDC:*
- Book de apresentação (20 slides)
- Executive Summary (2 pág)
- Contrato de lastro e cedentes
- Histórico de recebimento (12+ meses)
- Estrutura de cotas (sênior/subordinada)
- Parecer jurídico da estruturação

*CRI:*
- Book + Executive Summary
- Matrícula do imóvel atualizada
- Laudo de avaliação do imóvel
- Certidão de ônus do imóvel
- Parecer jurídico CRI

*CRA:*
- Book + Executive Summary
- Documentação do ativo agrícola
- Histórico de safra/colheita
- Parecer jurídico CRA
- Aval de crédito rural (se houver)

*Private Equity:*
- Book + Executive Summary
- Plano de crescimento (3-5 anos)
- Análise de potencial de saída
- Projeção de retorno (IRR, MOIC)
- Management presentation

---

## 📦 Código — Estatísticas

### Arquivos Criados/Modificados

| Arquivo | Tipo | Status |
|---------|------|--------|
| `lib/asset-prep/directives.ts` | Core | ✅ 200 linhas |
| `lib/asset-prep/eligibility-analyzer.ts` | Agent | ✅ 180 linhas |
| `lib/asset-prep/bottleneck-identifier.ts` | Agent | ✅ 250 linhas |
| `lib/asset-prep/market-fit-recommender.ts` | Agent | ✅ 200 linhas |
| `lib/asset-prep/service.ts` | Orchestrator | ✅ 150 linhas |
| `lib/asset-prep/scoring.ts` | Validation | ✅ 280 linhas |
| `lib/asset-prep/validation.ts` | Gate | ✅ 155 linhas |
| `lib/asset-prep/gate.ts` | Gate | ✅ 171 linhas |
| `lib/asset-prep/plano-preparacao.ts` | Planning | ✅ 248 linhas |
| `lib/asset-prep/market-fit-gps.ts` | GPS | ✅ 228 linhas |
| `lib/types.ts` | Types | ✅ +14 campos em DealIntake |
| `lib/schemas.ts` | Validation | ✅ +14 campos em AnaliseCreateSchema |
| `app/dashboard/(main)/nova-analise/page.tsx` | UI | ✅ +4 seções em step 8 |

**Total:** ~2,000 linhas de código novo  
**Commits:** 5 (P1-P5)  
**Typecheck:** ✅ Passando  
**Build:** ✅ Passando  

---

## 🚀 Deploy

### Produção
- **URL:** https://www.mandor.com.br
- **Vercel:** rr7x-portal-mc3n10sla-rr7x-deal-inteligences-projects.vercel.app
- **Data:** 2026-06-24
- **Status:** ✅ LIVE

### Histórico de Deploys (P1-P5)
```
P1 (Ingestão): Commit xxx, Deploy OK
P2 (Agentes): Commit xxx, Deploy OK
P3 (Scoring): Commit xxx, Deploy OK
P4 (Gate): Commit xxx, Deploy OK
P5 (Market Fit GPS): Commit 1558064, Deploy OK
```

---

## 🧪 Smoke Testing Checklist (Produção)

- [ ] Step 8 "Asset Preparation" aparece no formulário de nova análise
- [ ] Todos os 14 campos de ingestão validam corretamente
- [ ] 3 agentes respondem em < 30s (teste com FIDC de empresa)
- [ ] Scores de 7 dimensões calculam corretamente
- [ ] Gate bloqueia se há gargalos críticos
- [ ] Plano de Preparação gera timeline de semanas
- [ ] Market Fit GPS exibe investidores e checklist de roadshow
- [ ] UI exibe parecer executivo com all sections
- [ ] Próximos passos aparecem em ordem de prioridade

---

## 🔄 Integração com Invest Match

**Fluxo:**
1. Asset Preparation recomenda `tipo_capital_ideal` (ex: FIDC)
2. Market Fit GPS mapeia para tipos de investidor (gestoras, securitizadoras, etc)
3. Link para Invest Match com filtros pré-aplicados:
   - `tipo_deal`: "credito_estruturado"
   - `tipo_investidor`: ["gestora", "securitizadora"]
   - `capital_minimo`: volume buscado
4. Usuário vê investidores qualificados para sua estrutura

---

## 📚 Referências

### Documento de Requisitos Original
- 6 seções de spec
- 9-type elegibility matrix
- 10-type blocker identification system
- 7-dimension scoring algorithm
- Timeline parallelism logic
- Example output JSON

### Arquitetura
- Next.js App Router
- TypeScript (strict mode)
- Supabase (database)
- Inngest (background jobs, future phase)
- Claude LLM via Anthropic API
- Parallel execution via Promise.all()

### Directives dos Agentes
- Context: 'validators' (não 'asset_prep' — typo corrigido)
- Task: 'asset_prep_elegibilidade', 'asset_prep_gargalos', 'asset_prep_market_fit'
- Tone: consultativo, não alarmista
- Output: JSON estruturado

---

## 🎯 Próximas Fases (Roadmap)

### Phase 3: Inngest Integration (Background Jobs)
- Executar análise de Asset Prep como job assíncrono
- Notificar usuário quando pronto
- Retry automático se falhar

### Phase 4: Deep Dive — Due Diligence Inteligente
- Agente que analisa documentos enviados
- Valida gargalos contra evidências
- Gera relatório de due diligence

### Phase 5: Monitoramento Contínuo
- Webhook para updates de dados
- Rescoring automático se dados mudarem
- Dashboard de evolução de prontidão

---

**Documento Atualizado:** 2026-06-24  
**Autor:** Renan Regonato / Claude  
**Status:** Documentação Completa de P1-P5
