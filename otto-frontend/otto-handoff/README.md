# Otto — Deal Intelligence

> **Otto** é um SaaS de inteligência de deals para escritórios de M&A e Estruturação de Crédito credenciados pela XP. Em vez de o analista passar dias montando planilhas e rascunhando IMs do zero, Otto orquestra um **squad de 9 agentes especializados** que entrega — em até 12h — o pacote completo de análise de um ativo: Deal Readiness Score, diagnóstico financeiro, análise de M&A, contratos, estratégia de captação, veredicto de maturidade, blind teaser e sell-side pitchbook.

---

## 1. O produto

### Público-alvo
- **Usuário primário:** analista/associado de escritório credenciado XP (preenche Deal Intake, revisa outputs, aprova entregáveis).
- **Stakeholders:** sócio sênior (revisa e assina), originador comercial (gerencia pipeline de leads).

### Problema que resolve
Escritórios de M&A e Estruturação de Crédito **perdem deals por gargalos de produção**, não por falta de competência:
- 3 dias para montar um diagnóstico financeiro que o cliente espera em 48h
- 6h do sócio revisando teaser que o associado faria em 2h com framework certo
- Leads sumindo no CRM enquanto a equipe "organiza os dados"

Otto resolve isso entregando **inteligência estruturada** — o analista trabalha em nível superior (validar, ajustar, decidir) em vez de produzir do zero.

### Os 9 especialistas (em código: `src/data/mocks.js`)
| Agente | Especialidade | Entregável |
|---|---|---|
| **Otto** | Deal Orchestrator | Deal Readiness Score (DRS) + ativação dos agentes |
| **Pedro** | Market Researcher | Pesquisa mercadológica + benchmarks |
| **Davi** | Financial Diagnostician | DRE, fluxo de caixa, valuation, EBITDA normalizado |
| **Arthur** | M&A Architect | Tese de M&A, estrutura da transação |
| **Clara** | Contractualist | NDA, SHA, LOI, passivos jurídicos |
| **Victor** | Deal Originator | Teaser, IM, pitchbook, pipeline de compradores |
| **Estela** | Operation Structure Advisor | Ranking de operações de crédito |
| **Paulo** | Deal Preparator | Veredicto de Maturidade + roadmap |
| **Rafael** | Quality Reviewer | Revisão cruzada e consistência |

---

## 2. Stack técnica

| Camada | Tecnologia | Por quê |
|---|---|---|
| Build/Dev | **Vite 5** | Build instantâneo, HMR rápido, padrão de mercado React em 2025–2026 |
| UI | **React 18.3** | Ecossistema maduro, contratação fácil |
| Roteamento | **react-router-dom 6** | Já no `package.json`; dev deve substituir o estado `view` em `App.jsx` por rotas reais |
| Estilo | **Tailwind CSS 3.4** | Velocidade de iteração, design tokens centralizados, zero CSS fantasma |
| Tokens | **Arquivo JS único** (`src/theme/tokens.js`) | Source of truth — Tailwind e componentes consomem o mesmo objeto |
| Tipografia | **Fraunces + Inter + JetBrains Mono** (Google Fonts) | Display editorial + UI neutra + mono para números |
| Lint/Format | **ESLint + Prettier** | Padrão React |

**Decisões deliberadas:**
- ✅ Sem CSS-in-JS (styled-components, emotion) — Tailwind cobre tudo e é mais rápido em revisão.
- ✅ Sem UI lib (MUI, Chakra, shadcn) — visual é proprietário; uma lib externa criaria fricção contra o sistema Otto.
- ✅ Sem TypeScript ainda — adicionar quando o time crescer (infra está pronta, basta `npm i -D typescript @types/react`).
- ✅ Cores em **oklch()** em vez de hex/HSL — controle perceptual de luminosidade e consistência entre tons.

---

## 3. Como rodar localmente

**Pré-requisitos:** Node.js ≥ 18

```bash
# 1. Instalar dependências
npm install

# 2. Subir o servidor de dev (porta 5173)
npm run dev

# 3. Build de produção
npm run build

# 4. Preview do build
npm run preview

# Lint e formatação
npm run lint
npm run format
```

Após `npm run dev`, abrir `http://localhost:5173` (Vite abre automático).

---

## 4. Estrutura de pastas

