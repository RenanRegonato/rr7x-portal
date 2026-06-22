# O Mandor para FIDCs, Securitizadoras e Crédito Estruturado

> Go-to-market + roadmap de produto. Documento de estratégia, derivado do memorando "análise site e plataforma" (22/06/2026) e verificado contra o código-fonte. Cada afirmação de capacidade existente tem âncora no repositório.

## 1. Tese

O core d'O Mandor é agnóstico ao veículo: o que ele analisa é o ativo e sua viabilidade de captação. FIDCs, securitizadoras e gestoras de crédito têm exatamente o mesmo problema das boutiques de M&A para as quais o produto foi desenhado: mais pipeline do que capacidade analítica, exigência de padronização e rastreabilidade, e pressão para não errar o deal.

A infraestrutura para crédito estruturado já existe e já está parametrizada com base regulatória real (CVM 175/22 nos benchmarks). O gap não é de core tecnológico. É de posicionamento, linguagem de UX e três peças de produto bem delimitadas.

## 2. O que já está pronto (reuso imediato, verificado no código)

| Capacidade | Onde está | Aplicação a FIDC/Sec |
|---|---|---|
| Benchmarks nativos de FIDC com 8 parâmetros regulatórios (concentração por devedor 20-25%, PL mínimo do cedente R$ 2M, prazo 36-60m, spread sênior CDI+1,5-3,5%, spread sub CDI+5-12%, custo de estruturação 0,5-2%, ticket R$ 5-10M, nº mín. devedores 10) | `supabase/migrations/20260515_benchmarks.sql`, `lib/benchmarks.ts` | Estruturação de cota e teste de elegibilidade já saem com referência de mercado correta |
| Instrumentos de crédito como presets de benchmark: FIDC, CRI, CRA, CCB, Debênture, Debênture Incentivada, Crédito Bancário | `app/dashboard/admin/benchmarks/page.tsx` | Toda a pilha de crédito estruturado tem parâmetro nativo, com override por escritório |
| FIDC e securitizadora como tipos nativos no Mapa do Mercado, sobre dado público (CVM/BCB/B3/Receita) | `lib/mapa-mercado/types.ts` (`securitizadora`, `escritorio_credito_estruturado`; veículos `FIDC/CRI/CRA/CCB`) | Atlas de para-quem-levar o deal já cobre o segmento |
| Invest Match mapeia deals de crédito a veículos FIDC | `lib/invest-match/sugestoes-mercado.ts` (`credito_estruturado/debt/special_situations → FIDC`) | Originação e distribuição de série/tranche por aderência |
| Agente de Estruturação de Crédito + Parecer da Mesa de Crédito + KYC & Compliance | `lib/analise/run-pipeline.ts` (steps `estruturacao`, `kyc`, consolidação) | Diligência de cedente/devedor e ranqueamento CRI/CRA/debênture/securitização |
| Tipo de ativo "Portfólio de Crédito" | `app/dashboard/(main)/nova-analise/page.tsx:16` | Porta de entrada atual para carteiras (genérica) |
| Entitlement de monitoramento contínuo no Enterprise | `lib/entitlements-presets.ts` (`monitoramento`) | Base para monitoramento de carteira (hoje voltado a deal pontual) |

Prova social já dentro do motor: o Invest Match ranqueia automaticamente Pátria Crédito Estruturado FIDC, Kinea Crédito Estruturado, Vinci Special Situations e Itaú BBA DCM como destinos. O segmento já consome o produto sem ter um go-to-market próprio.

## 3. Os gaps reais (confirmados no código)

1. **Sem entrada de deal dedicada a FIDC/Sec.** Crédito estruturado cai em "Portfólio de Crédito" genérico. Faltam campos de cedente, originador, tipo de recebível, estrutura de cotas (sênior/mez/sub) e série.
2. **Sem categoria de investidor FIDC/securitizadora no Invest Match.** `lib/invest-match/types.ts` só tem `fundo`/`gestora`. FIDC e securitizadora não são modelados como tipo próprio de investidor, o que reduz precisão de matching e de linguagem.
3. **Sem módulo regulatório CVM 175/22 específico de gestão de FIDC** (estrutura de classes, elegibilidade de cota, relatório de gestão). Há os benchmarks, não a camada de adequação.
4. **Sem análise de recebíveis em lote** (scoring de carteira, não deal-a-deal), necessária para FIDC de varejo/consignado.
5. Securitizadoras na base do Mapa estão subestimadas (a categoria existe; a cobertura de dado é rasa).

