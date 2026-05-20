import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { resolveEscritorioId } from '@/lib/invest-match/auth-helpers'
import { listAnalisesElegiveis } from '@/lib/invest-match/match-service'
import { IconArrowLeft, IconCheck, IconClock } from '@/components/Icons'
import GerarTeseButton from '@/components/invest-match/GerarTeseButton'

export const dynamic = 'force-dynamic'

export default async function NovaTesePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const escritorioId = await resolveEscritorioId(user.id)
  if (!escritorioId) redirect('/dashboard/invest-match')

  const analises = await listAnalisesElegiveis(escritorioId)

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/dashboard/invest-match/teses" className="p-1.5 rounded-md hover:bg-surface-hover text-ink-2">
          <IconArrowLeft size={18}/>
        </Link>
        <h1 className="text-2xl font-semibold text-ink">Gerar tese de uma análise</h1>
      </div>
      <p className="text-ink-2 text-sm mb-6 ml-10">
        Escolha uma análise concluída. A partir do diagnóstico da Mandor, criamos automaticamente
        a tese de investimento e buscamos os investidores compatíveis.
      </p>

      {analises.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-10 text-center">
          <p className="text-sm text-ink-2">
            Nenhuma análise concluída encontrada no seu escritório.
            Conclua uma análise na Mandor para poder gerar a tese aqui.
          </p>
          <Link href="/dashboard/nova-analise" className="inline-block mt-4 text-sm text-accent-strong hover:underline">
            Criar análise na Mandor →
          </Link>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl divide-y divide-border">
          {analises.map(a => (
            <div key={a.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="font-medium text-ink truncate">{a.nome_ativo}</div>
                <div className="flex items-center gap-3 text-[11px] text-ink-3 mt-0.5">
                  {a.setor && <span>{a.setor}</span>}
                  {a.ticket && <span>· {a.ticket}</span>}
                  <span>· {new Date(a.criado_em).toLocaleDateString('pt-BR')}</span>
                  {a.tem_mesa ? (
                    <span className="inline-flex items-center gap-1 text-ok">
                      <IconCheck size={11}/> análise revisada
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-ink-3">
                      <IconClock size={11}/> revisão pendente
                    </span>
                  )}
                  {a.tem_tese && <span className="text-accent-strong">· tese criada</span>}
                </div>
              </div>
              <div className="shrink-0">
                <GerarTeseButton analiseId={a.id} teseId={a.tese_id} temMesa={a.tem_mesa}/>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
