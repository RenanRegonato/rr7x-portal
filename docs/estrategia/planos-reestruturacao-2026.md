# Reestruturação dos Planos de Assinatura — Rede Mandor (2026)

> Revisão comercial + operacional dos 3 planos, com base em TODAS as funcionalidades hoje no portal, e desenho de uma estrutura flexível para o Gestor Geral (admin Mandor) configurar cada escritório.
>
> Data: 12/06/2026 · Substitui/expande [planos-comercial-mandor.md](planos-comercial-mandor.md).
> **Preços = sugestão de referência, a validar comercialmente.**

---

## 1. Diagnóstico do modelo atual

O que já existe no portal hoje:

- **Volume de análises:** tabela `pacotes` (tipo `pontual | institucional | corporativo`, `analises_total`, `analises_consumidas`). O saldo é checado antes de criar a análise.
- **Módulos pagos (gated por escritório):** `invest_match_enabled` e `reforma_tributaria_enabled` (booleanos em `escritorios`, só o admin liga).
- **Mapa Inteligente do Mercado:** hoje **aberto a todos** (não gated) — oportunidade de virar alavanca de plano.
- **Limite de usuários e de análises:** existem campos legados (`plano`, `plano_status`, `plano_limite_analises`) pouco usados; o volume real vem dos `pacotes`.
- **Papéis:** `admin` (Gestor Geral, vê tudo), `gerente` (gestor do escritório), `assessor`.

**Problema:** os planos hoje são uma lista fixa na tela `/planos` + flags soltas. Não há uma camada única que diga "o que este escritório tem direito", nem o Gestor Geral consegue compor um plano sob medida (ex.: Essential + só Reforma). É isso que vamos resolver.

---

## 2. Princípio: plano = preset; escritório = configuração

A chave da flexibilidade é separar duas coisas:

- **Plano (preset):** um modelo pronto (Essential / Professional / Enterprise) que, ao ser aplicado, define um conjunto padrão de módulos e limites.
- **Entitlements do escritório (configuração viva):** o que aquele escritório realmente tem. Começa igual ao preset do plano, mas o **Gestor Geral pode sobrescrever qualquer item** (ligar um módulo avulso, mudar um limite, conceder uma cortesia).

Assim: o comercial vende 3 planos simples; a operação ganha flexibilidade total por escritório, sem criar "plano novo" no código a cada exceção.

---

## 3. Os 3 planos reestruturados (com preços sugeridos)

> Modelo: **assinatura mensal** (destrava módulos + inclui um pacote-base de análises) + **análises extras avulsas** (overage) + **módulos avulsos** (add-ons). Valores de referência em BRL, sem impostos, a validar.

### Essential — "Diagnóstico e prontidão"
**R$ 1.490/mês** · inclui **5 análises/mês** · **até 3 usuários** · análise extra **R$ 290**
- Pipeline completo de diligência (todos os agentes) + Deal Readiness Score
- Parecer rastreável + trilha de auditoria
- Documentos de captação (Blind Teaser + Pitchbook)
- Auto-pull de CNPJ + monitoramento contínuo
- Exportação PDF / Excel / PowerPoint
- **Mapa do Mercado — consulta** (busca por nome, fichas, filtros)
- Reforma Tributária: **não incluída** (add-on)
- Suporte: padrão

### Professional — "Originação como processo" ⭐ (mais vendido)
**R$ 3.900/mês** · inclui **15 análises/mês** · **até 17 usuários** · análise extra **R$ 260**
- Tudo do Essential, mais:
- **Adequação à Reforma Tributária** (agente dedicado)
- **Invest Match** (teses + matching de 5 camadas + originação reversa, na sua base)
- **Mapa do Mercado — completo** (busca semântica IA, grafo de conexões, alvos de captação por deal, indicadores BCB)
- **Aprendizados do escritório** (inteligência acumulada)
- Regeneração/refinamento com briefing + identidade do escritório nos relatórios
- Suporte: prioritário

### Enterprise — "Inteligência institucional em escala"
**A partir de R$ 9.900/mês** (sob proposta) · **volume negociado / ilimitado** · **usuários ilimitados**
- Tudo do Professional, mais:
- **Invest Match em Rede** (conexão ampliada às fontes de capital) + **API e integrações**
- Originação reversa avançada + insights de calibração
- **Personalização de agentes** e base de conhecimento própria
- **Governança avançada, SSO** e isolamento dedicado
- Painéis de uso/custo (admin) e gerente dedicado / SLA

### Add-ons avulsos (para compor planos sob medida)
Permitem ao Gestor Geral montar exceções sem sair dos 3 planos:
| Add-on | Sugestão |
|---|---|
| Módulo Reforma Tributária (sobre o Essential) | + R$ 600/mês |
| Módulo Invest Match (sobre o Essential) | + R$ 900/mês |
| Invest Match em Rede + API | + R$ 1.500/mês |
| Pacote de +10 análises | R$ 2.400 (R$ 240/análise) |
| Usuário adicional (acima do limite) | R$ 90/usuário/mês |

> **Lógica de precificação:** o valor por análise cai conforme o plano sobe (R$ 290 → R$ 260 → negociado), premiando volume; os módulos de originação (Invest Match + Mapa completo) são o "salto" do Essential para o Professional, onde está o maior valor percebido (análise vira deal flow). Enterprise vende escala, integração e governança, não mais features de análise.

---

