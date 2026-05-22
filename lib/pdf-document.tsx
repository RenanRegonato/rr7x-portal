import { Document, Page, Text, View, Link, Image, Svg, Rect, StyleSheet, Font, pdf } from '@react-pdf/renderer'
import type { Styles } from '@react-pdf/renderer'
import React from 'react'

// Desativa hifenização automática: evita quebras no meio de palavras (ex.: "Quími-cas")
// em títulos e textos longos, mantendo a quebra apenas nos espaços.
Font.registerHyphenationCallback((word) => [word])

// ─── Palette — Mesa de crédito / boutique de M&A ───────────────────────────────
// Capa em navy profundo, miolo claro institucional, azul Mandor como único acento.

const C = {
  // Navy (capa, divisórias)
  navy:       '#0B1220',
  navy2:      '#101B30',
  // Tinta (páginas claras)
  ink:        '#0F172A',
  ink2:       '#334155',
  ink3:       '#64748B',
  ink4:       '#94A3B8',
  // Acento — azul Mandor
  accent:     '#378ADD',
  accentLite: '#5BA3E8',
  accentSoft: '#EAF2FC',
  // Superfícies
  paper:      '#FFFFFF',
  paper2:     '#F7F9FC',
  border:     '#E2E8F0',
  borderSoft: '#EEF2F7',
  // Sobre navy
  onNavy:     '#FFFFFF',
  onNavy2:    '#CBD5E1',
  onNavy3:    '#7F8EA6',
  navyRule:   '#1F2C45',
  // Semântico — destaques críticos
  danger:     '#DC2626',
  dangerSoft: '#FEF2F2',
  warn:       '#B45309',
  warnSoft:   '#FFF7ED',
  ok:         '#15803D',
  okSoft:     '#F0FDF4',
}

