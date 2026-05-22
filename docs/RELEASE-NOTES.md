# Mandor — Notas de Versão

**Release de Maio/2026** · Atualizado em 20/05/2026
Produção: [www.mandor.com.br](https://www.mandor.com.br)
Plataforma de análise institucional e originação de deals da RR7x Capital Hub.

---

## ⭐ Novidades desta versão

### InvestMatch Plus — módulo de originação como recurso opcional
O **InvestMatch** passa a ser um módulo **Plus**, contratado à parte e liberado escritório a escritório.
- O controle é **centralizado no gestor master da Mandor**: o escritório não ativa o recurso sozinho — apenas a administração habilita, após a contratação comercial.
- No painel administrativo, cada escritório tem uma chave **"InvestMatch Plus"** (ligar/desligar). Ao ligar, todo o módulo é liberado automaticamente; ao desligar, o acesso é encerrado.
- Para escritórios sem o Plus, o item continua visível no menu, mas o acesso abre uma **tela de apresentação** explicando o recurso e convidando à contratação — transformando o bloqueio em oportunidade comercial.

### InvestMatch — originação inteligente (lançamento do módulo)
Motor que cruza **teses de investimento** (geradas a partir das análises da Mandor) com a **base de investidores** do escritório, gerando conexões qualificadas:
- Matching multicamada (filtros, score estruturado, semântico e avaliação por IA) com **explicação de por que cada conexão faz sentido**.
- **Originação reversa**: cadastre um investidor e receba na hora as teses mais aderentes ao perfil dele.
- **Insights & calibração**: painel de conversão por faixa de score para afinar o motor ao longo do tempo.

### Pipeline assíncrono de ingestão de documentos
Leitura de **100% dos documentos** do deal, sem limite de truncamento, com processamento em segundo plano (OCR para PDFs escaneados, extração e consolidação de fatos, busca semântica sob demanda) — mais cobertura e custo controlado.

---

## A plataforma Mandor — visão geral

A Mandor é uma plataforma de **análise institucional de operações** (crédito estruturado, M&A, captação) que usa um time de **agentes de IA** auditáveis para transformar a documentação de uma empresa em uma análise consolidada e confiável — e, a partir dela, originar oportunidades com investidores. Tudo organizado por **escritório**, com papéis, pacotes e controles de governança.

---

## Módulos

### 1. Análise Institucional Multiagente (núcleo)
O coração da plataforma: um pipeline de múltiplos agentes especializados (pesquisa, diagnóstico, KYC, contratos, análise M&A, estruturação, originação, maturidade, entre outros) que trabalham **em ondas**, lendo as saídas uns dos outros para conectar riscos entre dimensões.
- Lê **toda** a documentação enviada (Drive ou upload), incluindo PDFs escaneados.
- Produz a análise completa, com **Resumo Executivo** e abas por dimensão.

### 2. Camadas de Confiabilidade
O que diferencia a Mandor de uma "IA genérica" — controles para evitar afirmações sem base:
- **Truth Layer** — extrai os fatos do dossiê (com documento e página de origem) e injeta como verdade absoluta para todos os agentes.
- **Benchmarks de mercado** — parâmetros de referência (FIDC, CRI/CRA, CCB, debêntures, M&A, crédito bancário) usados para checar viabilidade.
- **Claims estruturados** — cada agente declara, de forma auditável, em que fato/benchmark baseou cada afirmação.
- **Motor de Consistência** — detecta divergências numéricas, violação de benchmark, lacunas críticas e recomendações sem fonte.
- **Mesa Consolidadora + Sentinela** — um revisor final (tom de diretor de crédito sênior) emite veredito (aprovado / com ressalvas / revisão necessária); a Sentinela detecta "síndromes" que só aparecem ao cruzar várias dimensões.
- **Validador de Cobertura** — confere, por tipo de operação, se todos os itens esperados foram cobertos; aponta o que falta.

### 3. Controle, Revisão e Auditoria
- **Regeneração assistida** — refaça um trecho da análise com um briefing; um agente Revisor avalia o pedido antes de executar (decisão final sempre humana).
- **Cascata de impacto** — ao refazer um trecho, a plataforma identifica quais outras partes podem ser afetadas e oferece reprocessá-las.
- **Versões e atestado** — histórico de versões da análise e atestado de integridade.
- **Painel de Auditoria** — trilha completa de eventos (quem fez o quê, quando, com qual justificativa).

### 4. Colaboração e Compartilhamento
- **Equipe no deal** — múltiplos usuários colaborando na mesma análise.
- **Compartilhamento externo seguro** — link com **token assinado e expiração**, com registro de cada acesso; envio de **NDA por e-mail**.
- **Exportações** — relatórios em **Excel** e **PowerPoint (PPTX)**, além de **modelo financeiro** em planilha.
- **Documentos de captação** — geração de **Blind Teaser** e **Sell-Side Pitchbook** (com pré-visualização no admin).

### 5. InvestMatch — Originação Inteligente *(Plus)*
Ver "Novidades desta versão". Cruza teses × investidores, faz originação reversa e oferece insights de calibração. Acesso controlado pelo gestor master da Mandor.

### 6. Dados Regulatórios e de Mercado
Integrações que enriquecem a análise com fontes oficiais:
- **Banco Central (BCB)**, **CVM** e checagem **CADE** (concorrencial).
- Registro de **benchmarks** mantido pela Mandor.

### 7. Gestão de Escritórios e Equipes (multi-tenant)
- **Escritórios** com identidade própria (logo, dados) e usuários vinculados.
- **Papéis**: Gerente (acesso completo ao escritório) e Assessor (acesso aos próprios deals).
- **Convites de equipe** e gestão de membros.
- **Pacotes de análises** (Pontual / Institucional / Corporativo) contratados por escritório, com consumo controlado.
- **Benchmarks do escritório** — o gerente pode sobrescrever benchmarks globais para o próprio escritório (com trava de versão e disclaimer de responsabilidade).
- **Planos** — página de contratação.

### 8. Administração (gestor master da Mandor)
Central de controle da operação:
- **Escritórios** — cadastro, usuários, plano e a nova chave **InvestMatch Plus**.
- **Pacotes** — gestão de pacotes de análises por escritório.
- **Clientes** e **Usuários** — visão de contas, assinaturas e acessos.
- **Métricas** — total de clientes, assinaturas ativas, análises por status/dia (14 dias) e por plano.
- **Auditoria** — consulta filtrada de todos os eventos da plataforma.
- **Benchmarks globais** — propagam para todos os escritórios.
- **Agentes** — configuração dos agentes de IA.
- **Blog** — gestão de conteúdo (criar/editar/publicar).
- **Preview** — pré-visualização dos documentos de captação.

### 9. Site público, Blog e SEO
- **Homepage** institucional, **Blog** (listagem + artigo), página de **Contato**, **Privacidade** e **Termos**.
- **SEO** com sitemap dinâmico (inclui posts do blog), robots e dados estruturados (Schema.org).

### 10. Conta e Segurança
- Autenticação completa (login, cadastro, definição/recuperação de senha, conclusão de cadastro).
- Suporte a **MFA** (autenticação multifator).
- Cabeçalhos de segurança rígidos (CSP, HSTS, proteção contra clickjacking e sniffing).

---

## Infraestrutura (resumo técnico)

| Camada | Tecnologia |
|---|---|
| Aplicação | Next.js 16 (App Router), Tailwind v4 |
| Banco de dados | Supabase (PostgreSQL) + **pgvector** (busca semântica) |
| IA | Anthropic **Claude** (Opus / Sonnet / Haiku) |
| Embeddings | voyage-3-large (1024 dimensões) |
| OCR | Mistral OCR (PDFs escaneados) |
| Processamento assíncrono | Inngest (filas/jobs) |
| Pagamentos | Stripe |
| E-mail | Resend |
| Hospedagem | Vercel (produção em www.mandor.com.br) |

---

## Notas técnicas desta release

- **Migration aplicada em produção:** `20260523_invest_match_plus_toggle.sql` — coluna `escritorios.invest_match_enabled` (padrão `false`; nenhum escritório recebe o módulo sem ativação explícita).
- **Gating do InvestMatch** aplicado em três níveis: APIs do módulo (entitlement por escritório, com bypass do admin), tela de upsell no acesso e chave de ativação no painel admin.
- **Estado atual:** módulo InvestMatch desabilitado por padrão para todos os escritórios; liberação caso a caso pela administração.
