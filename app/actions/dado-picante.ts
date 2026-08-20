'use server'

import { createClient } from '@/lib/supabase/server'
import type { DadoPicanteItem } from '@/types'

export async function getDadoPicanteItemsAction(): Promise<DadoPicanteItem[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('dado_picante_items').select('id, tipo, texto')
  return (data as DadoPicanteItem[]) ?? []
}
