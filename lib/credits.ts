// Tarifario del sistema de créditos. Reemplaza a lib/plans.ts (borrado
// junto con el resto del gating de suscripción -- ver docs/ROADMAP.md).
export const CREDIT_COST = {
  ritual_simple: 5,
  ritual_profundo: 10,
  dinamica_ia: 15,
} as const

export type CreditFeature = keyof typeof CREDIT_COST

export const WELCOME_CREDITS = 50
export const PAIRING_BONUS_CREDITS = 150

// Desbloqueo permanente por pareja de los 15 rituales especiales (viajes/
// planes/fantasías) que quedaron con premium=true tras el split de la
// migración 069. No pasa por CREDIT_COST/consume_credits: tiene su propia
// RPC (unlock_rituales_especiales) que cobra este mismo monto server-side.
export const RITUALES_ESPECIALES_COST = 30

export const CREDIT_FEATURES = [
  { id: 'ritual_simple' as const, label: 'Ritual diario con IA', cost: CREDIT_COST.ritual_simple },
  { id: 'ritual_profundo' as const, label: 'Ritual personalizado profundo', cost: CREDIT_COST.ritual_profundo },
  { id: 'dinamica_ia' as const, label: 'Dinámica / test de compatibilidad', cost: CREDIT_COST.dinamica_ia },
]
