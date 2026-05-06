'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { IconDownload } from '@/components/Icons'

// ─── Conteúdo simulado ────────────────────────────────────────────────────────

const BLIND_TEASER = `# Projeto Helix — Blind Teaser

**ESTRITAMENTE CONFIDENCIAL — DISTRIBUIÇÃO RESTRITA**

*Emitido por: Assessoria Confidencial · Maio de 2026*

*Este documento é de uso exclusivo do destinatário e está sujeito ao Acordo de Não Divulgação previamente assinado. A reprodução, transmissão ou uso das informações aqui contidas para qualquer finalidade distinta da avaliação desta oportunidade é expressamente proibida.*

---

## Sumário da oportunidade

Oportunidade de entrada em empresa de tecnologia de gestão para o setor de saúde, com operação consolidada em âmbito nacional, base de receita recorrente e margens acima da mediana do segmento.

A empresa opera no modelo SaaS B2B, atende clínicas, laboratórios e prestadores de serviços de saúde em todo o Brasil, e apresenta crescimento consistente de receita nos últimos três exercícios sem dependência de um único cliente ou concentração geográfica relevante.

A transação estruturada é uma participação minoritária com direitos de governança robustos e mecanismos de liquidez definidos, abrindo caminho para controle em 36–48 meses.

---

## Destaques do negócio

- **Setor:** Tecnologia — SaaS vertical para saúde (gestão de clínicas e diagnóstico)
- **Modelo de receita:** Recorrente (assinatura mensal) — 94% do faturamento
- **Base de clientes:** +1.200 clientes ativos; nenhum representa mais de 3% da receita
- **Presença geográfica:** Nacional — cobertura em 23 estados
- **Fundação:** 2016 · Sede em São Paulo (SP)
- **Equipe:** 180 colaboradores diretos

---

## Métricas financeiras selecionadas

*Exercício Fiscal 2025 — dados preliminares, base non-GAAP*

| Métrica | Valor |
|---|---|
| Receita Líquida Recorrente (ARR) | **R$ 52,0 MM** |
| Receita Líquida Contábil | R$ 48,3 MM |
| Crescimento de receita (vs. 2024) | **+34%** |
| EBITDA Ajustado | **R$ 14,5 MM** |
| Margem EBITDA | **30,0%** |
| Caixa Líquido | R$ 8,2 MM |
| Churn Mensal (MRR) | 1,4% |
| Net Revenue Retention (NRR) | 114% |
| Rule of 40 | **64** |
| NPS | 72 |

---

## Valuation indicativo

**Faixa de EV: R$ 130 MM – R$ 160 MM**

Premissas: múltiplos de 2,5x–3,1x ARR e 9,0x–11,0x EBITDA Ajustado, referenciados em transações comparáveis no segmento de health tech brasileiro entre 2023 e 2025.

---

## Racional da transação

Os sócios fundadores buscam um parceiro financeiro ou estratégico para três objetivos concretos:

1. Acelerar expansão para novos verticais dentro do setor de saúde — hospitais de médio porte e operadoras de planos regionais
2. Financiar o desenvolvimento e lançamento de módulo de inteligência clínica com IA (pipeline confirmado para Q4 2026)
3. Estruturar governança corporativa para uma saída via mercado de capitais (IPO ou secondary) em horizonte de 5 anos

A empresa é rentável e autofinanciada — não há urgência de liquidez. O processo é conduzido com exclusividade por assessor financeiro.

---

## Próximos passos

Investidores qualificados devem:

1. Assinar o NDA encaminhado pela assessoria
2. Participar da Management Presentation com a administração da empresa
3. Receber o Information Memorandum completo após validação do perfil e assinatura do NDA

---

*Para manifestar interesse, entre em contato exclusivamente pela assessoria emissora deste documento.*

---

*Assessoria Confidencial · confidencial@assessoria.com.br · (11) 9 9999-0000*

*© 2026 — Este material foi preparado pela assessoria financeira responsável pelo processo e não constitui oferta de valores mobiliários. As informações são baseadas em dados fornecidos pela empresa-alvo e estão sujeitas a ajustes após due diligence completa.*
`

