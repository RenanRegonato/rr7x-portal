# Mapa Inteligente do Mercado — Produto, Wireframes, Identidade Visual e Roadmap

> Documento 3 de 3. Ver: [01 — Relatório Executivo](mapa-inteligente-mercado-01-relatorio-executivo.md) · [02 — Arquitetura e Dados](mapa-inteligente-mercado-02-arquitetura-e-dados.md).
> Data: 12/06/2026 · Status: proposta de produto

---

## 1. Nome e posicionamento

**Nome do painel:** **Mapa Inteligente do Mercado** (rótulo curto na navegação: **"Mapa de Mercado"**).
**Tagline interna:** *o atlas do capital privado brasileiro.*

Posicionamento: não é "mais um buscador de fundos". É a **camada de inteligência de relacionamento** do mercado de crédito estruturado e originação — quem é quem, quem se conecta com quem, e quem é o parceiro certo para cada operação. Conectado ao Invest Match, fecha o ciclo originação → análise → distribuição dentro do Mandor.

> Nota de marca: nunca chamar o módulo de "plataforma/ferramenta/software" isoladamente — é um módulo do Mandor (masculino, de "Mandato"). Sem travessão (—) na copy de produto; CTA aponta para www.mandor.com.br.

---

## 2. Lista de funcionalidades priorizada

Priorização por valor × esforço, marcada por fase (MVP / V2 / V3).

| # | Funcionalidade | Valor | Esforço | Fase |
|---|---|---|---|---|
| 1 | **Busca unificada** de participantes (fundos, gestoras, bancos, FIDCs, securitizadoras, administradores, distribuidores, escritórios, boutiques) | Alto | Médio | **MVP** |
| 2 | **Ficha da entidade** (perfil 360º: papéis, veículos, métricas, fontes) | Alto | Médio | **MVP** |
| 3 | **Ficha do veículo** (fundo/FIDC: prestadores, PL, taxas, classe) | Alto | Médio | **MVP** |
| 4 | **Filtros avançados** (tipo, UF, CNAE, faixa de PL/AUM, papel, classe) | Alto | Baixo | **MVP** |
| 5 | **Rankings proprietários** (gestoras por AUM, admin por nº de FIDCs, distribuidores por alcance) | Alto | Médio | **MVP** |
| 6 | **Score de relevância** proprietário (0–100) | Alto | Médio | **MVP** |
| 7 | **Histórico / séries temporais** (PL, captação, cotistas) | Médio | Baixo | **MVP** |
| 8 | **Comparador** (lado a lado de N entidades/veículos) | Médio | Baixo | **MVP/V2** |
| 9 | **Mapa de conexões** (grafo de relacionamentos entre participantes) | Muito alto | Alto | **V2** |
| 10 | **Relacionamento entre empresas** (co-serviço, co-investimento, mesmo grupo) | Muito alto | Alto | **V2** |
| 11 | **Busca inteligente / semântica** (linguagem natural via callLLM + pgvector) | Alto | Médio | **V2** |
| 12 | **Identificação de potenciais parceiros comerciais** (sugestão de match) | Muito alto | Alto | **V2** |
| 13 | **Visualização de ecossistemas** (clusters/segmentos do mercado) | Alto | Alto | **V2/V3** |
| 14 | **Histórico de movimentações** (troca de prestador, nova captação, mudança cadastral) + **alertas** | Alto | Médio | **V3** |
| 15 | **Indicadores proprietários avançados** (apetite de alocação, momentum de captação) | Alto | Alto | **V3** |
| 16 | **Integração nativa com Invest Match** (Mapa ⇄ teses/matching) | Muito alto | Médio | **V2/V3** |
| 17 | **Enriquecimento ANBIMA Feed exibível** (mediante licença comercial) | Médio | Médio | **V3 / condicionado a contrato** |
| 18 | **Exportação / relatórios** (ficha em PDF institucional, listas) | Médio | Baixo | **V3** |

---

## 3. Arquitetura de telas e fluxo de navegação

### 3.1 Mapa de navegação

```
Dashboard (entrada do módulo)
  ├─ Busca unificada ──────────────▶ Resultados (lista + filtros)
  │                                     ├─▶ Ficha da Entidade ──┬─▶ aba Veículos ─▶ Ficha do Veículo
  │                                     │                       ├─▶ aba Métricas/Histórico
  │                                     │                       ├─▶ aba Conexões (mini-grafo) ─▶ Mapa de Conexões (full)
  │                                     │                       └─▶ aba Fontes
  │                                     └─▶ Ficha do Veículo
  ├─ Rankings ─────────────────────▶ Ranking por categoria ─▶ Ficha da Entidade
  ├─ Mapa de Conexões (grafo) ─────▶ Exploração do ecossistema
  ├─ Comparador ───────────────────▶ N entidades/veículos lado a lado
  └─ (V3) Alertas / Movimentações
```

