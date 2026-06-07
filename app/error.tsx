'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-dvh bg-ritual-bg flex flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-2xl text-ritual-cream mb-3">
        Algo salió mal
      </p>
      <p className="text-ritual-muted font-body text-sm mb-8">
        {error.message || 'Ocurrió un error inesperado.'}
      </p>
      <button
        onClick={reset}
        className="bg-ritual-gold text-ritual-bg font-body font-medium px-6 py-3 rounded-2xl"
      >
        Intentar de nuevo
      </button>
    </div>
  )
}
