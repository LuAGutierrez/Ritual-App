'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getRuletaPicanteItemsAction } from '@/app/actions/ruleta-picante'
import { logContenidoRechazadoAction, getRechazadosAction } from '@/app/actions/contenido-rechazado'
import { logRondaJugadaAction, getUltimaCategoriaRondaAction } from '@/app/actions/rondas-jugadas'
import { getIsCouplePremiumAction } from '@/app/actions/subscription'
import { getIntensidadMaximaAction } from '@/app/actions/perfil-preferencias'
import { dentroDelTecho, type Intensidad } from '@/lib/intensidad'
import { getCategoriaPreferida } from '@/lib/categoriaPreferida'
import type { RuletaPicanteItem } from '@/types'
import PicanteUpsell from '@/components/PicanteUpsell'

function pickIndex(total: number, vistos: Set<number>): number {
  const disponibles = Array.from({ length: total }, (_, i) => i).filter(i => !vistos.has(i))
  const pool = disponibles.length > 0 ? disponibles : Array.from({ length: total }, (_, i) => i)
  return pool[Math.floor(Math.random() * pool.length)]
}

export default function RuletaPicantePage() {
  const router = useRouter()
  const [confirmado, setConfirmado] = useState(false)
  const [promptItem, setPromptItem] = useState<RuletaPicanteItem | null>(null)
  const [girando, setGirando] = useState(false)
  const [vistos, setVistos] = useState<Set<number>>(new Set())
  const [items, setItems] = useState<RuletaPicanteItem[]>([])
  const [rechazados, setRechazados] = useState<Set<string>>(new Set())
  const [isPremium, setIsPremium] = useState(false)
  const [picanteUsado, setPicanteUsado] = useState(false)
  const [mostrarUpsell, setMostrarUpsell] = useState(false)
  const [intensidadMaxima, setIntensidadMaxima] = useState<Intensidad>('intensa')
  const ultimaCategoriaRef = useRef<string | null>(null)

  useEffect(() => {
    getRuletaPicanteItemsAction().then(setItems)
    getRechazadosAction('ruleta_picante').then(ids => setRechazados(new Set(ids)))
    getIsCouplePremiumAction().then(setIsPremium)
    getIntensidadMaximaAction().then(setIntensidadMaxima)
    getUltimaCategoriaRondaAction('ruleta_picante').then(c => { ultimaCategoriaRef.current = c })
  }, [])

  // Evita repetir lo que ya pasaron -- pero si eso deja muy pocas
  // opciones (el pool es chico, 12 en total), se prioriza variedad y
  // se gira sobre la lista completa. Después aplica el techo de
  // intensidad de la pareja y evita repetir la categoría del último
  // giro, con el mismo criterio de fallback si quedan pocas opciones.
  const itemsDisponibles = (() => {
    const sinRechazados = items.filter(item => !rechazados.has(item.id))
    const porRechazo = sinRechazados.length >= 3 ? sinRechazados : items
    const porTecho = porRechazo.filter(item => dentroDelTecho(item.intensidad, intensidadMaxima))
    const porTechoFinal = porTecho.length >= 3 ? porTecho : porRechazo
    const porVariedad = ultimaCategoriaRef.current
      ? (() => {
          const variados = porTechoFinal.filter(item => item.categoria !== ultimaCategoriaRef.current)
          return variados.length >= 3 ? variados : porTechoFinal
        })()
      : porTechoFinal
    const categoriaPreferida = getCategoriaPreferida()
    if (!categoriaPreferida) return porVariedad
    const preferidos = porVariedad.filter(item => item.categoria === categoriaPreferida)
    return preferidos.length >= 3 ? preferidos : porVariedad
  })()

  function girar() {
    if (!isPremium && picanteUsado) {
      setMostrarUpsell(true)
      return
    }
    if (itemsDisponibles.length === 0) return
    setMostrarUpsell(false)
    setGirando(true)
    setTimeout(() => {
      setVistos(prev => {
        const idx = pickIndex(itemsDisponibles.length, prev)
        const next = prev.size >= itemsDisponibles.length - 1 ? new Set([idx]) : new Set(prev).add(idx)
        setPromptItem(itemsDisponibles[idx])
        ultimaCategoriaRef.current = itemsDisponibles[idx].categoria
        logRondaJugadaAction('ruleta_picante', itemsDisponibles[idx].id, itemsDisponibles[idx].categoria)
        return next
      })
      setGirando(false)
      setPicanteUsado(true)
    }, 350)
  }

  // Acción segura "no quiero hacer esto" -- distinta de "Girar de
  // nuevo": deja registro de qué se rechazó y nunca rompe la partida.
  function pasar() {
    if (promptItem) {
      logContenidoRechazadoAction('ruleta_picante', promptItem.id)
      setRechazados(prev => new Set(prev).add(promptItem.id))
    }
    girar()
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
        {mostrarUpsell ? (
          <PicanteUpsell />
        ) : !promptItem ? (
          <div className="text-center animate-fade-up">
            <button
              onClick={girar}
              disabled={items.length === 0}
              className="w-full bg-[#D4A5A5]/10 border border-[#D4A5A5]/30 rounded-3xl py-16 hover:border-[#D4A5A5]/50 transition-all disabled:opacity-50"
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
              <p className="font-display text-2xl text-ritual-cream leading-snug">{promptItem.texto}</p>
            </div>
            <button
              onClick={girar}
              disabled={girando}
              className="w-full bg-[#D4A5A5] text-ritual-bg font-body font-medium py-4 rounded-2xl hover:opacity-90 transition-all disabled:opacity-50"
            >
              {girando ? 'Girando...' : 'Girar de nuevo'}
            </button>
            <button
              onClick={pasar}
              disabled={girando}
              className="w-full text-ritual-muted/70 font-body text-xs py-2 hover:text-ritual-text transition-colors disabled:opacity-40"
            >
              No quiero hacer esta, paso
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