const INK_BARS   = '#1A1C1F' // logo Mandor sobre fundo claro

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  // Páginas
  page: {
    backgroundColor: C.paper,
    paddingTop: 46,
    paddingBottom: 56,
    paddingHorizontal: 54,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: C.ink2,
  },
  coverPage: {
    backgroundColor: C.navy,
    paddingHorizontal: 56,
    paddingTop: 66,
    paddingBottom: 46,
    paddingLeft: 62,
    flexDirection: 'column',
    justifyContent: 'space-between',
    color: C.onNavy,
  },
  coverAccentBar: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0,
    width: 6,
    backgroundColor: C.accent,
  },

  // Capa
  coverTopRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  coverKicker:    { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: C.accentLite, letterSpacing: 2.6 },
  coverClass:     { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.onNavy3, letterSpacing: 1.6, textAlign: 'right' },
  coverTitle:     { fontSize: 33, fontFamily: 'Helvetica-Bold', color: C.onNavy, lineHeight: 1.12, marginBottom: 10 },
  coverSubtitle:  { fontSize: 12.5, color: C.accentLite, fontFamily: 'Helvetica-Bold', marginBottom: 22, letterSpacing: 0.2 },
  coverRule:      { width: 46, height: 2, backgroundColor: C.accent, marginBottom: 20 },
  coverResumo:    { fontSize: 11, color: C.onNavy2, lineHeight: 1.7, maxWidth: 430, marginBottom: 26 },
  coverChips:     { flexDirection: 'row', flexWrap: 'wrap', gap: 0 },
  coverChip:      { marginRight: 30, marginBottom: 6 },
  coverChipLabel: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.onNavy3, letterSpacing: 1.4, marginBottom: 3 },
  coverChipValue: { fontSize: 10.5, color: C.onNavy, fontFamily: 'Helvetica-Bold' },

  coverBottom:    {},
  coverMetaRule:  { height: 1, backgroundColor: C.navyRule, marginBottom: 18 },
  coverMetaRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 26 },
  coverMetaLabel: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.onNavy3, letterSpacing: 1.4, marginBottom: 4 },
  coverMetaValue: { fontSize: 9.5, color: C.onNavy, fontFamily: 'Helvetica-Bold' },

  // Lockup de marca (Mandor via Escritório)
  lockup:        { flexDirection: 'row', alignItems: 'center' },
  lockupVia:     { fontSize: 8, color: C.ink3, marginHorizontal: 8, fontFamily: 'Helvetica-Oblique' },
  lockupViaNavy: { fontSize: 8, color: C.onNavy3, marginHorizontal: 8, fontFamily: 'Helvetica-Oblique' },
  lockupOffice:  { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.ink },
  lockupOfficeNavy: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.onNavy },

  // Cabeçalho corrente
  pageHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 22, paddingBottom: 9,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  pageHeaderLeft:  { fontSize: 7.5, color: C.ink3, fontFamily: 'Helvetica-Bold', letterSpacing: 0.3 },
  pageHeaderRight: { fontSize: 7.5, color: C.accent, fontFamily: 'Helvetica-Bold', letterSpacing: 0.8 },

  // Rodapé
  footer: {
    position: 'absolute', bottom: 24, left: 54, right: 54,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border,
  },
  footerRight:  { alignItems: 'flex-end' },
  footerClass:  { fontSize: 6, color: C.ink4, fontFamily: 'Helvetica-Bold', letterSpacing: 1, marginBottom: 2 },
  footerPage:   { fontSize: 8, color: C.ink3, fontFamily: 'Helvetica-Bold' },

  // Abertura de seção
  sectionOpener: { marginBottom: 16 },
  sectionOrd:    { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.accent, letterSpacing: 2, marginBottom: 6 },
  sectionTitle:  { fontSize: 20, fontFamily: 'Helvetica-Bold', color: C.ink, lineHeight: 1.15, marginBottom: 8 },
  sectionRule:   { height: 2, width: 38, backgroundColor: C.accent, marginBottom: 4 },

  // Sumário
  tocTitle:   { fontSize: 24, fontFamily: 'Helvetica-Bold', color: C.ink, marginBottom: 4 },
  tocKicker:  { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: C.accent, letterSpacing: 2.4, marginBottom: 8 },
  tocIntro:   { fontSize: 9.5, color: C.ink3, lineHeight: 1.6, marginBottom: 26, maxWidth: 420 },
  tocLink:    { textDecoration: 'none' },
  tocRow:     {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.borderSoft,
  },
  tocOrd:     { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.accent, width: 30 },
  tocLabel:   { flex: 1, fontSize: 11.5, fontFamily: 'Helvetica-Bold', color: C.ink },
  tocArrow:   { fontSize: 11, color: C.ink4, fontFamily: 'Helvetica-Bold' },

  // Conteúdo
  h1:  { fontSize: 15, fontFamily: 'Helvetica-Bold', color: C.ink, marginTop: 18, marginBottom: 7, lineHeight: 1.25 },
  h2:  { fontSize: 12.5, fontFamily: 'Helvetica-Bold', color: C.ink, marginTop: 16, marginBottom: 5 },
  h3:  { fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: C.ink2, marginTop: 12, marginBottom: 4, letterSpacing: 0.2 },
  h4:  { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: C.ink3, marginTop: 8, marginBottom: 3, letterSpacing: 0.4, textTransform: 'uppercase' },
  para: { fontSize: 10, color: C.ink2, lineHeight: 1.62, marginBottom: 6 },

  bulletRow:  { flexDirection: 'row', marginBottom: 4, paddingLeft: 2 },
  bulletDot:  { width: 13, fontSize: 10, color: C.accent, fontFamily: 'Helvetica-Bold' },
  bulletText: { flex: 1, fontSize: 10, color: C.ink2, lineHeight: 1.58 },
  numberedRow:  { flexDirection: 'row', marginBottom: 4, paddingLeft: 2 },
  numberedN:    { width: 19, fontSize: 9.5, color: C.accent, fontFamily: 'Helvetica-Bold' },
  numberedText: { flex: 1, fontSize: 10, color: C.ink2, lineHeight: 1.58 },

  divider: { borderBottomWidth: 1, borderBottomColor: C.border, marginVertical: 12 },

  // Destaque / callout
  callout:      { flexDirection: 'row', backgroundColor: C.accentSoft, borderRadius: 4, padding: 11, marginVertical: 8 },
  calloutBar:   { width: 3, borderRadius: 2, backgroundColor: C.accent, marginRight: 10 },
  calloutText:  { flex: 1, fontSize: 9.5, color: C.ink2, lineHeight: 1.6 },

  // Tabela
  tableWrap:      { marginVertical: 10, borderWidth: 1, borderColor: C.border, borderRadius: 4, overflow: 'hidden' },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: C.navy2, paddingVertical: 6, paddingHorizontal: 8 },
  tableHeaderCell:{ flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.onNavy, letterSpacing: 0.3 },
  tableDataRow:   { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8 },
  tableDataRowAlt:{ flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8, backgroundColor: C.paper2 },
  tableDataCell:  { flex: 1, fontSize: 8.5, color: C.ink2, lineHeight: 1.4 },
})

