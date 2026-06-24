/**
 * Base de Conhecimento — Normas de Elegibilidade para CRI/CRA
 * Fontes: CVM 175/22, Resolução CVM 19, Regras ANBIMA
 */

export const CVM_175_22_KB_VERSION = '1.0'

export const CVM_175_22_KB = `
## Marcos Regulatórios Aplicáveis

### CVM 175/2022 — Fundo de Investimento em Direitos Creditórios (FIDC)
- Estrutura de cota: sênior, mezanino, subordinada (mínimo)
- Concentração de sacado: máximo 20% do lastro por devedor
- Retenção de cota subordinada: mínimo 25% para FIDC Padronizado
- Cedente como cotista: recomendado na subordinada (alinhamento de interesses)
- Diversificação: mínimo 10 devedores (exceto FIDC homogêneos)

### Certificados de Recebíveis Imobiliários (CRI) — CVM 88/1988
- Lastro: imóvel ou contrato imobiliário (compra-venda, locação, financiamento)
- Prazo mínimo: 24 meses (comum 36-60m)
- Concentração: máximo 20% por devedor (CRI pulverizado)
- Cedente validada: deve estar segregada de insolvência
- Tipo de oferta: ICVM 400 (pública, rating obrigatório) ou ICVM 476 (restrita, até 75 profissionais)

### Certificados de Recebíveis do Agronegócio (CRA) — CVM 89/1988
- Lastro: recebível da cadeia produtiva agrícola
- Devedores: produtor rural, cooperativa, intermediários (fornecedor/comprador)
- Concentração: máximo 20% por devedor
- Revolvência: deve estar clara no termo de securitização
- Sazonalidade: avaliar impacto de safra e commodity hedging

## Checklist de Elegibilidade

### Para CRI
1. ✓ Classificação ANBIMA: Categoria + Concentração + Segmento informados
2. ✓ Lastro documentado: Contrato de compra-venda, locação ou financiamento
3. ✓ Avaliação imóvel: Data ≤ 12 meses (standard), com AMC ou engenheiro
4. ✓ Cedente segregado: Insolvência de cedente não afeta direito creditório
5. ✓ Concentração: ≤ 20% por devedor (pulverizado) ou estrutura sub robusta (concentrado)
6. ✓ Estrutura de cotas: Sênior (60-80%) / Mezanino (10-20%) / Subordinada (≥ 25%)
7. ✓ Retenção subordinada: Cedente/administrador participa na sub (boa prática)
8. ✓ Tipo de oferta: ICVM 400 ou 476 (define prospecto/rating)
9. ✓ Rating: Obrigatório para ICVM 400; dispensável para ICVM 476
10. ✓ Prazo: Mínimo 24 meses recomendado

### Para CRA
1. ✓ Classificação ANBIMA: Atividade Devedor + Revolvência + Segmento informados
2. ✓ Lastro documentado: Contrato de fornecimento, compra, financiamento agrícola
3. ✓ Devedor qualificado: Produtor rural (MAPA), cooperativa (ACI) ou intermediário (DNRC)
4. ✓ Sazonalidade: Ciclo agrícola identificado; hedge informado (preço commodity)
5. ✓ Revolvência: Clara e definida (com limite máximo se "com revolvência")
6. ✓ Concentração: ≤ 20% por devedor ou cotas subordinadas robustas
7. ✓ Estrutura de cotas: Sênior / Mezanino / Subordinada (mínimo 25%)
8. ✓ Cedente participação: Cedente em cotas sub (alinhamento de interesses)
9. ✓ Tipo de oferta: ICVM 400 ou 476
10. ✓ Seguro/hedge: Recomendado para riscos de commodity/safra

## Regras de Concentração (ANBIMA + CVM)

### Pulverizado (≤ 20% máximo por devedor)
- Subordinação mínima: 25% (standard)
- Due diligence: Avaliação de cada crédito não exigida em detalhe (sampling)
- Fluxo: Acelerado para ICVM 476

### Concentrado (> 20% máximo por devedor, ou < 10 devedores)
- Subordinação mínima: 40% (estrutura defensiva)
- Due diligence: Análise profunda de cada sacado (inadimplência, setor, colateral)
- Retenção cedente: Essencial para credibilidade
- Fluxo: ICVM 400 (rating obrigatório)

## Riscos Comuns por Tipo

### CRI — Riscos
- Liquidação do imóvel: Mercado pode estar adverso
- Segregação cedente: Insolvência do cedente não deve afetar direito, mas impacta percepção
- Laudo desatualizado: Avaliação > 12 meses reduz confiança

### CRA — Riscos
- Sazonalidade: Fluxo concentrado em colheita; pode faltar caixa fora de safra
- Commodity: Preço de grão/açúcar impacta capacidade de pagamento do produtor
- Cooperativa: Estrutura de governança fragil (risco de calote coletivo)
- Revolvência: Se aberta, risco de deterioração da carteira ao longo do tempo

## Decisões Gating

### Bloqueios Críticos (impedem prosseguimento)
- Concentração > 20% SEM cotas subordinadas ≥ 40% → FALHA
- Cedente NÃO segregado de insolvência → FALHA
- Lastro não documentado → FALHA
- CRI sem avaliação imóvel ou datada > 24 meses → FALHA
- CRA sem ciclo agrícola definido → FALHA

### Alertas Altos (require remediação antes de publicar)
- Concentração concentrada SEM cedente em subordinada → Remediação
- Tipo de oferta indefinido (ICVM 400 vs 476) → Definir
- Estrutura de cotas fora do padrão (sub < 25%) → Aumentar retenção

### Avisos Médios (recomendação, não bloqueio)
- Imóvel com laudo > 12 meses → Atualizar antes de oferta
- CRA sem hedge de commodity → Considerar seguro
- Cedente não participa em cotas sub → Considerar alinhamento
`