```
otto/
├── public/
│   └── favicon.svg            # Favicon Otto (SVG inline, marca coral)
├── src/
│   ├── main.jsx               # Entry point (ReactDOM.createRoot)
│   ├── App.jsx                # Root + "roteador" por estado local + HomeView/EmptyView
│   ├── data/
│   │   └── mocks.js           # DEALS e AGENTS — substituir por API
│   ├── theme/
│   │   ├── tokens.js          # ⭐ DESIGN TOKENS (cores, tipografia, sombras, animações)
│   │   └── global.css         # Tailwind directives + resets globais + scrollbar
│   └── components/
│       ├── Icons.jsx          # SVGs inline + ICONS_BY_NAME lookup
│       ├── AgentMark.jsx      # Selo redondo do agente (com pulse opcional)
│       ├── DRSBar.jsx         # Barra do Deal Readiness Score 0–5
│       ├── Pill.jsx           # Badge colorido (live/warn/draft)
│       ├── Sidebar.jsx        # Navegação esquerda (workspace + coleções)
│       ├── Topbar.jsx         # Barra superior (variantes: tabs / context)
│       ├── NewDealForm.jsx    # Painel "Novo deal" + Field/Input/Select/Segmented
│       ├── PipelineCard.jsx   # Card do pipeline (thumb + DRS + status)
│       ├── PipelineGrid.jsx   # Grid de PipelineCards + filtro
│       ├── IntakeWizard.jsx   # Wizard de 8 etapas
│       ├── PhaseLabel.jsx     # Divisor de fase do pipeline (1..4)
│       ├── AgentRow.jsx       # Linha de agente em execução
│       ├── LiveLog.jsx        # Stream de eventos do squad
│       ├── SquadView.jsx      # Tela de execução ao vivo dos 9 agentes
│       └── DealDetail.jsx     # Tela de detalhe (DRS, tabs Resumo/Diagnóstico/M&A/...)
├── index.html                 # Entry HTML + Google Fonts
├── package.json
├── vite.config.js             # Aliases @, @components, @theme, @data
├── tailwind.config.js         # Consome tokens.js
├── postcss.config.js
├── .eslintrc.json
├── .prettierrc
└── .gitignore
```

### Convenções
- **1 componente principal por arquivo**, com JSDoc no topo descrevendo propósito e props.
- **Subcomponentes locais** (que só fazem sentido no contexto) ficam no mesmo arquivo do "dono" — ex.: `NavItem` dentro de `Sidebar.jsx`, `DRSPanel`/`SnapshotPanel` dentro de `DealDetail.jsx`.
- **Imports relativos** dentro de `components/`. Para importar de outras pastas, prefira aliases (`@theme/tokens`, `@data/mocks`).

---

## 5. Status — implementado vs. TODO

### ✅ Implementado (mock UI)
- [x] **Sidebar** — workspace + coleções + status do squad
- [x] **Home** — painel "Novo deal" + grid de pipeline com 8 deals exemplo
- [x] **Deal Intake** — wizard de 8 etapas com progresso
- [x] **Squad ao vivo** — 4 fases (orquestração → análises paralelas → veredicto → revisão), 9 agentes com barras de progresso animadas e log streaming (simulado via `setInterval`)
- [x] **Deal Detail** — DRS detalhado, snapshot, entregáveis, abas:
  - [x] Resumo (DRS + stats + entregáveis + revisor)
  - [x] Diagnóstico (EBITDA normalizado + valuation triangulado)
  - [x] M&A (estrutura recomendada + pipeline de compradores)
  - [ ] Contratos, Originação, Teaser, Pitchbook (placeholders)
- [x] **Design system** — tokens centralizados, paleta off-white + coral, tipografia editorial

### 🚧 TODOs prioritários (curto prazo)
- [ ] **Substituir estado `view` por React Router** (`react-router-dom` já no package.json)
  - Rotas: `/`, `/intake`, `/deal/:id/squad`, `/deal/:id`, `/deal/:id/:tab`
- [ ] **Backend integration**
  - Trocar `DEALS`/`AGENTS` por chamadas API (`fetch` ou React Query)
  - Substituir `setInterval` em `SquadView` por **WebSocket/SSE** (server-sent events) para progresso real
- [ ] **Autenticação** — login do escritório XP, isolamento por tenant
- [ ] **Persistência do Intake** — autosave por etapa (localStorage + backend)
- [ ] **Completar abas do DealDetail**:
  - Contratos (Clara): listagem de NDAs/SHAs/LOIs com flags de risco
  - Originação (Victor): pipeline de compradores com status de outreach
  - Teaser (Victor): preview do blind teaser editável
  - Pitchbook (Victor): preview do sell-side pitchbook editável

