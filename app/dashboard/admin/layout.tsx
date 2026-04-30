import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const ADMIN_EMAIL = 'gestor@renanregonato.com.br'

const NAV = [
  { href: '/dashboard/admin', label: 'Overview', icon: '◈' },
  { href: '/dashboard/admin/clientes', label: 'Clientes', icon: '◎' },
  { href: '/dashboard/admin/agentes', label: 'Agentes', icon: '◆' },
  { href: '/dashboard/admin/aprendizados', label: 'Aprendizados', icon: '◉' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Top bar */}
      <header className="border-b border-gray-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-bold text-cyan-400">RR7x</span>
          <span className="text-gray-600 text-sm">/</span>
          <span className="text-gray-300 text-sm font-medium">Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm transition">
            ← Dashboard
          </Link>
          <form action="/api/auth/signout" method="post">
            <button className="text-gray-500 hover:text-white text-sm transition">Sair</button>
          </form>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-52 border-r border-gray-800 p-4 flex flex-col gap-1 shrink-0">
          {NAV.map(n => (
            <Link
              key={n.href}
              href={n.href}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-900 hover:text-white transition"
            >
              <span className="text-cyan-500 text-xs">{n.icon}</span>
              {n.label}
            </Link>
          ))}
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
