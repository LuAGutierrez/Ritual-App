'use server'

import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { CREDIT_COST, type CreditFeature } from '@/lib/credits'

export type CreditsBalance = {
  mode: 'solo' | 'pareja'
  balance: number
  streakBonus: number
  streakBonusExpiresAt: string | null
  total: number
}

// Resuelve solo/pareja por auth.uid() (igual que consume_credits en
// SQL) -- el caller nunca necesita saber en qué modo está el usuario.
export async function getMyCreditsAction(): Promise<CreditsBalance | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from('couple_members')
    .select('couple_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (membership?.couple_id) {
    const { data } = await supabase
      .from('couple_credits')
      .select('balance, streak_bonus, streak_bonus_expires_at')
      .eq('couple_id', membership.couple_id)
      .maybeSingle()

    if (!data) return null

    const expired = !data.streak_bonus_expires_at || new Date(data.streak_bonus_expires_at) < new Date()
    const streakBonus = expired ? 0 : data.streak_bonus

    return {
      mode: 'pareja',
      balance: data.balance,
      streakBonus,
      streakBonusExpiresAt: expired ? null : data.streak_bonus_expires_at,
      total: data.balance + streakBonus,
    }
  }

  const { data } = await supabase
    .from('user_credits')
    .select('balance')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!data) return null

  return {
    mode: 'solo',
    balance: data.balance,
    streakBonus: 0,
    streakBonusExpiresAt: null,
    total: data.balance,
  }
}

export type ConsumeCreditsResult =
  | { ok: true; balance: number; idempotencyKey: string }
  | { ok: false; error: 'insufficient_credits' | 'not_authenticated' | 'unknown'; balance?: number }

// idempotencyKey se devuelve en el resultado para que el caller la
// guarde: si la generación con IA falla después de cobrar, se usa para
// refundCreditsAction sin arriesgar un doble cobro si hay reintento.
export async function consumeCreditsAction(feature: CreditFeature): Promise<ConsumeCreditsResult> {
  const supabase = await createClient()
  const idempotencyKey = randomUUID()

  const { data, error } = await supabase.rpc('consume_credits', {
    p_feature: feature,
    p_amount: CREDIT_COST[feature],
    p_idempotency_key: idempotencyKey,
  })

  if (error) return { ok: false, error: 'unknown' }

  const result = data as { ok: boolean; error?: string; balance?: number }
  if (!result.ok) {
    if (result.error === 'insufficient_credits') {
      return { ok: false, error: 'insufficient_credits', balance: result.balance }
    }
    return { ok: false, error: 'unknown' }
  }

  return { ok: true, balance: result.balance!, idempotencyKey }
}

export async function refundCreditsAction(idempotencyKey: string): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('refund_credits', { p_idempotency_key: idempotencyKey })
  if (error) return { ok: false }
  return { ok: !!(data as { ok: boolean }).ok }
}

export type CreditPackage = { id: string; credits: number; priceArs: number }

// Para /precios: tarifario desde credit_packages (migración 055).
export async function getCreditPackagesAction(): Promise<CreditPackage[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('credit_packages')
    .select('id, credits, price_ars')
    .eq('active', true)
    .order('sort_order')

  return (data ?? []).map(p => ({ id: p.id, credits: p.credits, priceArs: p.price_ars }))
}

export type CreateCheckoutResult =
  | { ok: true; initPoint: string }
  | { ok: false; error: string }

// Pago único de un paquete de créditos (Checkout Pro de Mercado Pago,
// migración 063 + create-credit-checkout). Reemplaza al checkout de
// suscripción recurrente que usaba /precios antes.
export async function createCreditCheckoutAction(packageId: string): Promise<CreateCheckoutResult> {
  const supabase = await createClient()
  const { data, error } = await supabase.functions.invoke('create-credit-checkout', {
    body: { package_id: packageId },
  })

  if (error) return { ok: false, error: 'unknown' }

  const result = data as { init_point?: string; error?: string }
  if (!result.init_point) return { ok: false, error: result.error ?? 'unknown' }

  return { ok: true, initPoint: result.init_point }
}
