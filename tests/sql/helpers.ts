import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { localSupabaseEnv } from '../local-env'

const env = localSupabaseEnv()
export const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
export const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
export const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

export async function requireLocalSupabase() {
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: { apikey: anonKey },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  } catch {
    throw new Error(
      `Supabase local no está corriendo en ${supabaseUrl}. Ejecutá: npx supabase start`
    )
  }
}

export function adminClient() {
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export function anonClient() {
  return createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function signedInClient(email: string, password: string) {
  const client = anonClient()
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`No se pudo iniciar sesión como ${email}: ${error.message}`)
  return client
}

let userSeq = 0

export async function createQaUser(label: string) {
  userSeq += 1
  const email = `qa-${label}-${Date.now()}-${userSeq}@rituales.test`
  const password = 'rituales-qa-test'
  const client = anonClient()
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { display_name: label } },
  })
  if (error || !data.user) {
    throw new Error(`No se pudo crear usuario ${label}: ${error?.message}`)
  }
  return { id: data.user.id, email, password }
}

export async function createCoupleWithMembers(
  userAId: string,
  userBId?: string
): Promise<{ coupleId: string; inviteCode: string }> {
  const admin = adminClient()
  const { data: couple, error } = await admin
    .from('couples')
    .insert({ name: null })
    .select('id, invite_code')
    .single()
  if (error || !couple) {
    throw new Error(`No se pudo crear pareja: ${error?.message}`)
  }

  const members = [{ user_id: userAId, couple_id: couple.id }]
  if (userBId) members.push({ user_id: userBId, couple_id: couple.id })

  const { error: memberErr } = await admin.from('couple_members').insert(members)
  if (memberErr) {
    throw new Error(`No se pudo vincular miembros: ${memberErr.message}`)
  }

  return { coupleId: couple.id as string, inviteCode: couple.invite_code as string }
}

export async function createRitualSession(
  coupleId: string,
  user1Id: string,
  user2Id: string
) {
  const admin = adminClient()
  const { data: ritual, error: ritualErr } = await admin
    .from('rituals')
    .select('id')
    .eq('premium', false)
    .limit(1)
    .single()
  if (ritualErr || !ritual) {
    throw new Error(`No hay rituales en la DB local: ${ritualErr?.message}`)
  }

  const { data: session, error } = await admin
    .from('couple_ritual_sessions')
    .insert({
      couple_id: coupleId,
      ritual_id: ritual.id,
      session_date: new Date().toISOString().slice(0, 10),
      user1_id: user1Id,
      user2_id: user2Id,
    })
    .select('id')
    .single()
  if (error || !session) {
    throw new Error(`No se pudo crear sesión: ${error?.message}`)
  }
  return session.id as string
}

export async function deleteUsers(ids: string[]) {
  if (ids.length === 0) return
  const admin = adminClient()
  const { data: memberships } = await admin
    .from('couple_members')
    .select('couple_id')
    .in('user_id', ids)
  const coupleIds = Array.from(
    new Set((memberships ?? []).map((m: { couple_id: string }) => m.couple_id))
  )
  if (coupleIds.length > 0) {
    await admin.from('couples').delete().in('id', coupleIds)
  }
  await admin.from('invite_attempts').delete().in('user_id', ids)
}

export type RpcResult = { ok?: boolean; error?: string; session?: Record<string, unknown> }

export async function rpcJson(
  client: SupabaseClient,
  fn: string,
  args: Record<string, unknown>
): Promise<RpcResult> {
  const { data, error } = await client.rpc(fn, args)
  if (error) return { ok: false, error: error.message }
  return (data ?? {}) as RpcResult
}
