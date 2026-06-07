'use client'

import { useEffect, useState } from 'react'
import {
  getNotificationPrefsAction,
  updateNotificationPrefsAction,
} from '@/app/actions/notifications'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { bravePushHint } from '@/lib/push/client'
import type { NotificationPrefs } from '@/types'

const TIMEZONES = [
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina' },
  { value: 'America/Mexico_City', label: 'México' },
  { value: 'America/Bogota', label: 'Colombia' },
  { value: 'America/Santiago', label: 'Chile' },
  { value: 'Europe/Madrid', label: 'España' },
]

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, '0')
  return { value: `${h}:00:00`, label: `${h}:00` }
})

export default function NotificationPrefsSection() {
  const { subscribe, unsubscribe, loading: pushLoading, isSupported } = usePushNotifications()
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const braveHint = bravePushHint()

  useEffect(() => {
    getNotificationPrefsAction().then(setPrefs)
  }, [])

  if (!prefs) return null

  async function handleSave() {
    setSaving(true)
    setError(null)
    const result = await updateNotificationPrefsAction({
      partner_responded: prefs!.partner_responded,
      daily_reminder: prefs!.daily_reminder,
      reminder_time: prefs!.reminder_time,
      timezone: prefs!.timezone,
    })
    if (!result.ok) {
      setError(result.error ?? 'No se pudo guardar.')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
    setSaving(false)
  }

  async function handleTogglePush() {
    if (prefs!.push_enabled) {
      await unsubscribe()
      setPrefs(p => p ? { ...p, push_enabled: false } : p)
    } else {
      const result = await subscribe()
      if (result.ok) {
        setPrefs(p => p ? { ...p, push_enabled: true } : p)
        setError(null)
      } else {
        setError(result.error)
      }
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-ritual-muted text-xs font-body uppercase tracking-wider">
        Notificaciones
      </h2>

      <div className="bg-ritual-bg-soft border border-white/8 rounded-2xl p-4 space-y-4">
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="text-ritual-cream font-body text-sm">Avisarme cuando mi pareja responda</span>
          <input
            type="checkbox"
            checked={prefs.partner_responded}
            onChange={e => setPrefs({ ...prefs, partner_responded: e.target.checked })}
            className="accent-ritual-gold w-4 h-4"
          />
        </label>

        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="text-ritual-cream font-body text-sm">Recordatorio diario del ritual</span>
          <input
            type="checkbox"
            checked={prefs.daily_reminder}
            onChange={e => setPrefs({ ...prefs, daily_reminder: e.target.checked })}
            className="accent-ritual-gold w-4 h-4"
          />
        </label>

        {prefs.daily_reminder && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-ritual-muted text-xs font-body mb-1.5">Hora</label>
              <select
                value={prefs.reminder_time.slice(0, 5) + ':00'}
                onChange={e => setPrefs({ ...prefs, reminder_time: e.target.value })}
                className="w-full bg-ritual-bg border border-white/10 rounded-xl px-3 py-2.5 text-ritual-text font-body text-sm"
              >
                {HOURS.map(h => (
                  <option key={h.value} value={h.value}>{h.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-ritual-muted text-xs font-body mb-1.5">Zona horaria</label>
              <select
                value={prefs.timezone}
                onChange={e => setPrefs({ ...prefs, timezone: e.target.value })}
                className="w-full bg-ritual-bg border border-white/10 rounded-xl px-3 py-2.5 text-ritual-text font-body text-sm"
              >
                {TIMEZONES.map(tz => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <p className="text-ritual-muted text-xs font-body">
          {prefs.push_enabled ? '● Avisos activos' : '○ Avisos desactivados'}
        </p>

        {braveHint && (
          <p className="text-ritual-muted text-xs font-body leading-relaxed">
            {braveHint}
          </p>
        )}

        {isSupported && (
          <button
            type="button"
            onClick={handleTogglePush}
            disabled={pushLoading}
            className="w-full bg-white/5 border border-white/10 text-ritual-muted font-body text-sm py-3 rounded-xl hover:border-white/20 hover:text-ritual-text transition-all disabled:opacity-40"
          >
            {pushLoading
              ? 'Procesando...'
              : prefs.push_enabled
                ? 'Desactivar avisos en este dispositivo'
                : 'Activar avisos en este dispositivo'}
          </button>
        )}

        {error && <p className="text-red-400/80 text-xs font-body text-center">{error}</p>}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-ritual-gold/15 border border-ritual-gold/25 text-ritual-gold font-body text-sm py-3 rounded-xl hover:bg-ritual-gold/25 transition-all disabled:opacity-40"
        >
          {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar preferencias'}
        </button>
      </div>
    </div>
  )
}
