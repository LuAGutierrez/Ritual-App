'use server'

import { createClient } from '@/lib/supabase/server'
import type { QuienDeLosDosRound, MatchStats, UserContext } from '@/types'

// Junta contexto + ronda activa + stats en un solo round-trip, mismo
// enfoque que getEleccionPageDataAction.
export async function getQuienDeLosDosPageDataAction(): Promise<{
  context: UserContext
  round: QuienDeLosDosRound | null
  stats: MatchStats | null
} | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_quien_de_los_dos_page_data')

  if (error || !data) return null

  return data as { context: UserContext; round: QuienDeLosDosRound | null; stats: MatchStats | null }
}

export async function startQuienDeLosDosRoundAction(
  coupleId: string,
  excluir: string[] = []
): Promise<QuienDeLosDosRound | null> {
  const supabase = await createClient()

  const { data: items } = await supabase
    .from('quien_de_los_dos_items')
    .select('pregunta')

  if (!items || items.length === 0) return null

  const disponibles = items.filter(i => !excluir.includes(i.pregunta))
  const pool = disponibles.length > 0 ? disponibles : items
  const item = pool[Math.floor(Math.random() * pool.length)]

  const { data: members } = await supabase
    .from('couple_members')
    .select('user_id')
    .eq('couple_id', coupleId)

  const [user1, user2] = (members || []).map(m => m.user_id)

  const { data } = await supabase
    .from('couple_quien_de_los_dos_rounds')
    .insert({
      couple_id: coupleId,
      user1_id: user1 || null,
      user2_id: user2 || null,
      pregunta: item.pregunta,
    })
    .select('*')
    .single()

  return data as QuienDeLosDosRound | null
}

// Escritura pasa por submit_quien_de_los_dos_choice (SECURITY
// DEFINER, migración 034) -- mismo patrón que submitEleccionChoiceAction.
export async function submitQuienDeLosDosChoiceAction(
  roundId: string,
  choice: 0 | 1
): Promise<QuienDeLosDosRound | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('submit_quien_de_los_dos_choice', {
    p_round_id: roundId,
    p_choice: choice,
  })

  if (error || !data?.ok) return null
  return data.round as QuienDeLosDosRound
}
