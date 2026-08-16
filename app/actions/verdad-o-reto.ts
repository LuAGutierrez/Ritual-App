'use server'

import { createClient } from '@/lib/supabase/server'
import type { VerdadORetoItem } from '@/types'

export async function getVerdadORetoItemsAction(): Promise<VerdadORetoItem[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('verdad_o_reto_items').select('id, modo, texto, picante, par_picante_id')
  return (data as VerdadORetoItem[]) ?? []
}