const SELL_SIDE_PITCHBOOK = `# Clinicorp Tecnologia S.A.
## Sell-Side Pitchbook — Oportunidade de Investimento

**ESTRITAMENTE CONFIDENCIAL — DISTRIBUIÇÃO RESTRITA**

*Emitido por: Assessoria Confidencial · Processo: Participação Minoritária com direitos de governança · Maio de 2026*

*Este documento foi preparado exclusivamente para destinatários que assinaram o Acordo de Não Divulgação (NDA). A reprodução, distribuição ou uso das informações aqui contidas para qualquer finalidade distinta da avaliação desta oportunidade é proibida.*

---

## 1. Sumário executivo

A Clinicorp Tecnologia S.A. é uma empresa de software de gestão para o setor de saúde com 1.200 clientes ativos e receita anual recorrente de R$ 52 MM. Fundada em 2016 em São Paulo, opera no modelo SaaS B2B e atende clínicas de médio porte, laboratórios de análises clínicas e centros de diagnóstico por imagem em todo o Brasil.

A empresa cresceu 34% em receita em 2025, com EBITDA de 30% — combinação que a posiciona no primeiro quartil do segmento. A base de clientes é diversificada (nenhum cliente representa mais de 3% do faturamento), e o churn mensal de 1,4% está abaixo da mediana do mercado brasileiro de SaaS vertical.

**Tese de investimento:**

A Clinicorp tem os clientes certos, o produto certo e o timing certo. O setor de saúde digital no Brasil ainda está no início da consolidação; a empresa é lucrativa, não precisa do capital para operar, e o modelo está provado em duas vertentes — clínicas ambulatoriais e diagnóstico. O próximo ciclo de crescimento (hospitais de médio porte e IA clínica) exige um parceiro estratégico, não um resgate.

---

## 2. Visão geral da empresa

### Dados institucionais

| Campo | Dado |
|---|---|
| Razão Social | Clinicorp Tecnologia S.A. |
| Fundação | Março de 2016 |
| Sede | São Paulo, SP |
| Colaboradores | 180 diretos |
| Regime Tributário | Lucro Real |
| Estrutura societária | Dois sócios fundadores (78%) + pool de opções (22%) |
| Auditoria | Auditoria independente anual desde 2022 |

### Linha do tempo

| Ano | Marco |
|---|---|
| 2016 | Fundação. MVP focado em clínicas de fisioterapia e dermatologia |
| 2018 | Expansão para laboratórios. 200 clientes. Primeiro EBITDA positivo |
| 2020 | Lançamento do módulo de telemedicina integrada — crescimento 2x durante a pandemia |
| 2022 | 800 clientes. Capital anjo + seed (R$ 5 MM) |
| 2024 | Lançamento do módulo de diagnóstico por imagem (integração com equipamentos DICOM) |
| **2025** | **1.200 clientes · ARR R$ 52 MM · Operação nacional consolidada** |

---

## 3. Produtos e plataforma

A Clinicorp opera com quatro módulos vendidos em bundles ou separadamente:

### Clinicorp Core
Gestão de agenda, prontuário eletrônico, faturamento de convênios.
- Ticket médio: R$ 1.800/mês por unidade · Base: 950 clientes · NPS: 74

### Clinicorp Lab
Gestão de fluxo laboratorial, integração LIS, laudos digitais.
- Ticket médio: R$ 2.400/mês · Base: 180 clientes · NPS: 68

### Clinicorp Imagem
Worklist DICOM, laudos radiológicos, integração com PACS.
- Ticket médio: R$ 3.200/mês · Base: 70 clientes (lançado em 2024) · NPS: 78

### Clinicorp Connect
Telemedicina, prescrição digital, portal do paciente.
- Ticket médio: R$ 890/mês (add-on) · Base: 520 clientes

### Roadmap confirmado (2026–2027)

- **Clinicorp Intelligence:** IA clínica para alertas de risco e sugestão diagnóstica — lançamento Q4 2026
- **Clinicorp Hospital:** versão para hospitais de 50–200 leitos — piloto ativo com 3 hospitais em MG e PR

---

## 4. Mercado endereçável

### TAM / SAM / SOM

| Segmento | Tamanho (R$ MM/ano) | Premissa |
|---|---|---|
| TAM — software de saúde no Brasil | R$ 4.200 MM | IBGE + ABIMO + estimativas setoriais 2025 |
| SAM — SaaS para clínicas/labs/diagnóstico | R$ 1.100 MM | ~260 mil unidades de saúde de pequeno/médio porte |
| SOM — acessível nos próximos 3 anos | R$ 320 MM | Foco SP, MG, PR, RS, RJ e expansão para interior |

### Dinâmica competitiva

O mercado de software de gestão para saúde no Brasil é fragmentado. Os três maiores players somam menos de 25% do segmento de clínicas de pequeno e médio porte.

| Concorrente | Posicionamento | Diferença vs. Clinicorp |
|---|---|---|
| Tasy (Philips) | Hospitais grandes | Não compete diretamente no segmento |
| Totvs Saúde | Clínicas e hospitais | Produto mais pesado; implementação em 3–6 meses |
| MV (Totvs, 2023) | Hospitais médios e grandes | Concentrado em hospitais acima de 200 leitos |
| Players locais | Regionais | Produto defasado, sem cobertura nacional |

**Vantagem estrutural da Clinicorp:** implementação em 72h vs. 3–6 meses dos concorrentes tradicionais; modelo cloud-native reduz custo de infraestrutura para o cliente em ~40% vs. sistemas on-premise.

---

## 5. Performance financeira

### DRE resumida (R$ MM)

| | 2023A | 2024A | 2025A | 2026E |
|---|---|---|---|---|
| Receita Bruta | 29,4 | 37,1 | 50,8 | 66,0 |
| Deduções | (1,8) | (2,3) | (2,5) | (3,3) |
| **Receita Líquida** | **27,6** | **34,8** | **48,3** | **62,7** |
| CPV / COR | (9,4) | (11,8) | (16,4) | (21,3) |
| **Margem Bruta** | **65,9%** | **66,1%** | **66,0%** | **66,0%** |
| Despesas Operacionais | (11,2) | (13,9) | (17,4) | (22,4) |
| **EBITDA Ajustado** | **7,0** | **9,1** | **14,5** | **19,0** |
| **Margem EBITDA** | **25,3%** | **26,1%** | **30,0%** | **30,3%** |
| D&A | (1,2) | (1,4) | (1,8) | (2,1) |
| EBIT | 5,8 | 7,7 | 12,7 | 16,9 |
| Resultado Financeiro | 0,4 | 0,6 | 0,8 | 0,6 |
| IR/CSLL | (1,8) | (2,4) | (4,0) | (5,3) |
| **Lucro Líquido** | **4,4** | **5,9** | **9,5** | **12,2** |

*EBITDA Ajustado exclui despesas com stock options (R$ 1,8 MM em 2025). Projeção 2026E baseada em pipeline de vendas auditado e premissas conservadoras de churn.*

### Métricas SaaS

| Métrica | 2024 | 2025 |
|---|---|---|
| ARR | R$ 38,5 MM | R$ 52,0 MM |
| MRR Médio por Cliente | R$ 2.670 | R$ 3.610 |
| Churn Mensal (MRR) | 1,7% | 1,4% |
| Net Revenue Retention (NRR) | 108% | 114% |
| LTV Médio | R$ 32.000 | R$ 38.000 |
| CAC Médio | R$ 3.800 | R$ 4.200 |
| LTV/CAC | 8,4x | 9,0x |
| CAC Payback | 14 meses | 12 meses |
| Rule of 40 | 59 | **64** |

### Balanço resumido (31/12/2025)

| Item | R$ MM |
|---|---|
| Caixa e Equivalentes | 11,4 |
| Contas a Receber (líquido) | 4,8 |
| Outros Ativos Circulantes | 1,2 |
| Ativo Total | 28,6 |
| Dívida Financeira | 3,2 |
| **Caixa Líquido** | **8,2** |
| Patrimônio Líquido | 19,4 |

---

## 6. Valuation

### Metodologia

Três metodologias independentes, resultado final como média ponderada:

| Metodologia | EV Calculado | Peso |
|---|---|---|
| Múltiplos de Receita (ARR) | R$ 130–156 MM | 40% |
| Múltiplos de EBITDA | R$ 130–160 MM | 35% |
| DCF (WACC 14,5% · g 4,0%) | R$ 138–168 MM | 25% |
| **Faixa de EV Indicativa** | **R$ 132–160 MM** | — |

### Transações comparáveis (2023–2025)

| Transação | Ano | EV/ARR | EV/EBITDA | Tipo |
|---|---|---|---|---|
| SaaS saúde (BR) — Transação A | 2024 | 2,8x | 10,2x | Minoritário |
| Health tech (BR) — Transação B | 2023 | 2,4x | 9,1x | Controle |
| SaaS vertical (BR) — Transação C | 2025 | 3,2x | 11,8x | Minoritário + tag-along |
| SaaS B2B (BR) — Transação D | 2024 | 2,6x | 9,8x | Controle |
| **Mediana** | | **2,7x** | **10,0x** | |
| **Clinicorp (faixa aplicada)** | | **2,5–3,0x** | **9,0–11,0x** | |

### Premissas do DCF

- Crescimento de receita: 35% em 2026, desacelerando para 20% até 2028 e 12% até 2030
- Margem EBITDA estável em 30–32% no período
- CAPEX: 4,5% da receita (manutenção + P&D capitalizado)
- WACC: 14,5% (Rf 6,8% + prêmio de risco 7,2% + spread small cap 0,5%)
- Valor terminal: múltiplo de saída 10x EBITDA 2030

---

## 7. Estrutura da transação

| Parâmetro | Detalhes |
|---|---|
| Tipo | Participação Minoritária com direitos de governança |
| Participação Ofertada | 30–40% do capital |
| Instrumento | Aumento de capital (ações preferenciais com direitos especiais) |
| EV da Transação | R$ 130–160 MM |
| Equity Investido | R$ 39–64 MM (conforme percentual e EV negociado) |
| Uso dos Recursos | 60% crescimento orgânico (comercial + P&D); 40% liquidez para os sócios |
| Liquidez | Tag-along, drag-along, opção de compra progressiva de controle (anos 3–5) |
| Governança | 1–2 assentos no Conselho; veto em matérias relevantes (M&A, dívida, distribuição acima de threshold) |
| Lock-up sócios | 3 anos para posição de controle; saída parcial permitida após 18 meses |

### Cronograma indicativo

| Fase | Prazo |
|---|---|
| Distribuição do Blind Teaser | Maio 2026 |
| Assinatura de NDAs | Mai–Jun 2026 |
| Management Presentation | Jun–Jul 2026 |
| Indicações de Interesse (IOI) | Julho 2026 |
| Due Diligence (selecionados) | Jul–Ago 2026 |
| Term Sheet / Proposta Vinculante | Setembro 2026 |
| Fechamento | Out–Nov 2026 |

---

## 8. Destaques para o investidor

**1. Recorrência real**
94% da receita é recorrente, com NRR de 114%. A base de clientes cresce sem depender de novos contratos.

**2. Margem estrutural**
30% de EBITDA em empresa crescendo a 34% é incomum no segmento. Não é resultado de corte de custos — é consequência do modelo cloud-native com custo marginal por cliente baixo.

**3. Barreiras de saída do cliente**
Sistema de prontuário eletrônico e histórico de exames criam switching cost elevado. O churn de 1,4% ao mês não é acidente: trocar de sistema de gestão clínica é caro, lento e arriscado para o cliente.

**4. Mercado ainda fragmentado**
Os três maiores players somam menos de 25% do mercado de gestão para clínicas de pequeno e médio porte. Há espaço real para consolidação via M&A e crescimento orgânico.

**5. Roadmap validado**
Clinicorp Intelligence e Clinicorp Hospital estão em desenvolvimento com demanda identificada e pilotos ativos — não são apostas em mercados hipotéticos.

**6. Governança pronta**
A empresa já opera com auditoria independente, controles internos formais e políticas de compliance desde 2022. O custo de formalização para o investidor é baixo.

---

## 9. Riscos relevantes

Os riscos abaixo estão identificados e discutidos abertamente com a administração da empresa:

**Concentração geográfica:** 54% da receita ainda concentrada em SP e região metropolitana. A expansão para interior e demais estados está em andamento, mas a execução não é garantida.

**Dependência de equipe técnica:** 12 engenheiros de produto compõem o núcleo de desenvolvimento. Retenção é crítica; o pool de opções (22% do capital) cobre parcialmente esse risco, mas não integralmente.

**Risco regulatório:** mudanças nas regras de interoperabilidade do CFM e ANVISA podem exigir adaptações rápidas de produto. A empresa tem histórico de adequação dentro de prazo, mas o risco existe.

**Concorrência de grandes players:** Totvs ou SAP poderiam decidir competir diretamente com produto mais agressivo e capital ilimitado. A Clinicorp tem vantagem de agilidade e conhecimento do segmento, não de capital.

**Projeção 2026E:** crescimento de 37% (para R$ 66 MM de receita) assume conversão de 70% do pipeline comercial qualificado. Abaixo desse percentual, o EBITDA estimado sofre redução proporcional.

---

## 10. Processo e próximos passos

A transação é conduzida com exclusividade pela assessoria emissora deste documento.

**Critérios para participação no processo:**
- Cheque mínimo de R$ 35 MM
- Comprovação de capacidade financeira antes do acesso ao data room
- Assinatura de NDA antes da Management Presentation

Manifestações de interesse devem ser direcionadas exclusivamente ao assessor financeiro.

---

*Assessoria Confidencial · confidencial@assessoria.com.br · (11) 9 9999-0000*

---

*Este documento foi preparado pela assessoria financeira responsável pelo processo e tem caráter exclusivamente informativo. As informações foram fornecidas pela empresa-alvo e não foram verificadas de forma independente pela assessoria. Nada neste documento constitui oferta de valores mobiliários ou recomendação de investimento. As projeções financeiras são estimativas sujeitas a riscos e incertezas que podem fazer com que os resultados reais difiram materialmente.*

*© 2026 — Assessoria Confidencial. Todos os direitos reservados.*
`

