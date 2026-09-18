'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getVerdadORetoItemsAction } from '@/app/actions/verdad-o-reto'
import { getPicanteHabilitadoAction, habilitarPicanteAction } from '@/app/actions/picante-consent'
import { logContenidoRechazadoAction, getRechazadosAction } from '@/app/actions/contenido-rechazado'
import { logRondaJugadaAction, getUltimaCategoriaRondaAction } from '@/app/actions/rondas-jugadas'
import { registrarRetoDobleCompletadoAction } from '@/app/actions/momentos'
import { generarVerdadORetoConIAAction } from '@/app/actions/verdad-o-reto-ia'
import { getCategoriaPreferida } from '@/lib/categoriaPreferida'
import { getIntensidadTab, getTecho, type IntensidadTab as Intensidad, type TechoLabel } from '@/lib/juegosConfig'
import { dentroDelTecho, type Intensidad as Techo } from '@/lib/intensidad'
import type { VerdadORetoItem } from '@/types'
import PicanteConsentGate from '@/components/PicanteConsentGate'
import PageLoader from '@/components/PageLoader'

type Modo = 'verdad' | 'reto'

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
  const [items, setItems] = useState<VerdadORetoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [rechazados, setRechazados] = useState<Set<string>>(new Set())
  const [picanteHabilitado, setPicanteHabilitado] = useState(false)
  const [mostrarConsentimiento, setMostrarConsentimiento] = useState(false)
  const [retoDobleExtra, setRetoDobleExtra] = useState<VerdadORetoItem | null>(null)
  const [techoLabel, setTechoLabel] = useState<TechoLabel>('Intensa')
  const [generandoIA, setGenerandoIA] = useState(false)
  const [errorIA, setErrorIA] = useState<string | null>(null)
  const ultimaCategoriaRef = useRef<string | null>(null)
  const rondaCountRef = useRef(0)

  const techo = techoLabel.toLowerCase() as Techo

  useEffect(() => {
    getPicanteHabilitadoAction().then(setPicanteHabilitado)
    getVerdadORetoItemsAction().then(data => {
      setItems(data)
      setLoading(false)
    })
    getRechazadosAction('verdad_o_reto').then(ids => setRechazados(new Set(ids)))
    getUltimaCategoriaRondaAction('verdad_o_reto').then(c => { ultimaCategoriaRef.current = c })
    // Normal/Picante e Intensidad ya se eligieron en /juegos, ver
    // lib/juegosConfig.ts -- acá solo se leen.
    setIntensidad(getIntensidadTab())
    setTechoLabel(getTecho())
  }, [])

  // Evita repetir lo que ya pasaron, respeta el techo de intensidad
  // elegido en esta misma pantalla (antes vivía en /perfil, migración
  // 038 -- se sacó el 17/09/2026, ver docs/DECISIONES.md) y prefiere
  // variedad de categoría respecto de la última mostrada en la sesión
  // -- en ese orden, cada filtro con el mismo criterio de fallback: si
  // deja muy pocas opciones, se ignora y se usa el pool anterior.
  function listaFiltrada(m: Modo, ints: Intensidad): VerdadORetoItem[] {
    const base = items.filter(item => item.modo === m && (ints === 'picante' ? item.picante : !item.picante))
    const sinRechazados = base.filter(item => !rechazados.has(item.id))
    const porRechazo = sinRechazados.length >= 3 ? sinRechazados : base
    const porTecho = porRechazo.filter(item => dentroDelTecho(item.intensidad as Techo, techo))
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
    const lista = listaFiltrada(m, intensidad)
    const idx = pickIndex(lista, new Set())
    const { extra, vistos: nuevosVistos } = elegirRetoDoble(m, intensidad, lista, new Set([idx]))
    rondaCountRef.current += 1
    setModo(m)
    setVistos(nuevosVistos)
    setPromptItem(lista[idx])
    ultimaCategoriaRef.current = lista[idx].categoria
    logRondaJugadaAction('verdad_o_reto', lista[idx].id, lista[idx].categoria)
    setRetoDobleExtra(extra)
  }

  // Cada ronda se vuelve a elegir Verdad o Reto -- "Siguiente" ya no repite
  // el mismo modo indefinidamente, vuelve a la pantalla de selección
  // (jugar() arranca fresco: vistos se recalcula ahí, no hace falta
  // tocarlo acá). Normal/Picante e Intensidad no se repreguntan, quedan
  // fijos para la sesión desde /juegos (ver lib/juegosConfig.ts).
  function siguiente() {
    setModo(null)
    setPromptItem(null)
    setRetoDobleExtra(null)
  }

  // Distinto de "Siguiente" normal y de "Paso": solo se llama desde el
  // botón "Hecho, los dos", así que solo cuenta como completado un
  // Reto Doble que de verdad se hizo, no uno que se rechazó.
  function completarRetoDoble() {
    registrarRetoDobleCompletadoAction()
    siguiente()
  }

  async function confirmarPicante() {
    await habilitarPicanteAction()
    setPicanteHabilitado(true)
    setMostrarConsentimiento(false)
    setIntensidad('picante')
    setModo(null)
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

  // Genera una consigna nueva con IA en vez de sacarla del pool fijo --
  // solo en la tab picante (ver migración 054: el historial que evita
  // repeticiones vive en couple_ia_contenido, separado del pool de
  // verdad_o_reto_items). Complementa el flujo existente, no lo
  // reemplaza: "Siguiente" después de esto vuelve a la selección, y de
  // ahí en más se sigue sacando del pool normal.
  async function generarConIA() {
    if (!modo) return
    setGenerandoIA(true)
    setErrorIA(null)
    const resultado = await generarVerdadORetoConIAAction(modo, techo)
    setGenerandoIA(false)
    if (!resultado.ok) {
      setErrorIA(resultado.error)
      return
    }
    setPromptItem(resultado.item)
    ultimaCategoriaRef.current = resultado.item.categoria
    setRetoDobleExtra(null)
    logRondaJugadaAction('verdad_o_reto', resultado.item.id, resultado.item.categoria)
  }

  // Cada 3 rondas en modo normal, si la pregunta/reto actual tiene un
  // par picante definido (migración 027), se muestra un preview con
  // link directo -- todo el contenido estático es gratis, así que acá
  // no hay nada que desbloquear, solo un atajo a la tab picante.
  const parPicante = promptItem?.par_picante_id
    ? items.find(i => i.id === promptItem.par_picante_id)
    : undefined
  const mostrarHintPicante = intensidad === 'normal' && rondaCountRef.current % 3 === 0 && !!parPicante

  function verPicante() {
    if (!parPicante) return
    const lista = listaFiltrada(parPicante.modo, 'picante')
    const idx = lista.findIndex(i => i.id === parPicante.id)
    rondaCountRef.current += 1
    setIntensidad('picante')
    setModo(parPicante.modo)
    setPromptItem(parPicante)
    ultimaCategoriaRef.current = parPicante.categoria
    logRondaJugadaAction('verdad_o_reto', parPicante.id, parPicante.categoria)
    setRetoDobleExtra(null)
    setVistos(new Set(idx >= 0 ? [idx] : []))
  }

  function handleHintClick() {
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
        {mostrarConsentimiento ? (
          <PicanteConsentGate
            onConfirmar={confirmarPicante}
            onCancelar={() => setMostrarConsentimiento(false)}
          />
        ) : !modo ? (
          <div className="space-y-6 animate-fade-up">
            <div className="grid grid-cols-2 gap-4">
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
                <p className="font-body text-sm text-ritual-cream leading-snug">{parPicante.texto}</p>
              </button>
            )}

            <button
              onClick={retoDobleExtra ? completarRetoDoble : siguiente}
              className="w-full bg-ritual-gold text-ritual-bg font-body font-medium text-sm py-4 rounded-2xl hover:bg-ritual-cream transition-all"
            >
              {retoDobleExtra ? 'Hecho, los dos' : 'Siguiente'}
            </button>

            {intensidad === 'picante' && (
              <div className="space-y-1.5">
                <button
                  onClick={generarConIA}
                  disabled={generandoIA}
                  className="w-full bg-[#D4A5A5]/8 border border-[#D4A5A5]/25 text-[#D4A5A5] font-body text-sm py-3 rounded-2xl hover:border-[#D4A5A5]/40 transition-all disabled:opacity-50"
                >
                  {generandoIA ? 'Pensando...' : '✨ Quiero otra'}
                </button>
                {errorIA && (
                  <p className="text-ritual-muted text-xs font-body text-center">{errorIA}</p>
                )}
              </div>
            )}

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
