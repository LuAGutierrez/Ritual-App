'use server'

import { createClient } from '@/lib/supabase/server'
import type { Momento } from '@/types'

export async function getCoupleMomentosAction(): Promise<Momento[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_couple_momentos')

  if (error || !data) return []

  return data as Momento[]
}

// Verdad o Reto no tiene rondas persistidas en la base (a diferencia
// de Elección/Esto o Aquello/Conoces/Quién de los dos), así que este
// es el único Momento que se inserta directo desde el cliente en vez
// de detectarse server-side -- la policy de INSERT (migración 036)
// solo permite exactamente juego='verdad_o_reto' + tipo='reto_doble',
// y un índice único garantiza que se registre una sola vez por
// pareja. Si ya existe, el INSERT falla en silencio -- no hace falta
// chequear el error acá.
export async function registrarRetoDobleCompletadoAction(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: membership } = await supabase
    .from('couple_members')
    .select('couple_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) return

  await supabase.from('couple_momentos').insert({
    couple_id: membership.couple_id,
    juego: 'verdad_o_reto',
    tipo: 'reto_doble',
  })
}
