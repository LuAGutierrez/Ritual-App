'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import BottomNav from '@/components/BottomNav'
import PageLoader from '@/components/PageLoader'

function IconEleccion() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="12" r="6" />
      <circle cx="15" cy="12" r="6" />
    </svg>
  )
}

function IconDado() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <circle cx="8.5" cy="8.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="8.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="15.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconBifurcacion() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 5c3 0 3 6 6 6s3-6 6-6" />
      <path d="M5 19c3 0 3-6 6-6s3 6 6 6" />
    </svg>
  )
}

function IconLlama() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3c1.5 3-3 4.5-3 9a5 5 0 0 0 10 0c0-2.5-1.5-3.5-2-5.5C16.3 8.5 16 10 15 10c-1.5 0-.5-3.5-3-7z" />
    </svg>
  )
}

export default function JuegosPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick(e: React.MouseEvent, href: string) {
    e.preventDefault()
    startTransition(() => {
      router.push(href)
    })
  }

  return (
    <div className="min-h-dvh bg-ritual-bg flex flex-col">
      {isPending && (
        <div className="fixed inset-0 z-50">
          <PageLoader />
        </div>
      )}

      <header className="px-5 pt-8 pb-4">
        <h1 className="font-display text-xl text-ritual-cream tracking-wide">Juegos</h1>
        <p className="text-ritual-muted text-xs font-body mt-0.5">Para jugar juntos, más allá del ritual de hoy</p>
      </header>

      <main className="flex-1 px-5 pb-28 max-w-md mx-auto w-full space-y-3">
        {/* Destacado: Elección — el único con reveal sincronizado */}
        <Link
          href="/juegos/eleccion"
          prefetch
          onClick={e => handleClick(e, '/juegos/eleccion')}
          className="group block bg-ritual-bg-soft border border-white/8 rounded-3xl px-6 py-8 transition-all duration-200 hover:border-ritual-gold/30"
        >
          <div className="flex items-start justify-between">
            <span className="text-ritual-muted group-hover:text-ritual-gold transition-colors"><IconEleccion /></span>
            <span className="text-[10px] font-body uppercase tracking-wider text-ritual-muted border border-white/10 rounded-full px-2 py-0.5 flex items-center gap-1">
              <IconLlama /> también picante
            </span>
          </div>
          <p className="font-display text-3xl text-ritual-cream leading-snug mt-4">Elección</p>
          <p className="text-ritual-muted text-sm font-body mt-1.5 max-w-[85%]">
            Elijan en secreto, en tiempo real. Si coinciden, se llevan un premio.
          </p>
        </Link>

        {/* Par: Verdad o Reto + Esto o Aquello */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/juegos/verdad-o-reto"
            prefetch
            onClick={e => handleClick(e, '/juegos/verdad-o-reto')}
            className="group bg-ritual-bg-soft border border-white/8 rounded-2xl px-4 py-5 flex flex-col justify-between h-40 transition-all duration-200 hover:border-white/20"
          >
            <span className="text-ritual-muted group-hover:text-ritual-cream transition-colors"><IconDado /></span>
            <div>
              <p className="font-display text-xl text-ritual-cream leading-tight">Verdad o Reto</p>
              <p className="text-ritual-muted text-[11px] font-body mt-1 flex items-center gap-1">
                <IconLlama /> también picante
              </p>
            </div>
          </Link>

          <Link
            href="/juegos/esto-o-aquello"
            prefetch
            onClick={e => handleClick(e, '/juegos/esto-o-aquello')}
            className="group bg-ritual-bg-soft border border-white/8 rounded-2xl px-4 py-5 flex flex-col justify-between h-40 transition-all duration-200 hover:border-white/20"
          >
            <span className="text-ritual-muted group-hover:text-ritual-cream transition-colors"><IconBifurcacion /></span>
            <div>
              <p className="font-display text-xl text-ritual-cream leading-tight">Esto o Aquello</p>
              <p className="text-ritual-muted text-[11px] font-body mt-1 flex items-center gap-1">
                <IconLlama /> también picante
              </p>
            </div>
          </Link>
        </div>

        {/* Ruleta Picante — el único 100% +18, tratamiento propio */}
        <Link
          href="/juegos/ruleta-picante"
          prefetch
          onClick={e => handleClick(e, '/juegos/ruleta-picante')}
          className="group flex items-center gap-4 bg-[#D4A5A5]/8 border border-[#D4A5A5]/25 rounded-2xl px-5 py-5 transition-all duration-200 hover:border-[#D4A5A5]/45"
        >
          <span className="text-[#D4A5A5]"><IconLlama /></span>
          <div className="flex-1 min-w-0">
            <p className="font-display text-xl text-ritual-cream leading-tight">Ruleta Picante</p>
            <p className="text-ritual-muted text-xs font-body mt-0.5">Solo para parejas que se animan</p>
          </div>
          <span className="text-[10px] font-body uppercase tracking-wider text-[#D4A5A5] border border-[#D4A5A5]/30 rounded-full px-2 py-0.5 flex-shrink-0">
            +18
          </span>
        </Link>
      </main>

      <BottomNav />
    </div>
  )
}
