'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  getConocesPageDataAction,
  startConocesRoundAction,
  submitConocesSubjectChoiceAction,
  submitConocesGuessAction,
} from '@/app/actions/conoces'
import { useDobleONada } from '@/lib/hooks/useDobleONada'
import { getCategoriaPreferida } from '@/lib/categoriaPreferida'
import type { ConocesRound, ConocesStats, UserContext } from '@/types'
import PageLoader from '@/components/PageLoader'

export default function ConocesPage() {
  const router = useRouter()
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const [ctx, setCtx] = useState<UserContext | null>(null)
  const [round, setRound] = useState<ConocesRound | null>(null)
  const [stats, setStats] = useState<ConocesStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedInvite, setCopiedInvite] = useState(false)
  const vistosRef = useRef<string[]>([])

  // Pareja creada pero sin unir a nadie: startConocesRoundAction fallaba con
  // un error generico ("No se pudo empezar la ronda") porque siguienteTurno()
  // (lib/turnos.ts) necesita 2 miembros y devuelve null con uno solo. Mismo
  // patron que /ritual y /perfil: mostrar el link de invitacion en vez de
  // dejar que la falla se disfrace de "intentá de nuevo".
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
  const subscribeToCouple = useCallback((coupleId: string) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current)

    const channel = supabase
      .channel(`conoces:${coupleId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'couple_conoces_rounds', filter: `couple_id=eq.${coupleId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') return
          // Mismo fix que Elección (migración 047): ignorar el evento de
          // una ronda distinta mientras la mía sigue activa sin revelar.
          const incoming = payload.new as ConocesRound
          setRound(prev => (prev && !prev.revealed_at && incoming.id !== prev.id) ? prev : incoming)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'couple_conoces_stats', filter: `couple_id=eq.${coupleId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') return
          setStats(payload.new as ConocesStats)
        }
      )
      .subscribe()

    channelRef.current = channel
  }, [])

  useEffect(() => {
    async function init() {
      const pageData = await getConocesPageDataAction()
      if (!pageData) { router.replace('/auth'); return }
      if (!pageData.context.couple) { router.replace('/onboarding'); return }

      setCtx(pageData.context)
      setRound(pageData.round)
      setStats(pageData.stats)
      subscribeToCouple(pageData.context.couple.id)
      setLoading(false)
    }
    init()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function empezarRonda(esDobleONada: boolean) {
    if (!ctx?.couple) return
    setStarting(true)
    setError(null)
    const nuevo = await startConocesRoundAction(ctx.couple.id, vistosRef.current, getCategoriaPreferida())
    if (!nuevo) {
      setError('No se pudo empezar la ronda. Intentá de nuevo.')
    } else {
      setRound(nuevo)
      vistosRef.current = [...vistosRef.current, nuevo.pregunta]
      if (esDobleONada) doble.aceptar()
      else doble.reset()
    }
    setStarting(false)
  }

  async function handleResponder(choice: number) {
    if (!round || !ctx) return
    setSubmitting(true)
    setError(null)
    const isSubject = round.subject_user_id === ctx.userId
    const updated = isSubject
      ? await submitConocesSubjectChoiceAction(round.id, choice)
      : await submitConocesGuessAction(round.id, choice)
    if (!updated) setError('No se pudo guardar tu respuesta.')
    else setRound(updated)
    setSubmitting(false)
  }

  const revelado = !!round?.revealed_at
  const acerto = revelado && round?.subject_choice === round?.guesser_choice
  const doble = useDobleONada(revelado, acerto, round?.id)

  // Evento especial "Cambio de Roles": si el sujeto de esta ronda es
  // el mismo que el de la anterior, siguienteTurno() (lib/turnos.ts)
  // decidió romper la alternancia esta vez. Se detecta comparando
  // contra la ronda anterior en vez de leerlo del backend porque
  // aplica igual para quien arrancó la ronda y para quien la recibe
  // por Realtime.
  const anteriorSujetoRef = useRef<string | null>(null)
  const [huboCambioDeRoles, setHuboCambioDeRoles] = useState(false)
  useEffect(() => {
    if (!round) return
    setHuboCambioDeRoles(!!anteriorSujetoRef.current && anteriorSujetoRef.current === round.subject_user_id)
    anteriorSujetoRef.current = round.subject_user_id
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round?.id])

  if (loading) return <PageLoader />

  if (ctx?.couple && !ctx.partnerProfile) {
    return (
      <div className="min-h-dvh bg-ritual-bg flex flex-col">
        <header className="px-5 pt-8 pb-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl text-ritual-cream tracking-wide">¿Cuánto me conoces?</h1>
            <p className="text-ritual-muted text-xs font-body mt-0.5">Uno responde sobre sí, el otro adivina</p>
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

  const isSubject = round?.subject_user_id === ctx?.userId
  const miNombre = ctx?.profile?.display_name ?? 'Vos'
  const parejaNombre = ctx?.partnerProfile?.display_name ?? 'tu pareja'
  const subjectNombre = isSubject ? miNombre : parejaNombre
  const guesserNombre = isSubject ? parejaNombre : miNombre

  const miRespuesta = round ? (isSubject ? round.subject_choice : round.guesser_choice) : null
  const porcentaje = stats && stats.intentos > 0 ? Math.round((stats.aciertos / stats.intentos) * 100) : null

  return (
    <div className="min-h-dvh bg-ritual-bg flex flex-col">
      <header className="px-5 pt-8 pb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl text-ritual-cream tracking-wide">¿Cuánto me conoces?</h1>
          <p className="text-ritual-muted text-xs font-body mt-0.5">Uno responde sobre sí, el otro adivina</p>
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
          <div className="space-y-8 animate-fade-up text-center">
            {stats && stats.intentos > 0 && (
              <div className="flex items-center justify-center gap-8">
                <div>
                  <p className="font-display text-4xl text-ritual-cream">{stats.racha_actual}</p>
                  <p className="text-ritual-muted text-[11px] font-body uppercase tracking-wider mt-1">racha actual</p>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div>
                  <p className="font-display text-4xl text-ritual-cream">{porcentaje}%</p>
                  <p className="text-ritual-muted text-[11px] font-body uppercase tracking-wider mt-1">aciertos</p>
                </div>
              </div>
            )}
            <div className="space-y-4">
              <p className="font-display text-2xl text-ritual-cream">¿Cuánto se conocen?</p>
              <p className="text-ritual-muted font-body text-sm leading-relaxed">
                Cada ronda, uno responde algo sobre sí mismo y el otro adivina en secreto. Se turnan solos, ronda a ronda.
              </p>
            </div>
            <button
              onClick={() => empezarRonda(false)}
              disabled={starting}
              className="w-full bg-ritual-gold text-ritual-bg font-body font-medium py-4 rounded-2xl disabled:opacity-50"
            >
              {starting ? 'Empezando...' : 'Empezar ronda'}
            </button>
          </div>
        )}

        {round && !revelado && miRespuesta == null && (
          <div className="space-y-5 animate-fade-up">
            {huboCambioDeRoles && (
              <p className="text-center text-ritual-gold text-[11px] font-body uppercase tracking-widest">
                🔁 Cambio de roles: le toca de nuevo a {subjectNombre}
              </p>
            )}
            <p className="text-center text-ritual-muted text-xs font-body uppercase tracking-widest">
              {isSubject ? 'Respondé sobre vos' : `Adiviná qué respondió ${parejaNombre}`}
            </p>
            <p className="font-display text-2xl text-ritual-cream text-center leading-snug">{round.pregunta}</p>
            <div className="space-y-3">
              {round.opciones.map((opcion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleResponder(idx)}
                  disabled={submitting}
                  className="w-full bg-ritual-bg-soft border border-white/10 rounded-2xl py-4 px-5 text-left hover:border-ritual-gold/40 transition-all disabled:opacity-50"
                >
                  <span className="font-body text-ritual-text">{opcion}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {round && !revelado && miRespuesta != null && (
          <div className="text-center space-y-5 animate-fade-up">
            <div className="w-10 h-10 border-2 border-ritual-gold/30 border-t-ritual-gold rounded-full animate-spin mx-auto" />
            <p className="font-display text-xl text-ritual-cream">
              {isSubject ? 'Ya respondiste' : 'Ya arriesgaste tu respuesta'}
            </p>
            <p className="text-ritual-muted font-body text-sm">
              {isSubject
                ? `Esperando que ${parejaNombre} adivine...`
                : `Esperando a que ${subjectNombre} confirme...`}
            </p>
          </div>
        )}

        {round && revelado && (
          <div className="text-center space-y-6 animate-fade-up">
            <div>
              <p className={`font-display text-3xl ${acerto ? 'text-ritual-gold' : 'text-ritual-muted'}`}>
                {doble.enJuego
                  ? acerto ? '¡Ganaron el Doble o Nada!' : 'Esta vez no salió'
                  : acerto ? 'Acertaste' : 'Esta vez no'}
              </p>
              {stats && (
                <p className="text-ritual-muted font-body text-xs mt-2">
                  {stats.racha_actual > 1
                    ? `${stats.racha_actual} rondas seguidas acertando`
                    : `${stats.aciertos} de ${stats.intentos} aciertos en total`}
                </p>
              )}
            </div>
            <p className="font-display text-lg text-ritual-cream/90">{round.pregunta}</p>
            <div className="flex flex-col gap-2 text-sm font-body text-ritual-muted">
              <span className="bg-ritual-bg-soft border border-white/10 rounded-xl px-4 py-3">
                {subjectNombre}: {round.opciones[round.subject_choice!]}
              </span>
              <span className="bg-ritual-bg-soft border border-white/10 rounded-xl px-4 py-3">
                {guesserNombre} adivinó: {round.opciones[round.guesser_choice!]}
              </span>
            </div>
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
