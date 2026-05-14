import pptxgen from 'pptxgenjs'

const BRAND = {
  cyan:    '06B6D4',
  indigo:  '4F46E5',
  dark:    '0F172A',
  mid:     '334155',
  light:   '94A3B8',
  white:   'FFFFFF',
  bg:      'F8FAFC',
  border:  'E2E8F0',
}

const FONT = 'Calibri'

// Converte markdown em texto limpo para os slides
function mdToText(md: string, maxChars = 1200): string {
  return md
    .replace(/#{1,6}\s+/g, '')       // headers
    .replace(/\*\*(.+?)\*\*/g, '$1') // bold
    .replace(/\*(.+?)\*/g, '$1')     // italic
    .replace(/`(.+?)`/g, '$1')       // code
    .replace(/\[.+?\]\(.+?\)/g, '')  // links
    .replace(/^\s*[-*•]\s+/gm, '• ') // bullets
    .replace(/\|[^\n]+\|/g, '')      // tables
    .replace(/---+/g, '')            // dividers
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxChars)
}

// Extrai seções H2 do markdown
function extractSections(md: string): { title: string; content: string }[] {
  const sections: { title: string; content: string }[] = []
  const parts = md.split(/^##\s+/m)
  for (const part of parts.slice(1)) {
    const lines   = part.split('\n')
    const title   = lines[0].trim()
    const content = lines.slice(1).join('\n').trim()
    if (title && content) sections.push({ title, content })
  }
  return sections
}

interface PptxInput {
  nomeAtivo:   string
  tipoAtivo?:  string
  escritorio?: string
  outputs:     Record<string, string>
  dealIntake:  Record<string, string>
}

export async function buildPptx(input: PptxInput): Promise<Buffer> {
  const prs = new pptxgen()

  prs.layout  = 'LAYOUT_WIDE' // 13.33" x 7.5"
  prs.author  = input.escritorio ?? 'Otto Intelligence — RR7x Capital Hub'
  prs.company = input.escritorio ?? 'RR7x Capital Hub'
  prs.subject = `Deal Analysis — ${input.nomeAtivo}`

  // ── Layout masters ─────────────────────────────────────────────────────
  prs.defineSlideMaster({
    title: 'COVER',
    background: { color: BRAND.dark },
  })
  prs.defineSlideMaster({
    title: 'CONTENT',
    background: { color: BRAND.white },
    objects: [
      // Linha superior
      { rect: { x: 0, y: 0, w: '100%', h: 0.04, fill: { color: BRAND.cyan } } },
      // Footer
      { rect: { x: 0, y: 7.3, w: '100%', h: 0.2, fill: { color: BRAND.bg } } },
      { text: {
          text: `${input.nomeAtivo} — CONFIDENCIAL | ${input.escritorio ?? 'RR7x Capital Hub'}`,
          options: { x: 0.4, y: 7.3, w: 11, h: 0.2, fontSize: 7, color: BRAND.light, fontFace: FONT },
        },
      },
    ],
  })

  // ── Slide 1: Capa ───────────────────────────────────────────────────────
  const cover = prs.addSlide({ masterName: 'COVER' })
  cover.addShape('rect', { x: 0, y: 0, w: 0.08, h: 7.5, fill: { color: BRAND.cyan }, line: { color: BRAND.cyan } })
  cover.addText(input.escritorio ?? 'RR7x Capital Hub', {
    x: 0.4, y: 0.5, w: 12, h: 0.4,
    fontSize: 11, color: BRAND.light, fontFace: FONT,
  })
  cover.addText(input.nomeAtivo, {
    x: 0.4, y: 1.4, w: 12, h: 1.2,
    fontSize: 36, bold: true, color: BRAND.white, fontFace: FONT,
  })
  if (input.tipoAtivo) {
    cover.addText(input.tipoAtivo, {
      x: 0.4, y: 2.6, w: 8, h: 0.4,
      fontSize: 14, color: BRAND.cyan, fontFace: FONT,
    })
  }
  const objetivo = input.dealIntake.objetivo ?? ''
  if (objetivo) {
    cover.addText(`Objetivo: ${objetivo}`, {
      x: 0.4, y: 3.1, w: 10, h: 0.35,
      fontSize: 12, color: BRAND.light, fontFace: FONT,
    })
  }
  cover.addText('CONFIDENCIAL — USO RESTRITO', {
    x: 0.4, y: 6.8, w: 12, h: 0.3,
    fontSize: 9, color: BRAND.mid, fontFace: FONT,
  })
  cover.addText(new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }), {
    x: 0.4, y: 7.1, w: 6, h: 0.25,
    fontSize: 9, color: BRAND.mid, fontFace: FONT,
  })

  // ── Slide 2: Deal Intake ─────────────────────────────────────────────
  const intake = prs.addSlide({ masterName: 'CONTENT' })
  addSectionHeader(intake, 'Deal Snapshot')

  const intakeRows = [
    ['Ativo',             input.nomeAtivo],
    ['Tipo',             input.tipoAtivo          ?? '—'],
    ['Estágio',          input.dealIntake.estagio ?? '—'],
    ['Objetivo',         input.dealIntake.objetivo ?? '—'],
    ['Ticket Estimado',  input.dealIntake.ticketEstimado ?? '—'],
    ['Localização',      input.dealIntake.localizacao ?? '—'],
    ['Nível de Info.',   input.dealIntake.nivelInformacao ?? '—'],
  ]
  intake.addTable(
    intakeRows.map(([k, v]) => [
      { text: k, options: { bold: true, color: BRAND.dark, fontSize: 11, fontFace: FONT } },
      { text: v, options: { color: BRAND.mid,  fontSize: 11, fontFace: FONT } },
    ]),
    { x: 0.5, y: 1.2, w: 12.3, colW: [3, 9.3], border: { type: 'solid', color: BRAND.border, pt: 0.5 } }
  )

  if (input.dealIntake.resumoAtivo) {
    intake.addText(mdToText(input.dealIntake.resumoAtivo, 400), {
      x: 0.5, y: 4.4, w: 12.3, h: 2.5,
      fontSize: 10, color: BRAND.mid, fontFace: FONT, wrap: true,
    })
  }

  // ── Slides por agente ─────────────────────────────────────────────────
  const agentSlides: { key: string; title: string; subtitle: string }[] = [
    { key: 'orchestration',         title: 'Orquestração — DRS',               subtitle: 'Otto Orquestra' },
    { key: 'pesquisa',              title: 'Inteligência de Mercado',           subtitle: 'Pedro Panorama' },
    { key: 'diagnostico',           title: 'Diagnóstico Financeiro',           subtitle: 'Davi Diagnóstico' },
    { key: 'kyc',                   title: 'Compliance & KYC',                 subtitle: 'Carmen Compliance' },
    { key: 'analise_ma',            title: 'Análise de M&A',                   subtitle: 'Arthur Aquisição' },
    { key: 'contratos',             title: 'Análise Contratual',               subtitle: 'Clara Cláusula' },
    { key: 'originacao',            title: 'Estratégia de Originação',         subtitle: 'Victor Valor' },
    { key: 'estruturacao',          title: 'Estruturação de Capital',          subtitle: 'Estela Estrutura' },
    { key: 'maturidade',            title: 'Veredicto de Maturidade',          subtitle: 'Paulo Preparo' },
    { key: 'relatorio_consolidado', title: 'Resumo Executivo',                 subtitle: 'Chief Intelligence Analyst' },
  ]

  for (const ag of agentSlides) {
    const content = input.outputs[ag.key]
    if (!content) continue

    const sections = extractSections(content)

    if (sections.length === 0) {
      // Slide único com texto limpo
      addContentSlide(prs, ag.title, ag.subtitle, mdToText(content))
    } else {
      // Slide de sumário do agente + até 3 slides de seções
      addContentSlide(prs, ag.title, ag.subtitle, mdToText(sections[0]?.content ?? content, 600))

      for (const sec of sections.slice(1, 4)) {
        addContentSlide(prs, sec.title, ag.title, mdToText(sec.content, 900))
      }
    }
  }

  // ── Slide final: Disclaimer ANBIMA ──────────────────────────────────
  const disc = prs.addSlide({ masterName: 'COVER' })
  disc.addShape('rect', { x: 0, y: 0, w: 0.08, h: 7.5, fill: { color: BRAND.cyan }, line: { color: BRAND.cyan } })
  disc.addText('DISCLAIMER', {
    x: 0.4, y: 0.5, w: 12, h: 0.4,
    fontSize: 14, bold: true, color: BRAND.cyan, fontFace: FONT,
  })
  disc.addText(DISCLAIMER_TEXT, {
    x: 0.4, y: 1.1, w: 12.5, h: 5.8,
    fontSize: 8.5, color: BRAND.light, fontFace: FONT, wrap: true,
  })

  return prs.write({ outputType: 'nodebuffer' }) as Promise<Buffer>
}

