'use client'

import { useCallback, useState } from 'react'
import {
  friendlyPushError,
  isPushSupported,
  prepareServiceWorker,
  urlBase64ToUint8Array,
  withTimeout,
} from '@/lib/push/client'
import { setPushEnabledAction } from '@/app/actions/notifications'

export type SubscribeResult =
  | { ok: true }
  | { ok: false; error: string }

export function usePushNotifications() {
  const [loading, setLoading] = useState(false)

  const subscribe = useCallback(async (): Promise<SubscribeResult> => {
    if (!isPushSupported()) {
      return { ok: false, error: 'Tu navegador no soporta notificaciones push.' }
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!publicKey) {
      return { ok: false, error: 'Faltan las claves VAPID en el servidor. Reiniciá el dev server.' }
    }

    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'denied') {
        return {
          ok: false,
          error: 'Bloqueaste las notificaciones. En Chrome: ícono del candado en la barra de direcciones → Notificaciones → Permitir.',
        }
      }
      if (permission !== 'granted') {
        return { ok: false, error: 'No se otorgó permiso para notificaciones.' }
      }

      const reg = await prepareServiceWorker()

      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await withTimeout(
          reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
          }),
          15_000,
          'Chrome no pudo conectar con el servicio push. Probá http://127.0.0.1:3000, Firefox, o desactivá VPN.'
        )
      }

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        return { ok: false, error: (data as { error?: string }).error ?? `Error del servidor (${res.status})` }
      }

      await setPushEnabledAction(true)
      return { ok: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      return { ok: false, error: friendlyPushError(msg) }
    } finally {
      setLoading(false)
    }
  }, [])

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = await reg?.pushManager.getSubscription()

      if (sub) {
        await fetch('/api/push/unsubscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }

      await setPushEnabledAction(false)
      return true
    } catch {
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return { subscribe, unsubscribe, loading, isSupported: isPushSupported() }
}
