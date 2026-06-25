# Invest Match — Kanban (Fase C)

**Data:** 2026-06-25  
**Status:** Aprimoramentos implementados  
**Versão:** v2.1 (Fase C)

---

## O que é a Fase C

A Fase C do Invest Match Kanban adiciona refinamentos na UI/UX do painel de matching:

1. ✅ **Filtros Avançados** — por score mínimo, tipo de deal, tipo de investidor
2. ✅ **Busca** — encontrar rapidamente por empresa ou investidor
3. ✅ **Indicadores Visuais** — contador de cards por coluna, progresso
4. ⏳ **Integração com Mapa Inteligente** — sugestões de investidores baseadas no catálogo
5. ⏳ **Bulk Actions** — mover múltiplos cards, rejeitar em lote
6. ⏳ **Exportação** — matches em PDF com tese + parecer

---

## Componentes

### MatchesBoard (Kanban Base)
Arquivo: `components/invest-match/MatchesBoard.tsx`

Funcionalidades:
- ✅ Drag-drop com @dnd-kit
- ✅ Validação de transições de status
- ✅ Reconciliação com servidor (otimista + rollback)
- ✅ Cards compactos com score, resumo LLM, ações
- ✅ Feedback visual (hover, drag-over, overlay)

### MatchesBoardEnhanced (Kanban com Filtros — NOVO)
Arquivo: `components/invest-match/MatchesBoardEnhanced.tsx`

Funcionalidades (Fase C):
- ✅ Filtro de busca (empresa/investidor)
- ✅ Filtro de score mínimo (70+, 80+, 90+)
- ✅ Filtro de tipo de deal (equity, debt, crédito estruturado)
- ✅ Filtro de tipo de investidor (pessoa física, fundo, banco, securitizadora)
- ✅ Botão "Limpar filtros"
- ✅ Indicador de "X de Y oportunidades (filtradas)"

---

## Como Usar

### 1. Substituir MatchesBoard por MatchesBoardEnhanced na página

**Arquivo:** `app/dashboard/(main)/invest-match/matches/page.tsx`

**Antes:**
```tsx
<MatchesBoard initial={cards}/>
```

**Depois:**
```tsx
<MatchesBoardEnhanced initial={cards} total={total}/>
```

### 2. Filtrar Matches

1. **Busca:** Digite o nome da empresa ou investidor
2. **Score:** Selecione o score mínimo (70+, 80+, 90+)
3. **Tipo Deal:** Filtre por equity, debt, crédito estruturado
4. **Tipo Investidor:** Filtre por tipo de investidor
5. **Limpar:** Clique em "Limpar filtros" para resetar

### 3. Arrastar Cards

Os cards continuam funcionando com drag-drop:
- Clique na alça (≡) e arraste para a coluna desejada
- Validação de transição automática (mostra erro se inválida)
- Reconciliação com servidor após soltar

---

## Próximos Aprimoramentos (Fase D e além)

### Curto Prazo
- [ ] Propagar tipos de deal e investidor em BoardCard (atualmente só searchable)
- [ ] Sugestões de investidores via Mapa Inteligente
- [ ] Exportação de matches em PDF
- [ ] Bulk actions (mover múltiplos, rejeitar lote)
- [ ] Atalhos de teclado (J/K para próx/ant, Enter para detalhe)

### Médio Prazo
- [ ] Timeline visual (dias em cada estágio)
- [ ] Integração com Asset Preparation (score de prontidão no card)
- [ ] Histórico de movimentações por card
- [ ] Alertas automáticos (score acima de X, nova oportunidade, etc)
- [ ] Relatório de conversão (matches → propostas → deals fechados)

### Longo Prazo
- [ ] Painel de forecasting (pipeline projection)
- [ ] Análise de taxa de conversão por investidor/tipo deal
- [ ] Recomendações automáticas (IA: "próximo passo provável")
- [ ] Integração com CRM externo (Salesforce, Pipedrive)

---

## Arquitetura

```
MatchesBoardEnhanced (Cliente)
  ├─ Estado: searchQuery, filterTipoDeal, filterTipoInvestidor, filterScoreMin
  ├─ Lógica: Filtrar + memoizar cards
  └─ Renderiza: Barra de filtros + MatchesBoard (com cards filtrados)
       └─ MatchesBoard (drag-drop, validação, reconciliação servidor)
```

**Flow de dados:**
1. Server: Carrega matches do Supabase
2. Server → Client: Passa `initial: BoardCard[]` e `total: number`
3. Client: MatchesBoardEnhanced filtra/memoiza
4. Client → Server: Drag-end → PATCH `/api/invest-match/matches/{id}`
5. Server: Atualiza status, recalcula métricas
6. Server → Client: router.refresh() para reconciliação

---

## Notas de Performance

- **Memoização:** `useMemo` para `filteredCards` e `countByStatus` evita recálculos desnecessários
- **Limite de cards:** 500 (pode aumentar com paginação virtual mais tarde)
- **Re-renders:** Minimizados via dependency arrays precisos

---

## Testes Manuais

1. **Busca:** Digite "Alfa" → deve filtrar matches com "Alfa" em empresa ou investidor
2. **Score:** Selecione "90+" → deve mostrar apenas matches com score >= 90
3. **Drag-drop:** Arraste card de "compatível" para "proposta enviada"
4. **Validação:** Tente mover de "compatível" para "rejeitado" (deve falhar com erro)
5. **Limpar:** Clique "Limpar filtros" → deve resetar todos os filtros

---

**Criado em:** 2026-06-25
