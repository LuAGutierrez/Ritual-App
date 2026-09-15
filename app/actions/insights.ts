'use server'

import { createClient } from '@/lib/supabase/server'

export type CoupleInsights = {
  semanaCompletados: number
  categoriaTop: string | null
  tendencia: 'mas' | 'menos' | 'igual' | null
  categoriaEvitada: string | null
}

// get_couple_insights (migración 069) -- resumen semanal y detección de
// patrones de Sprint 4. Devuelve null sin pareja vinculada, no hace falta
// distinguir ese caso acá (el llamador ya sabe si hay pareja por otro lado).
export async function getCoupleInsightsAction(): Promise<CoupleInsights | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_couple_insights')
  if (error || !data) return null
  return data as CoupleInsights
}
