import { createAdminClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const DEFAULT_MSG =
  'Estamos aplicando uma atualização para deixar O Mandor ainda melhor. Voltamos em instantes.'

export default async function ManutencaoPage() {
  let message = DEFAULT_MSG
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('app_settings')
      .select('value')
      .eq('key', 'maintenance')
      .maybeSingle()
    const custom = (data?.value as { message?: string } | undefined)?.message?.trim()
    if (custom) message = custom
  } catch {
    // mantém a mensagem padrão
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg text-ink px-6 text-center">
      <img
        src="/logo/mandor-horizontal-dark.svg"
        alt="Mandor"
        width={140}
        className="h-9 w-auto mb-8 opacity-90"
      />
      <h1 className="font-display text-[26px] font-medium mb-3">Manutenção em andamento</h1>
      <p className="text-[15px] text-ink-2 leading-relaxed max-w-[460px]">{message}</p>
      <p className="text-[12px] text-ink-3 mt-10">
        Em caso de urgência, fale com a equipe: contato@rr7x.com.br
      </p>
    </div>
  )
}
