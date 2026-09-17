'use server'

import { createClient } from '@/lib/supabase/server'
import { consumeCreditsAction, refundCreditsAction } from './credits'
import { getAIProvider, AI_MODEL_BY_TIER } from '@/lib/ai/provider'
import { buildConocesInsightSystemPrompt } from '@/lib/ai/prompts-creditos'
import { parseConocesInsight } from '@/lib/ai/parse-generated-content'
import { CREDIT_COST } from '@/lib/credits'
import { notifyPartnerCreditsSpent } from '@/lib/push/notify'

export type GenerarConocesInsightResult =
  | { ok: true; insight: string; balance?: number; fromCache: boolean }
  | {
      ok: false
      error: 'insufficient_credits' | 'generation_failed' | 'not_authenticated' | 'round_not_found' | 'not_revealed'
      balance?: number
    }

// Insight con IA post-reveal de "¿Cuánto me conoces?" -- ver
// docs/ROADMAP.md. Mismo orden cobro-antes-de-generar y refund-on-failure
// que generarConIAAction (app/actions/ritual-ia.ts), pero atado a una
// ronda puntual en vez de a "tags de contexto": se genera una sola vez
// por ronda (couple_conoces_insights.round_id es UNIQUE) para que
// cualquiera de los dos lo vea sin pagar de nuevo.
export async function generarConocesInsightAction(roundId: string): Promise<GenerarConocesInsightResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not_authenticated' }

  const { data: round } = await supabase
    .from('couple_conoces_rounds')
    .select('id, couple_id, pregunta, opciones, subject_choice, guesser_choice, revealed_at')
    .eq('id', roundId)
    .maybeSingle()

  // RLS ya limita el SELECT a miembros de la pareja -- si no aparece,
  // no existe o no es de esta pareja, mismo error para ambos casos.
  if (!round) return { ok: false, error: 'round_not_found' }
  if (!round.revealed_at || round.subject_choice == null || round.guesser_choice == null) {
    return { ok: false, error: 'not_revealed' }
  }

  const { data: existente } = await supabase
    .from('couple_conoces_insights')
    .select('texto')
    .eq('round_id', roundId)
    .maybeSingle()

  if (existente) {
    return { ok: true, insight: existente.texto as string, fromCache: true }
  }

  const cobrado = await consumeCreditsAction('conoces_insight')
  if (!cobrado.ok) {
    return {
      ok: false,
      error: cobrado.error === 'insufficient_credits' ? 'insufficient_credits' : 'generation_failed',
      balance: cobrado.balance,
    }
  }

  const { data: partner } = await supabase
    .from('couple_members')
    .select('user_id')
    .eq('couple_id', round.couple_id)
    .neq('user_id', user.id)
    .maybeSingle()
  if (partner) {
    await notifyPartnerCreditsSpent(partner.user_id, CREDIT_COST.conoces_insight, cobrado.balance)
  }

  const opciones = round.opciones as string[]
  const systemPrompt = buildConocesInsightSystemPrompt(
    round.pregunta as string,
    opciones[round.subject_choice as number],
    opciones[round.guesser_choice as number],
    round.subject_choice === round.guesser_choice
  )

  const provider = getAIProvider()
  if (!provider.isConfigured()) {
    await refundCreditsAction(cobrado.idempotencyKey)
    return { ok: false, error: 'generation_failed' }
  }

  let raw: string
  try {
    raw = await provider.complete({
      systemPrompt,
      userPrompt: 'Generá el insight.',
      model: AI_MODEL_BY_TIER.conoces_insight,
      // Mismo mínimo que ritual-ia.ts (450): con menos, Groq tira
      // json_validate_failed porque el razonamiento se come el budget
      // antes de terminar el JSON, aun con un schema de un solo campo.
      maxTokens: 450,
      reasoningEffort: 'low',
      jsonMode: true,
    })
  } catch (err) {
    console.error('[conoces-insight] Error llamando al proveedor de IA:', err)
    await refundCreditsAction(cobrado.idempotencyKey)
    return { ok: false, error: 'generation_failed' }
  }

  const insight = parseConocesInsight(raw)
  if (!insight) {
    console.error('[conoces-insight] Respuesta de IA no matchea el schema esperado:', raw)
    await refundCreditsAction(cobrado.idempotencyKey)
    return { ok: false, error: 'generation_failed' }
  }

  const { error: insertError } = await supabase
    .from('couple_conoces_insights')
    .insert({ round_id: roundId, couple_id: round.couple_id, texto: insight })

  if (insertError) {
    // 23505: el partner generó el suyo en la misma ventana -- ya existe
    // contenido para esta ronda, no hace falta cobrar dos veces.
    if (insertError.code === '23505') {
      await refundCreditsAction(cobrado.idempotencyKey)
      const { data: yaExistente } = await supabase
        .from('couple_conoces_insights')
        .select('texto')
        .eq('round_id', roundId)
        .maybeSingle()
      if (yaExistente) return { ok: true, insight: yaExistente.texto as string, fromCache: true }
    }
    console.error('[conoces-insight] No se pudo guardar el insight:', insertError)
  }

  return { ok: true, insight, balance: cobrado.balance, fromCache: false }
}
