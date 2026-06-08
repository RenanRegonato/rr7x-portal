import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { resolveEscritorioId } from '@/lib/invest-match/auth-helpers'
import { listInvestidores } from '@/lib/invest-match/investidor-service'
import {
  IconArrowLeft, IconPlus, IconUsers, IconSparkle,
} from '@/components/Icons'
import DeleteButton from '@/components/invest-match/DeleteButton'
import type { Investidor } from '@/lib/invest-match/types'

export const dynamic = 'force-dynamic'

const TIPO_LABEL: Record<string, string> = {
  pessoa_fisica:           'Pessoa física',
  holding_familiar:        'Holding familiar',
  family_office:           'Family office',
  fundo:                   'Fundo',
  financeira:              'Financeira',
  pj:                      'PJ',
  estrategico_corporativo: 'Estratégico',
  gestora:                 'Gestora',
  clube_investimento:      'Clube de investimento',
}

const STATUS_BADGE: Record<string, string> = {
  ativo:     'bg-ok/10 text-ok border-ok/30',
  pausado:   'bg-warn/10 text-warn border-warn/30',
  arquivado: 'bg-surface-2 text-ink-3 border-border',
}

function formatBRL(v: number | null | undefined): string {
  if (v == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

export default async function InvestidoresListPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const escritorioId = await resolveEscritorioId(user.id)
  if (!escritorioId) redirect('/dashboard/invest-match')

  const { rows, total } = await listInvestidores({
    escritorioId,
    limit:  200,
    offset: 0,
  })

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/invest-match"
            className="p-1.5 rounded-md hover:bg-surface-hover text-ink-2"
            aria-label="Voltar"
          >
            <IconArrowLeft size={18}/>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-ink">Investidores</h1>
            <p className="text-ink-3 text-xs mt-0.5">{total} cadastrados no seu escritório</p>
          </div>
        </div>
        <Link
          href="/dashboard/invest-match/investidores/novo"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-strong text-white text-sm font-medium hover:opacity-90"
        >
          <IconPlus size={16}/> Novo investidor
        </Link>
      </div>

      {rows.length === 0 ? <EmptyState/> : <InvestidoresTable rows={rows}/>}
    </div>
  )
}


function EmptyState() {
  return (
    <div className="bg-surface border border-border rounded-xl p-12 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-surface-2 text-ink-2 mb-4">
        <IconUsers size={22}/>
      </div>
      <h2 className="text-base font-semibold text-ink mb-2">Nenhum investidor cadastrado</h2>
      <p className="text-sm text-ink-2 max-w-md mx-auto mb-6">
        Cadastre o primeiro investidor com sua tese declarada (setores, faixa de ticket,
        estágios aceitos, narrativa). O sistema vai cruzar essa tese com cada análise
        consolidada do Mandor.
      </p>
      <Link
        href="/dashboard/invest-match/investidores/novo"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-strong text-white text-sm font-medium hover:opacity-90"
      >
        <IconPlus size={16}/> Cadastrar primeiro investidor
      </Link>
    </div>
  )
}


function InvestidoresTable({ rows }: { rows: Investidor[] }) {
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-surface-2 text-ink-3 text-[11px] uppercase tracking-wider">
          <tr>
            <th className="text-left font-semibold px-4 py-3">Nome</th>
            <th className="text-left font-semibold px-4 py-3">Tipo</th>
            <th className="text-left font-semibold px-4 py-3">Setores</th>
            <th className="text-right font-semibold px-4 py-3">Ticket</th>
            <th className="text-left font-semibold px-4 py-3">Tese</th>
            <th className="text-left font-semibold px-4 py-3">Status</th>
            <th className="w-12"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(inv => (
            <tr key={inv.id} className="border-t border-border hover:bg-surface-hover transition">
              <td className="px-4 py-3">
                <Link
                  href={`/dashboard/invest-match/investidores/${inv.id}`}
                  className="font-medium text-ink hover:text-accent-strong"
                >
                  {inv.nome}
                </Link>
                {inv.email && (
                  <div className="text-[11px] text-ink-3 mt-0.5">{inv.email}</div>
                )}
              </td>
              <td className="px-4 py-3 text-ink-2">
                {TIPO_LABEL[inv.tipo] ?? inv.tipo}
              </td>
              <td className="px-4 py-3 text-ink-2 max-w-[200px]">
                <div className="truncate">
                  {inv.setores_alvo.length > 0 ? inv.setores_alvo.slice(0, 2).join(', ') : '—'}
                  {inv.setores_alvo.length > 2 && (
                    <span className="text-ink-3"> +{inv.setores_alvo.length - 2}</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-ink-2 whitespace-nowrap">
                {inv.ticket_min_brl || inv.ticket_max_brl ? (
                  <>
                    {formatBRL(inv.ticket_min_brl)}
                    <span className="text-ink-3 mx-1">–</span>
                    {formatBRL(inv.ticket_max_brl)}
                  </>
                ) : '—'}
              </td>
              <td className="px-4 py-3">
                {inv.tese_embedding_at ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-accent-strong">
                    <IconSparkle size={12}/> indexada
                  </span>
                ) : (
                  <span className="text-[11px] text-ink-3">sem narrativa</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold border ${STATUS_BADGE[inv.status] ?? STATUS_BADGE.arquivado}`}>
                  {inv.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <DeleteButton
                    endpoint={`/api/invest-match/investidores/${inv.id}`}
                    entityLabel="investidor"
                    name={inv.nome}
                    cascadeNote="Os matches deste investidor e seus históricos de feedback também serão removidos em definitivo."
                    confirmWord="EXCLUIR"
                    variant="icon"
                  />
                  <Link
                    href={`/dashboard/invest-match/investidores/${inv.id}`}
                    className="text-ink-3 hover:text-accent-strong text-xs"
                  >
                    →
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
