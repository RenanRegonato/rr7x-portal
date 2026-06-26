/**
 * Dossiê de Documentação Mandor — PDF Institucional
 *
 * Documento enviado a clientes antes do início da análise.
 * Explica quais documentos são necessários, por pilar, e a finalidade de cada um.
 *
 * Paleta: Archive Ivory (site/editorial) — NÃO o navy do relatório de análise.
 */

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font, pdf } from '@react-pdf/renderer'
import {
  DOCS_GERAL,
  DOCS_MA,
  DOCS_FIDC,
  DOCS_CRI,
  DOCS_CRA,
  DOCS_ASSET_PREP,
  type ItemChecklist,
  type SeveridadeDoc,
} from '@/lib/documentos/checklist'

Font.registerHyphenationCallback((word) => [word])

// ─── Paleta ──────────────────────────────────────────────────────────────────
const C = {
  // Fundos
  ivory:       '#EDE9E5',
  ivoryDeep:   '#E2DDD7',
  white:       '#FFFFFF',
  // Tintas
  ink:         '#211F1A',
  ink2:        '#4A4540',
  ink3:        '#7C7670',
  // Bronze / dourado Mandor
  bronze:      '#8C6F45',
  bronzeDark:  '#6B5234',
  bronzeLight: '#C9A87A',
  bronzeSoft:  '#F5EFE6',
  // Severidade
  critico:     '#7F1D1D',
  critBg:      '#FEF2F2',
  critBorder:  '#FECACA',
  alto:        '#713F12',
  altoBg:      '#FEFCE8',
  altoBorder:  '#FDE68A',
  rec:         '#1E3A5F',
  recBg:       '#EFF6FF',
  recBorder:   '#BFDBFE',
  // Linha
  border:      '#D4C5A9',
}

