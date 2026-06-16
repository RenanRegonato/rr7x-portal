import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { resolveEscritorioId } from '@/lib/invest-match/auth-helpers'
import { listMatches } from '@/lib/invest-match/match-service'
import { IconArrowLeft, IconHandshake } from '@/components/Icons'
import MatchesBoard, { type BoardCard } from '@/components/invest-match/MatchesBoard'
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

  // DTO enxuto e serializável para o board interativo (client component).
  const cards: BoardCard[] = rows.map(m => ({
    id:              m.id!,
    status:          m.status as StatusMatch,
    score_final:     m.score_final,
    llm_resumo:      m.llm_resumo ?? null,
    tese_id:         m.tese_id ?? null,
    empresa_nome:    m.tese?.empresa_nome ?? 'Empresa',
    investidor_nome: m.investidor?.nome ?? 'Investidor',
  }))

  return (
    <div className="p-6 md:p-8 w-full flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/invest-match" className="p-1.5 rounded-md hover:bg-surface-hover text-ink-2">
          <IconArrowLeft size={18}/>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-ink">Central de matches</h1>
          <p className="text-ink-3 text-xs mt-0.5">
            {total} oportunidades no pipeline · arraste pela alça para mover de etapa
          </p>
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
        <MatchesBoard initial={cards}/>
      )}
    </div>
  )
}
