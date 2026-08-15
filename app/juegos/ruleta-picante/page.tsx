'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RULETA_PICANTE } from '@/lib/juegos'

function pickRandom(list: string[], excluir?: string): string {
  let candidato = list[Math.floor(Math.random() * list.length)]
  if (list.length > 1) {
    while (candidato === excluir) {
      candidato = list[Math.floor(Math.random() * list.length)]
    }
  }
  return candidato
}

export default function RuletaPicantePage() {
  const router = useRouter()
  const [confirmado, setConfirmado] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [girando, setGirando] = useState(false)

  function girar() {
    setGirando(true)
    setTimeout(() => {
      setPrompt(p => pickRandom(RULETA_PICANTE, p))
      setGirando(false)
    }, 350)
  }

  if (!confirmado) {
    return (
      <div className="min-h-dvh bg-ritual-bg flex items-center justify-center px-5">
        <div className="max-w-md w-full text-center space-y-6 animate-fade-up">
          <p className="text-4xl">🔥</p>
          <p className="font-display text-2xl text-ritual-cream leading-snug">
            Contenido +18 para parejas
          </p>
          <p className="text-ritual-muted font-body text-sm leading-relaxed">
            Este juego tiene consignas íntimas y sugerentes, pensadas para jugarse a solas con tu pareja.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => setConfirmado(true)}
              className="w-full bg-[#D4A5A5] text-ritual-bg font-body font-medium py-4 rounded-2xl hover:opacity-90 transition-all"
            >
              Entendido, quiero jugar
            </button>
            <button
              onClick={() => router.push('/juegos')}
              className="w-full bg-transparent border border-white/10 text-ritual-muted font-body text-sm py-4 rounded-2xl hover:border-white/20 hover:text-ritual-text transition-all"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-ritual-bg flex flex-col">
      <header className="px-5 pt-8 pb-4 flex items-center justify-between">
        <h1 className="font-display text-xl text-ritual-cream tracking-wide">🔥 Ruleta Picante</h1>
        <button
          onClick={() => router.push('/juegos')}
          className="text-ritual-muted text-xs font-body hover:text-ritual-text transition-colors py-2 px-2"
        >
          ← Juegos
        </button>
      </header>

      <main className="flex-1 px-5 pb-28 flex flex-col justify-center max-w-md mx-auto w-full">
        {!prompt ? (
          <div className="text-center animate-fade-up">
            <button
              onClick={girar}
              className="w-full bg-[#D4A5A5]/10 border border-[#D4A5A5]/30 rounded-3xl py-16 hover:border-[#D4A5A5]/50 transition-all"
            >
              <span className="text-4xl">🎡</span>
              <p className="font-display text-xl text-ritual-cream mt-4">Tocá para girar</p>
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-up">
            <div
              className={`bg-ritual-bg-soft border border-[#D4A5A5]/30 rounded-3xl px-6 py-10 text-center transition-opacity duration-300 ${
                girando ? 'opacity-30' : 'opacity-100'
              }`}
            >
              <p className="font-display text-2xl text-ritual-cream leading-snug">{prompt}</p>
            </div>
            <button
              onClick={girar}
              disabled={girando}
              className="w-full bg-[#D4A5A5] text-ritual-bg font-body font-medium py-4 rounded-2xl hover:opacity-90 transition-all disabled:opacity-50"
            >
              {girando ? 'Girando...' : 'Girar de nuevo'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
