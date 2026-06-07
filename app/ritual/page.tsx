'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  getUserContextAction,
  getRitualOfDayAction,
  submitResponseAction,
  getStreakAction,
  updateStreakAction,
  usarComodinAction,
} from '@/app/actions/ritual'
import type { CoupleRitualSession, Streak, UserContext, SessionState } from '@/types'
import RitualCard from '@/components/RitualCard'
import WaitingState from '@/components/WaitingState'
import RevealCards from '@/components/RevealCards'
import StreakBadge from '@/components/StreakBadge'
import PartnerRespondedBanner from '@/components/PartnerRespondedBanner'
import PushPermissionPrompt from '@/components/PushPermissionPrompt'
import { getNotificationPrefsAction } from '@/app/actions/notifications'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { isPushPromptDismissed } from '@/lib/push/client'

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
  function resolveState(s: CoupleRitualSession, userId: string): SessionState {
    const isUser1 = s.user1_id === userId
    const myCompleted = isUser1 ? !!s.user1_completed_at : !!s.user2_completed_at
    const partnerCompleted = isUser1 ? !!s.user2_completed_at : !!s.user1_completed_at

    if (s.revealed_at) return 'revealed'
    if (!myCompleted) return 'waiting_self'
    if (!partnerCompleted) return 'waiting_partner'
    return 'revealed'
  }

  // ─── Cargar streak ──────────────────────────────────────────────
  async function loadStreak(coupleId: string) {
    const data = await getStreakAction(coupleId)
    if (data) setStreak(data)
  }

  // ─── Actualizar streak al completar reveal ──────────────────────
  async function handleStreakUpdate(coupleId: string) {
    if (streakUpdated) return
    setStreakUpdated(true)
    const updated = await updateStreakAction(coupleId)
    if (updated) setStreak(updated)
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

      const context = await getUserContextAction()
      if (!context) { router.replace('/auth'); return }

      setCtx(context)

      if (!context.couple) {
        setState('no_couple')
        return
      }

      const [ritualSession] = await Promise.all([
        getRitualOfDayAction(context.couple.id),
        loadStreak(context.couple.id),
      ])

      if (!ritualSession) {
        setError('No hay ritual disponible para hoy.')
        setState('waiting_self')
        return
      }

      setSession(ritualSession)
      const sessionState = resolveState(ritualSession, context.userId)
      setState(sessionState)

      if (partnerRespondedFirst(ritualSession, context.userId)) {
        setShowPartnerBanner(true)
      }

      if (sessionState === 'revealed') {
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
    }

    setSubmitting(false)
  }

  // ─── Comodín de streak ───────────────────────────────────────────
  function streakEnRiesgo(): boolean {
    if (!streak || comodinUsado) return false
    if ((streak.wildcards_remaining ?? 0) <= 0) return false
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
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

  // ─── Logout ──────────────────────────────────────────────────────
  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  // ─── Render ──────────────────────────────────────────────────────
  const today = new Date().toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  if (state === 'loading') {
    return (
      <div className="min-h-dvh bg-ritual-bg flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-ritual-gold/40 border-t-ritual-gold rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-ritual-bg flex flex-col">
      {/* Header */}
      <header className="px-5 pt-8 pb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl text-ritual-cream tracking-wide">Rituales</h1>
          <p className="text-ritual-muted text-xs font-body capitalize mt-0.5">{today}</p>
        </div>

        <div className="flex items-center gap-1">
          {ctx?.couple && (
            <button
              onClick={() => router.push('/historial')}
              className="text-ritual-muted text-xs font-body hover:text-ritual-text transition-colors py-2 px-2"
            >
              Historial
            </button>
          )}
          <button
            onClick={() => router.push('/perfil')}
            className="text-ritual-muted text-xs font-body hover:text-ritual-text transition-colors py-2 px-2"
          >
            Perfil
          </button>
          <button
            onClick={handleLogout}
            className="text-ritual-muted text-xs font-body hover:text-ritual-text transition-colors py-2 px-2"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 px-5 pb-10 flex flex-col justify-center max-w-md mx-auto w-full">

        {/* Sin pareja */}
        {state === 'no_couple' && (
          <div className="text-center space-y-6 animate-fade-up">
            <p className="font-display text-2xl text-ritual-cream">
              Invitá a tu pareja
            </p>
            <p className="text-ritual-muted font-body text-sm leading-relaxed">
              El ritual se completa cuando ambos participan.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/onboarding')}
                className="w-full bg-ritual-gold text-ritual-bg font-body font-medium py-4 rounded-2xl"
              >
                Vincular pareja
              </button>
              {session && (
                <p className="text-ritual-muted text-xs font-body">
                  Podés responder solo y el reveal se activa cuando se unan.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6">
            <p className="text-red-400/80 text-sm font-body text-center">{error}</p>
          </div>
        )}

        {/* Streak en top si hay pareja */}
        {ctx?.couple && streak && state !== 'revealed' && (
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
              Tenés {streak?.wildcards_remaining} comodín disponible · Se usa automáticamente para proteger tu racha
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
            onContinue={() => {
              // Mañana hay otro ritual — cerrar con mensaje
              setState('waiting_self')
              setSession(null)
              router.push('/')
            }}
          />
        )}

        {/* Pareja no vinculada y tiene ritual disponible */}
        {state === 'no_couple' && session?.ritual && (
          <div className="mt-8">
            <div className="bg-ritual-bg-soft border border-white/8 rounded-3xl px-6 py-8 text-center opacity-50">
              <p className="font-display text-xl text-ritual-cream leading-snug">
                {session.ritual.prompt}
              </p>
              <p className="text-ritual-muted text-xs font-body mt-4">
                Vinculá tu pareja para desbloquear el reveal
              </p>
            </div>
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
    </div>
  )
}
