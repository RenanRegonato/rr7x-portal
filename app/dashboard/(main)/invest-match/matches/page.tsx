import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { resolveEscritorioId } from '@/lib/invest-match/auth-helpers'
import { listMatches, type MatchEnriquecido } from '@/lib/invest-match/match-service'
import { KANBAN_COLUNAS, scoreBg } from '@/lib/invest-match/labels'
import { IconArrowLeft, IconHandshake } from '@/components/Icons'
import MatchActions from '@/components/invest-match/MatchActions'
import type { StatusMatch } from '@/lib/invest-match/types'

export const dynamic = 'force-dynamic'

export default async function MatchesBoardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const escritorioId = await resolveEscritorioId(user.id)
  if (!escritorioId) redirect('/dashboard/invest-match')

  // Carrega todos os matches do pipeline (limit alto; paginação fica p/ depois)
  const { rows, total } = await listMatches({ escritorioId, limit: 500, offset: 0 })

  // Agrupa por status
  const byStatus = new Map<string, MatchEnriquecido[]>()
  for (const m of rows) {
    const arr = byStatus.get(m.status) ?? []
    arr.push(m)
    byStatus.set(m.status, arr)
  }

  return (
    <div className="p-6 md:p-8 w-full flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/invest-match" className="p-1.5 rounded-md hover:bg-surface-hover text-ink-2">
          <IconArrowLeft size={18}/>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-ink">Central de matches</h1>
          <p className="text-ink-3 text-xs mt-0.5">{total} oportunidades no pipeline</p>
        </div>
      </div>

      {total === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-surface-2 text-ink-2 mb-4">
            <IconHandshake size={22}/>
          </div>
          <h2 className="text-base font-semibold text-ink mb-2">Nenhum match ainda</h2>
          <p className="text-sm text-ink-2 max-w-md mx-auto">
            Gere uma tese a partir de uma análise do Mandor (ou rode o matching de uma tese existente).
            Os matches aparecem aqui agrupados por etapa.
          </p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 items-start flex-1">
          {KANBAN_COLUNAS.map(col => {
            const items = byStatus.get(col.id) ?? []
            return (
              <div key={col.id} className="min-w-[300px] w-[300px] bg-surface-2/40 rounded-xl border border-border flex flex-col max-h-full shrink-0">
                <div className="p-3 border-b border-border sticky top-0 bg-surface rounded-t-xl">
                  <h3 className="font-semibold text-[13px] text-ink flex justify-between items-center">
                    {col.titulo}
                    <span className="bg-surface-2 px-2 py-0.5 rounded-full text-[11px] text-ink-3 tabular-nums">{items.length}</span>
                  </h3>
                </div>
                <div className="p-2.5 flex-1 overflow-y-auto space-y-2.5">
                  {items.map(m => (
                    <MatchKanbanCard key={m.id} match={m}/>
                  ))}
                  {items.length === 0 && (
                    <div className="h-16 border border-dashed border-border rounded-lg"/>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


function MatchKanbanCard({ match }: { match: MatchEnriquecido }) {
  const empresaNome = match.tese?.empresa_nome ?? 'Empresa'
  const investidorNome = match.investidor?.nome ?? 'Investidor'
  return (
    <div className="bg-surface border border-border rounded-lg p-3 hover:border-accent-strong/40 transition">
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link
          href={`/dashboard/invest-match/teses/${match.tese_id}`}
          className="min-w-0 group"
        >
          {/* Conexão entre as duas partes: empresa ↔ investidor */}
          <div className="font-medium text-[13px] text-ink group-hover:text-accent-strong leading-tight line-clamp-1">
            {empresaNome}
          </div>
          <div className="text-[11px] text-ink-3 leading-tight mt-0.5 line-clamp-1">
            <span className="text-accent-strong">↔</span> {investidorNome}
          </div>
        </Link>
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full border text-xs font-bold tabular-nums shrink-0 ${scoreBg(match.score_final)}`}>
          {Math.round(match.score_final)}
        </span>
      </div>
      {match.llm_resumo && (
        <p className="text-[11px] text-ink-2 line-clamp-2 mb-2.5">{match.llm_resumo}</p>
      )}
      <MatchActions matchId={match.id!} status={match.status as StatusMatch} size="sm"/>
    </div>
  )
}