function addSectionHeader(slide: pptxgen.Slide, title: string) {
  slide.addShape('rect', { x: 0, y: 0.9, w: 0.06, h: 0.35, fill: { color: BRAND.cyan }, line: { color: BRAND.cyan } })
  slide.addText(title, {
    x: 0.2, y: 0.88, w: 12, h: 0.42,
    fontSize: 18, bold: true, color: BRAND.dark, fontFace: FONT,
  })
}

function addContentSlide(prs: pptxgen, title: string, subtitle: string, content: string) {
  const slide = prs.addSlide({ masterName: 'CONTENT' })
  slide.addShape('rect', { x: 0, y: 0.9, w: 0.06, h: 0.35, fill: { color: BRAND.cyan }, line: { color: BRAND.cyan } })
  slide.addText(title, {
    x: 0.2, y: 0.88, w: 10, h: 0.42,
    fontSize: 18, bold: true, color: BRAND.dark, fontFace: FONT,
  })
  slide.addText(subtitle, {
    x: 0.2, y: 1.3, w: 10, h: 0.25,
    fontSize: 10, color: BRAND.light, fontFace: FONT, italic: true,
  })
  slide.addText(content, {
    x: 0.4, y: 1.65, w: 12.5, h: 5.4,
    fontSize: 10.5, color: BRAND.mid, fontFace: FONT, wrap: true,
    valign: 'top',
  })
}

