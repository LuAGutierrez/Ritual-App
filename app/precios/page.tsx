'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUserContextAction } from '@/app/actions/ritual'
import { isCouplePremiumAction } from '@/app/actions/subscription'
import { FREE_FEATURES, PREMIUM_FEATURES, PREMIUM_PRICE } from '@/lib/plans'
import { createClient } from '@/lib/supabase/client'

export default function PreciosPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isPremium, setIsPremium] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function load() {
      const ctx = await getUserContextAction()
      if (ctx?.couple) {
        setIsPremium(await isCouplePremiumAction(ctx.couple.id))
      }
      setLoading(false)
    }
    load()

    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === '1') setSuccess(true)
  }, [])

  async function handleCheckout() {
    setCheckoutLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.functions.invoke('create-mp-subscription')
      if (error || !data?.init_point) {
        console.error('Error al crear suscripción', error ?? data)
        return
      }
      window.location.href = data.init_point
    } finally {
      setCheckoutLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-ritual-bg flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-ritual-gold/40 border-t-ritual-gold rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-ritual-bg flex flex-col">
      <header className="px-5 pt-8 pb-4 flex items-center justify-between">
        <h1 className="font-display text-xl text-ritual-cream tracking-wide">Rituales Premium</h1>
        <button
          onClick={() => router.push('/ritual')}
          className="text-ritual-muted text-xs font-body hover:text-ritual-text transition-colors py-2 px-3"
        >
          ← Volver
        </button>
      </header>

      <main className="flex-1 px-5 pb-10 max-w-md mx-auto w-full space-y-6">
        {success && (
          <div className="bg-ritual-gold/15 border border-ritual-gold/30 text-ritual-gold font-body text-sm px-4 py-3 rounded-2xl text-center">
            Pago exitoso — ya tenés Premium activo
          </div>
        )}

        <div className="text-center space-y-2 pt-2">
          <p className="text-3xl">✦</p>
          <p className="font-display text-2xl text-ritual-cream leading-snug">
            Más profundidad para su rutina
          </p>
          <p className="text-ritual-muted font-body text-sm leading-relaxed">
            El ritual diario siempre es gratis. Premium suma exclusividad y recuerdos sin límite.
          </p>
        </div>

        <div className="bg-ritual-bg-soft border border-white/10 rounded-3xl p-6 space-y-4">
          <div>
            <p className="text-ritual-muted text-xs font-body uppercase tracking-widest">Gratis</p>
            <p className="font-display text-3xl text-ritual-cream mt-1">$0</p>
          </div>
          <ul className="space-y-2.5">
            {FREE_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-2.5 text-ritual-muted font-body text-sm">
                <span className="text-ritual-gold/70 mt-0.5">·</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-ritual-gold/8 border border-ritual-gold/25 rounded-3xl p-6 space-y-4 relative overflow-hidden">
          <div className="absolute top-4 right-4 bg-ritual-gold/20 border border-ritual-gold/30 text-ritual-gold text-[10px] font-body uppercase tracking-widest px-2.5 py-1 rounded-full">
            Premium
          </div>
          <div>
            <p className="text-ritual-gold text-xs font-body uppercase tracking-widest">Para parejas</p>
            <p className="font-display text-3xl text-ritual-cream mt-1">
              {PREMIUM_PRICE.label}
              <span className="text-base text-ritual-muted font-body"> / {PREMIUM_PRICE.period}</span>
            </p>
            <p className="text-ritual-muted text-xs font-body mt-1">
              Si uno de los dos es Premium, la pareja accede junta
            </p>
          </div>
          <ul className="space-y-2.5">
            {PREMIUM_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-2.5 text-ritual-text font-body text-sm">
                <span className="text-ritual-gold mt-0.5">✦</span>
                {f}
              </li>
            ))}
          </ul>

          {isPremium ? (
            <div className="w-full bg-ritual-gold/15 border border-ritual-gold/30 text-ritual-gold font-body text-sm py-4 rounded-2xl text-center">
              Ya tenés Premium activo
            </div>
          ) : (
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="w-full bg-ritual-gold text-ritual-bg font-body font-medium py-4 rounded-2xl transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {checkoutLoading ? 'Redirigiendo...' : `Suscribirse — ${PREMIUM_PRICE.label} / ${PREMIUM_PRICE.period}`}
            </button>
          )}
          <p className="text-ritual-muted text-xs font-body text-center leading-relaxed">
            Sin bloquear la experiencia core. El ritual de hoy siempre queda disponible.
          </p>
        </div>
      </main>
    </div>
  )
}
