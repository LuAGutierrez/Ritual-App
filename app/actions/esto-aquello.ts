'use server'

import { createClient } from '@/lib/supabase/server'
import { ESTO_O_AQUELLO } from '@/lib/juegos'
import type { EstoAquelloRound, UserContext } from '@/types'

export async function getEstoAquelloPageDataAction(): Promise<{
  context: UserContext
  round: EstoAquelloRound | null
} | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_esto_aquello_page_data')

  if (error || !data) return null

  return data as { context: UserContext; round: EstoAquelloRound | null }
}

export async function startEstoAquelloRoundAction(
  coupleId: string,
  intensidad: 'normal' | 'picante' = 'normal',
  excluir: string[] = []
): Promise<EstoAquelloRound | null> {
  const supabase = await createClient()

  const filtrados = ESTO_O_AQUELLO.filter(p => (intensidad === 'picante' ? p.picante : !p.picante))
  const disponibles = filtrados.filter(p => !excluir.includes(`${p.a}|${p.b}`))
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
      option_a: par.a,
      option_b: par.b,
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
