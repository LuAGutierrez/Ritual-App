'use server'

import { createClient } from '@/lib/supabase/server'
import type { EleccionRound, MatchStats, UserContext } from '@/types'

// Junta contexto + ronda activa + stats en un solo round-trip (ver
// get_eleccion_page_data() en la migracion 018, stats agregadas en la
// 029), mismo enfoque que /ritual y /historial -- antes eran dos
// llamadas en fila (getUserContextAction + getActiveEleccionRoundAction).
export async function getEleccionPageDataAction(): Promise<{
  context: UserContext
  round: EleccionRound | null
  stats: MatchStats | null
} | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_eleccion_page_data')

  if (error || !data) return null

  return data as { context: UserContext; round: EleccionRound | null; stats: MatchStats | null }
}

export async function startEleccionRoundAction(
  coupleId: string,
  intensidad: 'normal' | 'picante' = 'normal',
  excluir: string[] = []
): Promise<EleccionRound | null> {
  const supabase = await createClient()

  const { data: filtrados } = await supabase
    .from('eleccion_prompts')
    .select('option_a, option_b, premio')
    .eq('picante', intensidad === 'picante')

  if (!filtrados || filtrados.length === 0) return null

  const disponibles = filtrados.filter(p => !excluir.includes(`${p.option_a}|${p.option_b}`))
  const pool = disponibles.length > 0 ? disponibles : filtrados
  const prompt = pool[Math.floor(Math.random() * pool.length)]

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
      option_a: prompt.option_a,
      option_b: prompt.option_b,
      premio: prompt.premio,
    })
    .select('*')
    .single()

  return data as EleccionRound | null
}

// Igual que submit_ritual_response: la escritura pasa por una funcion
// SECURITY DEFINER (migracion 020) que decide server-side de que lado
// estas y solo toca esa columna, en vez de confiar en lo que mande el
// cliente. De paso agrega un guard "ya elegiste" -- antes nada impedia
// cambiar tu propia eleccion despues de ver la de tu pareja por Realtime.
export async function submitEleccionChoiceAction(
  roundId: string,
  choice: 0 | 1
): Promise<EleccionRound | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('submit_eleccion_choice', {
    p_round_id: roundId,
    p_choice: choice,
  })

  if (error || !data?.ok) return null
  return data.round as EleccionRound
}
