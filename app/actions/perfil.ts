'use server'

import { createClient } from '@/lib/supabase/server'
import type { Profile, Streak } from '@/types'

export type PerfilData = {
  profile: Profile
  streak: Streak | null
  ritualesCompletados: number
  categoriaFavorita: string | null
  partnerName: string | null
}

export async function getPerfilAction(): Promise<PerfilData | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  const { data: membership } = await supabase
    .from('couple_members')
    .select('couple_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return { profile: profile as Profile, streak: null, ritualesCompletados: 0, categoriaFavorita: null, partnerName: null }
  }

  const coupleId = membership.couple_id

  const { data: streak } = await supabase
    .from('streaks')
    .select('*')
    .eq('couple_id', coupleId)
    .single()

  const { data: sessions } = await supabase
    .from('couple_ritual_sessions')
    .select('*, ritual:rituals(category)')
    .eq('couple_id', coupleId)
    .not('revealed_at', 'is', null)

  const ritualesCompletados = sessions?.length ?? 0

  // Categoría favorita
  const counts: Record<string, number> = {}
  for (const s of sessions ?? []) {
    const cat = (s.ritual as { category?: string } | null)?.category
    if (cat) counts[cat] = (counts[cat] ?? 0) + 1
  }
  const categoriaFavorita = Object.keys(counts).length > 0
    ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    : null

  // Partner
  const { data: members } = await supabase
    .from('couple_members')
    .select('user_id')
    .eq('couple_id', coupleId)
    .neq('user_id', user.id)

  let partnerName: string | null = null
  if (members && members.length > 0) {
    const { data: partner } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', members[0].user_id)
      .single()
    partnerName = partner?.display_name ?? null
  }

  return {
    profile: profile as Profile,
    streak: streak as Streak | null,
    ritualesCompletados,
    categoriaFavorita,
    partnerName,
  }
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
