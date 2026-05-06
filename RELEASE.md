# Otto — Deal Intelligence
## Release Completo da Plataforma
**RR7x Capital Hub · Versão atual em produção: rr7x-portal.vercel.app**

---

## Sumário

1. [Visão Geral da Plataforma](#1-visão-geral-da-plataforma)
2. [Inteligência do Sistema](#2-inteligência-do-sistema)
3. [Fluxos Operacionais](#3-fluxos-operacionais)
4. [Portal — Funcionalidades por Nível de Acesso](#4-portal--funcionalidades-por-nível-de-acesso)
5. [Estrutura do Portal (Front-End)](#5-estrutura-do-portal-front-end)
6. [Regras de Permissão e Segurança](#6-regras-de-permissão-e-segurança)

---

## 1. Visão Geral da Plataforma

### 1.1 Proposta e Finalidade

Otto é uma plataforma de **Deal Intelligence** desenvolvida pela RR7x Capital Hub. Seu propósito central é transformar a análise de ativos em um processo estruturado, padronizado e inteligente — reduzindo o tempo de due diligence, elevando a qualidade dos relatórios e automatizando a produção de documentos de captação.

A plataforma opera como um sistema multi-agente baseado em IA: cada deal submetido por um assessor ou gerente percorre um pipeline de especialistas virtuais, cada um responsável por uma dimensão específica da análise (mercado, finanças, M&A, contratos, estruturação, maturidade). Ao final, os documentos de captação são gerados automaticamente com identidade visual do escritório.

**Usuários diretos:** assessores de M&A, gestores de escritórios de investimento, administradores da plataforma.

**Resultado entregue por deal:** até 11 relatórios especializados + Blind Teaser + Sell-Side Pitchbook, prontos para uso com o mercado.

### 1.2 Estrutura Macro — Módulos e Integrações

```
Otto Platform
│
├── Portal Web (Next.js 16.2.4 App Router)
│   ├── Dashboard do Assessor
│   ├── Dashboard do Gerente
│   └── Painel Admin Global
│
├── Pipeline de Agentes (Anthropic Claude Sonnet 4.6)
│   ├── Drive Intake (ingestão de documentos)
│   ├── 9 Agentes Especialistas (paralelos e sequenciais)
│   └── Documentos de Captação (Teaser + Pitchbook)
│
├── Backend (Next.js API Routes)
│   ├── Gestão de análises e steps
│   ├── RBAC e controle de acesso
│   ├── Upload e leitura de documentos
│   └── Webhooks de pagamento
│
├── Banco de Dados (Supabase PostgreSQL)
│   ├── auth.users, perfis, escritorios
│   ├── analises, agent_prompts
│   └── admin_feedbacks, escritorio_feedbacks, subscriptions
│
├── Storage (Supabase Storage)
│   ├── Bucket "analises" — documentos de deals
│   └── Bucket "logos" — logomarcas dos escritórios
│
└── Integrações Externas
    ├── Stripe (planos e pagamentos)
    └── Resend (convites por email)
```

### 1.3 Lógica Central de Funcionamento

O fluxo central da plataforma segue três etapas:

1. **Cadastro do Deal (Intake):** O assessor preenche um wizard de 8 etapas capturando dados do proprietário (internos), do mandato (internos) e do ativo (enviados aos agentes). Documentos são anexados opcionalmente.

2. **Execução do Pipeline:** Na tela de análise, cada etapa do pipeline é acionada manualmente ou em sequência. A IA recebe o intake do ativo, os documentos, os aprendizados do escritório, os aprendizados globais e o prompt do agente — e produz o relatório correspondente via streaming.

3. **Geração de Documentos:** Ao final do pipeline, Blind Teaser e Sell-Side Pitchbook são gerados com a identidade do escritório (logo, nome, contato, site) — nunca com a marca RR7x Capital Hub.

---

## 2. Inteligência do Sistema

### 2.1 Regras de Negócio — Deals, Ativos, Proprietários, Mandatos

**Deal**
- Um deal é uma análise completa de um ativo. É a unidade central do sistema.
- Todo deal tem status: `rascunho`, `processando`, `concluído` ou `erro`.
- Um deal pertence a um `user_id` (o assessor/gerente que o criou).
- O campo `deal_intake` armazena todos os dados do wizard em JSON.

**Ativo**
- É o bem, empresa, imóvel ou portfólio sendo avaliado.
- Tipos suportados: Empresa (M&A), Imóvel/Real Estate, Startup/Scale-up, Portfólio de Crédito, Franquia, Agronegócio, Outro.
- Estágios: Cru/Não validado, Estruturando, Estruturado, Em comercialização, Em negociação/Closing.
- Nível de informação: Baixo, Médio, Alto — calibra a profundidade da análise dos agentes.
- Ticket estimado e localização (cidade/UF) são capturados para contextualização geográfica e de porte.

**Proprietário**
- Dados do dono do ativo: nome, CPF/CNPJ, telefone, email, observações.
- **Regra crítica:** esses dados ficam armazenados no banco para consulta interna, mas **nunca são enviados ao Claude**. A função `formatIntake()` os omite antes da injeção no contexto dos agentes.

**Mandato**
- Dados operacionais: assessor responsável + parceiro intermediário (se houver), com nome, telefone e email de cada um.
- Assim como o proprietário, o mandato é **dado interno** — não chega aos agentes.
- Serve para rastreabilidade e gestão interna do escritório.

**Objetivos do Deal (multi-select)**
- Venda 100% do ativo
- Venda de participação minoritária
- Captação de capital (equity)
- Estruturação de crédito
- Preparação para o mercado
- Apenas diagnóstico

### 2.2 Lógica de Atribuição e Visibilidade de Dados

A visibilidade de deals segue a hierarquia RBAC:

| Papel | Vê os deals de quem |
|-------|---------------------|
| Admin | Todos os usuários da plataforma |
| Gerente | Todos os membros do seu escritório |
| Assessor | Apenas os próprios deals |

A função `getTeamUserIds(ctx)` implementa essa lógica no backend. Admins recebem todos os IDs; gerentes recebem os IDs de todos os membros do seu `escritorio_id`; assessores recebem apenas o próprio `userId`.

Cada chamada de API que lista análises filtra por esses IDs — garantindo isolamento total entre escritórios.

### 2.3 Funcionamento do Módulo de Aprendizado

O sistema possui dois níveis de aprendizados, injetados juntos em todos os agentes mas com escopos distintos:

**Globais (Admin)**
- Armazenados em `admin_feedbacks`
- Aplicam-se a todos os escritórios e todas as análises da plataforma
- Gerenciados em Admin → Aprendizados Globais
- Uso típico: padrões de qualidade, boas práticas transversais, calibrações sistêmicas

**Por Escritório (Gerente)**
- Armazenados em `escritorio_feedbacks` com `escritorio_id`
- Aplicam-se apenas ao escritório que os registrou — total isolamento
- Gerenciados em Dashboard → Aprendizados
- Uso típico: alertas de mercados regionais, padrões do portfólio local, ajustes de abordagem do escritório

**Injeção no contexto dos agentes:**
```
APRENDIZADOS GLOBAIS DA PLATAFORMA:
[lista dos aprendizados globais ativos]

APRENDIZADOS ESPECÍFICOS DO ESCRITÓRIO:
[lista dos aprendizados do escritório ativos]
```

Cada aprendizado pode ser ativado ou desativado individualmente. Aprendizados inativos não são injetados.

### 2.4 Pipeline de Agentes — Lógica de Execução

O pipeline executa em fases, combinando etapas sequenciais e paralelas:

```
Fase 1 (Sequencial)
└── Drive Intake — lê e resume os documentos enviados

Fase 2 (Sequencial)
└── Otto Orquestra — calcula DRS, mapeia riscos, define estratégia

Fase 3 (Paralela)
├── Pedro Panorama — viabilidade econômica + Go/No-Go
├── Davi Diagnóstico — saúde financeira + EBITDA + fluxo de caixa
├── Arthur Aquisição — valuation + tese M&A + estratégia de negociação
├── Clara Cláusula — riscos legais + documentação necessária (NDA, SHA, LOI)
├── Victor Valor — posicionamento de venda + pipeline de compradores
└── Estela Estrutura — ranking de operações de crédito estruturado

Fase 4 (Sequencial)
└── Paulo Preparo — veredicto de maturidade + roadmap de preparação

Fase 5 (Sequencial)
└── Rodrigo Relatório — revisão cruzada + consolidado de qualidade

Fase 6 (Paralela)
├── Blind Teaser — documento cego para o mercado
└── Sell-Side Pitchbook — apresentação completa sell-side
```

**Contexto injetado em cada agente:**
1. System prompt do agente (editável via Admin → Agentes, com fallback hardcoded)
2. Humanizer Directive (proíbe linguagem de IA; exige terminologia financeira)
3. Aprendizados globais ativos
4. Aprendizados do escritório ativos
5. Dados do escritório (identidade para documentos)
6. Todos os outputs anteriores do pipeline (acumulados via `buildAllOutputs()`)
7. Dados do ativo (via `formatIntake()`)
8. Conteúdo dos documentos enviados (base64 para imagens/PDFs, texto extraído para demais)

**Parâmetros técnicos:**
- Modelo: Claude Sonnet 4.6
- Max tokens por step: 10.000
- Cache control: ephemeral (prompt caching para reduzir latência e custo)
- Output: streaming via ReadableStream → renderizado em tempo real no cliente

### 2.5 Deal Readiness Score (DRS)

O DRS é calculado pelo Otto Orquestra (agente de orquestração) na segunda fase do pipeline. É um score de 0 a 100 que representa o nível de maturidade e legibilidade do deal para o mercado. É exibido visualmente na tela de análise via barra de progresso com cor semafórica.

O DRS orienta o assessor sobre o quanto o ativo ainda precisa ser preparado antes de ir ao mercado.

### 2.6 Documentos de Captação

**Blind Teaser**
- Documento cego: não identifica proprietário, localização exata ou marca do ativo
- Gerado ao final do pipeline
- Identidade do emissor: dados do escritório (nunca "RR7x Capital Hub")
- Se não houver dados cadastrados: "Assessoria Confidencial"

**Sell-Side Pitchbook**
- Apresentação completa para compradores qualificados
- Inclui tese de investimento, dados financeiros, estrutura da operação e próximos passos
- Identidade visual: logo do escritório (se disponível) + nome + contato + site + tagline no rodapé

### 2.7 Automações e Padrões Operacionais

- **Draft versionado:** O wizard de intake salva automaticamente em localStorage a cada alteração. A versão atual é `DRAFT_VERSION = 2`. Rascunhos de versões anteriores são automaticamente descartados.
- **Logo salvo automaticamente:** O upload da logo do escritório persiste imediatamente via URL assinada — sem necessidade de clicar em "Salvar".
- **Convite pré-cria perfil:** Ao convidar um usuário, o sistema cria a row em `perfis` imediatamente. O callback de autenticação detecta o perfil existente e não re-provisiona — evitando duplicações.
- **Filtro de intake para agentes:** `formatIntake()` remove Proprietário e Mandato antes de enviar para o Claude — garantindo que dados pessoais e internos nunca cheguem à IA.

---

## 3. Fluxos Operacionais

### 3.1 Cadastro de Escritório — Primeiro Usuário como Gerente

```
1. Usuário acessa /auth/signup
2. Preenche: nome completo, nome do escritório, email, senha
3. Confirma email → redirecionado para /auth/callback
4. Callback verifica se já existe row em perfis para o user_id
5. Como não existe (primeiro acesso):
   a. Cria registro em escritorios (nome = campo "nome do escritório")
   b. Cria registro em perfis com role = 'gerente' + escritorio_id recém-criado
6. Usuário entra no dashboard como Gerente do seu escritório
```

### 3.2 Convite de Usuário por Admin

```
1. Admin acessa /dashboard/admin/usuarios → Convidar
2. Define: email + papel (gerente ou assessor) + escritório
3. Sistema chama inviteUserByEmail (Supabase) com metadata:
   - invited_role: 'gerente' | 'assessor'
   - invited_escritorio_id: UUID do escritório selecionado
4. Pré-cria row em perfis com role + escritorio_id
5. Usuário recebe email com link de convite
6. Ao clicar, callback detecta perfil existente → não re-provisiona
7. Usuário entra com o papel atribuído pelo admin
```

### 3.3 Convite de Assessor por Gerente

```
1. Gerente acessa /dashboard/equipe → Convidar assessor
2. Informa o email do assessor
3. API /api/gerente/convidar cria convite com:
   - role = 'assessor'
   - escritorio_id = escritório do gerente autenticado
4. Assessor recebe email → ao confirmar, entra como assessor do escritório
```

### 3.4 Criação e Execução de um Deal

```
CADASTRO DO DEAL
│
├── Assessor/Gerente acessa /dashboard/nova-analise
├── Preenche wizard (8 etapas):
│   ├── Step 0: Proprietário (opcional, interno)
│   ├── Step 1: Mandato (opcional, interno)
│   ├── Step 2: Identificação do ativo
│   ├── Step 3: Localização + ticket estimado
│   ├── Step 4: Nível de informação
│   ├── Step 5: Resumo e tese do ativo
│   ├── Step 6: Informações adicionais
│   └── Step 7: Upload de documentos (até 15 arquivos, 20MB cada)
│
├── Submissão: POST /api/analise → cria registro em analises
└── Redirecionamento para /dashboard/analise/[id]

EXECUÇÃO DO PIPELINE
│
├── Usuário aciona cada step manualmente na tela de análise
├── Para cada step: POST /api/analise/[id]/step { step: "orchestration" }
├── API monta contexto completo:
│   ├── System prompt do agente (banco ou fallback)
│   ├── Humanizer Directive
│   ├── Aprendizados globais + escritório
│   ├── Dados do escritório
│   ├── Outputs anteriores acumulados
│   ├── Intake formatado do ativo
│   └── Conteúdo dos documentos
│
├── Claude Sonnet 4.6 gera resposta via streaming
├── Saída renderizada em tempo real no cliente (React Markdown)
└── Output armazenado em analises.outputs (JSON) → disponível para próximos agentes
```

### 3.5 Jornada Completa do Assessor

```
Login → Dashboard (lista de deals)
      → Nova Análise (wizard)
      → Tela do Deal:
          ├── Aba Resumo Executivo
          ├── Pipeline de agentes (rodar em sequência)
          ├── Visualizar outputs de cada agente
          ├── Blind Teaser (gerado automaticamente)
          └── Sell-Side Pitchbook (gerado automaticamente)
```

### 3.6 Interações entre Perfis

| Ação | Admin | Gerente | Assessor |
|------|-------|---------|----------|
| Criar deal | ✓ | ✓ | ✓ |
| Ver deals da equipe | Todos | Só seu escritório | Só os próprios |
| Convidar assessor | ✓ | ✓ (escritório próprio) | ✗ |
| Convidar gerente | ✓ | ✗ | ✗ |
| Criar escritório | ✓ | ✗ | ✗ |
| Editar dados do escritório | ✓ | ✓ (escritório próprio) | ✗ |
| Gerenciar aprendizados globais | ✓ | ✗ | ✗ |
| Gerenciar aprendizados do escritório | ✓ | ✓ | ✗ |
| Editar prompts de agentes | ✓ | ✗ | ✗ |
| Ver métricas da plataforma | ✓ | ✗ | ✗ |

---

## 4. Portal — Funcionalidades por Nível de Acesso

### 4.1 Administrador Global

**Acesso via:** `perfis.role = 'admin'`

**Dashboard Admin** (`/dashboard/admin`)
- Painel de métricas da plataforma:
  - Total de clientes (escritórios ativos)
  - Total de assinaturas ativas (recorrente + enterprise)
  - Total de análises realizadas
  - Análises por plano (avulso vs. recorrente)
- Visão operacional da saúde da plataforma em tempo real

**Usuários** (`/dashboard/admin/usuarios`)
- Lista todos os usuários cadastrados com papel, escritório e status
- Convidar novos usuários: define email, papel (admin/gerente/assessor) e escritório
- Editar papel de usuários existentes
- Ativar/desativar/banir usuários
- Atribuir ou mover usuários entre escritórios

**Escritórios** (`/dashboard/admin/escritorios`)
- Lista completa de todos os escritórios cadastrados
- Criar novo escritório manualmente
- Editar nome de escritórios existentes
- Excluir escritórios (com confirmação)
- Visualizar número de membros e deals por escritório

**Clientes** (`/dashboard/admin/clientes`)
- Lista de todos os clientes com:
  - Plano de assinatura ativo (avulso/recorrente/enterprise)
  - Créditos restantes (plano avulso)
  - Número de análises realizadas
- Busca e filtragem por plano, escritório ou status

**Agentes** (`/dashboard/admin/agentes`)
- Lista todos os agentes do pipeline com seus papéis
- Editar system prompt de cada agente individualmente
- Visualizar prompt atual + prompt padrão (fallback)
- Salvar alterações — efetivas imediatamente para todos os escritórios

**Aprendizados Globais** (`/dashboard/admin/aprendizados`)
- Registrar aprendizados que impactam todos os escritórios
- Ativar/desativar aprendizados individuais sem excluí-los
- Excluir aprendizados obsoletos
- Visualizar quais aprendizados estão sendo injetados atualmente

### 4.2 Gerente de Escritório

**Acesso via:** `perfis.role = 'gerente'` + `perfis.escritorio_id`

**Dashboard** (`/dashboard`)
- Lista todas as análises do escritório (próprias + de todos os assessores vinculados)
- Filtros por status, assessor, tipo de ativo
- Acesso rápido para abrir qualquer deal da equipe
- Criar nova análise

**Análise** (`/dashboard/analise/[id]`)
- Visualiza e executa qualquer análise do escritório
- Aciona etapas do pipeline
- Lê outputs de todos os agentes
- Acessa Blind Teaser e Pitchbook gerados

**Equipe** (`/dashboard/equipe`)
- Lista todos os assessores vinculados ao escritório
- Ver atividade: número de deals por assessor
- Convidar novo assessor (por email)
- Remover assessor do escritório

**Aprendizados** (`/dashboard/aprendizados`)
- Registrar aprendizados específicos do escritório
- Ativar/desativar aprendizados sem excluir
- Excluir aprendizados obsoletos
- Esses aprendizados afetam apenas as análises do próprio escritório

**Escritório** (`/dashboard/escritorio`)
- Editar dados institucionais:
  - Nome do escritório
  - CNPJ
  - Endereço completo (logradouro, número, complemento, bairro, cidade, UF, CEP)
  - Telefone/WhatsApp
  - Email de contato
  - Site
  - Tagline/slogan (aparece no rodapé dos documentos)
- Upload da logomarca (salva automaticamente via URL assinada)
- Todos os dados são usados na identidade dos documentos gerados pelo escritório

**Planos** (`/dashboard/planos`)
- Visualizar plano atual e créditos restantes
- Selecionar ou trocar de plano:
  - Avulso: 1 análise por compra
  - Recorrente: análises ilimitadas por assinatura mensal
  - Enterprise: contato comercial

### 4.3 Assessor

**Acesso via:** `perfis.role = 'assessor'` + `perfis.escritorio_id`

**Dashboard** (`/dashboard`)
- Lista apenas os próprios deals
- Criar nova análise
- Ver status de cada deal (rascunho, processando, concluído, erro)

**Análise** (`/dashboard/analise/[id]`)
- Visualiza e executa análises próprias
- Pipeline completo: aciona agentes, lê outputs, acessa documentos gerados
- Não pode ver análises de outros assessores

**Nova Análise** (`/dashboard/nova-analise`)
- Acesso ao wizard completo de 8 etapas
- Upload de documentos
- Rascunho salvo automaticamente no navegador

**Planos** (`/dashboard/planos`)
- Visualizar plano e créditos disponíveis
- Adquirir créditos adicionais (avulso)

**Não tem acesso a:** Equipe, Escritório (edição), Aprendizados, Painel Admin.

---

## 5. Estrutura do Portal (Front-End)

### 5.1 Navegação e Layout

**Sidebar** (lateral, persistente em todas as telas do dashboard):
- Logo Otto + subtítulo "Deal Intelligence"
- **Dashboard** — lista de análises
- **Nova Análise** — wizard de cadastro
- **Aprendizados** — (visível para gerentes)
- **Escritório** — (visível para gerentes)
- **Equipe** — (visível para gerentes)
- **Planos**
- **Admin** — (visível apenas para admins)
- Avatar + nome do usuário + logout

**Topbar** (barra superior contextual):
- Título da página atual
- Botões de ação contextuais (ex: "Novo Deal", "Convidar Assessor")
- Navegação de volta (breadcrumb simplificado)

### 5.2 Dashboard — Lista de Análises

- **Cards de análise (PipelineCard):**
  - Nome do ativo
  - Tipo de ativo (badge colorido)
  - Estágio atual do deal
  - Data de criação
  - Status de processamento (ícone + cor semafórica)
  - Assessor responsável (para gerentes)
- Paginação para escritórios com muitos deals
- Filtros planejados: por status, tipo, assessor

### 5.3 Wizard de Novo Deal (8 Etapas)

O wizard usa estado local com navegação entre steps, validação por etapa e auto-save em localStorage.

**Step 0 — Proprietário**
- Campos: Nome, CPF/CNPJ, Telefone, Email, Observações
- Step marcado como "(interno)" — usuário ciente que não vai para agentes

**Step 1 — Mandato**
- Assessor responsável: Nome, Telefone, Email
- Parceiro intermediário (opcional): Nome, Telefone, Email
- Observações do mandato

**Step 2 — Identificação do Ativo**
- Nome do ativo (campo livre)
- Tipo do ativo (select): Empresa, Imóvel/Real Estate, Startup/Scale-up, Portfólio de Crédito, Franquia, Agronegócio, Outro

**Step 3 — Localização e Ticket**
- Cidade e Estado (UF)
- Ticket estimado (campo numérico formatado em R$)
- Estágio atual (select): Cru, Estruturando, Estruturado, Em comercialização, Em negociação

**Step 4 — Objetivos e Nível de Informação**
- Objetivos do deal (multi-select com checkboxes)
- Nível de informação disponível (select): Baixo, Médio, Alto

**Step 5 — Resumo e Tese**
- Resumo executivo do ativo (textarea livre, multi-linha)
- Tese de investimento / posicionamento estratégico

**Step 6 — Informações Adicionais**
- Campo livre para dados complementares relevantes para a análise

**Step 7 — Upload de Documentos**
- Tipos aceitos: PDF, Word (.docx), Excel (.xlsx), CSV, TXT, PNG, JPG, GIF, WebP
- Limite: 15 arquivos, máximo 20MB por arquivo (5MB para imagens)
- Interface drag-and-drop + seletor de arquivo
- Preview do nome + tamanho de cada arquivo antes de enviar
- Documentos enviados ao Supabase Storage em `{userId}/{analiseId}/`

**Draft recovery:**
- Ao abrir o wizard com rascunho salvo, modal pergunta se deseja restaurar ou descartar
- Rascunhos de versões anteriores (DRAFT_VERSION < 2) são descartados automaticamente

### 5.4 Tela de Análise — Pipeline e Outputs

**Layout da tela:**
- Header com nome do ativo, tipo, estágio e ticket
- DRS Bar — barra visual do Deal Readiness Score (0–100)
- Painel de execução do pipeline (lado esquerdo)
- Área de output com abas (lado direito)

**Painel de Pipeline:**
- Lista de agentes com status (pendente / rodando / concluído / erro)
- Ícone colorido por agente (AgentMark)
- Tempo decorrido por step (timer ao vivo durante execução)
- Botão para acionar cada step

**Abas de Output:**
| Aba | Agente |
|-----|--------|
| Resumo Executivo | Consolidado final (5 seções) |
| Ingestão | Drive Intake |
| Orquestração | Otto Orquestra (inclui DRS) |
| Mercado | Pedro Panorama |
| Diagnóstico | Davi Diagnóstico |
| M&A | Arthur Aquisição |
| Contratos | Clara Cláusula |
| Originação | Victor Valor |
| Estruturação | Estela Estrutura |
| Maturidade | Paulo Preparo |
| Revisão | Rodrigo Relatório |
| Blind Teaser | Gerado ao final |
| Pitchbook | Gerado ao final |

**Live Log:**
- Linha de log em tempo real durante execução
- Formato: `[HH:MM:SS] [NomeDoAgente] mensagem`
- Indica início, progresso e conclusão de cada agente

**Streaming de texto:**
- Output é renderizado em tempo real via React Markdown conforme o Claude gera
- Suporta: headers, listas, tabelas, negrito, código inline

### 5.5 Componentes Principais

| Componente | Função |
|------------|--------|
| `PipelineCard` | Card de análise no dashboard |
| `AgentRow` | Linha de agente no painel de execução |
| `AgentMark` | Ícone colorido identificador do agente |
| `PhaseLabel` | Badge do estágio do deal |
| `DRSBar` | Barra visual do Deal Readiness Score |
| `LiveLog` | Log em tempo real da execução |
| `OttoInput` | Input padrão do sistema |
| `OttoTextarea` | Textarea padrão do sistema |
| `OttoSelect` | Select padrão do sistema |
| `Field` | Wrapper de campo com label e erro |

### 5.6 Design System

- **Stack:** Tailwind CSS v4 com oklch (perceptual color model)
- **Fonte:** Manrope (identidade RR7x)
- **Cores principais:** Cyan `#06B6D4`, Indigo `#4F46E5`
- **Renderização de Markdown:** React Markdown com suporte a tabelas e código
- **Ícones:** Lucide React

---

## 6. Regras de Permissão e Segurança

### 6.1 Hierarquia de Acessos

```
Admin Global
    │
    ├── Acesso irrestrito a todas as rotas
    ├── Pode gerenciar qualquer escritório ou usuário
    └── Único com acesso a /dashboard/admin/*

Gerente de Escritório
    │
    ├── Acesso a /dashboard/* (exceto /admin/*)
    ├── Vê apenas dados do próprio escritório
    └── Pode gerenciar assessores do próprio escritório

Assessor
    │
    ├── Acesso a /dashboard/* (exceto /admin/*, /equipe, /escritorio, /aprendizados)
    └── Vê apenas os próprios deals
```

### 6.2 Proteção de Rotas

**Middleware (`/middleware.ts`):**
- Protege todas as rotas `/dashboard/*` — usuários não autenticados são redirecionados para `/auth/login`
- Redireciona usuários autenticados de `/` para `/dashboard`
- Usa Supabase SSR client para manter sessão entre requisições server-side

**Verificação de papel no backend:**
- Toda API route que acessa dados chama `getUserContext()` primeiro
- `getUserContext()` busca `perfis.role` e `perfis.escritorio_id` do usuário autenticado
- Verificações de permissão são feitas server-side — nunca apenas no cliente

### 6.3 Isolamento de Dados entre Escritórios

- **Análises:** filtradas por `getTeamUserIds(ctx)` — assessores de outros escritórios são invisíveis
- **Aprendizados:** `escritorio_feedbacks` filtra por `escritorio_id` — nenhum escritório acessa os dados de outro
- **Documentos (Storage):** organizados por `{userId}/{analiseId}/` — acesso via URLs assinadas (tempo limitado)
- **Dados do escritório:** apenas membros do escritório (ou admin) podem ver e editar

### 6.4 Controle de Visibilidade e Edição

| Recurso | Admin | Gerente | Assessor |
|---------|-------|---------|----------|
| Ver qualquer deal | ✓ | Só do escritório | Só próprios |
| Editar deal | ✓ | Qualquer do escritório | Só próprios |
| Excluir deal | ✓ | Qualquer do escritório | Só próprios |
| Editar prompt de agente | ✓ | ✗ | ✗ |
| Registrar aprendizado global | ✓ | ✗ | ✗ |
| Registrar aprendizado do escritório | ✓ | ✓ | ✗ |
| Editar dados do escritório | ✓ | ✓ (só o próprio) | ✗ |
| Gerenciar usuários | ✓ | Só assessores do próprio escritório | ✗ |
| Ver métricas admin | ✓ | ✗ | ✗ |

### 6.5 Segurança de Dados Sensíveis

- **Proprietário/Mandato:** armazenados no banco mas filtrados por `formatIntake()` — nunca enviados ao Claude
- **Documentos:** acessados via URLs assinadas de curta duração — sem exposição direta de paths do Storage
- **Stripe:** webhooks validados por assinatura antes de processados
- **Convites:** metadata de papel e escritório trafega no JWT do convite Supabase — não em parâmetros de URL
- **Supabase RLS:** Row Level Security configurado no banco como segunda camada de proteção (além da lógica da API)

### 6.6 Planos e Controle de Créditos

| Plano | Lógica |
|-------|--------|
| Avulso | `analises_restantes` decrementado a cada deal criado. API bloqueia criação se = 0 |
| Recorrente | Sem limite de análises. Campo `plan = 'recorrente'` na tabela `subscriptions` |
| Enterprise | Sem limite. Configuração manual pelo admin |

A API `POST /api/analise` verifica o plano e créditos antes de criar qualquer análise — retornando erro 402 se sem créditos.

---

## Referência Técnica

### Stack Completa

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 16.2.4 (App Router) + React 19.2.4 |
| Estilização | Tailwind CSS v4 (oklch) |
| Banco de dados | Supabase PostgreSQL + RLS |
| Autenticação | Supabase Auth (email/senha + convites) |
| Storage | Supabase Storage |
| IA | Anthropic Claude Sonnet 4.6 (streaming + prompt caching) |
| Pagamentos | Stripe (checkout + webhooks) |
| Email | Resend |
| Deploy | Vercel |

### Arquivos Centrais

| Arquivo | Responsabilidade |
|---------|-----------------|
| `/middleware.ts` | Proteção de rotas + redirect de sessão |
| `/lib/get-role.ts` | RBAC: getUserContext, getTeamUserIds, canAccessAnalise |
| `/lib/anthropic.ts` | Cliente Claude configurado (Sonnet 4.6) |
| `/lib/types.ts` | Interfaces: DealIntake, PipelineOutputs, UserContext |
| `/lib/doc-reader.ts` | Leitura de documentos do Supabase Storage |
| `/app/api/analise/[id]/step/route.ts` | Motor de execução dos agentes (contexto + streaming) |
| `/app/dashboard/(main)/analise/[id]/page.tsx` | Tela principal de análise e pipeline |
| `/app/dashboard/(main)/nova-analise/page.tsx` | Wizard de intake (8 steps) |

### Nomenclatura Canônica

| Termo | Significado |
|-------|------------|
| Deal | Ativo sendo analisado (unidade central) |
| Proprietário | Dono do ativo — dado interno, não vai para agentes |
| Mandato | Responsabilidade operacional — dado interno |
| Ativo | O bem/empresa/imóvel sendo avaliado |
| Escritório | Unidade operacional do gerente na plataforma |
| Gerente | Responsável pelo escritório na plataforma |
| Assessor | Operacional — cria e executa deals |
| Aprendizado | Contexto registrado para calibrar agentes |
| Step | Etapa do pipeline de agentes |
| DRS | Deal Readiness Score — calculado pelo orquestrador |

---

*Otto — Deal Intelligence · RR7x Capital Hub · rr7x-portal.vercel.app*
