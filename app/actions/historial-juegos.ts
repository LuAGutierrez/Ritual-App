'use server'

import { createClient } from '@/lib/supabase/server'
import type { HistorialJuegoEntry } from '@/types'

const HISTORIAL_JUEGOS_PAGE_SIZE = 15

export async function getHistorialJuegosAction(
  juego: string,
  offset = 0,
  limit = HISTORIAL_JUEGOS_PAGE_SIZE
): Promise<{ entradas: HistorialJuegoEntry[]; hasMore: boolean }> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_historial_juegos', {
    p_juego: juego,
    p_offset: offset,
    p_limit: limit + 1,
  })

  if (error || !data) return { entradas: [], hasMore: false }

  const rows = data as HistorialJuegoEntry[]
  const hasMore = rows.length > limit
  const entradas = hasMore ? rows.slice(0, limit) : rows

  return { entradas, hasMore }
}
