'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  getQuienDeLosDosPageDataAction,
  startQuienDeLosDosRoundAction,
  submitQuienDeLosDosChoiceAction,
} from '@/app/actions/quien-de-los-dos'
import type { QuienDeLosDosRound, MatchStats, UserContext } from '@/types'
import PageLoader from '@/components/PageLoader'

// Evento especial "Todos los Ojos": puro encuadre, sin cambiar la
// mecánica (que ya es "ambos eligen y se revela junto"). Se deriva
// del round.id -- un dato que ambos clientes ya reciben igual vía
// fetch/Realtime -- así los dos lados de la pareja llegan al mismo
// resultado sin guardar ningún flag nuevo en la base.
function hashProbabilidad(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return (hash % 100) / 100
}

export default function QuienDeLosDosPage() {
  const router = useRouter()
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const vistosRef = useRef<string[]>([])

  const [ctx, setCtx] = useState<UserContext | null>(null)
  const [round, setRound] = useState<QuienDeLosDosRound | null>(null)
  const [stats, setStats] = useState<MatchStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const subscribeToRounds = useCallback((coupleId: string) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current)

    const channel = supabase
      .channel(`quien-de-los-dos:${coupleId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'couple_quien_de_los_dos_rounds', filter: `couple_id=eq.${coupleId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') return
          setRound(payload.new as QuienDeLosDosRound)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'couple_quien_de_los_dos_stats', filter: `couple_id=eq.${coupleId}` },
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
      const pageData = await getQuienDeLosDosPageDataAction()
      if (!pageData) { router.replace('/auth'); return }
      if (!pageData.context.couple) { router.replace('/onboarding'); return }

      setCtx(pageData.context)
      setRound(pageData.round)
      setStats(pageData.stats)
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
    const nuevo = await startQuienDeLosDosRoundAction(ctx.couple.id, vistosRef.current)
    if (!nuevo) {
      setError('No se pudo empezar la ronda. Intentá de nuevo.')
    } else {
      setRound(nuevo)
      vistosRef.current = [...vistosRef.current, nuevo.pregunta]
    }
    setStarting(false)
  }

  async function handleElegir(choice: 0 | 1) {
    if (!round) return
    setSubmitting(true)
    setError(null)
    const updated = await submitQuienDeLosDosChoiceAction(round.id, choice)
    if (!updated) setError('No se pudo guardar tu elección.')
    else setRound(updated)
    setSubmitting(false)
  }

  if (loading) {
    return <PageLoader />
  }

  const isUser1 = round?.user1_id === ctx?.userId
  const nombreUser1 = isUser1 ? (ctx?.profile?.display_name ?? 'Vos') : (ctx?.partnerProfile?.display_name ?? 'Tu pareja')
  const nombreUser2 = isUser1 ? (ctx?.partnerProfile?.display_name ?? 'Tu pareja') : (ctx?.profile?.display_name ?? 'Vos')
  const miEleccion = round ? (isUser1 ? round.user1_choice : round.user2_choice) : null
  const eleccionPartner = round ? (isUser1 ? round.user2_choice : round.user1_choice) : null
  const revelado = !!round?.revealed_at
  const coincidieron = revelado && round?.user1_choice === round?.user2_choice
  const esTodosLosOjos = round ? hashProbabilidad(round.id) < 0.15 : false

  return (
    <div className="min-h-dvh bg-ritual-bg flex flex-col">
      <header className="px-5 pt-8 pb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl text-ritual-cream tracking-wide">¿Quién de los dos?</h1>
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
            <p className="text-3xl">⚖️</p>
            <p className="font-display text-2xl text-ritual-cream">¿Quién de los dos?</p>
            <p className="text-ritual-muted font-body text-sm leading-relaxed">
              Una pregunta comparativa. Cada uno elige en secreto quién cree que es. Si coinciden, se conocen bien.
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

        {round && !revelado && miEleccion == null && (
          <div className="space-y-5 animate-fade-up">
            {esTodosLosOjos && (
              <p className="text-center text-ritual-gold text-[11px] font-body uppercase tracking-widest">
                👀 Todos los ojos: respondan los dos ¡ya, sin pensarlo mucho!
              </p>
            )}
            <p className="font-display text-2xl text-ritual-cream text-center leading-snug">{round.pregunta}</p>
            <div className="space-y-3">
              <button
                onClick={() => handleElegir(0)}
                disabled={submitting}
                className="w-full bg-ritual-bg-soft border border-white/10 rounded-2xl py-5 text-center hover:border-ritual-gold/40 transition-all disabled:opacity-50"
              >
                <span className="font-display text-xl text-ritual-cream">{nombreUser1}</span>
              </button>
              <button
                onClick={() => handleElegir(1)}
                disabled={submitting}
                className="w-full bg-ritual-bg-soft border border-white/10 rounded-2xl py-5 text-center hover:border-ritual-gold/40 transition-all disabled:opacity-50"
              >
                <span className="font-display text-xl text-ritual-cream">{nombreUser2}</span>
              </button>
            </div>
          </div>
        )}

        {round && !revelado && miEleccion != null && (
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
            <p className="text-4xl">{coincidieron ? '✦' : '💭'}</p>
            <p className="font-display text-2xl text-ritual-cream">
              {coincidieron ? '¡Coincidieron!' : 'No coincidieron esta vez'}
            </p>
            <p className="font-body text-ritual-cream/90 text-base">{round.pregunta}</p>
            <div className="flex items-center justify-center gap-3 text-sm font-body text-ritual-muted">
              <span className="bg-ritual-bg-soft border border-white/10 rounded-xl px-3 py-2">
                {ctx?.profile?.display_name ?? 'Vos'}: {miEleccion === 0 ? nombreUser1 : nombreUser2}
              </span>
              <span className="bg-ritual-bg-soft border border-white/10 rounded-xl px-3 py-2">
                {ctx?.partnerProfile?.display_name ?? 'Pareja'}: {eleccionPartner === 0 ? nombreUser1 : nombreUser2}
              </span>
            </div>
            <button
              onClick={() => setRound(null)}
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
