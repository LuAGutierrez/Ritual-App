'use server'

import { createClient } from '@/lib/supabase/server'
import type { ConocesRound, ConocesStats, UserContext } from '@/types'

export async function getConocesPageDataAction(): Promise<{
  context: UserContext
  round: ConocesRound | null
  stats: ConocesStats | null
} | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_conoces_page_data')

  if (error || !data) return null

  return data as { context: UserContext; round: ConocesRound | null; stats: ConocesStats | null }
}

// Elige un item al azar (evitando repetir preguntas vistas en la sesión,
// igual que startEleccionRoundAction) y decide subject_user_id alternando
// por paridad de la cantidad de rondas previas de la pareja -- robusto a
// rondas abandonadas sin reveal, porque cuentan igual para la paridad.
export async function startConocesRoundAction(
  coupleId: string,
  excluir: string[] = []
): Promise<ConocesRound | null> {
  const supabase = await createClient()

  const { data: items } = await supabase
    .from('conoces_items')
    .select('pregunta, opciones')
    .eq('picante', false)

  if (!items || items.length === 0) return null

  const disponibles = items.filter(i => !excluir.includes(i.pregunta))
  const pool = disponibles.length > 0 ? disponibles : items
  const item = pool[Math.floor(Math.random() * pool.length)]

  const { data: members } = await supabase
    .from('couple_members')
    .select('user_id')
    .eq('couple_id', coupleId)
    .order('joined_at', { ascending: true })

  const [user1, user2] = (members || []).map(m => m.user_id)
  if (!user1 || !user2) return null

  const { count } = await supabase
    .from('couple_conoces_rounds')
    .select('id', { count: 'exact', head: true })
    .eq('couple_id', coupleId)

  const subjectUserId = (count ?? 0) % 2 === 0 ? user1 : user2

  const { data } = await supabase
    .from('couple_conoces_rounds')
    .insert({
      couple_id: coupleId,
      user1_id: user1,
      user2_id: user2,
      subject_user_id: subjectUserId,
      pregunta: item.pregunta,
      opciones: item.opciones,
    })
    .select('*')
    .single()

  return data as ConocesRound | null
}

export async function submitConocesSubjectChoiceAction(
  roundId: string,
  choice: number
): Promise<ConocesRound | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('submit_conoces_subject_choice', {
    p_round_id: roundId,
    p_choice: choice,
  })
  if (error || !data?.ok) return null
  return data.round as ConocesRound
}

export async function submitConocesGuessAction(
  roundId: string,
  choice: number
): Promise<ConocesRound | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('submit_conoces_guess', {
    p_round_id: roundId,
    p_choice: choice,
  })
  if (error || !data?.ok) return null
  return data.round as ConocesRound
}
