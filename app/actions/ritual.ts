'use server'

import { createClient } from '@/lib/supabase/server'
import { notifyPartnerResponded } from '@/lib/push/notify'
import type { CoupleRitualSession, UserContext, Profile, Couple, Streak } from '@/types'

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export async function getUserContextAction(): Promise<UserContext | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: membership } = await supabase
    .from('couple_members')
    .select('couple_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return { userId: user.id, profile: profile as Profile | null, couple: null, partnerProfile: null }
  }

  const { data: couple } = await supabase
    .from('couples')
    .select('*')
    .eq('id', membership.couple_id)
    .single()

  const { data: members } = await supabase
    .from('couple_members')
    .select('user_id')
    .eq('couple_id', membership.couple_id)
    .neq('user_id', user.id)

  let partnerProfile: Profile | null = null
  if (members && members.length > 0) {
    const { data: partner } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', members[0].user_id)
      .single()
    partnerProfile = partner as Profile | null
  }

  return {
    userId: user.id,
    profile: profile as Profile | null,
    couple: couple as Couple | null,
    partnerProfile,
  }
}

export async function getRitualOfDayAction(coupleId: string): Promise<CoupleRitualSession | null> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: existing } = await supabase
    .from('couple_ritual_sessions')
    .select('*, ritual:rituals(*)')
    .eq('couple_id', coupleId)
    .eq('session_date', today)
    .single()

  if (existing) return existing as CoupleRitualSession

  const dayOfYear = getDayOfYear(new Date())

  const { data: rituals } = await supabase
    .from('rituals')
    .select('id')
    .eq('premium', false)
    .order('created_at', { ascending: true })

  if (!rituals || rituals.length === 0) return null

  const ritualId = rituals[dayOfYear % rituals.length].id

  const { data: members } = await supabase
    .from('couple_members')
    .select('user_id')
    .eq('couple_id', coupleId)

  const [user1, user2] = (members || []).map(m => m.user_id)

  const { data: session } = await supabase
    .from('couple_ritual_sessions')
    .insert({
      couple_id: coupleId,
      ritual_id: ritualId,
      session_date: today,
      user1_id: user1 || null,
      user2_id: user2 || null,
    })
    .select('*, ritual:rituals(*)')
    .single()

  return session as CoupleRitualSession | null
}

export async function submitResponseAction(
  sessionId: string,
  response: string
): Promise<CoupleRitualSession | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: session } = await supabase
    .from('couple_ritual_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (!session) return null

  const isUser1 = session.user1_id === user.id
  const now = new Date().toISOString()

  const updatePayload = isUser1
    ? { user1_response: response, user1_completed_at: now }
    : { user2_response: response, user2_completed_at: now }

  const { data: updated } = await supabase
    .from('couple_ritual_sessions')
    .update(updatePayload)
    .eq('id', sessionId)
    .select('*, ritual:rituals(*)')
    .single()

  if (!updated) return null

  if (updated.user1_completed_at && updated.user2_completed_at && !updated.revealed_at) {
    const { data: revealed } = await supabase
      .from('couple_ritual_sessions')
      .update({ revealed_at: now })
      .eq('id', sessionId)
      .select('*, ritual:rituals(*)')
      .single()
    return revealed as CoupleRitualSession
  }

  // Push al partner si solo uno completó
  const partnerId = isUser1 ? session.user2_id : session.user1_id
  if (partnerId) {
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()
    await notifyPartnerResponded(partnerId, myProfile?.display_name ?? null)
  }

  return updated as CoupleRitualSession
}

export async function usarComodinAction(coupleId: string): Promise<{ ok: boolean; streak?: Streak; error?: string }> {
  const supabase = await createClient()

  const { data: streak } = await supabase
    .from('streaks')
    .select('*')
    .eq('couple_id', coupleId)
    .single()

  if (!streak) return { ok: false, error: 'No hay racha registrada.' }
  if ((streak.wildcards_remaining ?? 0) <= 0) return { ok: false, error: 'No te quedan comodines.' }

  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  // Solo aplica si la racha se rompería hoy (último día registrado fue anteayer o antes)
  if (streak.last_completed_date === today || streak.last_completed_date === yesterdayStr) {
    return { ok: false, error: 'Tu racha sigue activa, no necesitás el comodín.' }
  }

  const { data: updated } = await supabase
    .from('streaks')
    .update({
      wildcards_remaining: streak.wildcards_remaining - 1,
      last_completed_date: yesterdayStr, // simula que completaron ayer
    })
    .eq('couple_id', coupleId)
    .select()
    .single()

  if (!updated) return { ok: false, error: 'No se pudo usar el comodín.' }
  return { ok: true, streak: updated as Streak }
}

export async function getStreakAction(coupleId: string): Promise<Streak | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('streaks')
    .select('*')
    .eq('couple_id', coupleId)
    .single()
  return data as Streak | null
}

export async function getHistorialAction(
  coupleId: string,
  categoria?: string
): Promise<CoupleRitualSession[]> {
  const supabase = await createClient()

  let query = supabase
    .from('couple_ritual_sessions')
    .select('*, ritual:rituals(*)')
    .eq('couple_id', coupleId)
    .not('revealed_at', 'is', null)
    .order('session_date', { ascending: false })
    .limit(30)

  if (categoria && categoria !== 'todos') {
    query = query.eq('ritual.category', categoria)
  }

  const { data } = await query
  // Filtrar en JS si la categoria filter no funcionó por el join
  const sessions = (data ?? []) as CoupleRitualSession[]
  if (categoria && categoria !== 'todos') {
    return sessions.filter(s => s.ritual?.category === categoria)
  }
  return sessions
}

export async function updateStreakAction(coupleId: string): Promise<Streak | null> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: streak } = await supabase
    .from('streaks')
    .select('*')
    .eq('couple_id', coupleId)
    .single()

  if (!streak) {
    const { data: newStreak } = await supabase
      .from('streaks')
      .insert({ couple_id: coupleId, current_streak: 1, longest_streak: 1, last_completed_date: today })
      .select()
      .single()
    return newStreak as Streak
  }

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  if (streak.last_completed_date === today) return streak as Streak

  const newCurrent = streak.last_completed_date === yesterdayStr ? streak.current_streak + 1 : 1
  const newLongest = Math.max(streak.longest_streak, newCurrent)

  const { data: updated } = await supabase
    .from('streaks')
    .update({ current_streak: newCurrent, longest_streak: newLongest, last_completed_date: today })
    .eq('couple_id', coupleId)
    .select()
    .single()

  return updated as Streak
}
