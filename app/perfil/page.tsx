'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getPerfilAction, updatePerfilAction } from '@/app/actions/perfil'
import type { PerfilData } from '@/app/actions/perfil'
import { getCoupleMomentosAction } from '@/app/actions/momentos'
import { getJuegosStatsSummaryAction } from '@/app/actions/juegos-stats'
import { getRondasJugadasCountAction } from '@/app/actions/rondas-jugadas'
import { getIntensidadMaximaAction, setIntensidadMaximaAction } from '@/app/actions/perfil-preferencias'
import { nivelActual } from '@/lib/niveles'
import type { Intensidad } from '@/lib/intensidad'
import type { Momento } from '@/types'
import NotificationPrefsSection from '@/components/NotificationPrefsSection'
import BottomNav from '@/components/BottomNav'
import PageLoader from '@/components/PageLoader'
import { createClient } from '@/lib/supabase/client'

// El texto/emoji de cada momento vive acá, no en la base -- la RPC
// (get_couple_momentos, migración 031) solo devuelve juego+tipo.
const MOMENTO_COPY: Record<Momento['juego'], Record<Momento['tipo'], { emoji: string; texto: string }>> = {
  eleccion: {
    primera_partida: { emoji: '💫', texto: 'Primera vez que jugaron a Elección' },
    primera_coincidencia: { emoji: '🔥', texto: 'Primera vez que coincidieron en Elección' },
    racha_5: { emoji: '🔥', texto: '5 coincidencias seguidas en Elección' },
    sorpresa: { emoji: '✨', texto: 'Un momento sorpresa en Elección' },
    reto_doble: { emoji: '🔥', texto: 'Reto doble completado' },
    primer_desacuerdo: { emoji: '💭', texto: 'Primera vez que no coincidieron en Elección' },
  },
  esto_aquello: {
    primera_partida: { emoji: '⚡', texto: 'Primera vez que jugaron a Esto o Aquello' },
    primera_coincidencia: { emoji: '⚡', texto: 'Primera vez que eligieron lo mismo en Esto o Aquello' },
    racha_5: { emoji: '⚡', texto: '5 coincidencias seguidas en Esto o Aquello' },
    sorpresa: { emoji: '✨', texto: 'Un momento sorpresa en Esto o Aquello' },
    reto_doble: { emoji: '🔥', texto: 'Reto doble completado' },
    primer_desacuerdo: { emoji: '💭', texto: 'Primera vez que eligieron distinto en Esto o Aquello' },
  },
  conoces: {
    primera_partida: { emoji: '👁️', texto: 'Primera vez que jugaron a ¿Cuánto me conoces?' },
    primera_coincidencia: { emoji: '🎯', texto: 'Primera vez que acertaste qué respondió tu pareja' },
    racha_5: { emoji: '🎯', texto: '5 aciertos seguidos en ¿Cuánto me conoces?' },
    sorpresa: { emoji: '✨', texto: 'Un momento sorpresa en ¿Cuánto me conoces?' },
    reto_doble: { emoji: '🔥', texto: 'Reto doble completado' },
    primer_desacuerdo: { emoji: '💭', texto: 'Primera vez que no acertaste en ¿Cuánto me conoces?' },
  },
  quien_de_los_dos: {
    primera_partida: { emoji: '⚖️', texto: 'Primera vez que jugaron a ¿Quién de los dos?' },
    primera_coincidencia: { emoji: '⚖️', texto: 'Primera vez que coincidieron en ¿Quién de los dos?' },
    racha_5: { emoji: '⚖️', texto: '5 coincidencias seguidas en ¿Quién de los dos?' },
    sorpresa: { emoji: '✨', texto: 'Un momento sorpresa en ¿Quién de los dos?' },
    reto_doble: { emoji: '🔥', texto: 'Reto doble completado' },
    primer_desacuerdo: { emoji: '💭', texto: 'Primera vez que no coincidieron en ¿Quién de los dos?' },
  },
  verdad_o_reto: {
    primera_partida: { emoji: '🎲', texto: 'Primera vez que jugaron a Verdad o Reto' },
    primera_coincidencia: { emoji: '🎲', texto: 'Primera vez que jugaron a Verdad o Reto' },
    racha_5: { emoji: '🎲', texto: 'Primera vez que jugaron a Verdad o Reto' },
    sorpresa: { emoji: '✨', texto: 'Un momento sorpresa en Verdad o Reto' },
    reto_doble: { emoji: '🔥', texto: 'Primer Reto Doble completado' },
    primer_desacuerdo: { emoji: '💭', texto: 'Primera vez que jugaron a Verdad o Reto' },
  },
  ruleta_picante: {
    primera_partida: { emoji: '🔥', texto: 'Primera vez que jugaron a Ruleta Picante' },
    primera_coincidencia: { emoji: '🔥', texto: 'Primera vez que jugaron a Ruleta Picante' },
    racha_5: { emoji: '🔥', texto: 'Primera vez que jugaron a Ruleta Picante' },
    sorpresa: { emoji: '✨', texto: 'Un momento sorpresa en Ruleta Picante' },
    reto_doble: { emoji: '🔥', texto: 'Primera vez que jugaron a Ruleta Picante' },
    primer_desacuerdo: { emoji: '💭', texto: 'Primera vez que jugaron a Ruleta Picante' },
  },
}