const LABEL_SEV: Record<SeveridadeDoc, string> = {
  critico:    'Obrigatório',
  alto:       'Recomendado',
  recomendado: 'Complementar',
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: C.ivory,
    fontFamily: 'Helvetica',
    paddingTop: 0,
    paddingBottom: 48,
    paddingHorizontal: 0,
  },
  // Capa
  cover: {
    backgroundColor: C.ink,
    minHeight: 842,
    paddingHorizontal: 56,
    paddingTop: 0,
    paddingBottom: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  coverTop: { paddingTop: 64, flex: 1 },
  coverLabel: { color: C.bronzeLight, fontSize: 9, letterSpacing: 2, marginBottom: 48, textTransform: 'uppercase' },
  coverTitle: { color: C.ivory, fontSize: 32, fontFamily: 'Helvetica-Bold', lineHeight: 1.25, marginBottom: 16 },
  coverSub: { color: C.ink3, fontSize: 13, lineHeight: 1.6, maxWidth: 380 },
  coverDivider: { height: 1, backgroundColor: C.bronzeDark, marginVertical: 40 },
  coverMeta: { color: C.ink3, fontSize: 10, paddingBottom: 48 },
  coverMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  coverMetaLabel: { color: C.ink3, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' },
  coverMetaValue: { color: C.ivory, fontSize: 10 },
  // Página interna
  pageInner: {
    backgroundColor: C.ivory,
    paddingHorizontal: 52,
    paddingTop: 48,
    paddingBottom: 48,
  },
  // Cabeçalho de página
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 36,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  pageHeaderBrand: { color: C.bronze, fontSize: 9, fontFamily: 'Helvetica-Bold', letterSpacing: 2, textTransform: 'uppercase' },
  pageHeaderTitle: { color: C.ink3, fontSize: 9, letterSpacing: 1 },
  // Secções
  sectionTitle: { color: C.bronze, fontSize: 10, fontFamily: 'Helvetica-Bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 },
  h2: { color: C.ink, fontSize: 20, fontFamily: 'Helvetica-Bold', lineHeight: 1.3, marginBottom: 8 },
  h3: { color: C.ink, fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  body: { color: C.ink2, fontSize: 11, lineHeight: 1.65 },
  bodySmall: { color: C.ink3, fontSize: 9.5, lineHeight: 1.6 },
  // Bloco de pilar
  pilarHeader: {
    backgroundColor: C.ink,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 0,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  pilarLabel: { color: C.bronzeLight, fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  pilarTitle: { color: C.ivory, fontSize: 16, fontFamily: 'Helvetica-Bold' },
  pilarBody: {
    backgroundColor: C.white,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.border,
    marginBottom: 24,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  // Linha de documento
  docRow: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.ivoryDeep,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  docRowLast: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  docBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 1,
    marginTop: 1,
    flexShrink: 0,
  },
  docBadgeText: { fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5, textTransform: 'uppercase' },
  docContent: { flex: 1 },
  docNome: { color: C.ink, fontSize: 10.5, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  docFinalidade: { color: C.ink3, fontSize: 9, lineHeight: 1.55 },
  docDica: { color: C.bronze, fontSize: 8.5, lineHeight: 1.5, marginTop: 3, fontStyle: 'italic' },
  // Rodapé
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 52,
    right: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: { color: C.ink3, fontSize: 8, letterSpacing: 0.5 },
})

function badgeStyle(sev: SeveridadeDoc) {
  if (sev === 'critico')    return { bg: C.critBg, border: C.critBorder, text: C.critico }
  if (sev === 'alto')       return { bg: C.altoBg, border: C.altoBorder, text: C.alto }
  return                           { bg: C.recBg,  border: C.recBorder,  text: C.rec }
}

function DocRow({ doc, isLast }: { doc: ItemChecklist; isLast: boolean }) {
  const bd = badgeStyle(doc.severidade)
  return (
    <View style={isLast ? styles.docRowLast : styles.docRow}>
      <View style={[styles.docBadge, { backgroundColor: bd.bg, borderColor: bd.border }]}>
        <Text style={[styles.docBadgeText, { color: bd.text }]}>{LABEL_SEV[doc.severidade]}</Text>
      </View>
      <View style={styles.docContent}>
        <Text style={styles.docNome}>{doc.nome}</Text>
        <Text style={styles.docFinalidade}>{doc.finalidade}</Text>
        {doc.exemplo && (
          <Text style={styles.docFinalidade}>Ex: {doc.exemplo}</Text>
        )}
        {doc.dica && <Text style={styles.docDica}>{doc.dica}</Text>}
      </View>
    </View>
  )
}

function PilarSection({ label, titulo, docs }: { label: string; titulo: string; docs: ItemChecklist[] }) {
  if (docs.length === 0) return null
  return (
    <View>
      <View style={styles.pilarHeader}>
        <Text style={styles.pilarLabel}>{label}</Text>
        <Text style={styles.pilarTitle}>{titulo}</Text>
      </View>
      <View style={styles.pilarBody}>
        {docs.map((doc, i) => (
          <DocRow key={doc.id} doc={doc} isLast={i === docs.length - 1} />
        ))}
      </View>
    </View>
  )
}

function PageHeader({ section }: { section: string }) {
  return (
    <View style={styles.pageHeader} fixed>
      <Text style={styles.pageHeaderBrand}>O Mandor · Dossiê de Documentação</Text>
      <Text style={styles.pageHeaderTitle}>{section}</Text>
    </View>
  )
}

function PageFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>Confidencial · Uso interno</Text>
      <Text style={styles.footerText} render={({ pageNumber }) => `${pageNumber}`} />
    </View>
  )
}

export function DossiePDF() {
  return (
    <Document
      title="Dossiê de Documentação — O Mandor"
      author="Mandor"
      subject="Documentação necessária para análise de deals"
    >
      {/* ── Capa ── */}
      <Page size="A4" style={styles.cover}>
        <View style={styles.coverTop}>
          <Text style={styles.coverLabel}>O Mandor · Rede Cognitiva</Text>
          <Text style={styles.coverTitle}>
            Dossiê de{'\n'}Documentação
          </Text>
          <Text style={styles.coverSub}>
            Guia completo dos documentos necessários para que O Mandor entregue o parecer
            institucional com o maior nível possível de precisão e confiabilidade.
          </Text>
          <View style={styles.coverDivider} />
          <View style={styles.coverMetaRow}>
            <View>
              <Text style={styles.coverMetaLabel}>Pilares cobertos</Text>
              <Text style={styles.coverMetaValue}>M&A · FIDC · CRI/CRA · Asset Prep</Text>
            </View>
            <View>
              <Text style={styles.coverMetaLabel}>Versão</Text>
              <Text style={styles.coverMetaValue}>2026</Text>
            </View>
          </View>
        </View>
        <View style={styles.coverMeta}>
          <Text style={[styles.coverMetaLabel, { marginBottom: 4 }]}>
            www.mandor.com.br
          </Text>
        </View>
      </Page>

      {/* ── Introdução ── */}
      <Page size="A4" style={styles.pageInner}>
        <PageHeader section="Introdução" />
        <Text style={styles.sectionTitle}>Por que a documentação é fundamental</Text>
        <Text style={styles.h2}>A precisão da análise{'\n'}depende dos dados que você envia.</Text>
        <View style={{ marginTop: 16, gap: 12 }}>
          <Text style={styles.body}>
            O Mandor é uma rede cognitiva que transforma documentos em inteligência institucional. Cada arquivo
            enviado se torna evidência rastreável — nenhuma conclusão é emitida sem que haja uma fonte documental
            que a sustente.
          </Text>
          <Text style={styles.body}>
            Quanto mais completa e organizada for a documentação, mais preciso, mais confiável e mais auditável
            será o parecer. Em operações de M&A, FIDC e securitização, cada lacuna documental se traduz em uma
            ressalva no relatório final — e ressalvas impactam diretamente a percepção do investidor sobre o risco.
          </Text>
          <Text style={styles.body}>
            Este dossiê lista, por pilar de análise, todos os documentos que O Mandor espera receber, a finalidade
            de cada um e o nível de prioridade. Documentos marcados como "Obrigatórios" são essenciais para que
            a análise seja liberada. Os demais aumentam a profundidade e a confiança das conclusões.
          </Text>
        </View>

        <View style={{ marginTop: 28, backgroundColor: C.bronzeSoft, borderRadius: 6, padding: 20, borderWidth: 1, borderColor: C.bronzeLight }}>
          <Text style={[styles.h3, { color: C.bronzeDark, marginBottom: 8 }]}>Como organizar os arquivos</Text>
          <Text style={styles.bodySmall}>
            • Nomeie os arquivos de forma clara: "DRE_2024.pdf", "Balanco_2023.xlsx", "Contrato_Social.pdf"{'\n'}
            • Prefira PDF para documentos institucionais. Excel/XLSX para planilhas financeiras.{'\n'}
            • Se um documento estiver indisponível, explique na "Tese do Deal" durante o cadastro.{'\n'}
            • Documentos parciais ou preliminares são aceitos — o sistema registra a situação como contexto.{'\n'}
            • Limite de 20 MB por arquivo. Até 50 arquivos por análise.
          </Text>
        </View>

        <View style={{ marginTop: 28 }}>
          <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Níveis de prioridade</Text>
          {[
            { sev: 'critico' as SeveridadeDoc, titulo: 'Obrigatório', desc: 'Essencial para liberar o pipeline de análise. Sem ele, o parecer pode ser bloqueado ou ter seções inconclusivas.' },
            { sev: 'alto' as SeveridadeDoc, titulo: 'Recomendado', desc: 'Aumenta significativamente a precisão e a profundidade do parecer. Sua ausência gera ressalvas.' },
            { sev: 'recomendado' as SeveridadeDoc, titulo: 'Complementar', desc: 'Enriquece o contexto e a análise, mas não é indispensável. A ausência não gera ressalvas.' },
          ].map(({ sev, titulo, desc }) => {
            const bd = badgeStyle(sev)
            return (
              <View key={sev} style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
                <View style={[styles.docBadge, { backgroundColor: bd.bg, borderColor: bd.border, marginTop: 2 }]}>
                  <Text style={[styles.docBadgeText, { color: bd.text }]}>{LABEL_SEV[sev]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bodySmall, { fontFamily: 'Helvetica-Bold', color: C.ink, marginBottom: 2 }]}>{titulo}</Text>
                  <Text style={styles.bodySmall}>{desc}</Text>
                </View>
              </View>
            )
          })}
        </View>
        <PageFooter />
      </Page>

      {/* ── Documentação Geral ── */}
      <Page size="A4" style={styles.pageInner}>
        <PageHeader section="Documentação Geral" />
        <Text style={styles.sectionTitle}>Documentação base</Text>
        <Text style={[styles.h2, { marginBottom: 4 }]}>Documentação Geral</Text>
        <Text style={[styles.bodySmall, { marginBottom: 20 }]}>
          Exigida em todos os pilares como parte do KYC e da verificação de existência jurídica da entidade.
        </Text>
        <PilarSection label="Todos os pilares" titulo="Documentação Base da Entidade" docs={DOCS_GERAL} />
        <PageFooter />
      </Page>

      {/* ── M&A ── */}
      <Page size="A4" style={styles.pageInner}>
        <PageHeader section="M&A e Aquisições" />
        <Text style={styles.sectionTitle}>Pilar 1</Text>
        <Text style={[styles.h2, { marginBottom: 4 }]}>M&A e Aquisições</Text>
        <Text style={[styles.bodySmall, { marginBottom: 20 }]}>
          Cobre operações de venda de empresa, venda de participação, captação de investimento, fusões e due
          diligence. O objetivo é construir um parecer institucional que sustente o valuation e a estrutura
          da transação diante de investidores e compradores qualificados.
        </Text>
        <PilarSection label="M&A" titulo="Documentação M&A" docs={DOCS_MA} />
        <PageFooter />
      </Page>

      {/* ── FIDC ── */}
      <Page size="A4" style={styles.pageInner}>
        <PageHeader section="FIDC / Crédito Estruturado" />
        <Text style={styles.sectionTitle}>Pilar 2</Text>
        <Text style={[styles.h2, { marginBottom: 4 }]}>FIDC / Crédito Estruturado</Text>
        <Text style={[styles.bodySmall, { marginBottom: 20 }]}>
          Cobre estruturação e análise de Fundos de Investimento em Direitos Creditórios (FIDC). A documentação
          varia conforme o tipo de lastro (duplicatas, cartão, consignado, imobiliário, contratos). A lista
          abaixo cobre o cedente e a estrutura — documentos específicos de lastro devem ser adicionados conforme o tipo.
        </Text>
        <PilarSection label="FIDC" titulo="Documentação do Cedente e da Estrutura" docs={DOCS_FIDC} />
        <PageFooter />
      </Page>

      {/* ── CRI / CRA ── */}
      <Page size="A4" style={styles.pageInner}>
        <PageHeader section="CRI / CRA — Securitização" />
        <Text style={styles.sectionTitle}>Pilar 3</Text>
        <Text style={[styles.h2, { marginBottom: 4 }]}>CRI / CRA</Text>
        <Text style={[styles.bodySmall, { marginBottom: 16 }]}>
          Cobre securitizações imobiliárias (CRI) e do agronegócio (CRA) conforme CVM 175/22 e classificação ANBIMA.
        </Text>
        <PilarSection label="CRI — Imobiliário" titulo="Certificados de Recebíveis Imobiliários" docs={DOCS_CRI} />
        <PilarSection label="CRA — Agronegócio" titulo="Certificados de Recebíveis do Agronegócio" docs={DOCS_CRA} />
        <PageFooter />
      </Page>

      {/* ── Asset Prep ── */}
      <Page size="A4" style={styles.pageInner}>
        <PageHeader section="Preparação de Ativo" />
        <Text style={styles.sectionTitle}>Pilar 4</Text>
        <Text style={[styles.h2, { marginBottom: 4 }]}>Preparação de Ativo para Mercado</Text>
        <Text style={[styles.bodySmall, { marginBottom: 20 }]}>
          Diagnóstico de prontidão do ativo para mercados de capital. Aplica-se a empresas, imóveis, carteiras de
          recebíveis, ativos agro e ativos industriais. A documentação varia conforme o tipo de ativo.
        </Text>
        <PilarSection label="Asset Prep" titulo="Documentação de Diagnóstico" docs={DOCS_ASSET_PREP} />

        {/* Nota final */}
        <View style={{ marginTop: 24, backgroundColor: C.bronzeSoft, borderRadius: 6, padding: 18, borderWidth: 1, borderColor: C.border }}>
          <Text style={[styles.bodySmall, { color: C.bronzeDark, fontFamily: 'Helvetica-Bold', marginBottom: 6 }]}>
            Dúvidas sobre a documentação?
          </Text>
          <Text style={[styles.bodySmall, { color: C.ink2 }]}>
            Entre em contato pelo e-mail contato@mandor.com.br ou acesse o checklist inteligente dentro da plataforma.
            O sistema identifica automaticamente quais documentos foram enviados e indica o que ainda está pendente.
          </Text>
          <Text style={[styles.bodySmall, { color: C.bronze, marginTop: 6 }]}>
            www.mandor.com.br
          </Text>
        </View>
        <PageFooter />
      </Page>
    </Document>
  )
}

/** Gera o buffer do PDF para uso em API routes (Node.js) */
export async function gerarDossiePDF(): Promise<Buffer> {
  const blob = await pdf(<DossiePDF />).toBlob()
  const arrayBuffer = await blob.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
