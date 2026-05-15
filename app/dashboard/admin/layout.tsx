import { getUserContext } from '@/lib/get-role'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AdminNav from '@/components/AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getUserContext()
  if (!ctx || ctx.role !== 'admin') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border px-6 py-3 flex items-center justify-between shrink-0 bg-bg sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img src="/logo/mandor-horizontal.svg" alt="Mandor" className="h-6 w-auto" />
          <span className="text-ink-3 text-[11px] mx-0.5">/</span>
          <span className="text-ink-2 text-[13px] font-medium">Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-ink-2 hover:text-ink text-[13px] transition flex items-center gap-1.5">
            ← Dashboard
          </Link>
          <form action="/api/auth/signout" method="post">
            <button className="text-ink-3 hover:text-ink text-[13px] transition">Sair</button>
          </form>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <AdminNav/>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
