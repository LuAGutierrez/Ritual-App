'use server'

import { createClient } from '@/lib/supabase/server'

// Consentimiento a nivel pareja para el modo picante (migración 035).
// Parejas nuevas arrancan en false; las que ya existían al momento de
// la migración quedaron en true (no se les corta el hábito).
export async function getPicanteHabilitadoAction(): Promise<boolean> {
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
    .from('couples')
    .select('picante_habilitado')
    .eq('id', membership.couple_id)
    .single()

  return data?.picante_habilitado ?? false
}

// UPDATE directo permitido por la policy couples_update_member -- no
// hace falta SECURITY DEFINER, este campo no es privado ni
// adversarial entre los dos miembros de la pareja.
export async function habilitarPicanteAction(): Promise<void> {
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
    .update({ picante_habilitado: true })
    .eq('id', membership.couple_id)
}