## 4. Go-to-market comercial

### Segmentos e a dor que O Mandor resolve
- **FIDCs:** triagem de cedentes em escala, diligência de originadores antes da admissão, base para relatório de monitoramento ao cotista, adequação tributária da cessão fiduciária pós-reforma.
- **Securitizadoras (CRI/CRA, CVM 88/160):** análise do lastro e do devedor, ranqueamento de viabilidade da emissão, Blind Teaser e Pitchbook como base de memorando de oferta, distribuição por série via Invest Match.
- **Gestoras de crédito privado / special situations:** triagem de pipeline amplo, diagnóstico de distress, originação reversa por mandato.
- **Bancos / assessoria de dívida estruturada:** pre-deal screening e comparação automática entre CRI, CRA, debênture e securitização.

### Linguagem própria (UX e material)
Substituir o vocabulário de M&A pela linguagem do gestor de crédito quando o veículo for FIDC/Sec: cedente, originador, lastro, recebível, elegibilidade, cota sênior/mezanino/subordinada, série, tranche, concentração por sacado, índice de subordinação.

### Narrativa de venda
"Antes de admitir o cedente ou estruturar a emissão, você sabe se o lastro se sustenta, em diligência rastreável, em 90 minutos." Ancorar nos benchmarks CVM 175/22 já nativos (credibilidade técnica imediata) e na presença de FIDCs reais no motor de matching (não é promessa, é o que já roda).

## 5. Roadmap de produto (esforço x impacto)

Ordem proposta, do que mais reusa o que já existe ao que mais constrói.

| # | Item | Esforço | Impacto GTM | Reuso |
|---|---|---|---|---|
| 1 | ✅ **Entrada de deal dedicada FIDC/Sec (entregue 22/06).** Tipos de ativo "FIDC / Crédito Estruturado" e "Securitização (CRI / CRA)" + campos condicionais (cedente/originador, tipo de recebível, estrutura de cotas/tranches, série/emissão), persistidos no `deal_intake`. `formatIntake` injeta bloco "Estrutura de Crédito" para a Mesa de Crédito, estruturação e KYC; o nome do tipo direciona o `tipo_deal` do Invest Match para crédito estruturado. Sem migration. | Médio | Alto | Pipeline, benchmarks, KYC, estruturação de crédito (tudo pronto) |
| 2 | **Tipo de investidor FIDC/securitizadora no Invest Match.** Estende `TipoInvestidor` e o matching/sugestões para reconhecer a categoria explicitamente. | Baixo-Médio | Médio-Alto | Motor de matching e Mapa do Mercado já existem |
| 3 | **Camada de adequação CVM 175/22** na análise do deal de crédito (elegibilidade de cota, classes, concentração), no molde do módulo Reforma Tributária. | Alto | Alto | Padrão do módulo Reforma Tributária + benchmarks FIDC |
| 4 | **Monitoramento contínuo de carteira** (não só deal pontual), usando o entitlement `monitoramento` já existente. | Alto | Médio | Entitlement + Diagnóstico Financeiro + cron/Inngest |
| 5 | **Scoring de recebíveis em lote** para FIDC de varejo/consignado. | Alto | Médio (nicho) | Diagnóstico Financeiro |
| - | **Adensar securitizadoras no Mapa** (ETL/cobertura). | Baixo | Baixo-Médio | ETL do Mapa já existe |

## 6. Próximo passo recomendado

O item 1 (entrada de deal dedicada FIDC/Sec) foi entregue em 22/06: destravou a linguagem e a percepção de "produto feito para mim" sem reconstruir nada, reusando agentes de crédito, benchmarks e KYC que já existiam. Falta validar ao vivo (abrir um deal de teste do tipo FIDC em escritório isolado e conferir que o bloco de estrutura de crédito chega ao relatório).

O próximo passo é o **item 2 (tipo de investidor FIDC/securitizadora no Invest Match)**: complemento de menor esforço que fecha o ciclo originação-distribuição com a linguagem do segmento, estendendo `TipoInvestidor` em `lib/invest-match/types.ts` e o matching/sugestões para reconhecer a categoria explicitamente.

Depois dele, o item 3 (camada de adequação CVM 175/22) é o de maior impacto de autoridade, no molde do módulo Reforma Tributária.

## Referências
- Memorando de origem: `~/Desktop/analise site e plataforma.docx` (externo ao repo).
- Diagnóstico verificado contra o código em 22/06/2026 (esta sessão).
