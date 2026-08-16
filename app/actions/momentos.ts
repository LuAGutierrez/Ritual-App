'use server'

import { createClient } from '@/lib/supabase/server'
import type { Momento } from '@/types'

export async function getCoupleMomentosAction(): Promise<Momento[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_couple_momentos')

  if (error || !data) return []

  return data as Momento[]
}
