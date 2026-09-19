// Tarifario del sistema de créditos. Reemplaza a lib/plans.ts (borrado
// junto con el resto del gating de suscripción -- ver docs/ROADMAP.md).
//
// 18/09/2026: el catálogo estático (los 6 juegos) deja de ser gratis para
// siempre -- pivot de producto, "el gancho son los créditos gratis de
// bienvenida/vinculación, no el catálogo ilimitado". Cada ronda jugada
// cuesta GAME_ROUND_COST, cobrado server-side en el mismo punto donde
// hoy se crea la ronda (startXRoundAction) o se elige el próximo ítem
// (Verdad o Reto / Ruleta Picante, que no tienen ronda server-side).
export const GAME_ROUND_COST = 5

export const CREDIT_COST = {
  ritual_simple: 5,
  ritual_profundo: 10,
  dinamica_ia: 15,
  // Insight post-reveal de "¿Cuánto me conoces?" -- contenido corto,
  // mismo tier que ritual_simple. No entra a CREDIT_FEATURES: esa
  // lista alimenta el selector de /ritual-ia, esta feature se dispara
  // desde el juego, no ahí.
  conoces_insight: 5,
  eleccion_ronda: GAME_ROUND_COST,
  esto_aquello_ronda: GAME_ROUND_COST,
  conoces_ronda: GAME_ROUND_COST,
  quien_de_los_dos_ronda: GAME_ROUND_COST,
  verdad_o_reto_ronda: GAME_ROUND_COST,
  ruleta_picante_ronda: GAME_ROUND_COST,
  // Dado Picante tiene 2 tiradas por ronda (lugar+posición o acción+zona)
  // -- se cobra en la primera tirada del par, la segunda es gratis. Ver
  // app/juegos/dado-picante/page.tsx.
  dado_picante_ronda: GAME_ROUND_COST,
} as const

export type CreditFeature = keyof typeof CREDIT_COST

// Resultado común de las 4 startXRoundAction (Elección, Esto o Aquello,
// ¿Cuánto me conoces?, ¿Quién de los dos?) -- cobran GAME_ROUND_COST
// antes de crear la ronda, mismo patrón "cobro antes de generar" que
// generarConIAAction (app/actions/ritual-ia.ts).
export type StartRoundResult<T> =
  | { round: T; error?: undefined; balance?: undefined }
  | { round: null; error: 'insufficient_credits' | 'no_content' | 'unknown'; balance?: number }

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

// Las 3 features que comparten el schema genérico titulo/item1/item2/item3
// (generarConIAAction, buildCreditFeatureSystemPrompt) -- conoces_insight
// tiene su propio action/prompt builder (schema de un solo campo), nunca
// pasa por acá.
export type GenericCreditFeature = (typeof CREDIT_FEATURES)[number]['id']
