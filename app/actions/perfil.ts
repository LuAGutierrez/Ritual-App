'use server'

import { createClient } from '@/lib/supabase/server'
import type { Profile, Streak } from '@/types'

export type PerfilData = {
  profile: Profile
  streak: Streak | null
  ritualesCompletados: number
  categoriaFavorita: string | null
  partnerName: string | null
  isPremium: boolean
}

// El codigo TS anterior encadenaba hasta 9-10 round trips secuenciales
// (ni en paralelo entre si) para armar esta pantalla. Ver
// get_perfil_page_data() en supabase/migrations/018_perfil_eleccion_precios_rpc.sql --
// mismo enfoque que /ritual y /historial: todo el JOIN se resuelve
// adentro de Postgres en una sola llamada.
export async function getPerfilAction(): Promise<PerfilData | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_perfil_page_data')

  if (error || !data) return null
  return data as PerfilData
}

export async function updatePerfilAction(
  displayName: string,
  avatar: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  if (!displayName.trim()) return { ok: false, error: 'El nombre no puede estar vacío.' }

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName.trim(), avatar })
    .eq('id', user.id)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
