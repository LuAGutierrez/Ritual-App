export type IntensidadTab = 'normal' | 'picante'
export type TechoLabel = 'Liviana' | 'Media' | 'Intensa'

const KEY_TAB = 'juegos-intensidad-tab'
const KEY_TECHO = 'juegos-techo'

// Pegajoso por sesión (sessionStorage, no una tabla): se elige una sola vez
// al entrar a /juegos y cada uno de los 6 juegos que lo usaban por su
// cuenta ahora lo lee al montar -- mismo scope y motivo que
// categoriaPreferida.ts, el hub y cada juego son navegaciones de página
// distintas sin árbol de componentes compartido.
export function getIntensidadTab(): IntensidadTab {
  if (typeof window === 'undefined') return 'normal'
  return (sessionStorage.getItem(KEY_TAB) as IntensidadTab | null) ?? 'normal'
}

export function setIntensidadTab(tab: IntensidadTab): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(KEY_TAB, tab)
}

export function getTecho(): TechoLabel {
  if (typeof window === 'undefined') return 'Intensa'
  return (sessionStorage.getItem(KEY_TECHO) as TechoLabel | null) ?? 'Intensa'
}

export function setTecho(label: TechoLabel): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(KEY_TECHO, label)
}
