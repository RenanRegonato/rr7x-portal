import { createAdminClient } from '@/lib/supabase-server'
import { formatDateBR } from '@/lib/format-date'
import { getUserContext } from '@/lib/get-role'
import { getUsuariosUsage } from '@/lib/entitlements'
import { redirect } from 'next/navigation'
import Topbar from '@/components/Topbar'
import ConvidarAssessor from './ConvidarAssessor'

export default async function EquipePage() {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  if (ctx.role === 'assessor') redirect('/dashboard')

  const admin = createAdminClient()

  // Load escritório name from the gerente's escritorioId
  const { data: escritorio } = ctx.escritorioId
    ? await admin.from('escritorios').select('id, nome').eq('id', ctx.escritorioId).maybeSingle()
    : { data: null }

  // Find all perfis linked to this escritório
  const { data: perfis } = ctx.escritorioId
    ? await admin.from('perfis').select('user_id, role').eq('escritorio_id', ctx.escritorioId)
    : { data: [] }

  // Uso de assentos vs. limite usuarios_max do plano
  const usage = await getUsuariosUsage(ctx.escritorioId)

  const memberIds = (perfis ?? [])
    .filter((p: { user_id: string; role: string }) => p.user_id !== ctx.userId)
    .map((p: { user_id: string }) => p.user_id)

  // Load auth user data for each member
  const { data: usersData } = await admin.auth.admin.listUsers()
  const membros = (usersData?.users ?? []).filter(u => memberIds.includes(u.id))

  // Load analise counts per member
  const { data: analises } = memberIds.length > 0
    ? await admin.from('analises').select('user_id, status, criado_em').in('user_id', memberIds)
    : { data: [] }

  const fmt = (d: string | null) => d
    ? formatDateBR(d, { day: '2-digit', month: '2-digit', year: '2-digit' })
    : '—'

  return (
    <>
      <Topbar
        variant="context"
        title="Minha Equipe"
        subtitle={escritorio?.nome ?? 'Assessores vinculados ao escritório'}
      />

      <div className="p-8 max-w-3xl space-y-6">
        {/* Convite + uso de assentos do plano */}
        {ctx.escritorioId && (
          <div className="space-y-2">
            {usage.atLimit ? (
              <div className="bg-surface border border-border rounded-[14px] p-5 shadow-soft-sm">
                <p className="text-[13px] font-medium text-ink mb-1">
                  Limite de usuários do plano atingido
                </p>
                <p className="text-[12px] text-ink-3 leading-relaxed">
                  Seu plano permite <span className="font-semibold text-ink">{usage.max}</span> usuários.
                  Para ampliar a equipe, faça upgrade em <span className="text-accent-strong">Planos</span> ou
                  fale com o suporte.
                </p>
              </div>
            ) : (
              <ConvidarAssessor />
            )}
            {usage.max != null && (
              <p className="text-[11px] text-ink-3">
                {usage.count} de {usage.max} usuários do plano
              </p>
            )}
          </div>
        )}

        {membros.length === 0 ? (
          <div className="bg-surface border border-border rounded-[14px] p-10 text-center shadow-soft-sm">
            <p className="font-display text-[18px] text-ink-3 mb-2">Nenhum assessor vinculado</p>
            <p className="text-[13px] text-ink-3 max-w-xs mx-auto leading-relaxed">
              Convide um assessor usando o botão acima, ou peça ao administrador da plataforma
              em <span className="text-accent-strong">Admin → Usuários</span>.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[13px] text-ink-3">{membros.length} assessor(es) neste escritório</p>
            {membros.map(u => {
              const userAnalises = (analises ?? []).filter((a: { user_id: string }) => a.user_id === u.id)
              const concluidoCount = userAnalises.filter((a: { status: string }) => a.status === 'concluido').length
              const ultimaAnalise  = userAnalises.sort((a: { criado_em: string }, b: { criado_em: string }) =>
                new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
              )[0]?.criado_em ?? null

              return (
                <div
                  key={u.id}
                  className="bg-surface border border-border rounded-[14px] px-5 py-4 flex items-center justify-between shadow-soft-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-accent-soft text-accent-ink grid place-items-center text-[13px] font-semibold flex-none">
                      {u.email?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-ink">{u.email}</p>
                      <p className="text-[11px] text-ink-3 mt-0.5">
                        Último login: {fmt(u.last_sign_in_at ?? null)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold text-ink">{userAnalises.length} deal(s)</p>
                    <p className="text-[11px] text-ink-3">{concluidoCount} concluído(s) · última: {fmt(ultimaAnalise)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
