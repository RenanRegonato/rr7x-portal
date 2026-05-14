import * as XLSX from 'xlsx'

const AGENT_LABELS: Record<string, string> = {
  drive_intake:          'Ingestão',
  orchestration:         'Orquestração',
  pesquisa:              'Mercado',
  diagnostico:           'Diagnóstico',
  kyc:                   'Compliance KYC',
  analise_ma:            'M&A',
  contratos:             'Contratos',
  originacao:            'Originação',
  estruturacao:          'Estruturação',
  maturidade:            'Maturidade',
  blind_teaser:          'Blind Teaser',
  sell_side_pitchbook:   'Pitchbook',
  relatorio_consolidado: 'Resumo Executivo',
}

function parseMdToRows(text: string): string[][] {
  const rows: string[][] = []
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd()
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      if (/^\s*\|[\s|:-]+\|\s*$/.test(line)) continue // separator row
      const cells = line.trim().split('|').slice(1, -1).map((c) => c.trim())
      rows.push(cells)
    } else {
      rows.push([line])
    }
  }
  return rows
}

export function buildAnaliseWorkbook(
  intake: Record<string, string>,
  outputs: Record<string, string>,
  nomeAtivo: string,
  returnWorkbook?: false
): Buffer
export function buildAnaliseWorkbook(
  intake: Record<string, string>,
  outputs: Record<string, string>,
  nomeAtivo: string,
  returnWorkbook: true
): XLSX.WorkBook
export function buildAnaliseWorkbook(
  intake: Record<string, string>,
  outputs: Record<string, string>,
  nomeAtivo: string,
  returnWorkbook = false
): Buffer | XLSX.WorkBook {
  const wb = XLSX.utils.book_new()

  // ── Sheet 0: Deal Intake ──────────────────────────────────────────────────
  const intakeRows: string[][] = [
    ['Campo', 'Valor'],
    ['Ativo',              intake.nomeAtivo           ?? ''],
    ['Tipo de Ativo',      intake.tipoAtivo            ?? ''],
    ['Estágio',            intake.estagio              ?? ''],
    ['Objetivo',           intake.objetivo             ?? ''],
    ['Nível de Informação',intake.nivelInformacao      ?? ''],
    ['Localização',        intake.localizacao          ?? ''],
    ['Ticket Estimado',    intake.ticketEstimado        ?? ''],
    ['Resumo do Ativo',    intake.resumoAtivo           ?? ''],
    ['Informações Adicionais', intake.informacoesAdicionais ?? ''],
  ]
  const wsIntake = XLSX.utils.aoa_to_sheet(intakeRows)
  wsIntake['!cols'] = [{ wch: 26 }, { wch: 80 }]
  XLSX.utils.book_append_sheet(wb, wsIntake, 'Deal Intake')

  // ── Sheets por agente ─────────────────────────────────────────────────────
  const order = [
    'orchestration', 'pesquisa', 'diagnostico', 'kyc',
    'analise_ma', 'contratos', 'originacao', 'estruturacao',
    'maturidade', 'drive_intake', 'blind_teaser', 'sell_side_pitchbook',
    'relatorio_consolidado',
  ]

  for (const key of order) {
    if (!outputs[key]) continue
    const label = AGENT_LABELS[key] ?? key
    const rows  = parseMdToRows(outputs[key])
    const ws    = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 60 }, { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 40 }]
    // Sheet names max 31 chars
    XLSX.utils.book_append_sheet(wb, ws, label.slice(0, 31))
  }

  if (returnWorkbook) return wb
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as unknown as Buffer
}
