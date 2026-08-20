'use server'

import { createClient } from '@/lib/supabase/server'

type JuegoPicante = 'eleccion' | 'esto_aquello' | 'quien_de_los_dos' | 'verdad_o_reto' | 'ruleta_picante' | 'dado_picante'

export async function getPicanteTrialUsadoAction(juego: JuegoPicante): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: membership } = await supabase
    .from('couple_members')
    .select('couple_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) return false

  const { data } = await supabase
    .from('couple_picante_trial')
    .select('couple_id')
    .eq('couple_id', membership.couple_id)
    .eq('juego', juego)
    .maybeSingle()

  return !!data
}

export async function marcarPicanteTrialUsadoAction(juego: JuegoPicante): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: membership } = await supabase
    .from('couple_members')
    .select('couple_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) return

  await supabase
    .from('couple_picante_trial')
    .upsert({ couple_id: membership.couple_id, juego }, { onConflict: 'couple_id,juego' })
}
