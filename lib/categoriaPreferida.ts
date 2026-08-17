import type { RitualCategory } from '@/types'

const KEY = 'categoria-preferida'

// Pegajosa por sesión (sessionStorage, no una tabla): el hub y cada
// juego son navegaciones de página distintas, no comparten árbol de
// React, así que hace falta algo que sobreviva la navegación dentro
// de la pestaña sin persistir entre dispositivos ni días -- mismo
// scope que "vistos"/"ultimaCategoriaRef" en cada juego.
export function getCategoriaPreferida(): RitualCategory | null {
  if (typeof window === 'undefined') return null
  return (sessionStorage.getItem(KEY) as RitualCategory | null) ?? null
}

export function setCategoriaPreferida(categoria: RitualCategory | null): void {
  if (typeof window === 'undefined') return
  if (categoria) {
    sessionStorage.setItem(KEY, categoria)
  } else {
    sessionStorage.removeItem(KEY)
  }
}
