'use server'

import { createClient } from '@/lib/supabase/server'
import { dentroDelTecho, type Intensidad } from '@/lib/intensidad'
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
    .select('option_a, option_b, intensidad, categoria')
    .eq('picante', intensidad === 'picante')

  if (!filtrados || filtrados.length === 0) return null

  const { data: couple } = await supabase
    .from('couples')
    .select('intensidad_maxima')
    .eq('id', coupleId)
    .single()
  const techo = (couple?.intensidad_maxima as Intensidad) ?? 'intensa'
  const dentroDeTecho = filtrados.filter(p => dentroDelTecho(p.intensidad as Intensidad, techo))
  const porTecho = dentroDeTecho.length >= 3 ? dentroDeTecho : filtrados

  const disponibles = porTecho.filter(p => !excluir.includes(`${p.option_a}|${p.option_b}`))
  const porRechazo = disponibles.length > 0 ? disponibles : porTecho

  let pool = porRechazo
  const { data: ultimaRonda } = await supabase
    .from('couple_esto_aquello_rounds')
    .select('option_a, option_b')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (ultimaRonda) {
    const ultimaCategoria = filtrados.find(
      p => p.option_a === ultimaRonda.option_a && p.option_b === ultimaRonda.option_b
    )?.categoria
    if (ultimaCategoria) {
      const variados = porRechazo.filter(p => p.categoria !== ultimaCategoria)
      if (variados.length >= 3) pool = variados
    }
  }

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
