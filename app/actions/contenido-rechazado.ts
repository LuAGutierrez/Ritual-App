'use server'

import { createClient } from '@/lib/supabase/server'

// No bloquea ni devuelve error al que llama a propósito -- es un
// registro liviano, no una acción central del juego. Si falla (red,
// pareja no vinculada todavía), el "paso" del usuario igual funciona
// del lado del cliente.
export async function logContenidoRechazadoAction(
  juego: 'verdad_o_reto' | 'ruleta_picante',
  itemId: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: membership } = await supabase
    .from('couple_members')
    .select('couple_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) return

  await supabase.from('couple_contenido_rechazado').insert({
    couple_id: membership.couple_id,
    juego,
    item_id: itemId,
  })
}

// El perfil de pareja que "aprende": la señal más simple y confiable
// que tenemos hoy es qué pasaron, así que se usa para dejar de repetir
// eso mismo -- ver listaFiltrada() en verdad-o-reto y ruleta-picante.
export async function getRechazadosAction(
  juego: 'verdad_o_reto' | 'ruleta_picante'
): Promise<string[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: membership } = await supabase
    .from('couple_members')
    .select('couple_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) return []

  const { data } = await supabase
    .from('couple_contenido_rechazado')
    .select('item_id')
    .eq('couple_id', membership.couple_id)
    .eq('juego', juego)

  return Array.from(new Set((data ?? []).map(row => row.item_id as string)))
}