// ─── Marca Mandor (vetorial) ────────────────────────────────────────────────────

function MandorMark({ h = 13, light = false }: { h?: number; light?: boolean }) {
  const bar    = light ? C.onNavy : INK_BARS
  const accent = light ? C.accentLite : C.accent
  const text   = light ? C.onNavy : INK_BARS
  const w      = (36.5 / 37) * h
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Svg width={w} height={h} viewBox="0 0 37 37">
        <Rect x="0"  y="0" width="6.5" height="37" rx="1.8" fill={bar}/>
        <Rect x="10" y="8" width="6.5" height="29" rx="1.8" fill={bar}/>
        <Rect x="20" y="8" width="6.5" height="29" rx="1.8" fill={bar}/>
        <Rect x="30" y="0" width="6.5" height="37" rx="1.8" fill={accent}/>
      </Svg>
      <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: h * 0.82, color: text, marginLeft: 3, letterSpacing: -0.4 }}>
        andor
      </Text>
    </View>
  )
}

// ─── Lockup "Mandor via {Escritório}" ─────────────────────────────────────────

function BrandLockup({ escritorio, logo, h = 13, light = false }: {
  escritorio?: string | null
  logo?: string | null
  h?: number
  light?: boolean
}) {
  return (
    <View style={S.lockup}>
      <MandorMark h={h} light={light}/>
      {escritorio || logo ? (
        <>
          <Text style={light ? S.lockupViaNavy : S.lockupVia}>via</Text>
          {logo ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image não aceta alt
            <Image src={logo} style={{ height: h + 2, maxWidth: 92, objectFit: 'contain' }}/>
          ) : (
            <Text style={light ? S.lockupOfficeNavy : S.lockupOffice}>{escritorio}</Text>
          )}
        </>
      ) : null}
    </View>
  )
}

// ─── Inline parser ────────────────────────────────────────────────────────────

type Span = { text: string; bold: boolean; italic: boolean }

function parseInline(raw: string): Span[] {
  const text = raw
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')

  const spans: Span[] = []
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*)/)
  for (const part of parts) {
    if (!part) continue
    if (part.startsWith('**') && part.endsWith('**')) {
      spans.push({ text: part.slice(2, -2), bold: true, italic: false })
    } else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      spans.push({ text: part.slice(1, -1), bold: false, italic: true })
    } else {
      spans.push({ text: part, bold: false, italic: false })
    }
  }
  return spans.filter(s => s.text.trim())
}

// ─── Block parser ─────────────────────────────────────────────────────────────

type Block =
  | { type: 'h1' | 'h2' | 'h3' | 'h4'; text: string }
  | { type: 'para';     spans: Span[] }
  | { type: 'bullet';   spans: Span[] }
  | { type: 'numbered'; spans: Span[]; n: number }
  | { type: 'table';    rows: string[][] }
  | { type: 'hr' }
  | { type: 'callout';  text: string }
  | { type: 'blank' }

function parseMarkdown(md: string): Block[] {
  const lines  = md.split('\n')
  const blocks: Block[] = []
  let tableRows: string[][] = []
  let inTable = false

  function flushTable() {
    if (tableRows.length > 0) blocks.push({ type: 'table', rows: tableRows })
    tableRows = []
    inTable   = false
  }

  for (const line of lines) {
    const t = line.trim()

    if (t.startsWith('|')) {
      const cells = t.split('|').slice(1, -1).map(c => c.trim())
      if (cells.every(c => /^[-:| ]+$/.test(c))) { inTable = true; continue }
      tableRows.push(cells)
      inTable = true
      continue
    } else if (inTable) {
      flushTable()
    }

    if (t.startsWith('# '))    { blocks.push({ type: 'h1', text: t.slice(2) });  continue }
    if (t.startsWith('## '))   { blocks.push({ type: 'h2', text: t.slice(3) });  continue }
    if (t.startsWith('### '))  { blocks.push({ type: 'h3', text: t.slice(4) });  continue }
    if (t.startsWith('#### ')) { blocks.push({ type: 'h4', text: t.slice(5) });  continue }
    if (t.startsWith('> '))    { blocks.push({ type: 'callout', text: t.slice(2).replace(/\*\*/g, '') }); continue }
    if (t.match(/^[-*+] /))    { blocks.push({ type: 'bullet', spans: parseInline(t.slice(2)) }); continue }
    if (t.match(/^\d+\. /))    {
      const n    = parseInt(t)
      const text = t.replace(/^\d+\. /, '')
      blocks.push({ type: 'numbered', spans: parseInline(text), n })
      continue
    }
    if (t.match(/^-{3,}$/) || t.match(/^\*{3,}$/)) { blocks.push({ type: 'hr' }); continue }
    if (!t || t.startsWith('!['))  { blocks.push({ type: 'blank' }); continue }

    blocks.push({ type: 'para', spans: parseInline(t) })
  }

  flushTable()

  return blocks.filter((b, i) => !(b.type === 'blank' && blocks[i - 1]?.type === 'blank'))
}

