'use server'

import { createClient } from '@/lib/supabase/server'
import type { Intensidad } from '@/lib/intensidad'

// Techo de intensidad a nivel pareja (migración 038). Mismo patrón
// que picante-consent.ts: resolver couple_id server-side y usar la
// policy couples_update_member existente, sin SECURITY DEFINER --
// campo no privado ni adversarial entre los dos miembros.
export async function getIntensidadMaximaAction(): Promise<Intensidad> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'intensa'

  const { data: membership } = await supabase
    .from('couple_members')
    .select('couple_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) return 'intensa'

  const { data } = await supabase
    .from('couples')
    .select('intensidad_maxima')
    .eq('id', membership.couple_id)
    .single()

  return (data?.intensidad_maxima as Intensidad) ?? 'intensa'
}

export async function setIntensidadMaximaAction(intensidad: Intensidad): Promise<void> {
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
    .from('couples')
    .update({ intensidad_maxima: intensidad })
    .eq('id', membership.couple_id)
}
