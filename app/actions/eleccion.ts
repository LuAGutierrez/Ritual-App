'use server'

import { createClient } from '@/lib/supabase/server'
import { ELECCION_PROMPTS } from '@/lib/juegos'
import type { EleccionRound, UserContext } from '@/types'

// Junta contexto + ronda activa en un solo round-trip (ver
// get_eleccion_page_data() en la migracion 018), mismo enfoque que
// /ritual y /historial -- antes eran dos llamadas en fila
// (getUserContextAction + getActiveEleccionRoundAction).
export async function getEleccionPageDataAction(): Promise<{
  context: UserContext
  round: EleccionRound | null
} | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_eleccion_page_data')

  if (error || !data) return null

  return data as { context: UserContext; round: EleccionRound | null }
}

export async function startEleccionRoundAction(coupleId: string): Promise<EleccionRound | null> {
  const supabase = await createClient()

  const prompt = ELECCION_PROMPTS[Math.floor(Math.random() * ELECCION_PROMPTS.length)]

  const { data: members } = await supabase
    .from('couple_members')
    .select('user_id')
    .eq('couple_id', coupleId)

  const [user1, user2] = (members || []).map(m => m.user_id)

  const { data } = await supabase
    .from('couple_eleccion_rounds')
    .insert({
      couple_id: coupleId,
      user1_id: user1 || null,
      user2_id: user2 || null,
      option_a: prompt.a,
      option_b: prompt.b,
      premio: prompt.premio,
    })
    .select('*')
    .single()

  return data as EleccionRound | null
}

export async function submitEleccionChoiceAction(
  roundId: string,
  choice: 0 | 1
): Promise<EleccionRound | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: round } = await supabase
    .from('couple_eleccion_rounds')
    .select('*')
    .eq('id', roundId)
    .single()

  if (!round) return null

  const isUser1 = round.user1_id === user.id
  const patch = isUser1 ? { user1_choice: choice } : { user2_choice: choice }

  const nextUser1 = isUser1 ? choice : round.user1_choice
  const nextUser2 = isUser1 ? round.user2_choice : choice

  const { data: updated } = await supabase
    .from('couple_eleccion_rounds')
    .update({
      ...patch,
      revealed_at: nextUser1 != null && nextUser2 != null ? new Date().toISOString() : null,
    })
    .eq('id', roundId)
    .select('*')
    .single()

  return updated as EleccionRound | null
}
