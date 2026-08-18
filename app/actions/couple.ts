'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function crearPareja() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // couple_members_user_id_unique (migración 050) es la garantía real,
  // pero sin este chequeo previo terminábamos creando una fila en
  // couples huérfana (sin miembros) cada vez que alguien con pareja
  // intentaba crear otra -- el INSERT en couple_members de más abajo
  // fallaría igual, pero ya era tarde para el couples que se acababa
  // de insertar.
  const { data: existente } = await supabase
    .from('couple_members')
    .select('couple_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existente) {
    return { error: 'Ya tenés una pareja vinculada.' }
  }

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
    return { error: memberErr.code === '23505' ? 'Ya tenés una pareja vinculada.' : memberErr.message }
  }

  revalidatePath('/onboarding')
  revalidatePath('/ritual')
  return { inviteCode: couple.invite_code as string }
}

// Borra solo la membresía del que llama (leave_couple, migración 050,
// SECURITY DEFINER porque couple_members no tiene policy de DELETE
// para el cliente). La pareja y su historial compartido quedan
// intactos para el otro lado -- ver DECISIONES.md.
export async function salirDeParejaAction(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('leave_couple')
  if (error) return { ok: false, error: error.message }

  const result = data as { ok: boolean; error?: string }
  if (!result.ok) return { ok: false, error: result.error ?? 'No se pudo salir de la pareja.' }

  revalidatePath('/perfil')
  revalidatePath('/ritual')
  return { ok: true }
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