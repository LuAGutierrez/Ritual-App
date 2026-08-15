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

export async function getUserContextAction(): Promise<UserContext | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('couple_members').select('couple_id').eq('user_id', user.id).single(),
  ])

  if (!membership) {
    return { userId: user.id, profile: profile as Profile | null, couple: null, partnerProfile: null }
  }

  const [{ data: couple }, { data: members }] = await Promise.all([
    supabase.from('couples').select('*').eq('id', membership.couple_id).single(),
    supabase.from('couple_members').select('user_id').eq('couple_id', membership.couple_id).neq('user_id', user.id),
  ])

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

// La escritura pasa por submit_ritual_response (SECURITY DEFINER, ver
// migracion 020): decide server-side si sos user1 o user2 de la sesion y
// solo toca esa columna. authenticated ya no tiene permiso de UPDATE
// directo sobre couple_ritual_sessions -- antes, una llamada REST directa
// (sin pasar por esta funcion) podia reescribir la respuesta del otro
// miembro de la pareja, porque la policy de RLS solo chequeaba
// pertenencia a la pareja, no a la fila especifica.
export async function submitResponseAction(
  sessionId: string,
  response: string
): Promise<CoupleRitualSession | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase.rpc('submit_ritual_response', {
    p_session_id: sessionId,
    p_response: response,
  })

  if (error || !data?.ok) return null

  const updated = data.session as CoupleRitualSession

  // Push al partner si solo uno completó (si ya se reveló, no hace falta)
  if (!updated.revealed_at) {
    const isUser1 = updated.user1_id === user.id
    const partnerId = isUser1 ? updated.user2_id : updated.user1_id
    if (partnerId) {
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()
      await notifyPartnerResponded(partnerId, myProfile?.display_name ?? null)
    }
  }

  return updated
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

// Version RPC: junta contexto + ritual del dia + racha en una sola
// consulta a Postgres (ver migracion 017_ritual_page_rpc.sql), mismo
// enfoque que getHistorialPageDataAction. La eleccion del ritual del dia
// y la creacion de la sesion si no existe pasan a resolverse adentro de
// la funcion SQL con ON CONFLICT DO NOTHING -- ademas de mas rapido,
// evita la condicion de carrera que tenia el codigo anterior si los dos
// miembros de la pareja abrian /ritual por primera vez el mismo dia casi
// al mismo tiempo (el insert perdedor podia devolver null en vez de la
// sesion ya creada por el otro).
export async function getRitualPageDataAction(): Promise<{
  context: UserContext
  session: CoupleRitualSession | null
  streak: Streak | null
} | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_ritual_page_data')

  if (error || !data) return null

  return data as {
    context: UserContext
    session: CoupleRitualSession | null
    streak: Streak | null
  }
}

const HISTORIAL_PAGE_SIZE = 15

export async function getHistorialAction(
  coupleId: string,
  categoria?: string,
  offset = 0,
  limit = HISTORIAL_PAGE_SIZE
): Promise<{ sessions: CoupleRitualSession[]; hasMore: boolean; isPremium: boolean; totalCompleted: number; totalCompletedAll: number }> {
  const supabase = await createClient()
  const useCategory = categoria && categoria !== 'todos'

  let countQuery = supabase
    .from('couple_ritual_sessions')
    .select(useCategory ? '*, ritual:rituals!inner(category)' : 'id', { count: 'exact', head: true })
    .eq('couple_id', coupleId)
    .not('revealed_at', 'is', null)

  if (useCategory) {
    countQuery = countQuery.eq('ritual.category', categoria)
  }

  const [isPremium, totalAllResult, countResult] = await Promise.all([
    isCouplePremiumAction(coupleId),
    supabase
      .from('couple_ritual_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('couple_id', coupleId)
      .not('revealed_at', 'is', null),
    countQuery,
  ])

  const totalCompletedAll = totalAllResult.count ?? 0
  const totalCompleted = countResult.count ?? 0

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

// Version RPC: junta contexto + primera pagina de historial en una sola
// consulta a Postgres (ver migracion 016_historial_page_rpc.sql), en vez
// de encadenar ~7-8 round trips server->Supabase (auth.getUser, profile,
// membership, couple, partner, isPremium x3, counts, datos). El JOIN pasa
// a resolverse adentro de la base, que es rapido; lo caro era la cantidad
// de idas y vueltas de red, no el trabajo de cada query en si.
//
// handleCategoria/handleLoadMore en la pagina siguen llamando a
// getHistorialAction directo porque ahi ya se conoce el coupleId.
type HistorialPageData = {
  context: UserContext
  sessions: CoupleRitualSession[]
  hasMore: boolean
  isPremium: boolean
  totalCompleted: number
  totalCompletedAll: number
} | { context: UserContext } | null

export async function getHistorialPageDataAction(categoria = 'todos'): Promise<HistorialPageData> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_historial_page_data', {
    p_categoria: categoria,
    p_offset: 0,
    p_limit: HISTORIAL_PAGE_SIZE,
  })

  if (error || !data) return null

  const result = data as {
    context: UserContext | null
    sessions?: CoupleRitualSession[]
    hasMore?: boolean
    isPremium?: boolean
    totalCompleted?: number
    totalCompletedAll?: number
  }

  if (!result.context) return null
  if (result.sessions === undefined) return { context: result.context }

  return {
    context: result.context,
    sessions: result.sessions,
    hasMore: result.hasMore ?? false,
    isPremium: result.isPremium ?? false,
    totalCompleted: result.totalCompleted ?? 0,
    totalCompletedAll: result.totalCompletedAll ?? 0,
  }
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
