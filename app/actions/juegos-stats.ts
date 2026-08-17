'use server'

import { createClient } from '@/lib/supabase/server'
import type { ConocesStats, MatchStats } from '@/types'

export type JuegosStatsSummary = {
  eleccion: MatchStats | null
  estoAquello: MatchStats | null
  conoces: ConocesStats | null
  quienDeLosDos: MatchStats | null
}

export async function getJuegosStatsSummaryAction(): Promise<JuegosStatsSummary | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_juegos_stats_summary')

  if (error || !data) return null

  return data as JuegosStatsSummary
}
