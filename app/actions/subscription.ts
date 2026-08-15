'use server'

import { createClient } from '@/lib/supabase/server'

const ACTIVE_STATUSES = ['active', 'trialing']

export async function isPremiumAction(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle()

  return !!sub && ACTIVE_STATUSES.includes(sub.status)
}

/** Premium si el usuario o su pareja tienen suscripción activa */
export async function isCouplePremiumAction(coupleId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: members } = await supabase
    .from('couple_members')
    .select('user_id')
    .eq('couple_id', coupleId)

  const userIds = (members ?? []).map(m => m.user_id)
  if (userIds.length === 0) return false

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('status')
    .in('user_id', userIds)
    .in('status', ACTIVE_STATUSES)

  return (subs?.length ?? 0) > 0
}

// Version RPC para /precios (ver get_is_couple_premium en la migracion
// 018): reemplaza getUserContextAction + isCouplePremiumAction (dos
// round trips en fila) por una sola llamada.
export async function getIsCouplePremiumAction(): Promise<boolean> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_is_couple_premium')
  if (error) return false
  return !!data
}