// ─── Renderers ────────────────────────────────────────────────────────────────

function InlineText({ spans, style }: { spans: Span[]; style: Styles[string] }) {
  if (spans.length === 1 && !spans[0].bold && !spans[0].italic) {
    return <Text style={style}>{spans[0].text}</Text>
  }
  return (
    <Text style={style}>
      {spans.map((s, i) => {
        const font = s.bold && s.italic
          ? 'Helvetica-BoldOblique'
          : s.bold   ? 'Helvetica-Bold'
          : s.italic ? 'Helvetica-Oblique'
          : 'Helvetica'
        const color = s.bold ? C.ink : s.italic ? C.ink3 : undefined
        return (
          <Text key={i} style={{ fontFamily: font, ...(color ? { color } : {}) }}>
            {s.text}
          </Text>
        )
      })}
    </Text>
  )
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'h1':    return <Text style={S.h1} wrap={false}>{block.text}</Text>
    case 'h2':    return <Text style={S.h2} wrap={false}>{block.text}</Text>
    case 'h3':    return <Text style={S.h3} wrap={false}>{block.text}</Text>
    case 'h4':    return <Text style={S.h4} wrap={false}>{block.text}</Text>
    case 'hr':    return <View style={S.divider}/>
    case 'blank': return <View style={{ height: 5 }}/>
    case 'callout':
      return (
        <View style={S.callout} wrap={false}>
          <View style={S.calloutBar}/>
          <Text style={S.calloutText}>{block.text}</Text>
        </View>
      )
    case 'para':
      return <InlineText spans={block.spans} style={S.para}/>
    case 'bullet':
      return (
        <View style={S.bulletRow}>
          <Text style={S.bulletDot}>›</Text>
          <InlineText spans={block.spans} style={S.bulletText}/>
        </View>
      )
    case 'numbered':
      return (
        <View style={S.numberedRow}>
          <Text style={S.numberedN}>{block.n}.</Text>
          <InlineText spans={block.spans} style={S.numberedText}/>
        </View>
      )
    case 'table': {
      if (block.rows.length === 0) return null
      const [headers, ...dataRows] = block.rows
      return (
        <View style={S.tableWrap} wrap={false}>
          <View style={S.tableHeaderRow}>
            {headers.map((h, i) => (
              <Text key={i} style={S.tableHeaderCell}>{h.replace(/\*\*/g, '')}</Text>
            ))}
          </View>
          {dataRows.map((row, ri) => (
            <View key={ri} style={ri % 2 === 1 ? S.tableDataRowAlt : S.tableDataRow}>
              {row.map((cell, ci) => (
                <Text key={ci} style={S.tableDataCell}>{cell.replace(/\*\*/g, '')}</Text>
              ))}
            </View>
          ))}
        </View>
      )
    }
    default: return null
  }
}

// ─── Tipos públicos ─────────────────────────────────────────────────────────────

export interface PdfEscritorio {
  nome:      string
  logoUrl?:  string | null
  tagline?:  string | null
  site?:     string | null
  cidadeUf?: string | null
}

export interface PdfMeta {
  escritorio?: PdfEscritorio | null
  objetivo?:   string
  ticket?:     string
  estagio?:    string
  localizacao?: string
  resumo?:     string
}

interface Section { label: string; content: string }

function ord(i: number) { return String(i + 1).padStart(2, '0') }

// ─── Capa ─────────────────────────────────────────────────────────────────────

