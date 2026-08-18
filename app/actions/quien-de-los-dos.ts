'use server'

import { createClient } from '@/lib/supabase/server'
import { dentroDelTecho, type Intensidad } from '@/lib/intensidad'
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
  intensidad: 'normal' | 'picante' = 'normal',
  excluir: string[] = [],
  categoriaPreferida: string | null = null
): Promise<QuienDeLosDosRound | null> {
  const supabase = await createClient()

  const { data: items } = await supabase
    .from('quien_de_los_dos_items')
    .select('pregunta, intensidad, categoria')
    .eq('picante', intensidad === 'picante')

  if (!items || items.length === 0) return null

  const { data: couple } = await supabase
    .from('couples')
    .select('intensidad_maxima')
    .eq('id', coupleId)
    .single()
  const techo = (couple?.intensidad_maxima as Intensidad) ?? 'intensa'
  const dentroDeTecho = items.filter(i => dentroDelTecho(i.intensidad as Intensidad, techo))
  const porTecho = dentroDeTecho.length >= 3 ? dentroDeTecho : items

  const disponibles = porTecho.filter(i => !excluir.includes(i.pregunta))
  const porRechazo = disponibles.length > 0 ? disponibles : porTecho

  let pool = porRechazo
  const { data: ultimaRonda } = await supabase
    .from('couple_quien_de_los_dos_rounds')
    .select('pregunta')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (ultimaRonda) {
    const ultimaCategoria = items.find(i => i.pregunta === ultimaRonda.pregunta)?.categoria
    if (ultimaCategoria) {
      const variados = porRechazo.filter(i => i.categoria !== ultimaCategoria)
      if (variados.length >= 3) pool = variados
    }
  }

  if (categoriaPreferida) {
    const preferidos = pool.filter(i => i.categoria === categoriaPreferida)
    if (preferidos.length >= 3) pool = preferidos
  }

  const item = pool[Math.floor(Math.random() * pool.length)]

  const { data: members } = await supabase
    .from('couple_members')
    .select('user_id')
    .eq('couple_id', coupleId)

  const [user1, user2] = (members || []).map(m => m.user_id)

  const { data, error } = await supabase
    .from('couple_quien_de_los_dos_rounds')
    .insert({
      couple_id: coupleId,
      user1_id: user1 || null,
      user2_id: user2 || null,
      pregunta: item.pregunta,
    })
    .select('*')
    .single()

  // couple_quien_de_los_dos_rounds_one_active (migración 047): mismo
  // caso que Elección -- la pareja ya tenía una ronda sin revelar.
  if (error?.code === '23505') {
    const { data: existente } = await supabase
      .from('couple_quien_de_los_dos_rounds')
      .select('*')
      .eq('couple_id', coupleId)
      .is('revealed_at', null)
      .single()
    return existente as QuienDeLosDosRound | null
  }

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
