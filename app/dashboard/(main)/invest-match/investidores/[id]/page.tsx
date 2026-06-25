import Link from 'next/link'
import { formatDateBR } from '@/lib/format-date'
import { notFound, redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { resolveEscritorioId } from '@/lib/invest-match/auth-helpers'
import { getInvestidor } from '@/lib/invest-match/investidor-service'
import { listMatches } from '@/lib/invest-match/match-service'
import { STATUS_MATCH, scoreBg } from '@/lib/invest-match/labels'
import InvestidorForm from '@/components/invest-match/InvestidorForm'
import BuscarOportunidadesButton from '@/components/invest-match/BuscarOportunidadesButton'
import DeleteButton from '@/components/invest-match/DeleteButton'
import { IconArrowLeft, IconSparkle } from '@/components/Icons'
import type { StatusMatch } from '@/lib/invest-match/types'

export const dynamic = 'force-dynamic'

interface PageProps { params: Promise<{ id: string }> }

export default async function EditInvestidorPage({ params }: PageProps) {
  const { id } = await params

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const escritorioId = await resolveEscritorioId(user.id)
  if (!escritorioId) redirect('/dashboard/invest-match')

  const inv = await getInvestidor(id, escritorioId)
  if (!inv) notFound()

  const { rows: oportunidades } = await listMatches({ escritorioId, investidorId: id, limit: 50, offset: 0 })

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full space-y-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/invest-match/investidores" className="p-1.5 rounded-md hover:bg-surface-hover text-ink-2">
            <IconArrowLeft size={18}/>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-ink">{inv.nome}</h1>
            <div className="flex items-center gap-3 text-[11px] text-ink-3 mt-0.5">
              <span>Cadastrado em {inv.criado_em ? formatDateBR(inv.criado_em) : '—'}</span>
              {inv.tese_embedding_at && (
                <span className="inline-flex items-center gap-1 text-accent-strong">
                  <IconSparkle size={11}/> tese indexada (voyage-3-large)
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <BuscarOportunidadesButton investidorId={id}/>
          <DeleteButton
            endpoint={`/api/invest-match/investidores/${id}`}
            entityLabel="investidor"
            name={inv.nome}
            cascadeNote="Os matches deste investidor e seus históricos de feedback também serão removidos em definitivo."
            redirectTo="/dashboard/invest-match/investidores"
            confirmWord="EXCLUIR"
          />
        </div>
      </div>

      {/* Oportunidades (originação reversa) */}
      <section>
        <h2 className="text-sm font-semibold text-ink mb-3">
          Oportunidades sugeridas ({oportunidades.length})
        </h2>
        {oportunidades.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-6 text-center text-sm text-ink-2">
            Nenhuma oportunidade ainda. Clique em <strong>Buscar oportunidades</strong> para cruzar a tese
            deste investidor com as análises do Mandor.
            {!inv.tese_embedding_at && (
              <div className="text-[11px] text-ink-3 mt-2">
                Dica: preencha a tese narrativa (resumo/completa) para ativar o matching semântico.
              </div>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {oportunidades.map(m => (
              <Link
                key={m.id}
                href={`/dashboard/invest-match/teses/${m.tese_id}`}
                className="block bg-surface border border-border rounded-xl p-4 hover:border-accent-strong/40 transition"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-medium text-ink text-sm leading-tight">
                    {m.tese?.empresa_nome ?? 'Empresa'}
                  </span>
                  <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full border text-xs font-bold tabular-nums shrink-0 ${scoreBg(m.score_final)}`}>
                    {Math.round(m.score_final)}
                  </span>
                </div>
                <div className="text-[11px] text-ink-3 mb-1.5">{m.tese?.setor_primario ?? ''}</div>
                {m.llm_resumo && <p className="text-[12px] text-ink-2 line-clamp-2 mb-2">{m.llm_resumo}</p>}
                <span className={`inline-block text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border ${STATUS_MATCH[m.status as StatusMatch]?.cls ?? ''}`}>
                  {STATUS_MATCH[m.status as StatusMatch]?.label ?? m.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>


      {/* Edição da tese declarada */}
      <section>
        <h2 className="text-sm font-semibold text-ink mb-3">Tese declarada</h2>
        <InvestidorForm mode="edit" initial={inv}/>
      </section>
    </div>
  )
}
