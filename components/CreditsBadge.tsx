'use client'

import Link from 'next/link'
import { useCredits } from '@/hooks/useCredits'

// Pozo de créditos en tiempo real (Sprint 5) -- se usa como header
// pill en /juegos y /ritual-ia. Mismo lenguaje visual que StreakBadge:
// pill redondeada, dorado cuando hay algo para destacar (acá: bono de
// racha activo, no un hito numérico como en la racha de días).
export default function CreditsBadge() {
  const { credits, loading } = useCredits()

  if (loading || !credits) return null

  const tieneStreakBonus = credits.streakBonus > 0

  return (
    <Link
      href="/ritual-ia"
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-300 ${
        tieneStreakBonus ? 'bg-ritual-gold/15 border-ritual-gold/40' : 'bg-white/5 border-white/10'
      }`}
    >
      <span className={tieneStreakBonus ? 'text-ritual-gold' : 'text-ritual-muted'}>✦</span>
      <span className={`font-body font-medium text-xs ${tieneStreakBonus ? 'text-ritual-gold' : 'text-ritual-cream'}`}>
        {credits.total} {credits.total === 1 ? 'crédito' : 'créditos'}
      </span>
      {tieneStreakBonus && (
        <span className="text-ritual-gold/70 text-[10px] font-body">+{credits.streakBonus} hoy</span>
      )}
    </Link>
  )
}
