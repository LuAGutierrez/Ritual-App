'use server'

import { createClient } from '@/lib/supabase/server'
import type { EstoAquelloRound, MatchStats, UserContext } from '@/types'

export async function getEstoAquelloPageDataAction(): Promise<{
  context: UserContext
  round: EstoAquelloRound | null
  stats: MatchStats | null
} | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_esto_aquello_page_data')

  if (error || !data) return null

  return data as { context: UserContext; round: EstoAquelloRound | null; stats: MatchStats | null }
}

export async function startEstoAquelloRoundAction(
  coupleId: string,
  intensidad: 'normal' | 'picante' = 'normal',
  excluir: string[] = []
): Promise<EstoAquelloRound | null> {
  const supabase = await createClient()

  const { data: filtrados } = await supabase
    .from('esto_o_aquello_items')
    .select('option_a, option_b')
    .eq('picante', intensidad === 'picante')

  if (!filtrados || filtrados.length === 0) return null

  const disponibles = filtrados.filter(p => !excluir.includes(`${p.option_a}|${p.option_b}`))
  const pool = disponibles.length > 0 ? disponibles : filtrados
  const par = pool[Math.floor(Math.random() * pool.length)]

  const { data: members } = await supabase
    .from('couple_members')
    .select('user_id')
    .eq('couple_id', coupleId)

  const [user1, user2] = (members || []).map(m => m.user_id)

  const { data } = await supabase
    .from('couple_esto_aquello_rounds')
    .insert({
      couple_id: coupleId,
      user1_id: user1 || null,
      user2_id: user2 || null,
      option_a: par.option_a,
      option_b: par.option_b,
    })
    .select('*')
    .single()

  return data as EstoAquelloRound | null
}

export async function submitEstoAquelloChoiceAction(
  roundId: string,
  choice: 0 | 1
): Promise<EstoAquelloRound | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('submit_esto_aquello_choice', {
    p_round_id: roundId,
    p_choice: choice,
  })

  if (error || !data?.ok) return null
  return data.round as EstoAquelloRound
}