## 4. Matriz de configuração (o que o Gestor Geral controla por escritório)

Cada escritório passa a ter um conjunto de **entitlements** configuráveis:

**Módulos (ligar/desligar):**
`reforma_tributaria` · `invest_match` · `invest_match_rede` · `mapa_completo` · `aprendizados` · `monitoramento` · `api` · `sso`

**Limites (numéricos):**
`analises_mes` (pacote-base) · `usuarios_max` · `regeneracoes_por_analise` · `mapa_buscas_ia_mes` · `retencao_meses`

**Comercial:**
`plano` (preset aplicado) · `preco_mensal_brl` · `status` (trial/ativo/suspenso) · `suporte` (padrão/prioritário/dedicado)

Cada plano é só um **preset** desses valores; o Gestor Geral ajusta o que quiser por escritório.

| Recurso | Essential | Professional | Enterprise |
|---|:--:|:--:|:--:|
| Análises/mês incluídas | 5 | 15 | negociado |
| Usuários | 3 | 17 | ilimitado |
| Pipeline + pareceres + teaser/pitchbook | ✓ | ✓ | ✓ |
| Mapa do Mercado — consulta | ✓ | ✓ | ✓ |
| Reforma Tributária | add-on | ✓ | ✓ |
| Invest Match | add-on | ✓ | ✓ |
| Mapa completo (IA, grafo, alvos) | — | ✓ | ✓ |
| Aprendizados do escritório | — | ✓ | ✓ |
| Invest Match em Rede + API | — | — | ✓ |
| Personalização de agentes / KB próprio | — | — | ✓ |
| SSO, governança avançada, suporte dedicado | — | — | ✓ |

---

## 5. Desenho técnico da flexibilidade

### 5.1 Modelo de dados
Adicionar **um campo único** em `escritorios`:
```sql
ALTER TABLE public.escritorios
  ADD COLUMN IF NOT EXISTS plano text DEFAULT 'essential',      -- preset aplicado
  ADD COLUMN IF NOT EXISTS preco_mensal_brl numeric,
  ADD COLUMN IF NOT EXISTS entitlements jsonb NOT NULL DEFAULT '{}'::jsonb;
```
`entitlements` guarda módulos + limites (override sobre o preset). Exemplo:
```json
{
  "modulos": { "reforma_tributaria": true, "invest_match": true, "invest_match_rede": false,
               "mapa_completo": true, "aprendizados": true, "monitoramento": true, "api": false, "sso": false },
  "limites": { "analises_mes": 15, "usuarios_max": 17, "regeneracoes_por_analise": 3, "mapa_buscas_ia_mes": 200 },
  "suporte": "prioritario"
}
```
> Mantém-se compatibilidade: `invest_match_enabled` e `reforma_tributaria_enabled` continuam válidos durante a migração; o helper novo lê de `entitlements` com fallback nas flags antigas.

### 5.2 Camada única de leitura
Um helper central `getEntitlements(escritorioId)` que:
1. carrega o preset do `plano`,
2. aplica os overrides do `entitlements`,
3. retorna um objeto resolvido. E `hasModulo(escritorioId, 'invest_match')` / `getLimite(escritorioId, 'analises_mes')`.

Substitui as funções espalhadas (`isInvestMatchEnabled`, `isReformaTributariaEnabled`) por uma só, mantendo o padrão de gate em 3 camadas (UI / API / pipeline) já usado na Reforma.

### 5.3 UI do Gestor Geral
Na tela admin de escritórios (`/dashboard/admin/escritorios`), por escritório:
- Selecionar **plano** (aplica o preset) ·
- **Toggles** de cada módulo · **campos** de cada limite · **preço mensal** · **status** ·
- Botão "aplicar preset do plano" (reset) e edição livre por cima.

### 5.4 Aplicação dos limites
- `analises_mes` continua via `pacotes` (já implementado) — o preset cria/ajusta o pacote.
- `usuarios_max`: checar no convite de equipe.
- `mapa_completo`: gatear busca IA / grafo / alvos (hoje abertos) por entitlement.
- `regeneracoes_por_analise`: já existe limite; passa a ler do entitlement.

---

## 6. Roadmap de implementação (proposto)

| Fase | Entrega | Esforço |
|---|---|---|
| 1 | Migration (`plano`, `preco_mensal_brl`, `entitlements`) + presets + helper `getEntitlements` com fallback | baixo/médio |
| 2 | Refatorar gates (Invest Match, Reforma) para o helper único | médio |
| 3 | Gatear **Mapa completo** por entitlement (consulta fica em todos) | baixo |
| 4 | UI admin: configurar plano/módulos/limites/preço por escritório | médio |
| 5 | Atualizar `/planos` (vitrine) com os 3 planos + preços | baixo |

Nada disso quebra o que existe: as flags atuais continuam funcionando até a Fase 2 concluir.

---

## 7. Resumo executivo

- **3 planos** claros (Essential / Professional / Enterprise) com **preços de referência**: R$ 1.490 · R$ 3.900 · a partir de R$ 9.900/mês.
- **Flexibilidade real:** plano é preset; o Gestor Geral configura módulos, limites e preço **por escritório** num só lugar (`entitlements` jsonb + UI admin).
- **Alavanca de upgrade:** originação (Invest Match + Mapa completo) é o salto Essential → Professional; escala + API + governança é o salto → Enterprise.
- **Mapa do Mercado** entra como diferencial: consulta em todos, completo no Professional+.
