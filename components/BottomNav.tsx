'use client'

import { usePathname, useRouter } from 'next/navigation'

const TABS = [
  {
    href: '/ritual',
    label: 'Hoy',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.5l1.8 5.6 5.7.1-4.6 3.5 1.8 5.6-4.7-3.4-4.7 3.4 1.8-5.6-4.6-3.5 5.7-.1z" />
      </svg>
    ),
  },
  {
    href: '/juegos',
    label: 'Juegos',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/historial',
    label: 'Historial',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </svg>
    ),
  },
  {
    href: '/perfil',
    label: 'Perfil',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8.5" r="3.5" />
        <path d="M5 20c1.2-3.8 4-5.5 7-5.5s5.8 1.7 7 5.5" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-ritual-bg/95 backdrop-blur-sm border-t border-white/8 pb-[env(safe-area-inset-bottom)] z-40">
      <div className="max-w-md mx-auto flex items-stretch">
        {TABS.map(tab => {
          const active = pathname === tab.href
          return (
            <button
              key={tab.href}
              onClick={() => router.push(tab.href)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors duration-200 ${
                active ? 'text-ritual-gold' : 'text-ritual-muted hover:text-ritual-text'
              }`}
            >
              {tab.icon(active)}
              <span className="font-body text-[10px] tracking-wide">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
