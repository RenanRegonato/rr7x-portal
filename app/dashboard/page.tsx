import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()

  const [{ data: analises }, { data: sub }] = await Promise.all([
    admin.from('analises').select('*').eq('user_id', user.id).order('criado_em', { ascending: false }),
    admin.from('subscriptions').select('*').eq('user_id', user.id).eq('status', 'ativo').single(),
  ])

  const statusLabel = (s: string) => ({
    processando: { label: 'Processando...', color: 'text-yellow-400 bg-yellow-400/10' },
    concluido: { label: 'Concluído', color: 'text-green-400 bg-green-400/10' },
    erro: { label: 'Erro', color: 'text-red-400 bg-red-400/10' },
  }[s] ?? { label: s, color: 'text-gray-400 bg-gray-800' })

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div>
          <span className="font-bold text-lg text-cyan-400">RR7x</span>
          <span className="text-gray-400 text-sm ml-2">Deal Intelligence</span>
        </div>
        <div className="flex items-center gap-4">
          {sub ? (
            <span className="text-xs bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-2 py-1 rounded-full capitalize">
              {sub.plano} · {sub.analises_restantes !== null ? `${sub.analises_restantes} análise(s)` : 'ilimitado'}
            </span>
          ) : (
            <Link href="/dashboard/planos" className="text-xs text-yellow-400 hover:underline">
              Sem plano ativo
            </Link>
          )}
          {user.email === 'gestor@renanregonato.com.br' && (
            <Link href="/dashboard/admin" className="text-xs text-gray-500 hover:text-cyan-400 border border-gray-800 hover:border-cyan-500/30 px-2.5 py-1 rounded-full transition">
              Admin
            </Link>
          )}
          <form action="/api/auth/signout" method="post">
            <button className="text-gray-500 hover:text-white text-sm transition">Sair</button>
          </form>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Minhas Análises</h1>
          {sub ? (
            <Link
              href="/dashboard/nova-analise"
              className="bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold px-4 py-2 rounded-lg text-sm transition"
            >
              + Nova Análise
            </Link>
          ) : (
            <Link
              href="/dashboard/planos"
              className="bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold px-4 py-2 rounded-lg text-sm transition"
            >
              Adquirir Plano
            </Link>
          )}
        </div>

        {!analises || analises.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <div className="text-4xl mb-4">🏛️</div>
            <p className="text-lg font-medium text-gray-400 mb-2">Nenhuma análise ainda</p>
            <p className="text-sm">Clique em "Nova Análise" para começar seu primeiro diagnóstico de ativo.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {analises.map((a: any) => {
              const st = statusLabel(a.status)
              return (
                <Link
                  key={a.id}
                  href={`/dashboard/analise/${a.id}`}
                  className="block bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-white">{a.nome_ativo}</div>
                      <div className="text-gray-400 text-xs mt-0.5">
                        {new Date(a.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${st.color}`}>
                      {st.label}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
