// Anti-farmeo (Sprint 5, ver grant_pairing_bonus en la migración 056):
// UUID persistente por dispositivo, guardado en localStorage. No es
// criptográfico ni intenta ser infalible -- solo permite detectar
// cuando el MISMO navegador ya cobró un bono de vinculación con otra
// cuenta antes. Si localStorage no está disponible (privado, bloqueado),
// se devuelve string vacío y record_device_fingerprint simplemente no
// hace nada -- nunca bloquea el uso real de la app.
const KEY = 'rituales_device_id'

export function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = window.localStorage.getItem(KEY)
    if (!id) {
      id = crypto.randomUUID()
      window.localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return ''
  }
}
