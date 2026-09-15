// Modo offline (versión simple): cachea el shell (HTML de navegación +
// assets estáticos de Next) para que la app abra sin conexión en vez de
// mostrar el error nativo del navegador. Los datos del ritual en sí
// (respuestas, reveal) NO se cachean acá -- eso lo maneja
// lib/offlineCache.ts en localStorage, con su propio fallback de
// solo-lectura en /ritual. Los Server Actions (POST) y las llamadas a
// Supabase (otro origen) nunca pasan por este handler.
const SHELL_CACHE = 'rituales-shell-v1'
const STATIC_CACHE = 'rituales-static-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== SHELL_CACHE && k !== STATIC_CACHE).map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Navegación (HTML) -- red primero, y guarda la respuesta para
  // servirla si la próxima vez no hay conexión. Sin red y sin nada
  // cacheado para esa URL puntual, cae al shell de /ritual (la pantalla
  // principal), no a un error genérico.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/ritual')))
    )
    return
  }

  // Assets estáticos de Next: el nombre de archivo lleva el hash del
  // contenido, así que la misma URL nunca cambia de contenido -- seguro
  // cachear agresivo (cache primero, sin revalidar).
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          const copy = response.clone()
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy))
          return response
        })
      })
    )
  }
})

self.addEventListener('push', (event) => {
  let data = { title: 'Rituales', body: '', url: '/ritual' }
  try {
    data = { ...data, ...event.data?.json() }
  } catch {
    // payload inválido — usar defaults
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/192',
      badge: '/icons/192',
      data: { url: data.url ?? '/ritual' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/ritual'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
