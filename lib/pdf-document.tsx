import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
import type { Styles } from '@react-pdf/renderer'
import React from 'react'

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = {
  bg:         '#faf9f7',
  surface:    '#ffffff',
  border:     '#e8e2d8',
  ink:        '#1a1208',
  ink2:       '#5a4e42',
  ink3:       '#8a7a68',
  accent:     '#c04a2a',
  accentSoft: '#fdf0ea',
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  // Pages
  page: {
    backgroundColor: C.bg,
    paddingTop: 44,
    paddingBottom: 60,
    paddingHorizontal: 52,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: C.ink2,
  },
  coverPage: {
    backgroundColor: C.surface,
    paddingHorizontal: 64,
    paddingTop: 72,
    paddingBottom: 48,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  // Cover elements
  coverTag: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.accent,
    letterSpacing: 2,
    marginBottom: 36,
  },
  coverTitle: {
    fontSize: 30,
    fontFamily: 'Helvetica-Bold',
    color: C.ink,
    lineHeight: 1.15,
    marginBottom: 10,
  },
  coverSubtitle: {
    fontSize: 13,
    color: C.ink3,
    lineHeight: 1.6,
    marginBottom: 48,
  },
  coverRule: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    marginBottom: 16,
  },
  coverMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  coverMetaLabel: { fontSize: 7, color: C.ink3, marginBottom: 2 },
  coverMetaValue: { fontSize: 9, color: C.ink2, fontFamily: 'Helvetica-Bold' },
  // Page header/footer
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  pageHeaderLeft:  { fontSize: 7.5, color: C.ink3 },
  pageHeaderRight: { fontSize: 7.5, color: C.accent, fontFamily: 'Helvetica-Bold' },
  footer: {
    position: 'absolute',
    bottom: 22,
    left: 52,
    right: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  footerText: { fontSize: 7, color: C.ink3 },
  // Content
  h1: {
    fontSize: 17,
    fontFamily: 'Helvetica-Bold',
    color: C.ink,
    marginTop: 18,
    marginBottom: 8,
    lineHeight: 1.2,
  },
  h2: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: C.ink,
    marginTop: 16,
    marginBottom: 5,
  },
  h3: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.ink,
    marginTop: 12,
    marginBottom: 4,
  },
  h4: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: C.ink2,
    marginTop: 8,
    marginBottom: 3,
  },
  para: {
    fontSize: 10,
    color: C.ink2,
    lineHeight: 1.65,
    marginBottom: 5,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 3,
    paddingLeft: 4,
  },
  bulletDot: {
    fontSize: 10,
    color: C.accent,
    width: 12,
    fontFamily: 'Helvetica-Bold',
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    color: C.ink2,
    lineHeight: 1.6,
  },
  numberedRow: {
    flexDirection: 'row',
    marginBottom: 3,
    paddingLeft: 4,
  },
  numberedN: {
    width: 18,
    fontSize: 9,
    color: C.ink3,
    fontFamily: 'Helvetica-Bold',
  },
  numberedText: {
    flex: 1,
    fontSize: 10,
    color: C.ink2,
    lineHeight: 1.6,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    marginVertical: 10,
  },
  quote: {
    borderLeftWidth: 2,
    borderLeftColor: C.accent,
    paddingLeft: 10,
    marginVertical: 5,
    marginLeft: 4,
  },
  quoteText: {
    fontSize: 10,
    color: C.ink3,
    lineHeight: 1.6,
    fontFamily: 'Helvetica-Oblique',
  },
  // Table
  tableWrap:       { marginBottom: 12 },
  tableHeaderRow:  {
    flexDirection: 'row',
    backgroundColor: C.accentSoft,
    paddingVertical: 5,
    paddingHorizontal: 7,
  },
  tableDataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingVertical: 4,
    paddingHorizontal: 7,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.ink,
  },
  tableDataCell: {
    flex: 1,
    fontSize: 8.5,
    color: C.ink2,
    lineHeight: 1.4,
  },
})

// ─── Inline parser ────────────────────────────────────────────────────────────

type Span = { text: string; bold: boolean; italic: boolean }

