'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getVerdadORetoItemsAction } from '@/app/actions/verdad-o-reto'
import { getIsCouplePremiumAction } from '@/app/actions/subscription'
import { getPicanteHabilitadoAction, habilitarPicanteAction } from '@/app/actions/picante-consent'
import { getIntensidadMaximaAction } from '@/app/actions/perfil-preferencias'
import { logContenidoRechazadoAction, getRechazadosAction } from '@/app/actions/contenido-rechazado'
import { registrarRetoDobleCompletadoAction } from '@/app/actions/momentos'
import { dentroDelTecho, type Intensidad as Techo } from '@/lib/intensidad'
import type { VerdadORetoItem } from '@/types'
import PicanteUpsell from '@/components/PicanteUpsell'
import PicanteConsentGate from '@/components/PicanteConsentGate'
import PageLoader from '@/components/PageLoader'

type Modo = 'verdad' | 'reto'
type Intensidad = 'normal' | 'picante'

function pickIndex(list: VerdadORetoItem[], vistos: Set<number>): number {
  const disponibles = list.map((_, i) => i).filter(i => !vistos.has(i))
  const pool = disponibles.length > 0 ? disponibles : list.map((_, i) => i)
  return pool[Math.floor(Math.random() * pool.length)]
}

export default function VerdadORetoPage() {
  const router = useRouter()
  const [modo, setModo] = useState<Modo | null>(null)
  const [intensidad, setIntensidad] = useState<Intensidad>('normal')
  const [promptItem, setPromptItem] = useState<VerdadORetoItem | null>(null)
  const [vistos, setVistos] = useState<Set<number>>(new Set())
  const [isPremium, setIsPremium] = useState(false)
  const [picanteUsado, setPicanteUsado] = useState(false)
  const [mostrarUpsell, setMostrarUpsell] = useState(false)
  const [items, setItems] = useState<VerdadORetoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [rechazados, setRechazados] = useState<Set<string>>(new Set())
  const [picanteHabilitado, setPicanteHabilitado] = useState(false)
  const [mostrarConsentimiento, setMostrarConsentimiento] = useState(false)
  const [retoDobleExtra, setRetoDobleExtra] = useState<VerdadORetoItem | null>(null)
  const [intensidadMaxima, setIntensidadMaxima] = useState<Techo>('intensa')
  const ultimaCategoriaRef = useRef<string | null>(null)

  useEffect(() => {
    getIsCouplePremiumAction().then(setIsPremium)
    getPicanteHabilitadoAction().then(setPicanteHabilitado)
    getIntensidadMaximaAction().then(setIntensidadMaxima)
    getVerdadORetoItemsAction().then(data => {
      setItems(data)
      setLoading(false)
    })
    getRechazadosAction('verdad_o_reto').then(ids => setRechazados(new Set(ids)))
  }, [])

  // Evita repetir lo que ya pasaron, respeta el techo de intensidad
  // elegido por la pareja (/perfil, migración 038) y prefiere variedad
  // de categoría respecto de la última mostrada en la sesión -- en ese
  // orden, cada filtro con el mismo criterio de fallback: si deja muy
  // pocas opciones, se ignora y se usa el pool anterior.
  function listaFiltrada(m: Modo, ints: Intensidad): VerdadORetoItem[] {
    const base = items.filter(item => item.modo === m && (ints === 'picante' ? item.picante : !item.picante))
    const sinRechazados = base.filter(item => !rechazados.has(item.id))
    const porRechazo = sinRechazados.length >= 3 ? sinRechazados : base
    const porTecho = porRechazo.filter(item => dentroDelTecho(item.intensidad as Techo, intensidadMaxima))
    const porTechoFinal = porTecho.length >= 3 ? porTecho : porRechazo
    if (!ultimaCategoriaRef.current) return porTechoFinal
    const variados = porTechoFinal.filter(item => item.categoria !== ultimaCategoriaRef.current)
    return variados.length >= 3 ? variados : porTechoFinal
  }

  // Evento especial "Reto Doble" (solo modo reto, solo intensidad
  // normal): con probabilidad baja, además del reto principal se
  // elige un segundo reto distinto, sin repetir ninguno de los dos
  // vistos recientes. Devuelve el ítem extra (o null) y el set de
  // vistos ya actualizado con su índice si corresponde.
  function elegirRetoDoble(
    m: Modo,
    ints: Intensidad,
    lista: VerdadORetoItem[],
    vistosConPrimario: Set<number>
  ): { extra: VerdadORetoItem | null; vistos: Set<number> } {
    if (m !== 'reto' || ints !== 'normal' || Math.random() >= 0.2) {
      return { extra: null, vistos: vistosConPrimario }
    }
    const disponibles = lista.map((_, i) => i).filter(i => !vistosConPrimario.has(i))
    if (disponibles.length === 0) return { extra: null, vistos: vistosConPrimario }
    const idx2 = disponibles[Math.floor(Math.random() * disponibles.length)]
    return { extra: lista[idx2], vistos: new Set(vistosConPrimario).add(idx2) }
  }

  function jugar(m: Modo) {
    if (intensidad === 'picante' && !isPremium && picanteUsado) {
      setModo(m)
      setMostrarUpsell(true)
      return
    }
    const lista = listaFiltrada(m, intensidad)
    const idx = pickIndex(lista, new Set())
    const { extra, vistos: nuevosVistos } = elegirRetoDoble(m, intensidad, lista, new Set([idx]))
    setModo(m)
    setVistos(nuevosVistos)
    setPromptItem(lista[idx])
    ultimaCategoriaRef.current = lista[idx].categoria
    setRetoDobleExtra(extra)
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
    const vistosConPrimario = vistos.size >= lista.length ? new Set([idx]) : new Set(vistos).add(idx)
    const { extra, vistos: nuevosVistos } = elegirRetoDoble(modo, intensidad, lista, vistosConPrimario)
    setVistos(nuevosVistos)
    setPromptItem(lista[idx])
    ultimaCategoriaRef.current = lista[idx].categoria
    setRetoDobleExtra(extra)
    if (intensidad === 'picante') setPicanteUsado(true)
  }

  // Distinto de "Siguiente" normal y de "Paso": solo se llama desde el
  // botón "Hecho, los dos", así que solo cuenta como completado un
  // Reto Doble que de verdad se hizo, no uno que se rechazó.
  function completarRetoDoble() {
    registrarRetoDobleCompletadoAction()
    siguiente()
  }

  function cambiarIntensidad(ints: Intensidad) {
    if (ints === 'picante' && !picanteHabilitado) {
      setMostrarConsentimiento(true)
      return
    }
    setIntensidad(ints)
    setModo(null)
    setMostrarUpsell(false)
    setRetoDobleExtra(null)
    setVistos(new Set())
  }

  async function confirmarPicante() {
    await habilitarPicanteAction()
    setPicanteHabilitado(true)
    setMostrarConsentimiento(false)
    setIntensidad('picante')
    setModo(null)
    setMostrarUpsell(false)
    setRetoDobleExtra(null)
    setVistos(new Set())
  }

  // Acción segura "no quiero hacer esto" -- distinta de "Siguiente":
  // deja registro de qué se rechazó (para personalización futura) y
  // nunca rompe la partida, solo trae la próxima.
  function pasar() {
    if (promptItem) {
      logContenidoRechazadoAction('verdad_o_reto', promptItem.id)
      setRechazados(prev => new Set(prev).add(promptItem.id))
    }
    siguiente()
  }

  // Cada 3 rondas en modo normal, si la pregunta/reto actual tiene un par
  // picante definido (migración 027), se muestra un preview -- borroso si
  // la pareja no es premium, entero si ya lo es -- en vez de un upsell
  // genérico.
  const parPicante = promptItem?.par_picante_id
    ? items.find(i => i.id === promptItem.par_picante_id)
    : undefined
  const mostrarHintPicante = intensidad === 'normal' && vistos.size % 3 === 0 && !!parPicante

  function verPicante() {
    if (!parPicante) return
    const lista = listaFiltrada(parPicante.modo, 'picante')
    const idx = lista.findIndex(i => i.id === parPicante.id)
    setIntensidad('picante')
    setModo(parPicante.modo)
    setPromptItem(parPicante)
    ultimaCategoriaRef.current = parPicante.categoria
    setRetoDobleExtra(null)
    setVistos(new Set(idx >= 0 ? [idx] : []))
    setMostrarUpsell(false)
  }

  function handleHintClick() {
    if (!isPremium) {
      router.push('/precios')
      return
    }
    if (!picanteHabilitado) {
      setMostrarConsentimiento(true)
      return
    }
    verPicante()
  }

  if (loading) {
    return <PageLoader />
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

        {mostrarConsentimiento ? (
          <PicanteConsentGate
            onConfirmar={confirmarPicante}
            onCancelar={() => setMostrarConsentimiento(false)}
          />
        ) : mostrarUpsell ? (
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
              <p className="font-display text-2xl text-ritual-cream leading-snug">{promptItem?.texto}</p>
            </div>

            {retoDobleExtra && (
              <div className="space-y-2">
                <p className="text-[#D4A5A5] text-[10px] font-body uppercase tracking-wider text-center">
                  🔥 Reto doble
                </p>
                <div className="bg-ritual-bg-soft border border-[#D4A5A5]/25 rounded-3xl px-6 py-10 text-center">
                  <p className="font-display text-2xl text-ritual-cream leading-snug">{retoDobleExtra.texto}</p>
                </div>
              </div>
            )}

            {mostrarHintPicante && parPicante && (
              <button
                onClick={handleHintClick}
                className="w-full bg-[#D4A5A5]/8 border border-[#D4A5A5]/25 rounded-2xl p-4 text-left space-y-1.5 hover:border-[#D4A5A5]/40 transition-all"
              >
                <p className="text-[#D4A5A5] text-[10px] font-body uppercase tracking-wider">🔥 Versión picante</p>
                <p
                  className={`font-body text-sm text-ritual-cream leading-snug ${
                    isPremium ? '' : 'blur-[3px] select-none'
                  }`}
                >
                  {parPicante.texto}
                </p>
                {!isPremium && (
                  <p className="text-[#D4A5A5] text-xs font-body pt-0.5">Desbloqueá con Premium →</p>
                )}
              </button>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setModo(null)}
                className="bg-transparent border border-white/10 text-ritual-muted font-body text-sm py-4 rounded-2xl hover:border-white/20 hover:text-ritual-text transition-all"
              >
                Cambiar modo
              </button>
              <button
                onClick={retoDobleExtra ? completarRetoDoble : siguiente}
                className="bg-ritual-gold text-ritual-bg font-body font-medium text-sm py-4 rounded-2xl hover:bg-ritual-cream transition-all"
              >
                {retoDobleExtra ? 'Hecho, los dos' : 'Siguiente'}
              </button>
            </div>

            <button
              onClick={pasar}
              className="w-full text-ritual-muted/70 font-body text-xs py-2 hover:text-ritual-text transition-colors"
            >
              No quiero hacer esta, paso
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
