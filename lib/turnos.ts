import type { SupabaseClient } from '@supabase/supabase-js'

// Decide de quién es el turno alternando por paridad de rondas previas
// de la pareja en la tabla del juego -- mismo criterio que ya usaba
// startConocesRoundAction (ahora extraído acá para que el próximo juego
// por turnos no lo reimplemente). Solo sirve para juegos con roles
// asimétricos (uno actúa, el otro espera/adivina); Elección y Esto o
// Aquello no lo necesitan porque ahí ambos eligen a la vez.
export async function siguienteTurno(
  supabase: SupabaseClient,
  coupleId: string,
  tablaRondas: string
): Promise<{ user1: string; user2: string; actorId: string } | null> {
  const { data: members } = await supabase
    .from('couple_members')
    .select('user_id')
    .eq('couple_id', coupleId)
    .order('joined_at', { ascending: true })

  const [user1, user2] = (members || []).map((m: { user_id: string }) => m.user_id)
  if (!user1 || !user2) return null

  const { count } = await supabase
    .from(tablaRondas)
    .select('id', { count: 'exact', head: true })
    .eq('couple_id', coupleId)

  const actorId = (count ?? 0) % 2 === 0 ? user1 : user2

  return { user1, user2, actorId }
}
