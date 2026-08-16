'use client'

import { useRouter } from 'next/navigation'

export default function PicanteUpsell() {
  const router = useRouter()

  return (
    <div className="bg-[#D4A5A5]/8 border border-[#D4A5A5]/25 rounded-2xl p-5 text-center space-y-3 animate-fade-up">
      <p className="text-2xl">🔥</p>
      <p className="font-display text-lg text-ritual-cream">
        Eso fue solo una probada
      </p>
      <p className="text-ritual-muted font-body text-sm leading-relaxed">
        El modo picante completo es para parejas Premium.
      </p>
      <button
        onClick={() => router.push('/precios')}
        className="w-full bg-[#D4A5A5] text-ritual-bg font-body font-medium text-sm py-3.5 rounded-2xl hover:opacity-90 transition-all duration-300"
      >
        Ver Premium
      </button>
    </div>
  )
}
