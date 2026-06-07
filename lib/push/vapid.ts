import webpush from 'web-push'

export function isPushConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY
  )
}

export function configureWebPush() {
  if (!isPushConfigured()) return false

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:hola@rituales.app',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
  return true
}
