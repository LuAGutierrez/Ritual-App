'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getDadoPicanteItemsAction } from '@/app/actions/dado-picante'
import { getIsCouplePremiumAction } from '@/app/actions/subscription'
import { getPicanteTrialUsadoAction, marcarPicanteTrialUsadoAction } from '@/app/actions/picante-trial'
import type { DadoPicanteItem } from '@/types'
import PicanteUpsell from '@/components/PicanteUpsell'

// Patrones de pips 1-6 en una grilla de 3x3 (fila, columna), igual
// que un dado físico. Puramente decorativo: el número que muestra el
// dado durante el giro no tiene relación con qué lugar/posición sale
// -- el pool de cada uno no tiene por qué ser de 6 elementos.
const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
}

function Dado({ valor, girando }: { valor: number; girando: boolean }) {
  const activos = new Set(PIPS[valor].map(([f, c]) => `${f}-${c}`))
  return (
    <div
      className={`w-20 h-20 bg-ritual-bg-soft border border-[#D4A5A5]/30 rounded-2xl grid grid-cols-3 grid-rows-3 gap-1 p-3 transition-transform duration-150 ${
        girando ? 'scale-95' : 'scale-100'
      }`}
    >
      {Array.from({ length: 9 }, (_, i) => {
        const fila = Math.floor(i / 3)
        const col = i % 3
        const activo = activos.has(`${fila}-${col}`)
        return (
          <div key={i} className="flex items-center justify-center">
            {activo && <span className="w-2 h-2 rounded-full bg-[#D4A5A5]" />}
          </div>
        )
      })}
    </div>
  )
}

function pickRandom(items: DadoPicanteItem[]): DadoPicanteItem | null {
  if (items.length === 0) return null
  return items[Math.floor(Math.random() * items.length)]
}

export default function DadoPicantePage() {
  const router = useRouter()
  const [confirmado, setConfirmado] = useState(false)
  const [items, setItems] = useState<DadoPicanteItem[]>([])
  const [lugarActual, setLugarActual] = useState<DadoPicanteItem | null>(null)
  const [posicionActual, setPosicionActual] = useState<DadoPicanteItem | null>(null)
  const [girando, setGirando] = useState(false)
  const [pipLugar, setPipLugar] = useState(1)
  const [pipPosicion, setPipPosicion] = useState(4)
  const [isPremium, setIsPremium] = useState(false)
  const [picanteUsado, setPicanteUsado] = useState(false)
  const [mostrarUpsell, setMostrarUpsell] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    getDadoPicanteItemsAction().then(setItems)
    getIsCouplePremiumAction().then(setIsPremium)
    getPicanteTrialUsadoAction('dado_picante').then(setPicanteUsado)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const lugares = items.filter(i => i.tipo === 'lugar')
  const posiciones = items.filter(i => i.tipo === 'posicion')

  function tirar() {
    if (!isPremium && picanteUsado) {
      setMostrarUpsell(true)
      return
    }
    if (lugares.length === 0 || posiciones.length === 0) return

    setMostrarUpsell(false)
    setGirando(true)
    intervalRef.current = setInterval(() => {
      setPipLugar(1 + Math.floor(Math.random() * 6))
      setPipPosicion(1 + Math.floor(Math.random() * 6))
    }, 90)

    setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setLugarActual(pickRandom(lugares))
      setPosicionActual(pickRandom(posiciones))
      setGirando(false)
      setPicanteUsado(true)
      marcarPicanteTrialUsadoAction('dado_picante')
    }, 650)
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
            Dos dados: uno de lugar, otro de posición. Lo que salga, se juega.
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
        <h1 className="font-display text-xl text-ritual-cream tracking-wide">🎲 Dado Picante</h1>
        <button
          onClick={() => router.push('/juegos')}
          className="text-ritual-muted text-xs font-body hover:text-ritual-text transition-colors py-2 px-2"
        >
          ← Juegos
        </button>
      </header>

      <main className="flex-1 px-5 pb-28 flex flex-col justify-center max-w-md mx-auto w-full">
        {mostrarUpsell ? (
          <PicanteUpsell />
        ) : (
          <div className="space-y-8 animate-fade-up">
            <div className="flex items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-3">
                <Dado valor={pipLugar} girando={girando} />
                <p
                  className={`font-display text-lg text-ritual-cream text-center transition-opacity duration-200 ${
                    girando ? 'opacity-0' : 'opacity-100'
                  }`}
                >
                  {lugarActual?.texto ?? '—'}
                </p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <Dado valor={pipPosicion} girando={girando} />
                <p
                  className={`font-display text-lg text-ritual-cream text-center transition-opacity duration-200 ${
                    girando ? 'opacity-0' : 'opacity-100'
                  }`}
                >
                  {posicionActual?.texto ?? '—'}
                </p>
              </div>
            </div>

            <button
              onClick={tirar}
              disabled={girando || items.length === 0}
              className="w-full bg-[#D4A5A5] text-ritual-bg font-body font-medium py-4 rounded-2xl hover:opacity-90 transition-all disabled:opacity-50"
            >
              {girando ? 'Tirando...' : lugarActual ? 'Tirar de nuevo' : 'Tirar los dados'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
