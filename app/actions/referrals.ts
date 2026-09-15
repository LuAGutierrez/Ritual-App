'use server'

import { createClient } from '@/lib/supabase/server'

export type ReferralInfo = {
  referralCode: string
  activados: number
  pendientes: number
}

// get_referral_info (migración 071). Devuelve null sin sesión -- el
// llamador (/perfil) ya sabe si hay usuario logueado por otro lado.
export async function getReferralInfoAction(): Promise<ReferralInfo | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_referral_info')
  if (error || !data) return null
  return data as ReferralInfo
}