### 3.2 Hierarquia de informação (ordem do mais ao menos importante em cada ficha)

1. **Identidade** (nome, tipo/papéis, logo, score de relevância, status).
2. **Números-chave** (cards de indicadores: AUM/PL, nº de veículos, captação 12m).
3. **Relações** (prestadores/veículos vinculados; mini-grafo).
4. **Histórico** (séries temporais).
5. **Proveniência** (fontes + data de atualização).

---

## 4. Wireframes conceituais (ASCII)

### 4.1 Dashboard executivo (entrada)

```
┌───────────────────────────────────────────────────────────────────────────┐
│  MANDOR · Mapa Inteligente do Mercado                       [⌘K Buscar]  ◐  │
├───────────────────────────────────────────────────────────────────────────┤
│  🔎  Buscar fundo, gestora, banco, FIDC, securitizadora, escritório...      │
│      ───────────────────────────────────────────────────────────────────   │
├───────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ Gestoras    │ │ FIDCs       │ │ Securitiz.  │ │ Bancos      │   cards    │
│  │   1.842     │ │   2.107     │ │     312     │ │     168     │  de totais │
│  │ AUM R$ 7,1T │ │ PL R$ 480B  │ │             │ │ Cart. PJ ↑  │            │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘            │
│                                                                             │
│  Rankings em destaque                         Movimentações recentes (V3)   │
│  ┌─────────────────────────────┐   ┌───────────────────────────────────┐   │
│  │ Top Gestoras por AUM        │   │ • FIDC X trocou de administrador  │   │
│  │ 1. ████████████  R$ 412B    │   │ • Gestora Y captou R$ 320M (mês)  │   │
│  │ 2. █████████     R$ 388B    │   │ • Nova securitizadora registrada  │   │
│  │ 3. ████████      R$ 301B    │   └───────────────────────────────────┘   │
│  │ ...                  [ver+] │                                            │
│  └─────────────────────────────┘   Ecossistema (mini mapa de conexões V2)  │
│                                     ┌───────────────────────────────────┐   │
│  Fontes:  [CVM] [BCB] [B3]          │     ○──────○        ○             │   │
│           [Receita]  · atualizado   │      \    / \      /              │   │
│           hoje 08:12                │       ○──○   ○────○               │   │
│                                     └───────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Resultados de busca + filtros avançados

```
┌──────────────────┬────────────────────────────────────────────────────────┐
│ FILTROS          │  "credito estruturado"            312 resultados        │
│                  │  ┌──────────────────────────────────────────────────┐   │
│ Tipo             │  │ ◆ Gestora Alfa Capital          Score 92  ★★★★☆  │   │
│ ☑ Gestora        │  │   Gestora · Administrador · SP   AUM R$ 41B       │   │
│ ☑ FIDC           │  │   42 veículos · 18 FIDCs        [CVM][ANBIMA*]    │   │
│ ☐ Banco          │  ├──────────────────────────────────────────────────┤   │
│ ☑ Securitizadora │  │ ◆ Beta Securitizadora           Score 78  ★★★★☆  │   │
│ ☑ Escritório CE  │  │   Securitizadora · RJ            148 CRIs         │   │
│                  │  ├──────────────────────────────────────────────────┤   │
│ UF  [SP ▾]       │  │ ◆ Gamma FIDC Multisetorial      Score 71  ★★★☆☆  │   │
│ PL  [—————o——]   │  │   FIDC · PL R$ 1,2B · gestor: Alfa Capital       │   │
│ Papel [Gestor ▾] │  └──────────────────────────────────────────────────┘   │
│ Classe [▾]       │  ◀ 1 2 3 ... 21 ▶          [Comparar selecionados (0)]   │
│                  │                                                          │
│ [Limpar] [Aplicar]   * ANBIMA = enriquecimento interno (não exibido público)│
└──────────────────┴────────────────────────────────────────────────────────┘
```

### 4.3 Ficha da entidade (perfil 360º)

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ◀ Voltar                                              [Comparar] [Exportar] │
│ ┌────┐  ALFA CAPITAL GESTÃO DE RECURSOS LTDA        Score de relevância    │
│ │LOGO│  Gestora · Administrador · São Paulo/SP       ┌─────────────────┐   │
│ └────┘  CNPJ 00.000.000/0001-00 · Ativa             │       92        │   │
│         www.alfacapital.com.br                       │   ███████████░  │   │
│                                                      └─────────────────┘   │
├───────────────────────────────────────────────────────────────────────────┤
│ [ Visão geral ] [ Veículos (42) ] [ Métricas ] [ Conexões ] [ Fontes ]     │
├───────────────────────────────────────────────────────────────────────────┤
│  CARDS DE INDICADORES                                                        │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│  │ AUM        │ │ Veículos   │ │ Captação12m│ │ Cotistas   │               │
│  │ R$ 41,2 B  │ │    42      │ │ +R$ 3,1 B  │ │  18.420    │               │
│  │   ↑ 8%     │ │ 18 FIDCs   │ │   ↑        │ │   ↑        │               │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘               │
│                                                                             │
│  Resumo (IA)            │  Mini mapa de conexões                            │
│  "Gestora independente  │     ○ Custodiante BTG                             │
│  focada em crédito      │      \                                            │
│  estruturado, atua      │   ◆ ALFA ──○ Admin Vórtex                         │
│  como gestora e admin   │      /        \                                   │
│  em 42 veículos..."     │   ○ Distrib. XP  ○ co-gestão Delta  [ver grafo ▸] │
│                                                                             │
│  Evolução do AUM (R$ B)                                                      │
│   45│                                        ╭──                            │
│   40│                          ╭────────────╯                              │
│   35│      ╭──────────────────╯                                            │
│      └────────────────────────────────────────────  Fonte: CVM · BCB      │
└───────────────────────────────────────────────────────────────────────────┘
```