function CoverPage({ title, subtitle, date, meta }: {
  title:    string
  subtitle?: string
  date:     string
  meta?:    PdfMeta
}) {
  const escritorioNome = meta?.escritorio?.nome ?? null
  const chips = [
    meta?.objetivo    ? { label: 'OBJETIVO',     value: meta.objetivo }   : null,
    meta?.ticket      ? { label: 'TICKET',       value: meta.ticket }     : null,
    meta?.estagio     ? { label: 'ESTÁGIO',      value: meta.estagio }    : null,
    meta?.localizacao ? { label: 'LOCALIZAÇÃO',  value: meta.localizacao }: null,
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <Page size="A4" style={[S.page, S.coverPage]}>
      <View style={S.coverAccentBar} fixed/>

      <View style={S.coverTopRow}>
        <Text style={S.coverKicker}>RELATÓRIO ANALÍTICO</Text>
        <Text style={S.coverClass}>CONFIDENCIAL{'\n'}USO RESTRITO</Text>
      </View>

      <View>
        <Text style={S.coverTitle}>{title}</Text>
        {subtitle ? <Text style={S.coverSubtitle}>{subtitle}</Text> : null}
        <View style={S.coverRule}/>
        {meta?.resumo ? <Text style={S.coverResumo}>{meta.resumo}</Text> : null}
        {chips.length > 0 ? (
          <View style={S.coverChips}>
            {chips.map((c, i) => (
              <View key={i} style={S.coverChip}>
                <Text style={S.coverChipLabel}>{c.label}</Text>
                <Text style={S.coverChipValue}>{c.value}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={S.coverBottom}>
        <View style={S.coverMetaRule}/>
        <View style={S.coverMetaRow}>
          <View>
            <Text style={S.coverMetaLabel}>ESCRITÓRIO RESPONSÁVEL</Text>
            <Text style={S.coverMetaValue}>{escritorioNome ?? '—'}</Text>
          </View>
          <View>
            <Text style={S.coverMetaLabel}>DATA DE EMISSÃO</Text>
            <Text style={S.coverMetaValue}>{date}</Text>
          </View>
          <View>
            <Text style={S.coverMetaLabel}>CLASSIFICAÇÃO</Text>
            <Text style={S.coverMetaValue}>Confidencial</Text>
          </View>
        </View>
        {/* Capa navy: nome do escritório (sempre legível); o logo entra nos rodapés claros. */}
        <BrandLockup escritorio={escritorioNome} h={15} light/>
      </View>
    </Page>
  )
}

// ─── Sumário clicável ────────────────────────────────────────────────────────

function TocPage({ title, sections }: { title: string; sections: Section[] }) {
  return (
    <Page size="A4" style={S.page}>
      <Text style={S.tocKicker}>CONTEÚDO</Text>
      <Text style={S.tocTitle}>Sumário</Text>
      <Text style={S.tocIntro}>
        Navegue diretamente para qualquer seção do relatório. Cada item é um link interno; toque
        para ir ao conteúdo correspondente.
      </Text>
      {sections.map((s, i) => (
        <Link key={i} src={`#sec-${i}`} style={S.tocLink}>
          <View style={S.tocRow}>
            <Text style={S.tocOrd}>{ord(i)}</Text>
            <Text style={S.tocLabel}>{s.label}</Text>
            <Text style={S.tocArrow}>›</Text>
          </View>
        </Link>
      ))}
      <View style={S.footer} fixed>
        <BrandLockup h={11}/>
        <View style={S.footerRight}>
          <Text style={S.footerClass}>CONFIDENCIAL · USO RESTRITO</Text>
          <Text style={S.footerPage}>{title}</Text>
        </View>
      </View>
    </Page>
  )
}

// ─── Página de conteúdo ──────────────────────────────────────────────────────

function ContentPage({ section, index, title, meta, escritorioLogo }: {
  section: Section
  index:   number
  title:   string
  meta?:   PdfMeta
  escritorioLogo?: string | null
}) {
  const blocks = parseMarkdown(section.content)
  return (
    <Page size="A4" style={S.page} wrap bookmark={{ title: `${ord(index)}  ${section.label}` }}>
      <View style={S.pageHeader} fixed>
        <Text style={S.pageHeaderLeft}>{title}</Text>
        <Text style={S.pageHeaderRight}>{section.label.toUpperCase()}</Text>
      </View>

      <View style={S.sectionOpener} id={`sec-${index}`}>
        <Text style={S.sectionOrd}>SEÇÃO {ord(index)}</Text>
        <Text style={S.sectionTitle}>{section.label}</Text>
        <View style={S.sectionRule}/>
      </View>

      {blocks.map((block, i) => <BlockView key={i} block={block}/>)}

      <View style={S.footer} fixed>
        <BrandLockup escritorio={meta?.escritorio?.nome} logo={escritorioLogo} h={11}/>
        <View style={S.footerRight}>
          <Text style={S.footerClass}>CONFIDENCIAL · USO RESTRITO</Text>
          <Text style={S.footerPage} render={({ pageNumber }) => `pág. ${pageNumber}`}/>
        </View>
      </View>
    </Page>
  )
}

export function AnalysisPdf({ title, subtitle, date, sections, meta, escritorioLogo }: {
  title:    string
  subtitle?: string
  date:     string
  sections: Section[]
  meta?:    PdfMeta
  escritorioLogo?: string | null
}) {
  const showToc = sections.length > 1
  return (
    <Document
      title={title}
      author={meta?.escritorio?.nome ?? 'Mandor'}
      creator="Mandor"
      producer="Mandor"
    >
      <CoverPage title={title} subtitle={subtitle} date={date} meta={meta}/>
      {showToc ? <TocPage title={title} sections={sections}/> : null}
      {sections.map((s, i) => (
        <ContentPage key={i} section={s} index={i} title={title} meta={meta} escritorioLogo={escritorioLogo}/>
      ))}
    </Document>
  )
}

// ─── Helpers de download ─────────────────────────────────────────────────────

function today() {
  return new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href    = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Pré-carrega o logo do escritório como data URL. Faz isso fora do react-pdf
// para que uma falha de CORS/404 vire fallback elegante (nome em tipografia)
// em vez de quebrar a geração inteira do PDF.
async function loadImageDataUrl(url?: string | null): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) return null
    const blob = await res.blob()
    if (!/^image\//.test(blob.type)) return null
    return await new Promise<string | null>((resolve) => {
      const r = new FileReader()
      r.onloadend = () => resolve(typeof r.result === 'string' ? r.result : null)
      r.onerror   = () => resolve(null)
      r.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// Renderiza com o logo do escritório, mas com salvaguarda: se o decodificador de
// imagem do react-pdf travar (alguns PNGs de logo congelam o toBlob no browser),
// cai para a renderização sem logo em vez de deixar o usuário preso em "Gerando PDF...".
async function renderBlobSafe(make: (logo: string | null) => ReturnType<typeof AnalysisPdf>, logo: string | null): Promise<Blob> {
  if (!logo) return pdf(make(null)).toBlob()
  try {
    return await Promise.race([
      pdf(make(logo)).toBlob(),
      new Promise<Blob>((_, reject) => setTimeout(() => reject(new Error('pdf-logo-timeout')), 9000)),
    ])
  } catch {
    return pdf(make(null)).toBlob()
  }
}

export async function downloadStepPdf(params: {
  label:    string
  content:  string
  title:    string
  tipo?:    string
  meta?:    PdfMeta
  filename: string
}) {
  const escritorioLogo = await loadImageDataUrl(params.meta?.escritorio?.logoUrl)
  const subtitle = [params.tipo, params.label].filter(Boolean).join('  ·  ')
  const blob = await renderBlobSafe((logo) => (
    <AnalysisPdf
      title={params.title}
      subtitle={subtitle}
      date={today()}
      sections={[{ label: params.label, content: params.content }]}
      meta={params.meta}
      escritorioLogo={logo}
    />
  ), escritorioLogo)
  triggerDownload(blob, params.filename + '.pdf')
}

export async function downloadAllPdf(params: {
  title:    string
  tipo?:    string
  sections: Section[]
  meta?:    PdfMeta
  filename: string
}) {
  const escritorioLogo = await loadImageDataUrl(params.meta?.escritorio?.logoUrl)
  const blob = await renderBlobSafe((logo) => (
    <AnalysisPdf
      title={params.title}
      subtitle={params.tipo}
      date={today()}
      sections={params.sections}
      meta={params.meta}
      escritorioLogo={logo}
    />
  ), escritorioLogo)
  triggerDownload(blob, params.filename + '.pdf')
}
