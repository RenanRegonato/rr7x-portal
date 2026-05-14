import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { buildAnaliseWorkbook } from '@/lib/excel-export'
import { parseFinancialData, buildFinancialModelSheet } from '@/lib/financial-model-excel'
import * as XLSX from 'xlsx'

const ADMIN_EMAIL = 'gestor@renanregonato.com.br'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const admin = createAdminClient()
  const { data: analise } = await admin
    .from('analises')
    .select('nome_ativo, deal_intake, outputs, user_id')
    .eq('id', id)
    .single()

  if (!analise) return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })
  if (analise.user_id !== user.id && user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const intake  = (analise.deal_intake ?? {}) as Record<string, string>
  const outputs = (analise.outputs    ?? {}) as Record<string, string>
  const slug    = (analise.nome_ativo ?? 'analise').replace(/\s+/g, '-')

  // Injeta o modelo financeiro se Davi produziu dados estruturados
  const wb = buildAnaliseWorkbook(intake, outputs, analise.nome_ativo ?? '', true)
  const daviOutput = outputs['diagnostico'] ?? ''
  const fd = parseFinancialData(daviOutput)
  if (fd) {
    const modelSheet = buildFinancialModelSheet(fd)
    XLSX.utils.book_append_sheet(wb, modelSheet, 'Modelo Financeiro')
  }

  const buffer     = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as unknown as Buffer
  const uint8Array = new Uint8Array(buffer)

  return new Response(uint8Array, {
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${slug}-rr7x.xlsx"`,
      'Cache-Control':       'no-cache',
    },
  })
}
