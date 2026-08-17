'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  getEleccionPageDataAction,
  startEleccionRoundAction,
  submitEleccionChoiceAction,
} from '@/app/actions/eleccion'
import { getIsCouplePremiumAction } from '@/app/actions/subscription'
import { useDobleONada } from '@/lib/hooks/useDobleONada'
import type { EleccionRound, MatchStats, UserContext } from '@/types'
import PageLoader from '@/components/PageLoader'
import PicanteUpsell from '@/components/PicanteUpsell'

type Intensidad = 'normal' | 'picante'

export default function EleccionPage() {
  const router = useRouter()
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const [ctx, setCtx] = useState<UserContext | null>(null)
  const [round, setRound] = useState<EleccionRound | null>(null)
  const [stats, setStats] = useState<MatchStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [intensidad, setIntensidad] = useState<Intensidad>('normal')
  const [isPremium, setIsPremium] = useState(false)
  const [picanteUsado, setPicanteUsado] = useState(false)
  const [mostrarUpsell, setMostrarUpsell] = useState(false)
  const vistosRef = useRef<string[]>([])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const subscribeToRounds = useCallback((coupleId: string) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current)

    const channel = supabase
      .channel(`eleccion:${coupleId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'couple_eleccion_rounds', filter: `couple_id=eq.${coupleId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') return
          setRound(payload.new as EleccionRound)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'couple_eleccion_stats', filter: `couple_id=eq.${coupleId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') return
          setStats(payload.new as MatchStats)
        }
      )
      .subscribe()

    channelRef.current = channel
  }, [])

  useEffect(() => {
    async function init() {
      const pageData = await getEleccionPageDataAction()
      if (!pageData) { router.replace('/auth'); return }
      if (!pageData.context.couple) { router.replace('/onboarding'); return }

      setCtx(pageData.context)
      setRound(pageData.round)
      setStats(pageData.stats)
      subscribeToRounds(pageData.context.couple.id)
      setLoading(false)
    }
    init()
    getIsCouplePremiumAction().then(setIsPremium)

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function empezarRonda(esDobleONada: boolean) {
    if (!ctx?.couple) return
    if (intensidad === 'picante' && !isPremium && picanteUsado) {
      setMostrarUpsell(true)
      return
    }
    setStarting(true)
    setError(null)
    setMostrarUpsell(false)
    const nuevo = await startEleccionRoundAction(ctx.couple.id, intensidad, vistosRef.current)
    if (!nuevo) {
      setError('No se pudo empezar la ronda. Intentá de nuevo.')
    } else {
      setRound(nuevo)
      vistosRef.current = [...vistosRef.current, `${nuevo.option_a}|${nuevo.option_b}`]
      if (intensidad === 'picante') setPicanteUsado(true)
      if (esDobleONada) doble.aceptar()
      else doble.reset()
    }
    setStarting(false)
  }

  function cambiarIntensidad(ints: Intensidad) {
    setIntensidad(ints)
    setMostrarUpsell(false)
  }

  async function handleElegir(choice: 0 | 1) {
    if (!round) return
    setSubmitting(true)
    setError(null)
    const updated = await submitEleccionChoiceAction(round.id, choice)
    if (!updated) setError('No se pudo guardar tu elección.')
    else setRound(updated)
    setSubmitting(false)
  }

  const revelado = !!round?.revealed_at
  const coincidieron = revelado && round?.user1_choice === round?.user2_choice
  const doble = useDobleONada(revelado, coincidieron, round?.id)

  if (loading) {
    return <PageLoader />
  }

  const isUser1 = round?.user1_id === ctx?.userId
  const misElecciones = round ? (isUser1 ? round.user1_choice : round.user2_choice) : null
  const eleccionPartner = round ? (isUser1 ? round.user2_choice : round.user1_choice) : null

  return (
    <div className="min-h-dvh bg-ritual-bg flex flex-col">
      <header className="px-5 pt-8 pb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl text-ritual-cream tracking-wide">💫 Elección</h1>
          <p className="text-ritual-muted text-xs font-body mt-0.5">Elijan en secreto, vean si coinciden</p>
        </div>
        <button
          onClick={() => router.push('/juegos')}
          className="text-ritual-muted text-xs font-body hover:text-ritual-text transition-colors py-2 px-2"
        >
          ← Juegos
        </button>
      </header>

      <main className="flex-1 px-5 pb-28 flex flex-col justify-center max-w-md mx-auto w-full">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6">
            <p className="text-red-400/80 text-sm font-body text-center">{error}</p>
          </div>
        )}

        {!round && (
          <div className="space-y-6 animate-fade-up">
            <div className="flex bg-ritual-bg-soft rounded-2xl p-1">
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
            ) : (
              <div className="text-center space-y-6">
                {stats && stats.intentos > 0 && (
                  <div className="flex items-center justify-center gap-8">
                    <div>
                      <p className="font-display text-4xl text-ritual-cream">{stats.racha_actual}</p>
                      <p className="text-ritual-muted text-[11px] font-body uppercase tracking-wider mt-1">racha actual</p>
                    </div>
                    <div className="w-px h-10 bg-white/10" />
                    <div>
                      <p className="font-display text-4xl text-ritual-cream">
                        {Math.round((stats.coincidencias / stats.intentos) * 100)}%
                      </p>
                      <p className="text-ritual-muted text-[11px] font-body uppercase tracking-wider mt-1">coincidencias</p>
                    </div>
                  </div>
                )}
                <p className="text-3xl">✦</p>
                <p className="font-display text-2xl text-ritual-cream">¿Coinciden?</p>
                <p className="text-ritual-muted font-body text-sm leading-relaxed">
                  Cada uno elige en secreto. Si coinciden, se llevan un premio.
                </p>
                <button
                  onClick={() => empezarRonda(false)}
                  disabled={starting}
                  className="w-full bg-ritual-gold text-ritual-bg font-body font-medium py-4 rounded-2xl disabled:opacity-50"
                >
                  {starting ? 'Empezando...' : 'Empezar ronda'}
                </button>
              </div>
            )}
          </div>
        )}

        {round && !revelado && misElecciones == null && (
          <div className="space-y-4 animate-fade-up">
            <button
              onClick={() => handleElegir(0)}
              disabled={submitting}
              className="w-full bg-ritual-bg-soft border border-white/10 rounded-3xl py-10 text-center hover:border-ritual-gold/40 transition-all disabled:opacity-50"
            >
              <span className="font-display text-2xl text-ritual-cream">{round.option_a}</span>
            </button>
            <p className="text-center text-ritual-muted text-xs font-body">o</p>
            <button
              onClick={() => handleElegir(1)}
              disabled={submitting}
              className="w-full bg-ritual-bg-soft border border-white/10 rounded-3xl py-10 text-center hover:border-ritual-gold/40 transition-all disabled:opacity-50"
            >
              <span className="font-display text-2xl text-ritual-cream">{round.option_b}</span>
            </button>
          </div>
        )}

        {round && !revelado && misElecciones != null && (
          <div className="text-center space-y-5 animate-fade-up">
            <div className="w-10 h-10 border-2 border-ritual-gold/30 border-t-ritual-gold rounded-full animate-spin mx-auto" />
            <p className="font-display text-xl text-ritual-cream">Ya elegiste</p>
            <p className="text-ritual-muted font-body text-sm">
              Esperando a {ctx?.partnerProfile?.display_name ?? 'tu pareja'}...
            </p>
          </div>
        )}

        {round && revelado && (
          <div className="text-center space-y-6 animate-fade-up">
            <p className="text-4xl">{doble.enJuego && coincidieron ? '🎉' : coincidieron ? '🔥' : '💭'}</p>
            <p className="font-display text-2xl text-ritual-cream">
              {doble.enJuego
                ? coincidieron ? '¡Ganaron el Doble o Nada!' : 'Esta vez no salió'
                : coincidieron ? '¡Coincidieron!' : 'No coincidieron esta vez'}
            </p>
            <div className="flex items-center justify-center gap-3 text-sm font-body text-ritual-muted">
              <span className="bg-ritual-bg-soft border border-white/10 rounded-xl px-3 py-2">
                {ctx?.profile?.display_name ?? 'Vos'}: {misElecciones === 0 ? round.option_a : round.option_b}
              </span>
              <span className="bg-ritual-bg-soft border border-white/10 rounded-xl px-3 py-2">
                {ctx?.partnerProfile?.display_name ?? 'Pareja'}: {eleccionPartner === 0 ? round.option_a : round.option_b}
              </span>
            </div>
            {coincidieron && (
              <div className="bg-ritual-gold/8 border border-ritual-gold/20 rounded-2xl p-4">
                <p className="text-ritual-cream font-body text-sm">{round.premio}</p>
              </div>
            )}
            {doble.ofrecer && (
              <button
                onClick={() => empezarRonda(true)}
                className="w-full bg-ritual-gold/15 border border-ritual-gold/40 text-ritual-gold font-body font-medium py-4 rounded-2xl hover:bg-ritual-gold/20 transition-all"
              >
                ¿Van doble o nada?
              </button>
            )}
            <button
              onClick={() => { doble.reset(); setRound(null) }}
              className="w-full bg-ritual-gold text-ritual-bg font-body font-medium py-4 rounded-2xl"
            >
              Jugar de nuevo
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
