'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ESTO_O_AQUELLO } from '@/lib/juegos'

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export default function EstoOAquelloPage() {
  const router = useRouter()
  const [orden, setOrden] = useState(ESTO_O_AQUELLO)
  const [ronda, setRonda] = useState(0)
  const [elegido, setElegido] = useState<'a' | 'b' | null>(null)

  useEffect(() => {
    setOrden(shuffle(ESTO_O_AQUELLO))
  }, [])

  const par = orden[ronda % orden.length]
  const terminado = ronda >= orden.length

  function elegir(lado: 'a' | 'b') {
    setElegido(lado)
    setTimeout(() => {
      setElegido(null)
      setRonda(r => r + 1)
    }, 500)
  }

  return (
    <div className="min-h-dvh bg-ritual-bg flex flex-col">
      <header className="px-5 pt-8 pb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl text-ritual-cream tracking-wide">⚡ Esto o Aquello</h1>
          <p className="text-ritual-muted text-xs font-body mt-0.5">
            {terminado ? 'Ronda completa' : `${Math.min(ronda + 1, orden.length)} / ${orden.length}`}
          </p>
        </div>
        <button
          onClick={() => router.push('/juegos')}
          className="text-ritual-muted text-xs font-body hover:text-ritual-text transition-colors py-2 px-2"
        >
          ← Juegos
        </button>
      </header>

      <main className="flex-1 px-5 pb-28 flex flex-col justify-center max-w-md mx-auto w-full">
        {terminado ? (
          <div className="text-center space-y-6 animate-fade-up">
            <p className="text-3xl">✦</p>
            <p className="font-display text-2xl text-ritual-cream">¡Terminaron la ronda!</p>
            <p className="text-ritual-muted font-body text-sm">Cuéntense por qué eligieron lo que eligieron.</p>
            <button
              onClick={() => { setOrden(shuffle(ESTO_O_AQUELLO)); setRonda(0) }}
              className="w-full bg-ritual-gold text-ritual-bg font-body font-medium py-4 rounded-2xl"
            >
              Jugar de nuevo
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-up" key={ronda}>
            <button
              onClick={() => elegir('a')}
              className={`w-full rounded-3xl py-10 text-center border transition-all duration-200 ${
                elegido === 'a'
                  ? 'bg-ritual-gold text-ritual-bg border-ritual-gold'
                  : 'bg-ritual-bg-soft border-white/10 text-ritual-cream hover:border-ritual-gold/40'
              }`}
            >
              <span className="font-display text-2xl">{par.a}</span>
            </button>

            <p className="text-center text-ritual-muted text-xs font-body">o</p>

            <button
              onClick={() => elegir('b')}
              className={`w-full rounded-3xl py-10 text-center border transition-all duration-200 ${
                elegido === 'b'
                  ? 'bg-ritual-gold text-ritual-bg border-ritual-gold'
                  : 'bg-ritual-bg-soft border-white/10 text-ritual-cream hover:border-ritual-gold/40'
              }`}
            >
              <span className="font-display text-2xl">{par.b}</span>
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
