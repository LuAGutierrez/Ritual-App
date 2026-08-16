export type Profile = {
  id: string
  email: string | null
  display_name: string | null
  avatar: string | null
  created_at: string
}

export type Couple = {
  id: string
  invite_code: string
  name: string | null
  created_at: string
}

export type RitualCategory = 'conexion' | 'diversion' | 'intimidad' | 'reto' | 'viajes' | 'planes' | 'fantasias'

export type Ritual = {
  id: string
  category: RitualCategory
  prompt: string
  challenge: string | null
  difficulty: number
  premium: boolean
  created_at: string
}

export type CoupleRitualSession = {
  id: string
  couple_id: string
  ritual_id: string
  session_date: string
  user1_id: string | null
  user2_id: string | null
  user1_response: string | null
  user2_response: string | null
  user1_completed_at: string | null
  user2_completed_at: string | null
  revealed_at: string | null
  ritual?: Ritual
}

export type Streak = {
  couple_id: string
  current_streak: number
  longest_streak: number
  last_completed_date: string | null
  wildcards_remaining: number
}

export type Subscription = {
  user_id: string
  plan: 'monthly' | 'trial'
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
  current_period_end: string | null
}

// Estado resuelto de la sesión ritual para el UI
export type SessionState =
  | 'loading'
  | 'no_couple'          // No tiene pareja vinculada
  | 'waiting_self'       // El usuario aún no respondió
  | 'waiting_partner'    // El usuario respondió, pareja no
  | 'revealed'           // Ambos respondieron, reveal listo
  | 'completed'          // Ritual completado y visto

export type UserContext = {
  userId: string
  profile: Profile | null
  couple: Couple | null
  partnerProfile: Profile | null
}

export type EleccionRound = {
  id: string
  couple_id: string
  user1_id: string | null
  user2_id: string | null
  option_a: string
  option_b: string
  premio: string
  user1_choice: 0 | 1 | null
  user2_choice: 0 | 1 | null
  revealed_at: string | null
  created_at: string
}

export type EstoAquelloRound = {
  id: string
  couple_id: string
  user1_id: string | null
  user2_id: string | null
  option_a: string
  option_b: string
  user1_choice: 0 | 1 | null
  user2_choice: 0 | 1 | null
  revealed_at: string | null
  created_at: string
}

export type VerdadORetoItem = {
  id: string
  modo: 'verdad' | 'reto'
  texto: string
  picante: boolean
  par_picante_id: string | null
}

export type EstoAquelloItem = {
  id: string
  option_a: string
  option_b: string
  picante: boolean
}

export type EleccionPromptItem = {
  id: string
  option_a: string
  option_b: string
  premio: string
  picante: boolean
}

export type RuletaPicanteItem = {
  id: string
  texto: string
}

export type ConocesRound = {
  id: string
  couple_id: string
  user1_id: string | null
  user2_id: string | null
  subject_user_id: string
  pregunta: string
  opciones: string[]
  subject_choice: number | null
  guesser_choice: number | null
  revealed_at: string | null
  created_at: string
}

export type ConocesStats = {
  couple_id: string
  aciertos: number
  intentos: number
  racha_actual: number
  racha_maxima: number
  updated_at: string
}

export type ConocesItem = {
  id: string
  pregunta: string
  opciones: string[]
  categoria: string
  picante: boolean
}

export type NotificationPrefs = {
  user_id: string
  push_enabled: boolean
  partner_responded: boolean
  daily_reminder: boolean
  reminder_time: string
  timezone: string
}
