import type { SupabaseClient } from '@supabase/supabase-js'

// Decide de quién es el turno mirando quién actuó en la última ronda
// de la pareja en esa tabla, y alternando -- mismo criterio que ya
// usaba startConocesRoundAction (antes calculado por paridad de
// cantidad de rondas; ahora por el actor real de la última, para que
// forzarRepetirUltimo pueda romper la alternancia UNA vez sin
// desalinear las rondas siguientes).
//
// forzarRepetirUltimo es el mecanismo detrás del evento especial
// "Cambio de Roles": si se pide, el actor de esta ronda es el mismo
// que el de la última en vez del que le tocaría alternando. Como la
// ronda siguiente vuelve a mirar "quién actuó en la última" (que ahora
// es el repetido), la alternancia se retoma sola sin arrastrar el
// desvío.
export async function siguienteTurno(
  supabase: SupabaseClient,
  coupleId: string,
  tablaRondas: string,
  columnaActor: string,
  forzarRepetirUltimo = false
): Promise<{ user1: string; user2: string; actorId: string } | null> {
  const { data: members } = await supabase
    .from('couple_members')
    .select('user_id')
    .eq('couple_id', coupleId)
    .order('joined_at', { ascending: true })

  const [user1, user2] = (members || []).map((m: { user_id: string }) => m.user_id)
  if (!user1 || !user2) return null

  const { data: ultima } = await supabase
    .from(tablaRondas)
    .select(columnaActor)
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const ultimoActor = (ultima as Record<string, string> | null)?.[columnaActor] ?? null

  let actorId: string
  if (!ultimoActor) {
    actorId = user1
  } else if (forzarRepetirUltimo) {
    actorId = ultimoActor
  } else {
    actorId = ultimoActor === user1 ? user2 : user1
  }

  return { user1, user2, actorId }
}
