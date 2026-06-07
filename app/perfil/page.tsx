'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getPerfilAction, updatePerfilAction } from '@/app/actions/perfil'
import type { PerfilData } from '@/app/actions/perfil'
import NotificationPrefsSection from '@/components/NotificationPrefsSection'

const AVATARS = [
  '🌙', '✨', '🌿', '🦋', '🌸', '🔥', '💫', '🌊',
  '🍃', '🌺', '💎', '🕊️', '🌙', '⭐', '🌻', '🐚',
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
  const [loading, setLoading] = useState(true)
  const [nombre, setNombre] = useState('')
  const [avatar, setAvatar] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPerfilAction().then(d => {
      if (!d) { router.replace('/auth'); return }
      setData(d)
      setNombre(d.profile.display_name ?? '')
      setAvatar(d.profile.avatar ?? '🌙')
      setLoading(false)
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

  if (loading) {
    return (
      <div className="min-h-dvh bg-ritual-bg flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-ritual-gold/40 border-t-ritual-gold rounded-full animate-spin" />
      </div>
    )
  }

  const streak = data?.streak
  const rafacha = streak?.longest_streak ?? 0

  return (
    <div className="min-h-dvh bg-ritual-bg flex flex-col">
      {/* Header */}
      <header className="px-5 pt-8 pb-4 flex items-center justify-between">
        <h1 className="font-display text-xl text-ritual-cream tracking-wide">Perfil</h1>
        <button
          onClick={() => router.push('/ritual')}
          className="text-ritual-muted text-xs font-body hover:text-ritual-text transition-colors py-2 px-3"
        >
          ← Volver
        </button>
      </header>

      <main className="flex-1 px-5 pb-10 max-w-md mx-auto w-full space-y-6">

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
                Se usa automáticamente si se rompe la racha
              </p>
            </div>
          )}
        </div>

        {/* Link al historial */}
        <button
          onClick={() => router.push('/historial')}
          className="w-full bg-transparent border border-white/10 text-ritual-muted font-body text-sm py-4 rounded-2xl hover:border-white/20 hover:text-ritual-text transition-all duration-300"
        >
          Ver historial de rituales →
        </button>
      </main>
    </div>
  )
}
