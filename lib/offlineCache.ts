import type { CoupleRitualSession, Streak, UserContext } from '@/types'

// Modo offline simple: guarda el último ritual/contexto/racha que se
// pudo cargar con éxito, para mostrarlo en solo lectura si /ritual se
// abre sin conexión (ver app/ritual/page.tsx). No intenta sincronizar
// respuestas dadas offline -- eso requeriría una cola de escritura con
// resolución de conflictos, fuera de alcance de esta versión.
const KEY = 'rituales_offline_ritual_cache'

export type OfflineRitualCache = {
  context: UserContext
  session: CoupleRitualSession | null
  streak: Streak | null
  savedAt: string
}

export function saveOfflineRitualCache(data: Omit<OfflineRitualCache, 'savedAt'>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...data, savedAt: new Date().toISOString() }))
  } catch {
    // localStorage puede fallar (modo privado, cuota llena) -- sin cache
    // offline en ese caso, no rompe nada más.
  }
}

export function loadOfflineRitualCache(): OfflineRitualCache | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as OfflineRitualCache) : null
  } catch {
    return null
  }
}