const AVATARS = [
  '🌙', '✨', '🌿', '🦋', '🌸', '🔥', '💫', '🌊',
  '🍃', '🌺', '💎', '🕊️', '🌹', '⭐', '🌻', '🐚',
  '🍀', '🌈', '🦅', '🌷', '💐', '🌼', '🦄', '🌝',
]

const CATEGORY_LABELS: Record<string, string> = {
  conexion: 'Conexión',
  diversion: 'Diversión',
  intimidad: 'Intimidad',
  reto: 'Reto',
}

export default function PerfilPage() {
  const router = useRouter()
  const [data, setData] = useState<PerfilData | null>(null)
  const [momentos, setMomentos] = useState<Momento[]>([])
  const [totalJuegos, setTotalJuegos] = useState(0)
  const [loading, setLoading] = useState(true)
  const [nombre, setNombre] = useState('')
  const [avatar, setAvatar] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [intensidadMaxima, setIntensidadMaximaState] = useState<Intensidad>('intensa')

  useEffect(() => {
    getPerfilAction().then(d => {
      if (!d) { router.replace('/auth'); return }
      setData(d)
      setNombre(d.profile.display_name ?? '')
      setAvatar(d.profile.avatar ?? '🌙')
      setLoading(false)
    })
    getCoupleMomentosAction().then(setMomentos)
    getIntensidadMaximaAction().then(setIntensidadMaximaState)
    Promise.all([getJuegosStatsSummaryAction(), getRondasJugadasCountAction()]).then(([stats, rondas]) => {
      const total =
        (stats?.eleccion?.intentos ?? 0) +
        (stats?.estoAquello?.intentos ?? 0) +
        (stats?.conoces?.intentos ?? 0) +
        (stats?.quienDeLosDos?.intentos ?? 0) +
        rondas.verdadORetoRondas +
        rondas.ruletaPicanteRondas
      setTotalJuegos(total)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const result = await updatePerfilAction(nombre, avatar)
    if (!result.ok) {
      setError(result.error ?? 'No se pudo guardar.')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
    setSaving(false)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth')
  }

  async function cambiarIntensidadMaxima(intensidad: Intensidad) {
    setIntensidadMaximaState(intensidad)
    await setIntensidadMaximaAction(intensidad)
  }

  if (loading) {
    return <PageLoader />
  }

  const streak = data?.streak
  const rafacha = streak?.longest_streak ?? 0
  const totalInteracciones = (data?.ritualesCompletados ?? 0) + totalJuegos
  const { nivel, siguiente, faltan } = nivelActual(totalInteracciones)

  return (
    <div className="min-h-dvh bg-ritual-bg flex flex-col">
      {/* Header */}
      <header className="px-5 pt-8 pb-4">
        <h1 className="font-display text-xl text-ritual-cream tracking-wide">Perfil</h1>
      </header>

      <main className="flex-1 px-5 pb-28 max-w-md mx-auto w-full space-y-6">

        {/* Avatar actual */}
        <div className="text-center pt-2">
          <div className="w-20 h-20 rounded-full bg-ritual-bg-soft border border-white/10 flex items-center justify-center text-4xl mx-auto mb-3">
            {avatar || '🌙'}
          </div>
          {data?.partnerName && (
            <p className="text-ritual-muted text-xs font-body">
              Con {data.partnerName}
            </p>
          )}
        </div>

        {/* Formulario */}
        <form onSubmit={handleGuardar} className="space-y-5">
          {/* Nombre */}
          <div>
            <label className="block text-ritual-muted text-xs font-body uppercase tracking-wider mb-2">
              Tu nombre
            </label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              maxLength={30}
              className="w-full bg-ritual-bg-soft border border-white/10 rounded-2xl px-5 py-4 text-ritual-text placeholder-ritual-muted/40 font-body text-base focus:outline-none focus:border-ritual-gold/50 transition-colors"
            />
          </div>

          {/* Emoji picker */}
          <div>
            <label className="block text-ritual-muted text-xs font-body uppercase tracking-wider mb-3">
              Tu avatar
            </label>
            <div className="grid grid-cols-8 gap-2">
              {AVATARS.map((emoji, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setAvatar(emoji)}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all duration-200 ${
                    avatar === emoji
                      ? 'bg-ritual-gold/20 border border-ritual-gold/40 scale-110'
                      : 'bg-white/5 border border-transparent hover:bg-white/10'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-red-400/80 text-sm font-body text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving || !nombre.trim()}
            className="w-full bg-ritual-gold text-ritual-bg font-body font-medium py-4 rounded-2xl transition-all duration-300 hover:bg-ritual-cream active:scale-[0.98] disabled:opacity-40"
          >
            {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar cambios'}
          </button>
        </form>

        <NotificationPrefsSection />

        {/* Nivel de la pareja -- progresión emocional según cuánto jugaron juntos */}
        <div className="text-center py-2">
          <p className="text-5xl mb-2">{nivel.emoji}</p>
          <p className="font-display text-2xl text-ritual-cream">{nivel.nombre}</p>
          <p className="text-ritual-muted text-sm font-body mt-1 max-w-xs mx-auto">{nivel.descripcion}</p>
          {siguiente && faltan !== null && (
            <p className="text-ritual-gold text-xs font-body mt-3">
              A {faltan} de llegar a {siguiente.emoji} {siguiente.nombre}
            </p>
          )}
        </div>

        {/* Techo de intensidad -- qué tan a fondo van los juegos, aparte
            del gate de picante que ya existe */}
        <div className="pt-2">
          <h2 className="text-ritual-muted text-xs font-body uppercase tracking-wider mb-3">
            Intensidad de los juegos
          </h2>
          <div className="flex bg-ritual-bg-soft rounded-2xl p-1">
            {([
              { valor: 'liviana', emoji: '🌱', label: 'Liviana' },
              { valor: 'media', emoji: '❤️', label: 'Media' },
              { valor: 'intensa', emoji: '🔥', label: 'Intensa' },
            ] as const).map(({ valor, emoji, label }) => (
              <button
                key={valor}
                onClick={() => cambiarIntensidadMaxima(valor)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-body font-medium transition-all duration-300 ${
                  intensidadMaxima === valor ? 'bg-ritual-gold text-ritual-bg' : 'text-ritual-muted hover:text-ritual-text'
                }`}
              >
                {emoji} {label}
              </button>
            ))}
          </div>
        </div>

        {/* Estadísticas */}
        <div className="pt-2">
          <h2 className="text-ritual-muted text-xs font-body uppercase tracking-wider mb-4">
            Su historia juntos
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-ritual-bg-soft border border-white/8 rounded-2xl p-4 text-center">
              <p className="font-display text-3xl text-ritual-gold mb-1">
                {data?.ritualesCompletados ?? 0}
              </p>
              <p className="text-ritual-muted text-xs font-body">
                ritual{(data?.ritualesCompletados ?? 0) !== 1 ? 'es' : ''} completado{(data?.ritualesCompletados ?? 0) !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="bg-ritual-bg-soft border border-white/8 rounded-2xl p-4 text-center">
              <p className="font-display text-3xl text-ritual-gold mb-1">
                {streak?.current_streak ?? 0}
              </p>
              <p className="text-ritual-muted text-xs font-body">
                días de racha
              </p>
            </div>

            <div className="bg-ritual-bg-soft border border-white/8 rounded-2xl p-4 text-center">
              <p className="font-display text-3xl text-ritual-cream mb-1">
                {rafacha}
              </p>
              <p className="text-ritual-muted text-xs font-body">
                racha más larga
              </p>
            </div>

            <div className="bg-ritual-bg-soft border border-white/8 rounded-2xl p-4 text-center">
              <p className="font-display text-2xl text-ritual-cream mb-1">
                {data?.categoriaFavorita
                  ? CATEGORY_LABELS[data.categoriaFavorita] ?? data.categoriaFavorita
                  : '—'}
              </p>
              <p className="text-ritual-muted text-xs font-body">
                categoría favorita
              </p>
            </div>
          </div>

          {(streak?.wildcards_remaining ?? 0) > 0 && (
            <div className="mt-3 bg-ritual-gold/8 border border-ritual-gold/20 rounded-2xl p-4 text-center">
              <p className="text-ritual-gold font-body text-sm">
                {streak?.wildcards_remaining} comodín disponible
              </p>
              <p className="text-ritual-muted text-xs font-body mt-0.5">
                Tocalo desde el ritual del día si se rompe la racha
              </p>
            </div>
          )}
        </div>

        {/* Momentos -- hitos de los juegos, no solo del ritual */}
        {momentos.length > 0 && (
          <div className="pt-2">
            <h2 className="text-ritual-muted text-xs font-body uppercase tracking-wider mb-4">
              Momentos
            </h2>
            <div className="space-y-2">
              {momentos.map(m => {
                const copy = MOMENTO_COPY[m.juego]?.[m.tipo]
                if (!copy) return null
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 bg-ritual-bg-soft border border-white/8 rounded-2xl px-4 py-3"
                  >
                    <span className="text-xl">{copy.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-ritual-cream font-body text-sm">{copy.texto}</p>
                      <p className="text-ritual-muted text-[11px] font-body mt-0.5">
                        {new Date(m.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Link al historial */}
        <button
          onClick={() => router.push('/historial')}
          className="w-full bg-transparent border border-white/10 text-ritual-muted font-body text-sm py-4 rounded-2xl hover:border-white/20 hover:text-ritual-text transition-all duration-300"
        >
          Ver historial de rituales →
        </button>

        {/* Cerrar sesión */}
        <button
          onClick={handleLogout}
          className="w-full text-ritual-muted/70 font-body text-xs py-2 hover:text-ritual-text transition-colors"
        >
          Cerrar sesión
        </button>
      </main>

      <BottomNav />
    </div>
  )
}
