'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  getEstoAquelloPageDataAction,
  startEstoAquelloRoundAction,
  submitEstoAquelloChoiceAction,
} from '@/app/actions/esto-aquello'
import { useDobleONada } from '@/lib/hooks/useDobleONada'
import { getCategoriaPreferida } from '@/lib/categoriaPreferida'
import { getIntensidadTab, getTecho, type IntensidadTab as Intensidad, type TechoLabel } from '@/lib/juegosConfig'
import { useCredits, notifyCreditsChanged } from '@/hooks/useCredits'
import { GAME_ROUND_COST } from '@/lib/credits'
import type { EstoAquelloRound, MatchStats, UserContext } from '@/types'
import type { Intensidad as Techo } from '@/lib/intensidad'
import PageLoader from '@/components/PageLoader'
import CreditsBadge from '@/components/CreditsBadge'

export default function EstoOAquelloPage() {
  const router = useRouter()
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const vistosRef = useRef<string[]>([])
  const { credits, refetch: refetchCredits } = useCredits()

  const [ctx, setCtx] = useState<UserContext | null>(null)
  const [round, setRound] = useState<EstoAquelloRound | null>(null)
  const [stats, setStats] = useState<MatchStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [intensidad, setIntensidad] = useState<Intensidad>('normal')
  const [techoLabel, setTechoLabel] = useState<TechoLabel>('Intensa')
  const [copiedInvite, setCopiedInvite] = useState(false)

  // Pareja creada pero sin unir a nadie: startEstoAquelloRoundAction crea
  // la ronda igual (user2_id null, no exige 2 miembros) y el usuario
  // quedaba en "Ya elegiste / Esperando a tu pareja..." para siempre.
  // Mismo fix que /ritual, /perfil, Conoces, Quién de los dos y Elección.
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
      .channel(`esto-aquello:${coupleId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'couple_esto_aquello_rounds', filter: `couple_id=eq.${coupleId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') return
          // Mismo fix que Elección (migración 047): ignorar el evento de
          // una ronda distinta mientras la mía sigue activa sin revelar.
          const incoming = payload.new as EstoAquelloRound
          setRound(prev => (prev && !prev.revealed_at && incoming.id !== prev.id) ? prev : incoming)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'couple_esto_aquello_stats', filter: `couple_id=eq.${coupleId}` },
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
      const pageData = await getEstoAquelloPageDataAction()
      if (!pageData) { router.replace('/auth'); return }
      if (!pageData.context.couple) { router.replace('/onboarding'); return }

      setCtx(pageData.context)
      setRound(pageData.round)
      setStats(pageData.stats)
      subscribeToRounds(pageData.context.couple.id)
      setLoading(false)
    }
    init()
    // Normal/Picante e Intensidad ya se eligieron en /juegos, ver
    // lib/juegosConfig.ts -- el consentimiento +18 también se resuelve ahí
    // antes de que este juego sea alcanzable en modo picante.
    setIntensidad(getIntensidadTab())
    setTechoLabel(getTecho())

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function empezarRonda(esDobleONada: boolean) {
    if (!ctx?.couple) return
    setStarting(true)
    setError(null)
    const techo = techoLabel.toLowerCase() as Techo
    const resultado = await startEstoAquelloRoundAction(ctx.couple.id, intensidad, techo, vistosRef.current, getCategoriaPreferida())
    if (resultado.error === 'insufficient_credits') {
      setError('No te alcanzan los créditos para jugar esta ronda.')
    } else if (!resultado.round) {
      setError('No se pudo empezar la ronda. Intentá de nuevo.')
    } else {
      setRound(resultado.round)
      vistosRef.current = [...vistosRef.current, `${resultado.round.option_a}|${resultado.round.option_b}`]
      if (esDobleONada) doble.aceptar()
      else doble.reset()
      refetchCredits()
      notifyCreditsChanged()
    }
    setStarting(false)
  }

  const saldoInsuficiente = !!credits && credits.total < GAME_ROUND_COST

  async function handleElegir(choice: 0 | 1) {
    if (!round) return
    setSubmitting(true)
    setError(null)
    const updated = await submitEstoAquelloChoiceAction(round.id, choice)
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

  if (ctx?.couple && !ctx.partnerProfile) {
    return (
      <div className="min-h-dvh bg-ritual-bg flex flex-col">
        <header className="px-5 pt-8 pb-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl text-ritual-cream tracking-wide">⚡ Esto o Aquello</h1>
            <p className="text-ritual-muted text-xs font-body mt-0.5">Elijan en secreto y comparen</p>
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
  const miEleccion = round ? (isUser1 ? round.user1_choice : round.user2_choice) : null
  const eleccionPartner = round ? (isUser1 ? round.user2_choice : round.user1_choice) : null

  return (
    <div className="min-h-dvh bg-ritual-bg flex flex-col">
      <header className="px-5 pt-8 pb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl text-ritual-cream tracking-wide">⚡ Esto o Aquello</h1>
          <p className="text-ritual-muted text-xs font-body mt-0.5">Elijan en secreto y comparen</p>
        </div>
        <div className="flex items-center gap-2">
          <CreditsBadge />
          <button
            onClick={() => router.push('/juegos')}
            className="text-ritual-muted text-xs font-body hover:text-ritual-text transition-colors py-2 px-2"
          >
            ← Juegos
          </button>
        </div>
      </header>

      <main className="flex-1 px-5 pb-28 flex flex-col justify-center max-w-md mx-auto w-full">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6">
            <p className="text-red-400/80 text-sm font-body text-center">{error}</p>
          </div>
        )}

        {!round && (
          <div className="space-y-6 animate-fade-up">
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
              <p className="font-display text-2xl text-ritual-cream">¿Se conocen tan bien?</p>
              <p className="text-ritual-muted font-body text-sm leading-relaxed">
                Cada uno elige en secreto. Después ven si coincidieron.
              </p>
              <button
                onClick={() => empezarRonda(false)}
                disabled={starting || saldoInsuficiente}
                className="w-full bg-ritual-gold text-ritual-bg font-body font-medium py-4 rounded-2xl disabled:opacity-50"
              >
                {starting ? 'Empezando...' : `Empezar ronda (${GAME_ROUND_COST} créditos)`}
              </button>
              {saldoInsuficiente && (
                <p className="text-ritual-muted text-xs font-body text-center">
                  Te faltan créditos.{' '}
                  <button onClick={() => router.push('/precios')} className="text-ritual-gold underline">
                    Comprar más
                  </button>
                </p>
              )}
            </div>
          </div>
        )}

        {round && !revelado && miEleccion == null && (
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
            <p className="text-4xl">{doble.enJuego && coincidieron ? '🎉' : coincidieron ? '✦' : '💭'}</p>
            <p className="font-display text-2xl text-ritual-cream">
              {doble.enJuego
                ? coincidieron ? '¡Ganaron el Doble o Nada!' : 'Esta vez no salió'
                : coincidieron ? '¡Eligieron lo mismo!' : 'Eligieron distinto'}
            </p>
            <div className="flex items-center justify-center gap-3 text-sm font-body text-ritual-muted">
              <span className="bg-ritual-bg-soft border border-white/10 rounded-xl px-3 py-2">
                {ctx?.profile?.display_name ?? 'Vos'}: {miEleccion === 0 ? round.option_a : round.option_b}
              </span>
              <span className="bg-ritual-bg-soft border border-white/10 rounded-xl px-3 py-2">
                {ctx?.partnerProfile?.display_name ?? 'Pareja'}: {eleccionPartner === 0 ? round.option_a : round.option_b}
              </span>
            </div>
            {doble.ofrecer && (
              <button
                onClick={() => empezarRonda(true)}
                disabled={saldoInsuficiente}
                className="w-full bg-ritual-gold/15 border border-ritual-gold/40 text-ritual-gold font-body font-medium py-4 rounded-2xl hover:bg-ritual-gold/20 transition-all disabled:opacity-50"
              >
                ¿Van doble o nada? ({GAME_ROUND_COST} créditos)
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
