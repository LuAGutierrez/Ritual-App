'use client'

import { useRouter } from 'next/navigation'
import { JUEGOS } from '@/lib/juegos'
import BottomNav from '@/components/BottomNav'

export default function JuegosPage() {
  const router = useRouter()

  return (
    <div className="min-h-dvh bg-ritual-bg flex flex-col">
      <header className="px-5 pt-8 pb-4">
        <h1 className="font-display text-xl text-ritual-cream tracking-wide">Juegos</h1>
        <p className="text-ritual-muted text-xs font-body mt-0.5">Para jugar juntos, más allá del ritual de hoy</p>
      </header>

      <main className="flex-1 px-5 pb-28 max-w-md mx-auto w-full space-y-3">
        {JUEGOS.map(j => (
          <button
            key={j.id}
            onClick={() => router.push(`/juegos/${j.id}`)}
            className={`w-full text-left bg-ritual-bg-soft border rounded-2xl px-5 py-4 flex items-center gap-4 transition-all duration-200 hover:border-white/20 ${
              j.picante ? 'border-[#D4A5A5]/30' : 'border-white/8'
            }`}
          >
            <span className="text-3xl">{j.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-display text-lg text-ritual-cream leading-snug">{j.titulo}</p>
              <p className="text-ritual-muted text-xs font-body mt-0.5">{j.descripcion}</p>
            </div>
            {j.picante && (
              <span className="text-[10px] font-body uppercase tracking-wider text-[#D4A5A5] border border-[#D4A5A5]/30 bg-[#D4A5A5]/10 rounded-full px-2 py-0.5 flex-shrink-0">
                +18
              </span>
            )}
          </button>
        ))}
      </main>

      <BottomNav />
    </div>
  )
}
