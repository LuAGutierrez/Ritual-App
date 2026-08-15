export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64Safe)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ])
}

export async function prepareServiceWorker(): Promise<ServiceWorkerRegistration> {
  let reg = await navigator.serviceWorker.getRegistration('/')

  if (!reg) {
    reg = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    })
  } else {
    await reg.update().catch(() => {})
  }

  await withTimeout(
    navigator.serviceWorker.ready,
    10_000,
    'El service worker tardó demasiado. Recargá la página e intentá de nuevo.'
  )

  return reg
}

export function isBraveBrowser(): boolean {
  return typeof navigator !== 'undefined' && 'brave' in navigator
}

export function bravePushHint(): string | null {
  if (!isBraveBrowser()) return null
  return 'En Brave: abrí brave://settings/privacy y activá "Usar servicios de Google para mensajes push". Reiniciá el navegador e intentá de nuevo.'
}

export function friendlyPushError(message: string): string {
  const braveHint = bravePushHint()

  if (
    message.includes('push service error') ||
    message.includes('Registration failed') ||
    message.includes('servicio push')
  ) {
    if (braveHint) return braveHint
    return 'No se pudo registrar el servicio push. Probá http://127.0.0.1:3000 (en vez de localhost), desactivar VPN/antivirus, o usar Chrome/Firefox.'
  }
  if (message.includes('service worker tardó')) {
    return message
  }
  return message
}

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isIPhoneOrIpad = /iPad|iPhone|iPod/.test(ua)
  // iPadOS 13+ se identifica como Mac de escritorio, pero tiene soporte táctil
  const isIpadOs13Plus = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return isIPhoneOrIpad || isIpadOs13Plus
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

export function iosInstallHint(): string | null {
  if (!isIosDevice() || isStandaloneDisplay()) return null
  return 'En iPhone/iPad, los avisos solo funcionan si agregás Rituales a tu pantalla de inicio: tocá el ícono de Compartir → "Agregar a pantalla de inicio", y abrí la app desde ese ícono.'
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

const DISMISS_KEY = 'rituales_push_prompt_dismissed_until'

export function isPushPromptDismissed(): boolean {
  const until = localStorage.getItem(DISMISS_KEY)
  if (!until) return false
  return Date.now() < parseInt(until, 10)
}

export function dismissPushPrompt(days = 7) {
  localStorage.setItem(
    DISMISS_KEY,
    String(Date.now() + days * 24 * 60 * 60 * 1000)
  )
}
