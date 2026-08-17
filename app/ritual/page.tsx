'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import {
  getRitualPageDataAction,
  submitResponseAction,
  updateStreakAction,
  usarComodinAction,
} from '@/app/actions/ritual'
import type { CoupleRitualSession, Streak, UserContext, SessionState } from '@/types'
import RitualCard from '@/components/RitualCard'
import WaitingState from '@/components/WaitingState'
import StreakBadge from '@/components/StreakBadge'
import PartnerRespondedBanner from '@/components/PartnerRespondedBanner'
import BottomNav from '@/components/BottomNav'
import PageLoader from '@/components/PageLoader'
import { getNotificationPrefsAction } from '@/app/actions/notifications'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { isPushPromptDismissed } from '@/lib/push/client'

// Cargados solo cuando hacen falta (reveal / prompt de push) en vez de ir
// en el bundle inicial de /ritual -- son las dos piezas mas pesadas de la
// pantalla mas visitada de la app (RevealCards y PushPermissionPrompt
// usan Framer Motion), pero la mayoria de las visitas ni las renderiza.
const RevealCards = dynamic(() => import('@/components/RevealCards'))
const PushPermissionPrompt = dynamic(() => import('@/components/PushPermissionPrompt'))

function partnerRespondedFirst(s: CoupleRitualSession, userId: string): boolean {
  const isUser1 = s.user1_id === userId
  const myDone = isUser1 ? !!s.user1_completed_at : !!s.user2_completed_at
  const partnerDone = isUser1 ? !!s.user2_completed_at : !!s.user1_completed_at
  return partnerDone && !myDone
}

