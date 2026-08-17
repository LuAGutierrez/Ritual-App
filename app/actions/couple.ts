'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function crearPareja() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: couple, error: coupleErr } = await supabase
    .from('couples')
    .insert({ name: null })
    .select()
    .single()

  if (coupleErr || !couple) {
    return { error: coupleErr?.message ?? 'No se pudo crear la pareja' }
  }

  const { error: memberErr } = await supabase
    .from('couple_members')
    .insert({ user_id: user.id, couple_id: couple.id })

  if (memberErr) {
    return { error: memberErr.message }
  }

  revalidatePath('/onboarding')
  revalidatePath('/ritual')
  return { inviteCode: couple.invite_code as string }
}

export async function verificarInvitacionAction(code: string): Promise<{
  ok: boolean
  alreadyMember?: boolean
  full?: boolean
  error?: string
  needsAuth?: boolean
}> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, needsAuth: true }

  const { data, error } = await supabase.rpc('check_invite_code', {
    p_code: code.toUpperCase(),
  })

  if (error) return { ok: false, error: error.message }

  const result = data as { ok: boolean; already_member?: boolean; full?: boolean; error?: string }
  if (!result.ok) return { ok: false, error: result.error ?? 'Link inválido' }

  return {
    ok: true,
    alreadyMember: result.already_member ?? false,
    full: result.full ?? false,
  }
}

export async function unirseAPareja(code: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data, error } = await supabase.rpc('join_couple_by_invite', {
    p_code: code.toUpperCase(),
  })

  if (error) return { error: error.message }

  const result = data as { ok: boolean; error?: string }
  if (!result.ok) return { error: result.error ?? 'No se pudo unir a la pareja' }

  revalidatePath('/ritual')
  return { ok: true }
}