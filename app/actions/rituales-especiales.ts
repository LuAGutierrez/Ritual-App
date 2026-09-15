'use server'

import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'

export type RitualesEspecialesStatus = {
  desbloqueados: boolean
  tienePareja: boolean
}

export async function getRitualesEspecialesStatusAction(): Promise<RitualesEspecialesStatus | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from('couple_members')
    .select('couple_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership?.couple_id) {
    return { desbloqueados: false, tienePareja: false }
  }

  const { data: couple } = await supabase
    .from('couples')
    .select('rituales_especiales_desbloqueados')
    .eq('id', membership.couple_id)
    .maybeSingle()

  return { desbloqueados: !!couple?.rituales_especiales_desbloqueados, tienePareja: true }
}

export type UnlockRitualesEspecialesResult =
  | { ok: true }
  | { ok: false; error: 'not_authenticated' | 'no_couple' | 'insufficient_credits' | 'no_credits_row' | 'unknown'; balance?: number }

// unlock_rituales_especiales (migración 069) cobra los créditos y marca
// couples.rituales_especiales_desbloqueados = true en una sola transacción
// -- mismo motivo que consumeCreditsAction para pasar un idempotencyKey
// generado acá: un retry de red no debe cobrar dos veces.
export async function unlockRitualesEspecialesAction(): Promise<UnlockRitualesEspecialesResult> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('unlock_rituales_especiales', {
    p_idempotency_key: randomUUID(),
  })

  if (error) return { ok: false, error: 'unknown' }

  const result = data as { ok: boolean; error?: string; balance?: number }
  if (!result.ok) {
    const known = ['not_authenticated', 'no_couple', 'insufficient_credits', 'no_credits_row'] as const
    const err = known.find(k => k === result.error)
    return { ok: false, error: err ?? 'unknown', balance: result.balance }
  }

  return { ok: true }
}
