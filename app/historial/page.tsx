'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getHistorialPageDataAction, getHistorialAction } from '@/app/actions/ritual'
import { getHistorialJuegosAction } from '@/app/actions/historial-juegos'
import { FREE_HISTORIAL_LIMIT } from '@/lib/plans'
import BottomNav from '@/components/BottomNav'
import PageLoader from '@/components/PageLoader'
import type { CoupleRitualSession, UserContext, RitualCategory, HistorialJuegoEntry } from '@/types'

const JUEGO_FILTROS: { id: string; label: string; emoji: string }[] = [
  { id: 'todos', label: 'Todos', emoji: '' },
  { id: 'eleccion', label: 'Elección', emoji: '💫' },
  { id: 'esto_aquello', label: 'Esto o Aquello', emoji: '⚡' },
  { id: 'conoces', label: '¿Cuánto me conoces?', emoji: '👁️' },
  { id: 'quien_de_los_dos', label: '¿Quién de los dos?', emoji: '⚖️' },
  { id: 'verdad_o_reto', label: 'Verdad o Reto', emoji: '🎲' },
  { id: 'ruleta_picante', label: 'Ruleta Picante', emoji: '🔥' },
]

const RESULTADO_COPY: Record<NonNullable<HistorialJuegoEntry['resultado']>, string> = {
  coincidieron: '✓ Coincidieron',
  no_coincidieron: '✗ No coincidieron',
  acierto: '🎯 Acierto',
  no_acierto: '— No acertó',
}

function formatFechaHora(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
}

const CATEGORIAS: { id: string; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'conexion', label: 'Conexión' },
  { id: 'diversion', label: 'Diversión' },
  { id: 'intimidad', label: 'Intimidad' },
  { id: 'reto', label: 'Reto' },
]

const CATEGORY_COLORS: Record<RitualCategory, string> = {
  conexion: 'text-ritual-gold border-ritual-gold/30 bg-ritual-gold/10',
  diversion: 'text-ritual-cream border-ritual-cream/30 bg-ritual-cream/10',
  intimidad: 'text-[#D4A5A5] border-[#D4A5A5]/30 bg-[#D4A5A5]/10',
  reto: 'text-[#8B6F5E] border-[#8B6F5E]/40 bg-[#8B6F5E]/10',
  viajes: 'text-ritual-gold border-ritual-gold/30 bg-ritual-gold/10',
  planes: 'text-ritual-cream border-ritual-cream/30 bg-ritual-cream/10',
  fantasias: 'text-[#D4A5A5] border-[#D4A5A5]/30 bg-[#D4A5A5]/10',
}

const CATEGORY_LABELS: Record<RitualCategory, string> = {
  conexion: 'Conexión',
  diversion: 'Diversión',
  intimidad: 'Intimidad',
  reto: 'Reto',
  viajes: 'Viajes',
  planes: 'Planes',
  fantasias: 'Fantasías',
}