const DISCLAIMER_TEXT = `Este material foi preparado exclusivamente para uso interno e distribuição restrita a destinatários qualificados, conforme definição da Instrução CVM nº 554/2014 (Investidor Profissional) e/ou da Instrução CVM nº 558/2015.

As informações contidas neste documento foram obtidas de fontes consideradas confiáveis, incluindo dados fornecidos pela própria empresa e por fontes públicas, mas não foram objeto de auditoria ou verificação independente. A assessoria não faz qualquer declaração ou garantia, expressa ou implícita, quanto à exatidão, completude ou adequação das informações aqui contidas.

Este documento não constitui uma oferta de valores mobiliários, solicitação de compra ou venda, ou recomendação de investimento. As projeções, estimativas e opiniões aqui expressas refletem o julgamento da assessoria na data deste documento e estão sujeitas a alterações sem aviso prévio. Rentabilidade passada não representa garantia de retornos futuros.

Este material é CONFIDENCIAL. Qualquer reprodução, distribuição ou divulgação a terceiros, no todo ou em parte, sem o consentimento expresso por escrito da assessoria, é expressamente proibida. Ao receber este documento, o destinatário concorda em manter sua confidencialidade.

A assessoria e seus profissionais podem deter posições nos ativos aqui referenciados. Potenciais conflitos de interesse serão divulgados conforme exigência legal e regulatória aplicável.

Este documento foi elaborado em conformidade com o Código ANBIMA de Regulação e Melhores Práticas para Atividades de Fusões e Aquisições e Reestruturações Corporativas.`
