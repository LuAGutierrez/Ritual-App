'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  getEleccionPageDataAction,
  startEleccionRoundAction,
  submitEleccionChoiceAction,
} from '@/app/actions/eleccion'
import type { EleccionRound, UserContext } from '@/types'
import PageLoader from '@/components/PageLoader'

export default function EleccionPage() {
  const router = useRouter()
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const [ctx, setCtx] = useState<UserContext | null>(null)
  const [round, setRound] = useState<EleccionRound | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      subscribeToRounds(pageData.context.couple.id)
      setLoading(false)
    }
    init()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleEmpezar() {
    if (!ctx?.couple) return
    setStarting(true)
    setError(null)
    const nuevo = await startEleccionRoundAction(ctx.couple.id)
    if (!nuevo) setError('No se pudo empezar la ronda. Intentá de nuevo.')
    else setRound(nuevo)
    setStarting(false)
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

  if (loading) {
    return <PageLoader />
  }

  const isUser1 = round?.user1_id === ctx?.userId
  const misElecciones = round ? (isUser1 ? round.user1_choice : round.user2_choice) : null
  const eleccionPartner = round ? (isUser1 ? round.user2_choice : round.user1_choice) : null
  const revelado = !!round?.revealed_at
  const coincidieron = revelado && round?.user1_choice === round?.user2_choice

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
          <div className="text-center space-y-6 animate-fade-up">
            <p className="text-3xl">✦</p>
            <p className="font-display text-2xl text-ritual-cream">¿Coinciden?</p>
            <p className="text-ritual-muted font-body text-sm leading-relaxed">
              Cada uno elige en secreto. Si coinciden, se llevan un premio.
            </p>
            <button
              onClick={handleEmpezar}
              disabled={starting}
              className="w-full bg-ritual-gold text-ritual-bg font-body font-medium py-4 rounded-2xl disabled:opacity-50"
            >
              {starting ? 'Empezando...' : 'Empezar ronda'}
            </button>
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
            <p className="text-4xl">{coincidieron ? '🔥' : '💭'}</p>
            <p className="font-display text-2xl text-ritual-cream">
              {coincidieron ? '¡Coincidieron!' : 'No coincidieron esta vez'}
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
            <button
              onClick={handleEmpezar}
              disabled={starting}
              className="w-full bg-ritual-gold text-ritual-bg font-body font-medium py-4 rounded-2xl disabled:opacity-50"
            >
              {starting ? 'Empezando...' : 'Jugar de nuevo'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
