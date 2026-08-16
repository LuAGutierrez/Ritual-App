'use server'

import { createClient } from '@/lib/supabase/server'
import type { RuletaPicanteItem } from '@/types'

export async function getRuletaPicanteItemsAction(): Promise<RuletaPicanteItem[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('ruleta_picante_items').select('id, texto')
  return (data as RuletaPicanteItem[]) ?? []
}
