'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ICONS_BY_NAME } from './Icons'
import type { UserRole } from '@/lib/get-role'

interface NavItem {
  id:     string
  label:  string
  icon:   string
  href:   string
  count?: number
}

interface SidebarUser {
  name:     string
  role:     string
  email:    string
  initials: string
}

export default function Sidebar({
  user,
  userRole = 'assessor',
  analiseCount = 0,
}: {
  user:          SidebarUser
  userRole?:     UserRole
  analiseCount?: number
}) {
  const pathname = usePathname()

  const workspaceItems: NavItem[] = [
    { id: 'home',       label: 'Início',     icon: 'home',     href: '/dashboard' },
    { id: 'pipeline',   label: 'Pipeline',   icon: 'pipeline', href: '/dashboard', count: analiseCount || undefined },
    { id: 'escritorio', label: 'Escritório', icon: 'building', href: '/dashboard/escritorio' },
    { id: 'planos',     label: 'Planos',     icon: 'sparkle',  href: '/dashboard/planos' },
    { id: 'conta',      label: 'Minha Conta', icon: 'user',    href: '/dashboard/conta' },
  ]

  const equipeItems: NavItem[] = [
    { id: 'equipe',       label: 'Minha Equipe',  icon: 'users', href: '/dashboard/equipe' },
    { id: 'aprendizados', label: 'Aprendizados',  icon: 'doc',   href: '/dashboard/aprendizados' },
  ]

  const adminItems: NavItem[] = [
    { id: 'admin', label: 'Administração', icon: 'settings', href: '/dashboard/admin' },
  ]

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <aside className="border-r border-border bg-bg p-[18px_18px_24px] flex flex-col gap-6 sticky top-0 h-screen w-[240px] overflow-y-auto">
      {/* Logo */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent grid place-items-center font-display italic font-semibold text-[16px] text-accent-ink">
            o
          </div>
          <div className="font-display font-medium text-[22px] tracking-tight">Otto</div>
          <div className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-2 text-ink-2 border border-border">
            Beta
          </div>
        </div>
        <div className="text-[11px] text-ink-3 ml-[38px] -mt-1 tracking-wide">
          Deal intelligence · RR7x
        </div>
      </div>

      {/* Workspace */}
      <NavSection label="Workspace">
        {workspaceItems.map(item => (
          <NavItemComp key={item.id} {...item} active={isActive(item.href)}/>
        ))}
      </NavSection>

      {/* Equipe — gerentes only */}
      {userRole === 'gerente' && (
        <NavSection label="Equipe">
          {equipeItems.map(item => (
            <NavItemComp key={item.id} {...item} active={isActive(item.href)}/>
          ))}
        </NavSection>
      )}

      {/* Admin — admin only */}
      {userRole === 'admin' && (
        <NavSection label="Sistema">
          {adminItems.map(item => (
            <NavItemComp key={item.id} {...item} active={isActive(item.href)}/>
          ))}
        </NavSection>
      )}

      {/* Role badge + user */}
      <div className="mt-auto flex flex-col gap-1.5">
        <RoleBadge role={userRole}/>
        <div className="flex items-center gap-2 px-2 mt-1">
          <div className="w-6 h-6 rounded-full bg-accent-soft text-accent-ink grid place-items-center text-[11px] font-semibold flex-none">
            {user.initials}
          </div>
          <div className="min-w-0">
            <div className="text-[12px] font-medium text-ink truncate">{user.name}</div>
            <div className="text-[11px] text-ink-3 truncate">{user.role}</div>
          </div>
        </div>
        <form action="/api/auth/signout" method="post" className="px-2 mt-1">
          <button className="text-[11px] text-ink-3 hover:text-ink transition">Sair da conta</button>
        </form>
      </div>
    </aside>
  )
}

function RoleBadge({ role }: { role: UserRole }) {
  const config = {
    admin:    { label: 'Admin',   cls: 'bg-warn/10 text-warn border-warn/30' },
    gerente:  { label: 'Gerente', cls: 'bg-sky/20 text-sky-700 border-sky/30' },
    assessor: { label: 'Operacional', cls: 'bg-surface-2 text-ink-2 border-border' },
  }[role]
  return (
    <span className={`inline-flex items-center gap-2 text-xs border px-2.5 py-1 rounded-full w-max ${config.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-ok"/>
      Squad · {config.label}
    </span>
  )
}

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-3 px-2 pb-1.5">
        {label}
      </div>
      {children}
    </div>
  )
}

function NavItemComp({ icon, label, count, active, href }: NavItem & { active: boolean }) {
  const Ico = ICONS_BY_NAME[icon]
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium transition-colors
        ${active ? 'bg-surface-2 text-ink' : 'text-ink-2 hover:bg-surface-hover hover:text-ink'}`}
    >
      {Ico && <Ico size={15}/>}
      <span className="flex-1">{label}</span>
      {count != null && (
        <span className="text-[11px] text-ink-3 tabular-nums">{count}</span>
      )}
    </Link>
  )
}