function parseInline(raw: string): Span[] {
  // Strip image syntax and convert links to plain text
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
  | { type: 'quote';    text: string }
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
    if (t.startsWith('> '))    { blocks.push({ type: 'quote', text: t.slice(2) }); continue }
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

  // Collapse consecutive blanks
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
    case 'h1':      return <Text style={S.h1}>{block.text}</Text>
    case 'h2':      return <Text style={S.h2}>{block.text}</Text>
    case 'h3':      return <Text style={S.h3}>{block.text}</Text>
    case 'h4':      return <Text style={S.h4}>{block.text}</Text>
    case 'hr':      return <View style={S.divider}/>
    case 'blank':   return <View style={{ height: 4 }}/>
    case 'quote':
      return (
        <View style={S.quote}>
          <Text style={S.quoteText}>{block.text}</Text>
        </View>
      )
    case 'para':
      return <InlineText spans={block.spans} style={S.para}/>
    case 'bullet':
      return (
        <View style={S.bulletRow}>
          <Text style={S.bulletDot}>·</Text>
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
            <View key={ri} style={S.tableDataRow}>
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

// ─── Document components ──────────────────────────────────────────────────────

interface Section { label: string; content: string }

function CoverPage({ title, tipo, date }: { title: string; tipo?: string; date: string }) {
  return (
    <Page size="A4" style={[S.page, S.coverPage]}>
      <View>
        <Text style={S.coverTag}>DEAL INTELLIGENCE</Text>
        <Text style={S.coverTitle}>{title}</Text>
        {tipo ? <Text style={S.coverSubtitle}>{tipo}</Text> : null}
      </View>
      <View>
        <View style={S.coverRule}/>
        <View style={S.coverMeta}>
          <View>
            <Text style={S.coverMetaLabel}>DATA DE GERAÇÃO</Text>
            <Text style={S.coverMetaValue}>{date}</Text>
          </View>
          <View>
            <Text style={S.coverMetaLabel}>PLATAFORMA</Text>
            <Text style={S.coverMetaValue}>RR7x Capital Hub</Text>
          </View>
        </View>
      </View>
    </Page>
  )
}

function ContentPage({ section, title }: { section: Section; title: string }) {
  const blocks = parseMarkdown(section.content)
  return (
    <Page size="A4" style={S.page} wrap>
      <View style={S.pageHeader} fixed>
        <Text style={S.pageHeaderLeft}>{title}</Text>
        <Text style={S.pageHeaderRight}>{section.label.toUpperCase()}</Text>
      </View>
      {blocks.map((block, i) => <BlockView key={i} block={block}/>)}
      <View style={S.footer} fixed>
        <Text style={S.footerText}>{title} · Deal Intelligence · RR7x Capital Hub</Text>
        <Text style={S.footerText} render={({ pageNumber }) => String(pageNumber)}/>
      </View>
    </Page>
  )
}

function AnalysisPdf({ title, tipo, date, sections }: {
  title:    string
  tipo?:    string
  date:     string
  sections: Section[]
}) {
  return (
    <Document title={title} author="RR7x Capital Hub" creator="Deal Intelligence">
      <CoverPage title={title} tipo={tipo} date={date}/>
      {sections.map((s, i) => <ContentPage key={i} section={s} title={title}/>)}
    </Document>
  )
}

// ─── Public download helpers ──────────────────────────────────────────────────

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

export async function downloadStepPdf(params: {
  label:    string
  content:  string
  title:    string
  tipo?:    string
  filename: string
}) {
  const blob = await pdf(
    <AnalysisPdf
      title={params.title}
      tipo={params.tipo}
      date={today()}
      sections={[{ label: params.label, content: params.content }]}
    />
  ).toBlob()
  triggerDownload(blob, params.filename + '.pdf')
}

export async function downloadAllPdf(params: {
  title:    string
  tipo?:    string
  sections: Section[]
  filename: string
}) {
  const blob = await pdf(
    <AnalysisPdf
      title={params.title}
      tipo={params.tipo}
      date={today()}
      sections={params.sections}
    />
  ).toBlob()
  triggerDownload(blob, params.filename + '.pdf')
}
