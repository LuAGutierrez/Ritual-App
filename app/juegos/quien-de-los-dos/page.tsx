'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  getQuienDeLosDosPageDataAction,
  startQuienDeLosDosRoundAction,
  submitQuienDeLosDosChoiceAction,
} from '@/app/actions/quien-de-los-dos'
import { getIsCouplePremiumAction } from '@/app/actions/subscription'
import { getPicanteHabilitadoAction, habilitarPicanteAction } from '@/app/actions/picante-consent'
import { getPicanteTrialUsadoAction, marcarPicanteTrialUsadoAction } from '@/app/actions/picante-trial'
import { getCategoriaPreferida } from '@/lib/categoriaPreferida'
import type { QuienDeLosDosRound, MatchStats, UserContext } from '@/types'
import PageLoader from '@/components/PageLoader'
import PicanteUpsell from '@/components/PicanteUpsell'
import PicanteConsentGate from '@/components/PicanteConsentGate'

type Intensidad = 'normal' | 'picante'

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
  const [intensidad, setIntensidad] = useState<Intensidad>('normal')
  const [isPremium, setIsPremium] = useState(false)
  const [picanteUsado, setPicanteUsado] = useState(false)
  const [mostrarUpsell, setMostrarUpsell] = useState(false)
  const [picanteHabilitado, setPicanteHabilitado] = useState(false)
  const [mostrarConsentimiento, setMostrarConsentimiento] = useState(false)
  const [copiedInvite, setCopiedInvite] = useState(false)

  // Pareja creada pero sin unir a nadie: a diferencia de Conoces, acá
  // startQuienDeLosDosRoundAction SI crea la ronda con user2_id null (no
  // exige 2 miembros) -- el usuario puede elegir y despues queda en "Ya
  // elegiste / Esperando a tu pareja..." para siempre, sin indicio de que
  // nadie se unio. Mismo fix que /ritual, /perfil y Conoces: avisar antes
  // de dejar que arranque una ronda que nunca va a poder revelarse.
  async function copyInviteLink() {
    if (!ctx?.couple) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/unirse/${ctx.couple.invite_code}`)
      setCopiedInvite(true)
      setTimeout(() => setCopiedInvite(false), 2000)
    } catch {
      setError('No se pudo copiar. Copiá el link manualmente.')
    }
  }

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
          // Mismo fix que Elección (migración 047): ignorar el evento de
          // una ronda distinta mientras la mía sigue activa sin revelar.
          const incoming = payload.new as QuienDeLosDosRound
          setRound(prev => (prev && !prev.revealed_at && incoming.id !== prev.id) ? prev : incoming)
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
    getIsCouplePremiumAction().then(setIsPremium)
    getPicanteHabilitadoAction().then(setPicanteHabilitado)
    getPicanteTrialUsadoAction('quien_de_los_dos').then(setPicanteUsado)

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function empezarRonda() {
    if (!ctx?.couple) return
    if (intensidad === 'picante' && !isPremium && picanteUsado) {
      setMostrarUpsell(true)
      return
    }
    setStarting(true)
    setError(null)
    setMostrarUpsell(false)
    const nuevo = await startQuienDeLosDosRoundAction(ctx.couple.id, intensidad, vistosRef.current, getCategoriaPreferida())
    if (!nuevo) {
      setError('No se pudo empezar la ronda. Intentá de nuevo.')
    } else {
      setRound(nuevo)
      vistosRef.current = [...vistosRef.current, nuevo.pregunta]
      if (intensidad === 'picante') {
        setPicanteUsado(true)
        marcarPicanteTrialUsadoAction('quien_de_los_dos')
      }
    }
    setStarting(false)
  }

  function cambiarIntensidad(ints: Intensidad) {
    if (ints === 'picante' && !picanteHabilitado) {
      setMostrarConsentimiento(true)
      return
    }
    setIntensidad(ints)
    setMostrarUpsell(false)
  }

  async function confirmarPicante() {
    await habilitarPicanteAction()
    setPicanteHabilitado(true)
    setMostrarConsentimiento(false)
    setIntensidad('picante')
    setMostrarUpsell(false)
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

  if (ctx?.couple && !ctx.partnerProfile) {
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
          <div className="text-center space-y-6 animate-fade-up">
            <p className="font-display text-2xl text-ritual-cream">Todavía no se unió nadie</p>
            <p className="text-ritual-muted font-body text-sm leading-relaxed">
              Este juego se juega de a dos. Compartí el link para que tu pareja se una.
            </p>
            <div className="bg-ritual-bg-soft border border-white/10 rounded-2xl p-4 text-left">
              <p className="text-ritual-muted text-xs font-body mb-2">Link de invitación</p>
              <p className="text-ritual-cream font-body text-sm break-all leading-relaxed">
                {`${window.location.origin}/unirse/${ctx.couple.invite_code}`}
              </p>
            </div>
            <button
              onClick={copyInviteLink}
              className="w-full bg-ritual-gold text-ritual-bg font-body font-medium py-4 rounded-2xl transition-all duration-300 hover:bg-ritual-cream active:scale-[0.98]"
            >
              {copiedInvite ? '¡Copiado!' : 'Copiar link'}
            </button>
          </div>
        </main>
      </div>
    )
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

            {mostrarConsentimiento ? (
              <PicanteConsentGate
                onConfirmar={confirmarPicante}
                onCancelar={() => setMostrarConsentimiento(false)}
              />
            ) : mostrarUpsell ? (
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
                <p className="text-3xl">⚖️</p>
                <p className="font-display text-2xl text-ritual-cream">¿Quién de los dos?</p>
                <p className="text-ritual-muted font-body text-sm leading-relaxed">
                  Una pregunta comparativa. Cada uno elige en secreto quién cree que es. Si coinciden, se conocen bien.
                </p>
                <button
                  onClick={empezarRonda}
                  disabled={starting}
                  className="w-full bg-ritual-gold text-ritual-bg font-body font-medium py-4 rounded-2xl disabled:opacity-50"
                >
                  {starting ? 'Empezando...' : 'Empezar ronda'}
                </button>
              </div>
            )}
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
