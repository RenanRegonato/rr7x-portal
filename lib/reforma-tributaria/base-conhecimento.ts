// Base de conhecimento (v1) da Reforma Tributária — Adequação (Ferrante).
//
// Destilada do e-book oficial do CFC "Reforma Tributária: o novo Sistema
// Tributário Brasileiro" (Fellipe Guerra, jun/2024) sobre a EC 132/2023.
// É injetada no prompt do agente como base de regras/critérios.
//
// IMPORTANTE: muitos pontos dependem de leis complementares ainda em
// regulamentação (2024+) e de alíquotas não definidas. Toda análise é
// PRELIMINAR. Quando o PDF técnico detalhado for fornecido, esta base é
// enriquecida (ou migrada para RAG) sem mudar a estrutura do agente.

export const REFORMA_TRIBUTARIA_KB_VERSION = 'cfc-ebook-2024-06'

export const REFORMA_TRIBUTARIA_KB = `# Base de conhecimento — Reforma Tributária (EC 132/2023)

Fonte: e-book CFC "Reforma Tributária: o novo Sistema Tributário Brasileiro" (jun/2024).
Escopo desta fase: tributos sobre o CONSUMO (a tributação sobre a renda fica para fase futura).

## Novo modelo: IVA Dual
A reforma unifica os tributos sobre consumo em um IVA de caráter dual:
- **CBS** (Contribuição sobre Bens e Serviços) — FEDERAL (art. 195, V). Substitui **PIS e Cofins**.
- **IBS** (Imposto sobre Bens e Serviços) — ESTADUAL + MUNICIPAL (art. 156-A). Substitui **ICMS e ISS**. Competência compartilhada; cada ente fixa sua alíquota por lei específica; cobrança no DESTINO; legislação uniforme nacional; o Senado fixa alíquota de referência.
- **Imposto Seletivo (IS)** — FEDERAL. Substitui, em regra, o **IPI**. Incide sobre bens/serviços prejudiciais à saúde ou ao meio ambiente ("imposto do pecado": ex. cigarro, bebida alcoólica).

## Princípios do IBS/CBS
- **Não cumulatividade ampla**: crédito sobre praticamente todas as aquisições, exceto bens/serviços de uso ou consumo pessoal (lei complementar define).
- Não integram a própria base de cálculo nem a de outros tributos.
- **Não incidem sobre exportações** (mantido o aproveitamento de créditos).
- Neutralidade; fim gradual da "guerra fiscal" e dos benefícios/incentivos de ICMS.

## Contribuição Estadual sobre Produtos Primários e Semielaborados (art. 136 ADCT)
Estados que tinham fundos de infraestrutura/habitação financiados por contribuições sobre produtos primários/semielaborados até 30/04/2023 podem instituí-la, com limites de alíquota/base. **Extinta até 31/12/2043.**

## Alíquota e carga
Alíquota do IVA estimada em torno de **27,5%** (uma das mais altas do mundo). A intenção declarada é NÃO aumentar a carga total; há "trava de referência" (revisões em 2030 e 2035 vs. PIB).

## Cronograma de transição (2023–2033)
- **2023**: promulgação da EC 132.
- **2024–2025**: regulamentação por leis complementares.
- **2026**: fase de teste — IBS 0,1% + CBS 0,9% (total 1%), compensável com PIS/Cofins.
- **2027**: CBS entra em vigor; **extinção de PIS/Cofins**; IPI com alíquota zero (ressalvada a Zona Franca de Manaus).
- **2029–2032**: redução gradual de ICMS/ISS e aumento progressivo do IBS.
- **2033**: vigência plena do novo sistema.

## Simples Nacional (impacto relevante)
- O optante pode apurar/recolher IBS/CBS **por dentro** do regime único (DAS) ou **por fora** (regime regular) — é uma escolha de planejamento.
- **Por dentro**: o optante NÃO se apropria de créditos de IBS/CBS; o adquirente NÃO optante credita-se apenas no montante equivalente ao cobrado no regime único (geralmente menor).
- **Efeito competitivo**: um adquirente no Lucro Real pode ter REDUÇÃO de créditos ao comprar de optante do Simples (no exemplo do CFC, o crédito cai de ~R$97,50 para ~R$12 numa venda de R$1.000, redução de ~R$85,50). Isso pode reduzir a atratividade comercial da empresa do Simples. A decisão "por dentro vs. por fora" é ESTRATÉGICA e depende do perfil dos clientes.

## Serviços intelectuais/regulamentados
Profissões intelectuais/regulamentadas (inclui serviços contábeis) têm **redução de 30%** na alíquota base do IVA.

## Ressalva obrigatória
Pontos centrais (alíquotas definitivas, regimes específicos, créditos, isenções) dependem de **leis complementares ainda em regulamentação**. Qualquer diagnóstico é PRELIMINAR e deve ser revisto conforme a regulamentação evolui. NÃO constitui parecer jurídico-tributário.`
