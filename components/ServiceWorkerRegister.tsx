'use client'

import { useEffect } from 'react'

// Registro incondicional para que el cacheo del shell (modo offline
// simple, ver public/sw.js) funcione para cualquiera, no solo para quien
// activó notificaciones -- antes el único registro vivía en
// lib/push/client.ts, atado al opt-in de push. getRegistration primero
// evita registrar dos veces si el usuario ya activó notificaciones antes
// en esta sesión.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.getRegistration('/').then((existing) => {
      if (!existing) {
        navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
      }
    })
  }, [])

  return null
}