### 📋 TODOs de produto (médio prazo)
- [ ] **Estruturação de Crédito** (Estela): tela específica de ranking de operações (CRI/CRA/FIDC/debênture) com custo × prazo × adequação
- [ ] **Onboarding do escritório** — configurar marca, tom de voz, frameworks proprietários (plano Profissional/Enterprise)
- [ ] **Chat conversacional** com agente específico (override de outputs por instrução)
- [ ] **Comparador de deals** — colocar 2-3 deals lado a lado
- [ ] **Pipeline Kanban** — view alternativa ao grid (Lead → Mandato → Em análise → Pronto → Roadshow → Fechado)
- [ ] **Notificações** — bell icon já existe; ligar a eventos do squad e checkpoints

### 🔧 TODOs técnicos
- [ ] **TypeScript** — `npm i -D typescript @types/react @types/react-dom` + renomear `.jsx → .tsx`
- [ ] **Testes** — Vitest + Testing Library (componentes atômicos primeiro: AgentMark, DRSBar, Pill)
- [ ] **Storybook** — catalogar componentes do design system
- [ ] **CI** — GitHub Actions: `npm run lint && npm run build` em PR
- [ ] **Acessibilidade** — auditoria com axe; foco visível em todos os botões; aria-labels nos icon-buttons
- [ ] **i18n** — produto é PT-BR hoje; estruturar para EN posteriormente (mercado XP-internacional)

---

## 6. Decisões visuais — **PRESERVAR**

Otto tem identidade visual deliberada. Antes de mexer em qualquer coisa estética, leia esta seção.

### Paleta
- **Background:** off-white **quente** (`oklch(0.985 0.005 60)`), nunca branco puro nem cinza neutro. Esse tom faz Otto parecer um produto *premium* de banco privado, não um SaaS genérico de tech.
- **Acento coral/pêssego** (`oklch(0.78 0.09 35)`): único acento de cor. Não introduzir azuis Bootstrap, roxos VC ou verdes financeiros como cor primária — coral é a marca.
- **Verde, âmbar e azul** existem **apenas como semânticas** (sucesso, alerta, info). Nunca como decoração.
- **Os 6 tints** (peach/sage/sand/sky/lilac/cream) são reservados para **agent marks e thumbs de cards** — não usar em backgrounds gerais.

### Tipografia
- **Fraunces** (serifa editorial) só em **títulos, números grandes e wordmark**. Confere ar de relatório premium — não de app.
- **Inter** em todo o resto da UI.
- **JetBrains Mono** apenas para **números financeiros, IDs e logs**. Tabular-nums em qualquer tabela com valores R$.
- Tracking levemente negativo (`tracking-tight`) em títulos display.

### Tom de voz
- **Português técnico-financeiro**, conciso. Linguagem de fundo de PE: não romantiza ativos, não omite riscos, fala em DRS, EBITDA normalizado, valuation triangulado.
- Evitar emojis em UI (existem na data dos agentes para referência, mas não devem aparecer em produção a menos que o usuário ative).
- **Respeitar a hierarquia** ink → ink-2 → ink-3 (3 níveis de cinza). Não inventar um quarto.

### Densidade
- Alta densidade no pipeline e no SquadView; respiração maior no Intake (foco). Manter.
- Cards com `rounded-[14px]` e `shadow-soft-sm` — não aumentar shadow (Otto é discreto).

### O que **não** fazer
- ❌ Adicionar gradientes em backgrounds gerais
- ❌ Usar emojis decorativos em UI
- ❌ Trocar Fraunces por outra serifa "moderna" (Playfair, DM Serif). Fraunces tem opsz que ajusta optical sizing e é específica.
- ❌ Aumentar saturação do coral — ele é deliberadamente baixo em chroma para não competir com dados.
- ❌ Mudar para tema escuro como default — o quente off-white é parte da marca.

---

## 7. Migração futura

### React Router (substituir estado por rotas)
1. Em `App.jsx`, importar `BrowserRouter`, `Routes`, `Route`, `useNavigate`, `useParams`.
2. Cada `view.name` vira uma rota; cada `setView({...})` vira `navigate('/...')`.
3. Param de deal vai pela URL: `/deal/aurora` em vez de `view.deal`.

### TypeScript
1. `npm i -D typescript @types/react @types/react-dom`
2. `npx tsc --init` (configurar `jsx: 'react-jsx'`, `moduleResolution: 'bundler'`)
3. Renomear arquivos `.jsx → .tsx` gradualmente. Vite suporta nativamente.
4. Tipar `DEALS` e `AGENTS` em `src/data/types.ts`.

---

## 8. Contato
Versão visual original e design system desenhados na fase de prototipagem.
Dúvidas sobre intenção de UX/UI → consultar este README + comentários JSDoc nos componentes.
