'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getDadoPicanteItemsAction } from '@/app/actions/dado-picante'
import { getIsCouplePremiumAction } from '@/app/actions/subscription'
import { getPicanteTrialUsadoAction, marcarPicanteTrialUsadoAction } from '@/app/actions/picante-trial'
import type { DadoPicanteItem } from '@/types'
import PicanteUpsell from '@/components/PicanteUpsell'

type Tipo = 'lugar' | 'posicion' | 'accion' | 'zona'
type Modo = 'posiciones' | 'caricias'

const DADOS_POR_MODO: Record<Modo, [Tipo, Tipo]> = {
  posiciones: ['lugar', 'posicion'],
  caricias: ['accion', 'zona'],
}

const ETIQUETA: Record<Tipo, string> = {
  lugar: 'lugar',
  posicion: 'posición',
  accion: 'acción',
  zona: 'zona',
}

// Patrones de pips 1-6 en una grilla de 3x3 (fila, columna), igual
// que un dado físico. Puramente decorativo: el número que muestra el
// dado durante el giro no tiene relación con qué opción sale -- el
// pool de cada tipo no tiene por qué ser de 6 elementos.
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
  const [modo, setModo] = useState<Modo>('posiciones')
  const [items, setItems] = useState<DadoPicanteItem[]>([])
  const [resultados, setResultados] = useState<Record<Tipo, DadoPicanteItem | null>>({
    lugar: null, posicion: null, accion: null, zona: null,
  })
  const [girando, setGirando] = useState<Record<Tipo, boolean>>({
    lugar: false, posicion: false, accion: false, zona: false,
  })
  const [pips, setPips] = useState<Record<Tipo, number>>({
    lugar: 1, posicion: 4, accion: 2, zona: 5,
  })
  const [isPremium, setIsPremium] = useState(false)
  const [picanteUsado, setPicanteUsado] = useState(false)
  const [mostrarUpsell, setMostrarUpsell] = useState(false)
  const intervalsRef = useRef<Record<Tipo, ReturnType<typeof setInterval> | null>>({
    lugar: null, posicion: null, accion: null, zona: null,
  })

  useEffect(() => {
    getDadoPicanteItemsAction().then(setItems)
    getIsCouplePremiumAction().then(setIsPremium)
    getPicanteTrialUsadoAction('dado_picante').then(setPicanteUsado)

    return () => {
      Object.values(intervalsRef.current).forEach(id => { if (id) clearInterval(id) })
    }
  }, [])

  const itemsPorTipo: Record<Tipo, DadoPicanteItem[]> = {
    lugar: items.filter(i => i.tipo === 'lugar'),
    posicion: items.filter(i => i.tipo === 'posicion'),
    accion: items.filter(i => i.tipo === 'accion'),
    zona: items.filter(i => i.tipo === 'zona'),
  }

  function tirar(tipo: Tipo) {
    if (!isPremium && picanteUsado) {
      setMostrarUpsell(true)
      return
    }
    const pool = itemsPorTipo[tipo]
    if (pool.length === 0) return

    setMostrarUpsell(false)
    setGirando(prev => ({ ...prev, [tipo]: true }))
    intervalsRef.current[tipo] = setInterval(() => {
      setPips(prev => ({ ...prev, [tipo]: 1 + Math.floor(Math.random() * 6) }))
    }, 90)

    setTimeout(() => {
      const id = intervalsRef.current[tipo]
      if (id) clearInterval(id)
      setResultados(prev => ({ ...prev, [tipo]: pickRandom(pool) }))
      setGirando(prev => ({ ...prev, [tipo]: false }))
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
            Dos dados a la vez: posiciones, o caricias (acción + zona). Lo que salga, se juega.
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

  const [tipoA, tipoB] = DADOS_POR_MODO[modo]

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
        <div className="flex bg-ritual-bg-soft rounded-2xl p-1 mb-8">
          <button
            onClick={() => setModo('posiciones')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-body font-medium transition-all duration-300 ${
              modo === 'posiciones' ? 'bg-[#D4A5A5] text-ritual-bg' : 'text-ritual-muted hover:text-ritual-text'
            }`}
          >
            Posiciones
          </button>
          <button
            onClick={() => setModo('caricias')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-body font-medium transition-all duration-300 ${
              modo === 'caricias' ? 'bg-[#D4A5A5] text-ritual-bg' : 'text-ritual-muted hover:text-ritual-text'
            }`}
          >
            Caricias
          </button>
        </div>

        {mostrarUpsell ? (
          <PicanteUpsell />
        ) : (
          <div className="space-y-8 animate-fade-up">
            <div className="flex items-start justify-center gap-6">
              {[tipoA, tipoB].map(tipo => (
                <div key={tipo} className="flex flex-col items-center gap-3 flex-1">
                  <Dado valor={pips[tipo]} girando={girando[tipo]} />
                  <p
                    className={`font-display text-lg text-ritual-cream text-center transition-opacity duration-200 ${
                      girando[tipo] ? 'opacity-0' : 'opacity-100'
                    }`}
                  >
                    {resultados[tipo]?.texto ?? '—'}
                  </p>
                  <button
                    onClick={() => tirar(tipo)}
                    disabled={girando[tipo] || itemsPorTipo[tipo].length === 0}
                    className="w-full bg-[#D4A5A5] text-ritual-bg font-body font-medium py-3 rounded-2xl hover:opacity-90 transition-all disabled:opacity-50 text-sm"
                  >
                    {girando[tipo] ? 'Tirando...' : `Tirar ${ETIQUETA[tipo]}`}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