// ─── Componentes ──────────────────────────────────────────────────────────────

const TABS = [
  { key: 'blind_teaser',        label: 'Blind Teaser', content: BLIND_TEASER        },
  { key: 'sell_side_pitchbook', label: 'Pitchbook',    content: SELL_SIDE_PITCHBOOK },
]

function OutputPanel({ label, content, stepKey }: { label: string; content: string; stepKey: string }) {
  function download() {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${stepKey}-demo.md`
    a.click()
  }

  return (
    <div className="bg-surface border border-border rounded-[14px] shadow-soft-sm overflow-hidden">
      <div className="flex items-center justify-between px-7 py-4 border-b border-border">
        <h2 className="font-display text-[18px] font-medium">{label}</h2>
        <button
          onClick={download}
          className="text-[12px] text-ink-3 hover:text-ink flex items-center gap-1.5 transition-colors"
        >
          <IconDownload size={13}/> Baixar .md
        </button>
      </div>
      <div className="px-7 py-6">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => <h1 className="font-display text-[24px] font-medium tracking-tight mt-6 mb-3 text-ink">{children}</h1>,
            h2: ({ children }) => <h2 className="font-display text-[20px] font-medium tracking-tight mt-5 mb-2.5 text-ink">{children}</h2>,
            h3: ({ children }) => <h3 className="text-[15px] font-semibold mt-4 mb-2 text-ink">{children}</h3>,
            h4: ({ children }) => <h4 className="text-[13px] font-semibold mt-3 mb-1.5 text-ink">{children}</h4>,
            p:  ({ children }) => <p className="text-[13px] text-ink-2 leading-[1.7] mb-3">{children}</p>,
            ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1 text-[13px] text-ink-2">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-[13px] text-ink-2">{children}</ol>,
            li: ({ children }) => <li className="leading-[1.7]">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
            em: ({ children }) => <em className="text-ink-3 not-italic text-[12px]">{children}</em>,
            code: ({ children }) => <code className="font-mono text-[12px] bg-bg-tint px-1.5 py-0.5 rounded text-accent-ink">{children}</code>,
            pre: ({ children }) => <pre className="bg-bg-tint rounded-[10px] p-4 overflow-x-auto font-mono text-[12px] mb-3">{children}</pre>,
            table: ({ children }) => <div className="overflow-x-auto mb-4"><table className="w-full text-[13px] border-collapse">{children}</table></div>,
            thead: ({ children }) => <thead className="border-b border-border">{children}</thead>,
            th: ({ children }) => <th className="text-left py-2 pr-4 font-semibold text-ink">{children}</th>,
            td: ({ children }) => <td className="py-2 pr-4 text-ink-2 border-b border-border">{children}</td>,
            blockquote: ({ children }) => <blockquote className="border-l-2 border-accent pl-4 text-ink-2 italic my-3">{children}</blockquote>,
            hr: () => <hr className="border-border my-5"/>,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PreviewAdminPage() {
  const [activeTab, setActiveTab] = useState('blind_teaser')
  const current = TABS.find((t) => t.key === activeTab)!

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-display text-[24px] font-medium tracking-tight">Output Demo</h1>
        <p className="text-ink-3 text-[13px] mt-1">
          Simulação com dados fictícios — Clinicorp Tecnologia S.A. (health tech SaaS · R$ 52 MM ARR · EV R$ 130–160 MM)
        </p>
      </div>

      {/* Banner */}
      <div className="bg-warn-soft border border-warn/30 rounded-[10px] px-5 py-3 flex items-start gap-3 mb-6">
        <span className="text-warn text-[15px] mt-0.5 shrink-0">⚠</span>
        <p className="text-[12px] text-ink-2 leading-relaxed">
          <strong className="text-ink">Dados fictícios para validação interna.</strong>{' '}
          Esta página existe para visualizar a estrutura e apresentação final dos documentos Blind Teaser e Sell-Side Pitchbook
          gerados pelo pipeline. Nenhuma informação aqui representa uma análise real ou empresa existente.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors
              ${activeTab === t.key
                ? 'text-ink border-accent-strong'
                : 'text-ink-2 border-transparent hover:text-ink'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <OutputPanel key={current.key} label={current.label} content={current.content} stepKey={current.key}/>
    </div>
  )
}
