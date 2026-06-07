'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUserContextAction, getHistorialAction } from '@/app/actions/ritual'
import type { CoupleRitualSession, UserContext, RitualCategory } from '@/types'

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
}

const CATEGORY_LABELS: Record<RitualCategory, string> = {
  conexion: 'Conexión',
  diversion: 'Diversión',
  intimidad: 'Intimidad',
  reto: 'Reto',
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
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const context = await getUserContextAction()
      if (!context) { router.replace('/auth'); return }
      if (!context.couple) { router.replace('/onboarding'); return }
      setCtx(context)
      const data = await getHistorialAction(context.couple.id)
      setSessions(data)
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCategoria(cat: string) {
    if (!ctx?.couple) return
    setCategoria(cat)
    setLoading(true)
    const data = await getHistorialAction(ctx.couple.id, cat)
    setSessions(data)
    setLoading(false)
  }

  function getMyResponse(s: CoupleRitualSession): string {
    if (!ctx) return ''
    return ctx.userId === s.user1_id ? (s.user1_response ?? '') : (s.user2_response ?? '')
  }

  function getPartnerResponse(s: CoupleRitualSession): string {
    if (!ctx) return ''
    return ctx.userId === s.user1_id ? (s.user2_response ?? '') : (s.user1_response ?? '')
  }

  if (loading) {
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
          <h1 className="font-display text-xl text-ritual-cream tracking-wide">Historial</h1>
          <p className="text-ritual-muted text-xs font-body mt-0.5">
            {sessions.length > 0
              ? `${sessions.length} ritual${sessions.length !== 1 ? 'es' : ''} completado${sessions.length !== 1 ? 's' : ''}`
              : 'Aún no completaron rituales'}
          </p>
        </div>
        <button
          onClick={() => router.push('/ritual')}
          className="text-ritual-muted text-xs font-body hover:text-ritual-text transition-colors py-2 px-3"
        >
          ← Ritual de hoy
        </button>
      </header>

      {/* Filtro de categorías */}
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

      {/* Lista */}
      <main className="flex-1 px-5 pb-10 max-w-md mx-auto w-full">
        {sessions.length === 0 ? (
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
          </div>
        )}
      </main>
    </div>
  )
}
