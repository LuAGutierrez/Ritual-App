'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getCreditPackagesAction, createCreditCheckoutAction, type CreditPackage } from '@/app/actions/credits'
import { useCredits, notifyCreditsChanged } from '@/hooks/useCredits'
import PageLoader from '@/components/PageLoader'

function formatARS(n: number) {
  return `$${n.toLocaleString('es-AR')}`
}

// El catálogo estático (rituales, los 6 juegos, historial) es gratis
// para siempre -- acá solo se compran créditos para la generación con
// IA (Sprint 5). Pago único vía Checkout Pro de Mercado Pago
// (create-credit-checkout + mp-webhook), no la suscripción recurrente
// de antes.
export default function PreciosPage() {
  return (
    <Suspense>
      <PreciosContent />
    </Suspense>
  )
}

function PreciosContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { credits, loading: loadingCredits, refetch } = useCredits()
  const [packages, setPackages] = useState<CreditPackage[]>([])
  const [loadingPackages, setLoadingPackages] = useState(true)
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPendingBanner, setShowPendingBanner] = useState(false)

  useEffect(() => {
    getCreditPackagesAction().then(data => {
      setPackages(data)
      setLoadingPackages(false)
    })
  }, [])

  useEffect(() => {
    // Vuelta de Mercado Pago: el webhook procesa el pago de forma
    // asíncrona, puede no haber terminado cuando el usuario ya está de
    // vuelta acá -- se muestra un aviso y se reintenta el fetch del
    // saldo unas veces en vez de asumir que ya está acreditado.
    if (searchParams.get('mp') !== 'success') return
    setShowPendingBanner(true)
    let intentos = 0
    const interval = setInterval(() => {
      intentos += 1
      refetch()
      notifyCreditsChanged()
      if (intentos >= 5) clearInterval(interval)
    }, 2000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function comprar(packageId: string) {
    setBuyingId(packageId)
    setError(null)
    const result = await createCreditCheckoutAction(packageId)
    if (!result.ok) {
      setError('No se pudo iniciar la compra. Probá de nuevo en un rato.')
      setBuyingId(null)
      return
    }
    window.location.href = result.initPoint
  }

  if (loadingCredits || loadingPackages) {
    return <PageLoader />
  }

  return (
    <div className="min-h-dvh bg-ritual-bg flex flex-col">
      <header className="px-5 pt-8 pb-4 flex items-center justify-between">
        <h1 className="font-display text-xl text-ritual-cream tracking-wide">Créditos</h1>
        <button
          onClick={() => router.push('/ritual')}
          className="text-ritual-muted text-xs font-body hover:text-ritual-text transition-colors py-2 px-3"
        >
          ← Volver
        </button>
      </header>

      <main className="flex-1 px-5 pb-10 max-w-md mx-auto w-full space-y-6">
        {showPendingBanner && (
          <div className="bg-ritual-gold/15 border border-ritual-gold/30 text-ritual-gold font-body text-sm px-4 py-3 rounded-2xl text-center">
            Estamos confirmando tu pago — los créditos aparecen en unos segundos.
          </div>
        )}

        <div className="text-center space-y-2 pt-2">
          <p className="text-3xl">✦</p>
          <p className="font-display text-2xl text-ritual-cream leading-snug">
            Todo el contenido de Rituales es gratis
          </p>
          <p className="text-ritual-muted font-body text-sm leading-relaxed">
            Los créditos son solo para pedirle a la IA algo hecho a medida -- rituales personalizados
            y dinámicas de compatibilidad.
          </p>
        </div>

        {credits && (
          <div className="bg-ritual-bg-soft border border-ritual-gold/25 rounded-2xl px-5 py-4 flex items-center justify-between">
            <span className="text-ritual-muted font-body text-sm">Tu saldo</span>
            <span className="text-ritual-gold font-display text-xl">{credits.total} créditos</span>
          </div>
        )}

        <div className="space-y-3">
          {packages.map(pack => (
            <div
              key={pack.id}
              className="bg-ritual-bg-soft border border-white/10 rounded-2xl p-5 flex items-center justify-between gap-4"
            >
              <div>
                <p className="font-display text-xl text-ritual-cream">{pack.credits} créditos</p>
                <p className="text-ritual-muted text-xs font-body mt-0.5">{formatARS(pack.priceArs)}</p>
              </div>
              <button
                onClick={() => comprar(pack.id)}
                disabled={buyingId !== null}
                className="bg-ritual-gold text-ritual-bg font-body font-medium text-xs py-2.5 px-4 rounded-xl hover:bg-ritual-cream transition-all disabled:opacity-50"
              >
                {buyingId === pack.id ? 'Redirigiendo...' : 'Comprar'}
              </button>
            </div>
          ))}
        </div>

        {error && <p className="text-ritual-muted text-xs font-body text-center">{error}</p>}

        <p className="text-ritual-muted text-xs font-body text-center leading-relaxed pt-2">
          También sumás créditos gratis vinculando pareja y completando el ritual del día.
        </p>
      </main>
    </div>
  )
}