function formatFecha(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function HistorialPage() {
  const router = useRouter()
  const [ctx, setCtx] = useState<UserContext | null>(null)
  const [sessions, setSessions] = useState<CoupleRitualSession[]>([])
  const [categoria, setCategoria] = useState('todos')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [totalCompleted, setTotalCompleted] = useState(0)
  const [totalCompletedAll, setTotalCompletedAll] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const [tab, setTab] = useState<'rituales' | 'juegos'>('rituales')
  const [juegoEntries, setJuegoEntries] = useState<HistorialJuegoEntry[]>([])
  const [juegoFiltro, setJuegoFiltro] = useState('todos')
  const [juegoHasMore, setJuegoHasMore] = useState(false)
  const [juegoLoading, setJuegoLoading] = useState(false)
  const [juegoLoadingMore, setJuegoLoadingMore] = useState(false)
  const [juegoLoaded, setJuegoLoaded] = useState(false)

  function applyHistorial(result: { sessions: CoupleRitualSession[]; hasMore: boolean; isPremium: boolean; totalCompleted: number; totalCompletedAll: number }, append = false) {
    setSessions(prev => append ? [...prev, ...result.sessions] : result.sessions)
    setHasMore(result.hasMore)
    setIsPremium(result.isPremium)
    setTotalCompleted(result.totalCompleted)
    setTotalCompletedAll(result.totalCompletedAll)
    setError(null)
  }

  async function loadHistorial(coupleId: string, cat: string, offset = 0, append = false) {
    try {
      const result = await getHistorialAction(coupleId, cat, offset)
      applyHistorial(result, append)
    } catch {
      setError('No se pudo cargar el historial. Intentá de nuevo.')
    }
  }

  useEffect(() => {
    async function init() {
      try {
        const pageData = await getHistorialPageDataAction('todos')
        if (!pageData) { router.replace('/auth'); return }
        setCtx(pageData.context)
        if (!pageData.context.couple) { router.replace('/onboarding'); return }
        if ('sessions' in pageData) applyHistorial(pageData)
      } catch {
        setError('No se pudo cargar el historial. Intentá de nuevo.')
      }
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCategoria(cat: string) {
    if (!ctx?.couple) return
    setCategoria(cat)
    setLoading(true)
    setExpanded(null)
    await loadHistorial(ctx.couple.id, cat)
    setLoading(false)
  }

  async function handleLoadMore() {
    if (!ctx?.couple || loadingMore || !hasMore) return
    setLoadingMore(true)
    await loadHistorial(ctx.couple.id, categoria, sessions.length, true)
    setLoadingMore(false)
  }

  async function loadJuegos(filtro: string, offset = 0, append = false) {
    try {
      const result = await getHistorialJuegosAction(filtro, offset)
      setJuegoEntries(prev => append ? [...prev, ...result.entradas] : result.entradas)
      setJuegoHasMore(result.hasMore)
    } catch {
      setError('No se pudo cargar el historial de juegos. Intentá de nuevo.')
    }
  }

  async function handleTab(t: 'rituales' | 'juegos') {
    setTab(t)
    setError(null)
    // Carga lazy: los datos de "Juegos" solo se piden la primera vez
    // que se toca ese tab, no en la carga inicial de la página.
    if (t === 'juegos' && !juegoLoaded) {
      setJuegoLoading(true)
      await loadJuegos(juegoFiltro)
      setJuegoLoaded(true)
      setJuegoLoading(false)
    }
  }

  async function handleJuegoFiltro(filtro: string) {
    setJuegoFiltro(filtro)
    setJuegoLoading(true)
    await loadJuegos(filtro)
    setJuegoLoading(false)
  }

  async function handleJuegoLoadMore() {
    if (juegoLoadingMore || !juegoHasMore) return
    setJuegoLoadingMore(true)
    await loadJuegos(juegoFiltro, juegoEntries.length, true)
    setJuegoLoadingMore(false)
  }

  function getMyResponse(s: CoupleRitualSession): string {
    if (!ctx) return ''
    return ctx.userId === s.user1_id ? (s.user1_response ?? '') : (s.user2_response ?? '')
  }

  function getPartnerResponse(s: CoupleRitualSession): string {
    if (!ctx) return ''
    return ctx.userId === s.user1_id ? (s.user2_response ?? '') : (s.user1_response ?? '')
  }

  const showPremiumUpsell = categoria === 'todos' && !isPremium && totalCompletedAll > FREE_HISTORIAL_LIMIT && !hasMore

  const headerCount = categoria === 'todos' ? totalCompletedAll : totalCompleted

  if (loading) {
    return <PageLoader />
  }

  return (
    <div className="min-h-dvh bg-ritual-bg flex flex-col">
      {/* Header */}
      <header className="px-5 pt-8 pb-4">
        <h1 className="font-display text-xl text-ritual-cream tracking-wide">Historial</h1>
        <p className="text-ritual-muted text-xs font-body mt-0.5">
          {headerCount > 0
            ? `${headerCount} ritual${headerCount !== 1 ? 'es' : ''} completado${headerCount !== 1 ? 's' : ''}${categoria !== 'todos' ? ` · ${CATEGORIAS.find(c => c.id === categoria)?.label}` : ''}`
            : 'Aún no completaron rituales'}
        </p>
      </header>

      {/* Rituales / Juegos */}
      <div className="px-5 pb-4">
        <div className="flex bg-ritual-bg-soft rounded-2xl p-1">
          <button
            onClick={() => handleTab('rituales')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-body font-medium transition-all duration-300 ${
              tab === 'rituales' ? 'bg-ritual-gold text-ritual-bg' : 'text-ritual-muted hover:text-ritual-text'
            }`}
          >
            Rituales
          </button>
          <button
            onClick={() => handleTab('juegos')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-body font-medium transition-all duration-300 ${
              tab === 'juegos' ? 'bg-ritual-gold text-ritual-bg' : 'text-ritual-muted hover:text-ritual-text'
            }`}
          >
            Juegos
          </button>
        </div>
      </div>

      {/* Filtro de categorías (rituales) */}
      {tab === 'rituales' && (
        <div className="px-5 pb-4 flex gap-2 overflow-x-auto scrollbar-none">
          {CATEGORIAS.map(c => (
            <button
              key={c.id}
              onClick={() => handleCategoria(c.id)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full border font-body text-xs transition-all duration-200 ${
                categoria === c.id
                  ? 'bg-ritual-gold text-ritual-bg border-ritual-gold'
                  : 'bg-transparent border-white/15 text-ritual-muted hover:border-white/25'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Filtro por juego (juegos) */}
      {tab === 'juegos' && (
        <div className="px-5 pb-4 flex gap-2 overflow-x-auto scrollbar-none">
          {JUEGO_FILTROS.map(j => (
            <button
              key={j.id}
              onClick={() => handleJuegoFiltro(j.id)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full border font-body text-xs transition-all duration-200 ${
                juegoFiltro === j.id
                  ? 'bg-ritual-gold text-ritual-bg border-ritual-gold'
                  : 'bg-transparent border-white/15 text-ritual-muted hover:border-white/25'
              }`}
            >
              {j.emoji ? `${j.emoji} ${j.label}` : j.label}
            </button>
          ))}
        </div>
      )}

      {/* Lista */}
      <main className="flex-1 px-5 pb-28 max-w-md mx-auto w-full">
        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
            <p className="text-red-300 font-body text-sm">{error}</p>
          </div>
        )}
        {tab === 'rituales' && (sessions.length === 0 && !error ? (
          <div className="text-center py-16">
            <p className="font-display text-2xl text-ritual-cream mb-3">
              Todavía no hay rituales aquí
            </p>
            <p className="text-ritual-muted font-body text-sm leading-relaxed">
              {categoria === 'todos'
                ? 'Cuando completen su primer ritual juntos, aparecerá acá.'
                : `No completaron rituales de ${CATEGORIAS.find(c => c.id === categoria)?.label?.toLowerCase()} todavía.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(s => {
              const isExpanded = expanded === s.id
              const cat = s.ritual?.category as RitualCategory | undefined
              const myResp = getMyResponse(s)
              const partnerResp = getPartnerResponse(s)

              return (
                <div
                  key={s.id}
                  className="bg-ritual-bg-soft border border-white/8 rounded-2xl overflow-hidden transition-all duration-300"
                >
                  {/* Cabecera del card */}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : s.id)}
                    className="w-full px-5 py-4 text-left flex items-start justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      {cat && (
                        <span className={`inline-block text-[10px] font-body uppercase tracking-wider px-2 py-0.5 rounded-full border mb-2 ${CATEGORY_COLORS[cat]}`}>
                          {CATEGORY_LABELS[cat]}
                        </span>
                      )}
                      <p className="font-display text-ritual-cream text-base leading-snug line-clamp-2">
                        {s.ritual?.prompt}
                      </p>
                      <p className="text-ritual-muted text-xs font-body mt-1 capitalize">
                        {s.session_date ? formatFecha(s.session_date) : ''}
                      </p>
                    </div>
                    <span className="text-ritual-muted text-sm mt-1 flex-shrink-0">
                      {isExpanded ? '↑' : '↓'}
                    </span>
                  </button>

                  {/* Respuestas expandidas */}
                  {isExpanded && (
                    <div className="px-5 pb-5 space-y-4 border-t border-white/8 pt-4">
                      {myResp && (
                        <div>
                          <p className="text-ritual-muted text-[10px] font-body uppercase tracking-wider mb-1">
                            {ctx?.profile?.display_name ?? 'Vos'}
                          </p>
                          <p className="text-ritual-text font-body text-sm leading-relaxed">
                            {myResp}
                          </p>
                        </div>
                      )}
                      {partnerResp && (
                        <div>
                          <p className="text-ritual-muted text-[10px] font-body uppercase tracking-wider mb-1">
                            {ctx?.partnerProfile?.display_name ?? 'Tu pareja'}
                          </p>
                          <p className="text-ritual-text font-body text-sm leading-relaxed">
                            {partnerResp}
                          </p>
                        </div>
                      )}
                      {s.ritual?.challenge && (
                        <div className="bg-white/5 rounded-xl px-4 py-3">
                          <p className="text-ritual-muted text-[10px] font-body uppercase tracking-wider mb-1">Reto</p>
                          <p className="text-ritual-cream font-body text-sm">{s.ritual.challenge}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {hasMore && (
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="w-full bg-white/5 border border-white/10 text-ritual-muted font-body text-sm py-4 rounded-2xl hover:border-white/20 hover:text-ritual-text transition-all duration-300 disabled:opacity-40"
              >
                {loadingMore ? 'Cargando...' : 'Cargar más'}
              </button>
            )}
            {showPremiumUpsell && (
              <div className="bg-ritual-gold/8 border border-ritual-gold/20 rounded-2xl p-5 text-center space-y-3">
                <p className="font-display text-lg text-ritual-cream">
                  Hay más recuerdos guardados
                </p>
                <p className="text-ritual-muted font-body text-sm leading-relaxed">
                  Llevan {totalCompletedAll} rituales juntos. Con Premium podés ver todo su historial.
                </p>
                <button
                  onClick={() => router.push('/precios')}
                  className="w-full bg-ritual-gold text-ritual-bg font-body font-medium text-sm py-3.5 rounded-2xl hover:bg-ritual-cream transition-all duration-300"
                >
                  Ver Premium
                </button>
              </div>
            )}
          </div>
        ))}

        {tab === 'juegos' && (juegoLoading ? (
          <PageLoader />
        ) : juegoEntries.length === 0 && !error ? (
          <div className="text-center py-16">
            <p className="font-display text-2xl text-ritual-cream mb-3">
              Todavía no hay rondas aquí
            </p>
            <p className="text-ritual-muted font-body text-sm leading-relaxed">
              {juegoFiltro === 'todos'
                ? 'Cuando jueguen su primera ronda juntos, aparecerá acá.'
                : `No jugaron a ${JUEGO_FILTROS.find(j => j.id === juegoFiltro)?.label} todavía.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {juegoEntries.map((entry, idx) => {
              const juegoInfo = JUEGO_FILTROS.find(j => j.id === entry.juego)
              return (
                <div
                  key={`${entry.juego}-${entry.created_at}-${idx}`}
                  className="bg-ritual-bg-soft border border-white/8 rounded-2xl px-5 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-ritual-muted text-[10px] font-body uppercase tracking-wider mb-2">
                        {juegoInfo?.emoji} {juegoInfo?.label}
                      </p>
                      <p className="font-display text-ritual-cream text-base leading-snug line-clamp-2">
                        {entry.resumen}
                      </p>
                      <p className="text-ritual-muted text-xs font-body mt-1 capitalize">
                        {formatFechaHora(entry.created_at)}
                      </p>
                    </div>
                    {entry.resultado && (
                      <span className="flex-shrink-0 text-ritual-gold text-[10px] font-body mt-1">
                        {RESULTADO_COPY[entry.resultado]}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
            {juegoHasMore && (
              <button
                onClick={handleJuegoLoadMore}
                disabled={juegoLoadingMore}
                className="w-full bg-white/5 border border-white/10 text-ritual-muted font-body text-sm py-4 rounded-2xl hover:border-white/20 hover:text-ritual-text transition-all duration-300 disabled:opacity-40"
              >
                {juegoLoadingMore ? 'Cargando...' : 'Cargar más'}
              </button>
            )}
          </div>
        ))}
      </main>

      <BottomNav />
    </div>
  )
}
