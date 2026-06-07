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
