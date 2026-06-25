import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function MapaMercadoPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-ink">Mapa Inteligente do Mercado</h1>
        <p className="text-ink-2 mt-2">Catálogo de participantes, fundos e relações do mercado financeiro</p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-ink">Status de Dados</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-2xl font-bold text-ink">~62k</div>
            <div className="text-xs text-ink-3">Entidades</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-ink">~60k</div>
            <div className="text-xs text-ink-3">Veículos</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-ink">~500k</div>
            <div className="text-xs text-ink-3">Métricas</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-ink">⏳</div>
            <div className="text-xs text-ink-3">ETL em progresso</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-ink">Dados disponíveis</h2>
        <div className="space-y-3">
          <div className="flex gap-3 p-3 bg-surface rounded-lg border border-border">
            <div className="text-lg">🏢</div>
            <div>
              <div className="font-medium text-ink">Entidades</div>
              <div className="text-sm text-ink-2">Gestoras, bancos, administradores — ~62k registros</div>
            </div>
          </div>
          <div className="flex gap-3 p-3 bg-surface rounded-lg border border-border">
            <div className="text-lg">📈</div>
            <div>
              <div className="font-medium text-ink">Veículos</div>
              <div className="text-sm text-ink-2">FIDCs, FIPs, ETFs — ~60k registros</div>
            </div>
          </div>
          <div className="flex gap-3 p-3 bg-surface rounded-lg border border-border">
            <div className="text-lg">📊</div>
            <div>
              <div className="font-medium text-ink">Métricas</div>
              <div className="text-sm text-ink-2">PL, captação, cotistas — ~500k séries temporais</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-4">
        <div className="text-sm text-ink-2">
          ⏳ <strong>ETL em execução:</strong> Dados carregando do Portal CVM. Busca será re-habilitada em breve.
        </div>
      </div>
    </div>
  )
}