### 4.4 Mapa de conexões (grafo do ecossistema) — V2

```
┌───────────────────────────────────────────────────────────────────────────┐
│  Mapa de Conexões            [Centro: Alfa Capital ▾]  [Profundidade: 2 ▾] │
│  Legenda: ◆ Gestora  ● Admin  ▲ Distribuidor  ■ Custodiante  ★ FIDC        │
├───────────────────────────────────────────────────────────────────────────┤
│                          ■ BTG (custódia)                                   │
│                         ╱                                                   │
│        ▲ XP ──────── ◆ ALFA CAPITAL ───────── ● Vórtex Admin               │
│         ╲             ╱      │        ╲              │                       │
│          ★ FIDC Gamma       │         ◆ Delta       ★ FIDC Theta            │
│                              │        (co-gestão)                           │
│                          ★ FIDC Sigma                                       │
│                                                                             │
│  Painel lateral: vínculos de ALFA CAPITAL                                   │
│  • co-serviço com Vórtex Admin  ........ 18 veículos  (forte)              │
│  • distribuído por XP ................... 12 veículos                       │
│  • co-gestão com Delta ................. 3 FIDCs                            │
│  ▸ Sugestão de parceiro (V2): "Custodiante alternativo com fit: ..."       │
└───────────────────────────────────────────────────────────────────────────┘
```

### 4.5 Comparador

```
┌───────────────────────────────────────────────────────────────────────────┐
│  Comparar                                  [+ Adicionar]  [Exportar PDF]    │
├──────────────────────┬──────────────┬──────────────┬──────────────────────┤
│                      │ Alfa Capital │ Beta Asset   │ Gamma Gestão          │
├──────────────────────┼──────────────┼──────────────┼──────────────────────┤
│ Score                │      92       │     78       │     65                │
│ AUM                  │   R$ 41,2B    │  R$ 22,8B    │  R$ 9,1B              │
│ Veículos             │      42       │     27       │     14                │
│ FIDCs                │      18       │      9       │      6                │
│ Captação 12m         │   +R$ 3,1B    │  +R$ 0,8B    │  −R$ 0,2B             │
│ Principais parceiros │ Vórtex, XP    │ BTG, BB      │ Singulare            │
└──────────────────────┴──────────────┴──────────────┴──────────────────────┘
```

---

## 5. Identidade visual do módulo

### 5.1 Diretriz de marca

O módulo **segue o design system vivo do site Mandor** — não inventa identidade própria. Antes de implementar, confirmar os tokens atuais no repo (a identidade do site evoluiu; há divergência entre o navy/Inter histórico e a direção editorial mais recente ivory/bronze + Newsreader/Hanken). **Regra prática:** importar os tokens do design system em produção, não hardcodar cores deste documento.

- **Tom:** institucional, denso de informação, "mesa de operações" — sóbrio, premium, alta legibilidade.
- **Densidade:** telas de dados pedem mais densidade que o site institucional; manter respiro mas priorizar tabela/cards eficientes (referência de densidade: Capital IQ/PitchBook, não dashboards "bonitinhos").
- **Acessibilidade:** contraste AA; números sempre tabulares (alinhamento à direita, fonte mono/tabular).

