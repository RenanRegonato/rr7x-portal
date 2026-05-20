import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { resolveEscritorioId } from '@/lib/invest-match/auth-helpers'
import { listTeses } from '@/lib/invest-match/match-service'
import { ESTAGIO_LABEL, STATUS_TESE_LABEL, formatBRL } from '@/lib/invest-match/labels'
import { IconArrowLeft, IconBuilding, IconSparkle } from '@/components/Icons'

export const dynamic = 'force-dynamic'

export default async function TesesListPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const escritorioId = await resolveEscritorioId(user.id)
  if (!escritorioId) redirect('/dashboard/invest-match')

  const { rows, total } = await listTeses({ escritorioId, limit: 200, offset: 0 })

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/invest-match" className="p-1.5 rounded-md hover:bg-surface-hover text-ink-2">
          <IconArrowLeft size={18}/>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-ink">Teses</h1>
          <p className="text-ink-3 text-xs mt-0.5">{total} teses estruturadas</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-surface-2 text-ink-2 mb-4">
            <IconBuilding size={22}/>
          </div>
          <h2 className="text-base font-semibold text-ink mb-2">Nenhuma tese ainda</h2>
          <p className="text-sm text-ink-2 max-w-md mx-auto">
            Teses são geradas automaticamente a partir de análises consolidadas da Mandor
            (endpoint <span className="font-mono text-xs">from-analise</span>) ou criadas manualmente.
          </p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-ink-3 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Empresa / Projeto</th>
                <th className="text-left font-semibold px-4 py-3">Setor</th>
                <th className="text-left font-semibold px-4 py-3">Estágio</th>
                <th className="text-right font-semibold px-4 py-3">Capital buscado</th>
                <th className="text-center font-semibold px-4 py-3">Matches</th>
                <th className="text-left font-semibold px-4 py-3">Origem</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(t => (
                <tr key={t.id} className="border-t border-border hover:bg-surface-hover transition">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/invest-match/teses/${t.id}`} className="font-medium text-ink hover:text-accent-strong">
                      {t.is_blind ? (t.empresa_codinome ?? t.empresa_nome) : t.empresa_nome}
                    </Link>
                    <div className="text-[11px] text-ink-3 mt-0.5">{STATUS_TESE_LABEL[t.status] ?? t.status}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-2">{t.setor_primario}</td>
                  <td className="px-4 py-3 text-ink-2">{ESTAGIO_LABEL[t.estagio] ?? t.estagio}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-2">{formatBRL(t.capital_buscado_brl)}</td>
                  <td className="px-4 py-3 text-center">
                    {t.matches_count && t.matches_count > 0 ? (
                      <span className="inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 rounded-full bg-accent-soft text-accent-ink text-xs font-semibold">
                        {t.matches_count}
                      </span>
                    ) : <span className="text-ink-3 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {t.origem === 'mandor' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-accent-strong">
                        <IconSparkle size={11}/> Mandor
                      </span>
                    ) : (
                      <span className="text-[11px] text-ink-3">{t.origem}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/dashboard/invest-match/teses/${t.id}`} className="text-ink-3 hover:text-accent-strong text-xs">→</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
