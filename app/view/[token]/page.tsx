import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { verifyShareToken } from '@/lib/share-token'
import { createAdminClient } from '@/lib/supabase-server'
import { audit, extractIp } from '@/lib/audit'
import SharedAnaliseView from './SharedAnaliseView'

export const dynamic = 'force-dynamic'

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const result    = verifyShareToken(token)

  if (!result.ok) {
    if (result.reason === 'expired') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-bg">
          <div className="text-center">
            <p className="text-[28px] font-display font-medium text-ink mb-2">Link expirado</p>
            <p className="text-ink-3 text-[14px]">Este link de compartilhamento não é mais válido.</p>
          </div>
        </div>
      )
    }
    notFound()
  }

  const admin = createAdminClient()

  // Verificar revogação do link
  const { data: revoked } = await admin
    .from('share_revocations')
    .select('analise_id')
    .eq('analise_id', result.analiseId)
    .maybeSingle()

  if (revoked) notFound()

  const { data: analise } = await admin
    .from('analises')
    .select('id, nome_ativo, tipo_ativo, status, outputs, criado_em')
    .eq('id', result.analiseId)
    .single()

  if (!analise || analise.status !== 'concluido') notFound()

  // Registrar acesso ao link compartilhado (IP + user-agent do visitante externo)
  const reqHeaders = await headers()
  void audit({
    event:    'share.accessed',
    targetId: analise.id,
    metadata: { nome_ativo: analise.nome_ativo },
    ip:       extractIp(reqHeaders),
    userAgent: reqHeaders.get('user-agent'),
  })

  return <SharedAnaliseView analise={analise} />
}