### 5.2 Componentes visuais-chave

1. **Cards de indicadores** — KPI grande + variação (↑/↓ com cor semântica), unidade clara (R$ B, qtd, %), microtendência (sparkline).
2. **Score de relevância** — selo numérico 0–100 + barra; consistente em listas e fichas (é o "selo Mandor" do participante).
3. **Mapa de relacionamentos** — grafo force-directed; nós por tipo (forma + cor), arestas com espessura = força do vínculo; foco/centro selecionável.
4. **Dashboard executivo** — grid de cards de totais + rankings + mini-grafo + movimentações.
5. **Área de logos das fontes** — rodapé/cabeçalho institucional exibindo CVM / BCB / B3 / Receita (atribuição = credibilidade). **ANBIMA só com autorização de marca.**
6. **Área de logos das instituições pesquisadas** — `entities.logo_url`, curado de fonte oficial, com fallback de monograma quando ausente.

### 5.3 Linguagem visual dos nós do grafo (proposta)

```
◆ Gestora        ● Administrador     ▲ Distribuidor
■ Custodiante    ★ Fundo/FIDC        ⬢ Banco
◇ Securitizadora ⬟ Escritório CE     ✦ Boutique / Family Office
```

---

## 6. Roadmap de implementação

### MVP — "Catálogo + Rankings sobre dado aberto" (8–10 semanas)

> Objetivo: produto navegável, legalmente limpo, com valor imediato de consulta. Zero dependência de dado licenciado.

- ETL CVM (`fi_cad`, `inf_mensal_fidc`, securitizadoras) + BCB (`if_data`) + Receita/CNPJ (reuso do auto-pull).
- Schema `mercado.*` (entities, vehicles, vehicle_providers, entity_metrics, rankings, ingestion_runs).
- Busca unificada (full-text `pg_trgm`) + filtros avançados.
- Ficha da entidade + ficha do veículo + cards de indicadores + séries históricas.
- Rankings proprietários + score de relevância v1.
- Dashboard executivo.
- Atribuição de fonte + gate `redistribuivel`.
- **Critério de saída:** usuário busca qualquer gestora/FIDC/securitizadora e vê ficha + métricas + ranking, com dados batendo com a fonte oficial.

### Versão 2 — "Inteligência de relacionamento" (após MVP, ~8 semanas)

- `entity_edges` materializada + **mapa de conexões** (grafo).
- Relacionamento entre empresas (co-serviço, co-investimento, mesmo grupo).
- Busca semântica (pgvector + callLLM) e resumos de entidade por IA.
- Comparador completo.
- **Identificação de potenciais parceiros comerciais** (sugestão de match).
- **Integração com Invest Match** (Mapa enriquece teses; matching consome o grafo).
- (Condicional) início do enriquecimento interno via ANBIMA Feed.

### Versão 3 — "Monitoramento e indicadores avançados" (após V2)

- Histórico de movimentações + **alertas** (troca de prestador, nova captação, mudança cadastral) — reuso do padrão de monitoramento contínuo de CNPJ.
- Indicadores proprietários avançados (apetite de alocação, momentum de captação, *dry powder* estimado).
- Visualização de ecossistemas (clusters/segmentos).
- Exportação / relatórios institucionais (ficha em PDF).
- (Condicional a licença) **enriquecimento ANBIMA Feed exibível** ao usuário final.

---

## 7. Métricas de sucesso (sugestão)

| Métrica | MVP | V2 | V3 |
|---|---|---|---|
| Entidades catalogadas | > 5.000 | > 15.000 | > 25.000 |
| Cobertura de prestadores por veículo | 80% | 95% | 98% |
| Buscas/usuário ativo/semana | — | tracking | crescente |
| Matches Mapa→Invest Match gerados | — | piloto | recorrente |
| Frescor do dado (defasagem vs. fonte) | ≤ 1 dia (CVM) | ≤ 1 dia | ≤ 1 dia + alertas |

---

## 8. Dependências e decisões em aberto

1. **Jurídico:** validar ODbL (share-alike), LGPD de QSA, uso de logos/marcas (ver §4 do relatório executivo). **Bloqueante para go-live.**
2. **Comercial ANBIMA:** decidir se vamos negociar licença de redistribuição do Feed (define se #17 entra na V3).
3. **Coponto:** confirmar limites do contrato atual para uso interno/cruzamento (não redistribuir).
4. **Design system:** confirmar tokens vivos do site antes de implementar a UI (§5.1).
5. **Posição na navegação:** módulo próprio no `app/dashboard` ou submódulo do Invest Match? (recomendação: módulo próprio com integração bidirecional).
