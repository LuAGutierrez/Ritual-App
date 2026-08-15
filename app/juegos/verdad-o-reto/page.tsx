'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { VERDADES, RETOS } from '@/lib/juegos'

type Modo = 'verdad' | 'reto'

function pickRandom(list: string[], excluir?: string): string {
  let candidato = list[Math.floor(Math.random() * list.length)]
  if (list.length > 1) {
    while (candidato === excluir) {
      candidato = list[Math.floor(Math.random() * list.length)]
    }
  }
  return candidato
}

export default function VerdadORetoPage() {
  const router = useRouter()
  const [modo, setModo] = useState<Modo | null>(null)
  const [prompt, setPrompt] = useState('')

  function jugar(m: Modo) {
    const lista = m === 'verdad' ? VERDADES : RETOS
    setModo(m)
    setPrompt(pickRandom(lista))
  }

  function siguiente() {
    if (!modo) return
    const lista = modo === 'verdad' ? VERDADES : RETOS
    setPrompt(pickRandom(lista, prompt))
  }

  return (
    <div className="min-h-dvh bg-ritual-bg flex flex-col">
      <header className="px-5 pt-8 pb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl text-ritual-cream tracking-wide">🎲 Verdad o Reto</h1>
          <p className="text-ritual-muted text-xs font-body mt-0.5">Se van turnando en elegir</p>
        </div>
        <button
          onClick={() => router.push('/juegos')}
          className="text-ritual-muted text-xs font-body hover:text-ritual-text transition-colors py-2 px-2"
        >
          ← Juegos
        </button>
      </header>

      <main className="flex-1 px-5 pb-28 flex flex-col justify-center max-w-md mx-auto w-full">
        {!modo ? (
          <div className="grid grid-cols-2 gap-4 animate-fade-up">
            <button
              onClick={() => jugar('verdad')}
              className="bg-ritual-bg-soft border border-ritual-gold/30 rounded-3xl py-10 flex flex-col items-center gap-2 hover:border-ritual-gold/50 transition-all"
            >
              <span className="text-3xl">💬</span>
              <span className="font-display text-lg text-ritual-cream">Verdad</span>
            </button>
            <button
              onClick={() => jugar('reto')}
              className="bg-ritual-bg-soft border border-white/10 rounded-3xl py-10 flex flex-col items-center gap-2 hover:border-white/20 transition-all"
            >
              <span className="text-3xl">🔥</span>
              <span className="font-display text-lg text-ritual-cream">Reto</span>
            </button>
          </div>
        ) : (
          <div className="animate-fade-up space-y-6">
            <p className="text-ritual-muted text-xs font-body uppercase tracking-wider text-center">
              {modo === 'verdad' ? 'Verdad' : 'Reto'}
            </p>
            <div className="bg-ritual-bg-soft border border-white/8 rounded-3xl px-6 py-10 text-center">
              <p className="font-display text-2xl text-ritual-cream leading-snug">{prompt}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setModo(null)}
                className="bg-transparent border border-white/10 text-ritual-muted font-body text-sm py-4 rounded-2xl hover:border-white/20 hover:text-ritual-text transition-all"
              >
                Cambiar modo
              </button>
              <button
                onClick={siguiente}
                className="bg-ritual-gold text-ritual-bg font-body font-medium text-sm py-4 rounded-2xl hover:bg-ritual-cream transition-all"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