export default function RitualPage() {
  const router = useRouter()
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const [ctx, setCtx] = useState<UserContext | null>(null)
  const [session, setSession] = useState<CoupleRitualSession | null>(null)
  const [streak, setStreak] = useState<Streak | null>(null)
  const [state, setState] = useState<SessionState>('loading')
  const [response, setResponse] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [streakUpdated, setStreakUpdated] = useState(false)
  const [comodinLoading, setComodinLoading] = useState(false)
  const [comodinUsado, setComodinUsado] = useState(false)
  const [showPartnerBanner, setShowPartnerBanner] = useState(false)
  const [showPushPrompt, setShowPushPrompt] = useState(false)
  const { subscribe, loading: pushLoading, isSupported } = usePushNotifications()

  // ─── Calcular el estado de la sesión ───────────────────────────
  function resolveState(s: CoupleRitualSession, userId: string, alreadySeen = false): SessionState {
    const isUser1 = s.user1_id === userId
    const myCompleted = isUser1 ? !!s.user1_completed_at : !!s.user2_completed_at
    const partnerCompleted = isUser1 ? !!s.user2_completed_at : !!s.user1_completed_at

    if (s.revealed_at) return alreadySeen ? 'completed' : 'revealed'
    if (!myCompleted) return 'waiting_self'
    if (!partnerCompleted) return 'waiting_partner'
    return 'revealed'
  }

  // ─── Actualizar streak al completar reveal ──────────────────────
  async function handleStreakUpdate(coupleId: string) {
    if (streakUpdated) return
    setStreakUpdated(true)
    const updated = await updateStreakAction(coupleId)
    if (updated) setStreak(updated)
  }

  // ─── Prompt de push post-reveal ─────────────────────────────────
  async function maybeShowPushPrompt() {
    if (!isSupported) return
    if (isPushPromptDismissed()) return
    const prefs = await getNotificationPrefsAction()
    if (prefs?.push_enabled) return
    // Un respiro para que la animación del reveal no quede tapada al toque
    // por un modal a pantalla completa.
    setTimeout(() => setShowPushPrompt(true), 2500)
  }

  // ─── Suscripción Realtime ───────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const subscribeToSession = useCallback((coupleId: string, sessionId: string, userId: string) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(`couple_ritual:${coupleId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'couple_ritual_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const updated = payload.new as CoupleRitualSession
          setSession(prev => {
            if (prev && partnerRespondedFirst(updated, userId) && !partnerRespondedFirst(prev, userId)) {
              setShowPartnerBanner(true)
            }
            return { ...prev!, ...updated }
          })
          const newState = resolveState(updated, userId)
          setState(newState)

          if (newState === 'revealed' && coupleId) {
            handleStreakUpdate(coupleId)
            maybeShowPushPrompt()
          }
        }
      )
      .subscribe()

    channelRef.current = channel
  }, [streakUpdated])

  // ─── Init ────────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    async function init() {
      setError(null)

      const pageData = await getRitualPageDataAction()
      if (!pageData) { router.replace('/auth'); return }

      const { context, session: ritualSession, streak: initialStreak } = pageData
      setCtx(context)

      if (!context.couple) {
        setState('no_couple')
        return
      }

      if (initialStreak) setStreak(initialStreak)

      if (!ritualSession) {
        setError('No hay ritual disponible para hoy.')
        setState('waiting_self')
        return
      }

      setSession(ritualSession)
      const sessionState = resolveState(ritualSession, context.userId, true)
      setState(sessionState)

      if (partnerRespondedFirst(ritualSession, context.userId)) {
        setShowPartnerBanner(true)
      }

      if (sessionState === 'revealed' || sessionState === 'completed') {
        handleStreakUpdate(context.couple.id)
      }

      subscribeToSession(context.couple.id, ritualSession.id, context.userId)
    }

    init()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [])

  // ─── Submit respuesta ────────────────────────────────────────────
  async function handleSubmit() {
    if (!session || !ctx?.userId || !response.trim()) return
    setSubmitting(true)
    setError(null)

    const updated = await submitResponseAction(session.id, response.trim())

    if (!updated) {
      setError('No se pudo guardar tu respuesta. Intentá de nuevo.')
      setSubmitting(false)
      return
    }

    setSession(updated)
    setShowPartnerBanner(false)
    const newState = resolveState(updated, ctx.userId)
    setState(newState)

    if (newState === 'revealed' && ctx.couple) {
      await handleStreakUpdate(ctx.couple.id)
      await maybeShowPushPrompt()
    }

    setSubmitting(false)
  }

  // ─── Comodín de streak ───────────────────────────────────────────
  function streakEnRiesgo(): boolean {
    if (!streak || comodinUsado) return false
    if ((streak.wildcards_remaining ?? 0) <= 0) return false
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
    const [y, m, d] = today.split('-').map(Number)
    const yesterdayUtc = new Date(Date.UTC(y, m - 1, d))
    yesterdayUtc.setUTCDate(yesterdayUtc.getUTCDate() - 1)
    const yesterdayStr = yesterdayUtc.toISOString().split('T')[0]
    const last = streak.last_completed_date
    return !!last && last !== today && last !== yesterdayStr && streak.current_streak > 0
  }

  async function handleComodin() {
    if (!ctx?.couple) return
    setComodinLoading(true)
    const result = await usarComodinAction(ctx.couple.id)
    if (result.ok && result.streak) {
      setStreak(result.streak)
      setComodinUsado(true)
    } else {
      setError(result.error ?? 'No se pudo usar el comodín.')
    }
    setComodinLoading(false)
  }

  // ─── Render ──────────────────────────────────────────────────────
  const today = new Date().toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  if (state === 'loading') {
    return <PageLoader />
  }

  return (
    <div className="min-h-dvh bg-ritual-bg flex flex-col">
      {/* Header */}
      <header className="px-5 pt-8 pb-4">
        <h1 className="font-display text-xl text-ritual-cream tracking-wide">Rituales</h1>
        <p className="text-ritual-muted text-xs font-body capitalize mt-0.5">{today}</p>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 px-5 pb-28 flex flex-col justify-center max-w-md mx-auto w-full">

        {/* Sin pareja */}
        {state === 'no_couple' && (
          <div className="text-center space-y-6 animate-fade-up">
            <p className="font-display text-2xl text-ritual-cream">
              Invitá a tu pareja
            </p>
            <p className="text-ritual-muted font-body text-sm leading-relaxed">
              El ritual se completa cuando ambos participan.
            </p>
            <button
              onClick={() => router.push('/onboarding')}
              className="w-full bg-ritual-gold text-ritual-bg font-body font-medium py-4 rounded-2xl"
            >
              Vincular pareja
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6">
            <p className="text-red-400/80 text-sm font-body text-center">{error}</p>
          </div>
        )}

        {/* Streak en top si hay pareja */}
        {ctx?.couple && streak && state !== 'revealed' && state !== 'completed' && (
          <div className="mb-4">
            <StreakBadge streak={streak} partnerName={ctx.partnerProfile?.display_name} />
          </div>
        )}

        {/* Comodín — racha en riesgo */}
        {streakEnRiesgo() && state === 'waiting_self' && (
          <div className="bg-ritual-gold/8 border border-ritual-gold/20 rounded-2xl p-4 mb-5 text-center">
            <p className="text-ritual-cream font-body text-sm mb-1">
              Tu racha de <span className="text-ritual-gold font-medium">{streak?.current_streak} días</span> está en riesgo
            </p>
            <p className="text-ritual-muted text-xs font-body mb-3">
              Tenés {streak?.wildcards_remaining} comodín disponible · Tocalo para proteger tu racha
            </p>
            <button
              onClick={handleComodin}
              disabled={comodinLoading}
              className="bg-ritual-gold/20 border border-ritual-gold/30 text-ritual-gold font-body text-sm px-5 py-2 rounded-xl hover:bg-ritual-gold/30 transition-all duration-200 disabled:opacity-40"
            >
              {comodinLoading ? 'Usando comodín...' : 'Usar comodín y proteger racha'}
            </button>
          </div>
        )}

        {/* Comodín usado — confirmación */}
        {comodinUsado && state === 'waiting_self' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 mb-4 text-center">
            <p className="text-ritual-muted text-xs font-body">
              Comodín usado · Tu racha está protegida
            </p>
          </div>
        )}

        {/* Banner: la pareja respondió primero */}
        {showPartnerBanner && state === 'waiting_self' && (
          <PartnerRespondedBanner
            partnerName={ctx?.partnerProfile?.display_name}
            onDismiss={() => setShowPartnerBanner(false)}
          />
        )}

        {/* Ritual del día — responder */}
        {state === 'waiting_self' && session?.ritual && (
          <RitualCard
            ritual={session.ritual}
            response={response}
            onResponseChange={setResponse}
            onSubmit={handleSubmit}
            loading={submitting}
          />
        )}

        {/* Esperando al partner */}
        {state === 'waiting_partner' && (
          <WaitingState
            partnerName={ctx?.partnerProfile?.display_name}
            myResponse={
              ctx?.userId === session?.user1_id
                ? session?.user1_response ?? ''
                : session?.user2_response ?? ''
            }
          />
        )}

        {/* Reveal */}
        {state === 'revealed' && session && ctx && (
          <RevealCards
            session={session}
            myUserId={ctx.userId}
            myName={ctx.profile?.display_name}
            partnerName={ctx.partnerProfile?.display_name}
            streak={streak}
            onContinue={() => setState('completed')}
          />
        )}

        {/* Ritual de hoy completado */}
        {state === 'completed' && ctx?.couple && (
          <div className="text-center py-10 space-y-5">
            <p className="text-3xl">✦</p>
            <div className="space-y-2">
              <p className="font-display text-xl text-ritual-cream">Listo por hoy</p>
              <p className="text-ritual-muted font-body text-sm leading-relaxed">
                Mañana los espera un nuevo ritual.
              </p>
            </div>
            {streak && streak.current_streak > 0 && (
              <StreakBadge streak={streak} partnerName={ctx.partnerProfile?.display_name} />
            )}
            <button
              onClick={() => router.push('/historial')}
              className="w-full bg-white/5 border border-white/10 text-ritual-muted font-body text-sm py-4 rounded-2xl hover:border-white/20 hover:text-ritual-text transition-all duration-300"
            >
              Ver historial
            </button>
          </div>
        )}

      </main>

      {showPushPrompt && (
        <PushPermissionPrompt
          partnerName={ctx?.partnerProfile?.display_name}
          loading={pushLoading}
          onActivate={async () => {
            const result = await subscribe()
            setShowPushPrompt(false)
            if (!result.ok) setError(result.error)
          }}
          onDismiss={() => setShowPushPrompt(false)}
        />
      )}

      <BottomNav />
    </div>
  )
}
