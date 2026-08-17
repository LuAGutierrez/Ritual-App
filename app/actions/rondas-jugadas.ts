'use server'

import { createClient } from '@/lib/supabase/server'

type JuegoSimple = 'verdad_o_reto' | 'ruleta_picante'

async function getCoupleId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from('couple_members')
    .select('couple_id')
    .eq('user_id', user.id)
    .single()

  return membership?.couple_id ?? null
}

// No bloquea ni devuelve error al que llama a propósito -- es un
// registro liviano (mismo criterio que logContenidoRechazadoAction),
// no una acción central del juego. Si falla, la ronda igual se juega
// del lado del cliente.
export async function logRondaJugadaAction(
  juego: JuegoSimple,
  itemId: string,
  categoria: string
): Promise<void> {
  const supabase = await createClient()
  const coupleId = await getCoupleId()
  if (!coupleId) return

  await supabase.from('couple_rondas_jugadas').insert({
    couple_id: coupleId,
    juego,
    item_id: itemId,
    categoria,
  })

  // "primera_partida" para Verdad o Reto y Ruleta Picante: el único
  // Momento de estos 2 juegos que se detecta acá en vez de en un
  // _resolve_*_stats server-side (no tienen reveal). Las policies +
  // índices únicos (migraciones 041 y 042) lo hacen seguro pedir en
  // cada ronda -- después de la primera, el INSERT falla en silencio
  // por la constraint, no hace falta chequear el error acá (mismo
  // criterio que registrarRetoDobleCompletadoAction).
  await supabase.from('couple_momentos').insert({
    couple_id: coupleId,
    juego,
    tipo: 'primera_partida',
  })
}

export async function getUltimaCategoriaRondaAction(juego: JuegoSimple): Promise<string | null> {
  const supabase = await createClient()
  const coupleId = await getCoupleId()
  if (!coupleId) return null

  const { data } = await supabase
    .from('couple_rondas_jugadas')
    .select('categoria')
    .eq('couple_id', coupleId)
    .eq('juego', juego)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data?.categoria ?? null
}

export type RondasJugadasCount = {
  verdadORetoRondas: number
  ruletaPicanteRondas: number
}

export async function getRondasJugadasCountAction(): Promise<RondasJugadasCount> {
  const supabase = await createClient()
  const coupleId = await getCoupleId()
  if (!coupleId) return { verdadORetoRondas: 0, ruletaPicanteRondas: 0 }

  const [verdadORetoRes, ruletaPicanteRes] = await Promise.all([
    supabase
      .from('couple_rondas_jugadas')
      .select('id', { count: 'exact', head: true })
      .eq('couple_id', coupleId)
      .eq('juego', 'verdad_o_reto'),
    supabase
      .from('couple_rondas_jugadas')
      .select('id', { count: 'exact', head: true })
      .eq('couple_id', coupleId)
      .eq('juego', 'ruleta_picante'),
  ])

  return {
    verdadORetoRondas: verdadORetoRes.count ?? 0,
    ruletaPicanteRondas: ruletaPicanteRes.count ?? 0,
  }
}
