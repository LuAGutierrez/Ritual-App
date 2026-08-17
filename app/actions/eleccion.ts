'use server'

import { createClient } from '@/lib/supabase/server'
import { dentroDelTecho, type Intensidad } from '@/lib/intensidad'
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
  excluir: string[] = [],
  categoriaPreferida: string | null = null
): Promise<EleccionRound | null> {
  const supabase = await createClient()

  const { data: filtrados } = await supabase
    .from('eleccion_prompts')
    .select('option_a, option_b, premio, intensidad, categoria')
    .eq('picante', intensidad === 'picante')

  if (!filtrados || filtrados.length === 0) return null

  // Techo de intensidad elegido por la pareja (couples.intensidad_maxima,
  // migración 038) -- si deja muy pocas opciones, se ignora (mismo
  // criterio de fallback que ya se usa para rechazados/vistos en todos
  // los juegos).
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

  // Variedad: evitar repetir la categoría de la última ronda de esta
  // pareja (selección por variedad, §13) -- se mira la ronda más
  // reciente en vez de pedirle el dato al cliente, así el filtro queda
  // transparente para la UI existente.
  let pool = porRechazo
  const { data: ultimaRonda } = await supabase
    .from('couple_eleccion_rounds')
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

  // Categoría preferida elegida en el hub (pegajosa por sesión, ver
  // lib/categoriaPreferida.ts) -- mismo criterio de fallback que el
  // resto de la cadena.
  if (categoriaPreferida) {
    const preferidos = pool.filter(p => p.categoria === categoriaPreferida)
    if (preferidos.length >= 3) pool = preferidos
  }

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
