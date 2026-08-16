'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { VERDADES, RETOS, type JuegoItem } from '@/lib/juegos'
import { getIsCouplePremiumAction } from '@/app/actions/subscription'
import PicanteUpsell from '@/components/PicanteUpsell'

type Modo = 'verdad' | 'reto'
type Intensidad = 'normal' | 'picante'

function pickIndex(list: JuegoItem[], vistos: Set<number>): number {
  const disponibles = list.map((_, i) => i).filter(i => !vistos.has(i))
  const pool = disponibles.length > 0 ? disponibles : list.map((_, i) => i)
  return pool[Math.floor(Math.random() * pool.length)]
}

export default function VerdadORetoPage() {
  const router = useRouter()
  const [modo, setModo] = useState<Modo | null>(null)
  const [intensidad, setIntensidad] = useState<Intensidad>('normal')
  const [prompt, setPrompt] = useState('')
  const [vistos, setVistos] = useState<Set<number>>(new Set())
  const [isPremium, setIsPremium] = useState(false)
  const [picanteUsado, setPicanteUsado] = useState(false)
  const [mostrarUpsell, setMostrarUpsell] = useState(false)

  useEffect(() => {
    getIsCouplePremiumAction().then(setIsPremium)
  }, [])

  function listaFiltrada(m: Modo, ints: Intensidad): JuegoItem[] {
    const base = m === 'verdad' ? VERDADES : RETOS
    return base.filter(item => (ints === 'picante' ? item.picante : !item.picante))
  }

  function jugar(m: Modo) {
    if (intensidad === 'picante' && !isPremium && picanteUsado) {
      setModo(m)
      setMostrarUpsell(true)
      return
    }
    const lista = listaFiltrada(m, intensidad)
    const idx = pickIndex(lista, new Set())
    setModo(m)
    setVistos(new Set([idx]))
    setPrompt(lista[idx].texto)
    setMostrarUpsell(false)
    if (intensidad === 'picante') setPicanteUsado(true)
  }

  function siguiente() {
    if (!modo) return
    if (intensidad === 'picante' && !isPremium && picanteUsado) {
      setMostrarUpsell(true)
      return
    }
    const lista = listaFiltrada(modo, intensidad)
    const idx = pickIndex(lista, vistos)
    setVistos(prev => {
      const next = prev.size >= lista.length ? new Set([idx]) : new Set(prev).add(idx)
      return next
    })
    setPrompt(lista[idx].texto)
    if (intensidad === 'picante') setPicanteUsado(true)
  }

  function cambiarIntensidad(ints: Intensidad) {
    setIntensidad(ints)
    setModo(null)
    setMostrarUpsell(false)
    setVistos(new Set())
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
        <div className="flex bg-ritual-bg-soft rounded-2xl p-1 mb-6">
          <button
            onClick={() => cambiarIntensidad('normal')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-body font-medium transition-all duration-300 ${
              intensidad === 'normal' ? 'bg-ritual-gold text-ritual-bg' : 'text-ritual-muted hover:text-ritual-text'
            }`}
          >
            Normal
          </button>
          <button
            onClick={() => cambiarIntensidad('picante')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-body font-medium transition-all duration-300 ${
              intensidad === 'picante' ? 'bg-[#D4A5A5] text-ritual-bg' : 'text-ritual-muted hover:text-ritual-text'
            }`}
          >
            🔥 Picante
          </button>
        </div>

        {mostrarUpsell ? (
          <PicanteUpsell />
        ) : !modo ? (
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
