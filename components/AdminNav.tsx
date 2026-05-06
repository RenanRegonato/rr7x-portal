'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IconSettings, IconSquad, IconDoc, IconHome, IconUsers } from './Icons'

const NAV = [
  { href: '/dashboard/admin',              label: 'Overview',     Icon: IconHome     },
  { href: '/dashboard/admin/clientes',     label: 'Clientes',     Icon: IconSquad    },
  { href: '/dashboard/admin/usuarios',     label: 'Usuários',     Icon: IconUsers    },
  { href: '/dashboard/admin/agentes',      label: 'Agentes',      Icon: IconSettings },
  { href: '/dashboard/admin/aprendizados', label: 'Aprendizados', Icon: IconDoc      },
]

export default function AdminNav() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/dashboard/admin') return pathname === '/dashboard/admin'
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-52 border-r border-border p-4 flex flex-col gap-1 shrink-0 bg-bg">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3 px-2 pb-2">
        Administração
      </p>
      {NAV.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium transition-colors
            ${isActive(href)
              ? 'bg-surface-2 text-ink'
              : 'text-ink-2 hover:bg-surface-hover hover:text-ink'
            }`}
        >
          <Icon size={14}/>
          {label}
        </Link>
      ))}
    </aside>
  )
}
