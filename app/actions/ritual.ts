'use server'

import { createClient } from '@/lib/supabase/server'
import { notifyPartnerResponded } from '@/lib/push/notify'
import { isCouplePremiumAction } from '@/app/actions/subscription'
import { FREE_HISTORIAL_LIMIT } from '@/lib/plans'
import type { CoupleRitualSession, UserContext, Profile, Couple, Streak } from '@/types'

const ART_TZ = 'America/Argentina/Buenos_Aires'

// El "día" del ritual y de la racha corta a medianoche en Argentina, no en UTC —
// evita que el corte de día ocurra a las 21:00 ART (justo la franja "antes de dormir").
function todayInArgentina(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: ART_TZ })
}

function addDaysToDateStr(dateStr: string, delta: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().split('T')[0]
}

function getDayOfYear(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = Date.UTC(year, month - 1, day)
  const start = Date.UTC(year, 0, 0)
  return Math.floor((date - start) / (1000 * 60 * 60 * 24))
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
  const today = todayInArgentina()

  const { data: existing } = await supabase
    .from('couple_ritual_sessions')
    .select('*, ritual:rituals(*)')
    .eq('couple_id', coupleId)
    .eq('session_date', today)
    .single()

  if (existing) return existing as CoupleRitualSession

  const dayOfYear = getDayOfYear(today)

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

  const today = todayInArgentina()
  const yesterdayStr = addDaysToDateStr(today, -1)

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

const HISTORIAL_PAGE_SIZE = 15

export async function getHistorialAction(
  coupleId: string,
  categoria?: string,
  offset = 0,
  limit = HISTORIAL_PAGE_SIZE
): Promise<{ sessions: CoupleRitualSession[]; hasMore: boolean; isPremium: boolean; totalCompleted: number; totalCompletedAll: number }> {
  const supabase = await createClient()
  const isPremium = await isCouplePremiumAction(coupleId)
  const useCategory = categoria && categoria !== 'todos'

  const { count: totalAll } = await supabase
    .from('couple_ritual_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('couple_id', coupleId)
    .not('revealed_at', 'is', null)

  const totalCompletedAll = totalAll ?? 0

  let countQuery = supabase
    .from('couple_ritual_sessions')
    .select(useCategory ? '*, ritual:rituals!inner(category)' : 'id', { count: 'exact', head: true })
    .eq('couple_id', coupleId)
    .not('revealed_at', 'is', null)

  if (useCategory) {
    countQuery = countQuery.eq('ritual.category', categoria)
  }

  const { count } = await countQuery
  const totalCompleted = count ?? 0

  if (!isPremium && offset >= FREE_HISTORIAL_LIMIT) {
    return { sessions: [], hasMore: false, isPremium, totalCompleted, totalCompletedAll }
  }

  const cappedLimit = isPremium
    ? limit
    : Math.min(limit, FREE_HISTORIAL_LIMIT - offset)

  let query = supabase
    .from('couple_ritual_sessions')
    .select(useCategory ? '*, ritual:rituals!inner(*)' : '*, ritual:rituals(*)')
    .eq('couple_id', coupleId)
    .not('revealed_at', 'is', null)
    .order('session_date', { ascending: false })
    .range(offset, offset + cappedLimit)

  if (useCategory) {
    query = query.eq('ritual.category', categoria)
  }

  const { data } = await query
  const rows = (data ?? []) as CoupleRitualSession[]
  const hasMoreRows = rows.length > cappedLimit
  const sessions = hasMoreRows ? rows.slice(0, cappedLimit) : rows
  const hasMore = isPremium
    ? hasMoreRows
    : hasMoreRows && offset + sessions.length < FREE_HISTORIAL_LIMIT

  return { sessions, hasMore, isPremium, totalCompleted, totalCompletedAll }
}

export async function updateStreakAction(coupleId: string): Promise<Streak | null> {
  const supabase = await createClient()
  const today = todayInArgentina()

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

  const yesterdayStr = addDaysToDateStr(today, -1)

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
