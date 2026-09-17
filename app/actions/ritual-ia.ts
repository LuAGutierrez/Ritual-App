'use server'

import { createClient } from '@/lib/supabase/server'
import { consumeCreditsAction, refundCreditsAction } from './credits'
import { getAIProvider, AI_MODEL_BY_TIER } from '@/lib/ai/provider'
import { buildContextTags, type ContextInput } from '@/lib/ai/context'
import { buildCreditFeatureSystemPrompt } from '@/lib/ai/prompts-creditos'
import { CREDIT_COST, type GenericCreditFeature } from '@/lib/credits'
import { notifyPartnerCreditsSpent } from '@/lib/push/notify'
import { parseContenido, type IAGeneratedContent } from '@/lib/ai/parse-generated-content'
import type { Intensidad } from '@/lib/intensidad'

export type GenerarConIAResult =
  | { ok: true; content: IAGeneratedContent; balance: number; fromCache: boolean }
  | { ok: false; error: 'insufficient_credits' | 'generation_failed' | 'not_authenticated'; balance?: number }

// Cuántas variantes puede tener cacheada una misma combinación de
// (feature, tags de contexto). Se elige una al azar en cada pedido --
// migración 074: cachear por contexto exacto sin esto hacía que pedir
// la misma combinación (mismo ánimo/tiempo/objetivo/racha) devolviera
// SIEMPRE el mismo contenido, ni con la IA se estaba llamando la
// segunda vez. Con 5 variantes, una combinación necesita 5 pedidos
// para "agotar" la variedad y recién ahí empezar a repetir.
const CACHE_VARIANTS = 5

// Genera contenido con IA para una de las 3 features del sistema de
// créditos. Cobra ANTES de llamar al modelo (nunca al revés -- ver la
// nota de concurrencia en la migración 057): si el modelo falla o
// devuelve algo que no matchea el schema esperado, se refunda acá
// mismo en vez de dejar a alguien pagado sin contenido.
//
// Caché por (feature, tags de contexto, variant): si otra pareja ya
// generó exactamente la misma variante, se sirve esa respuesta sin
// llamar al modelo de nuevo -- ahorro real de tokens, no solo de
// latencia. No se trackea "ya generado para ESTA pareja" para evitar
// repetición entre pedidos (como sí hace couple_ia_contenido para
// Verdad o Reto, migración 054) -- con 5 variantes por combinación el
// riesgo de que la MISMA pareja repita la misma variante dos veces
// seguidas ya es bajo, y no se justificaba una tabla nueva para eso.
export async function generarConIAAction(
  feature: GenericCreditFeature,
  context: Omit<ContextInput, 'rachaActual'>
): Promise<GenerarConIAResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not_authenticated' }

  const { data: membership } = await supabase
    .from('couple_members')
    .select('couple_id')
    .eq('user_id', user.id)
    .maybeSingle()
  const coupleId = membership?.couple_id ?? null

  let rachaActual = 0
  if (coupleId) {
    const { data: streak } = await supabase
      .from('streaks')
      .select('current_streak')
      .eq('couple_id', coupleId)
      .maybeSingle()
    rachaActual = streak?.current_streak ?? 0
  }

  // Antes leía couples.intensidad_maxima (configurado en /perfil) --
  // ese mecanismo se sacó (17/09/2026, ver docs/DECISIONES.md): casi
  // ninguna pareja real lo tocaba, así que en la práctica siempre daba
  // 'intensa'. El chip "Objetivo" (Risas/Conexión/Deseo/Sorpresa) ya
  // cubre buena parte de ese mismo eje para esta feature puntual.
  const intensidad: Intensidad = 'intensa'
  const tags = buildContextTags({ ...context, rachaActual })
  const variant = Math.floor(Math.random() * CACHE_VARIANTS)

  const { data: cached } = await supabase
    .from('ai_content_cache')
    .select('id, output, hits')
    .eq('feature', feature)
    .eq('context_key', tags)
    .eq('variant', variant)
    .maybeSingle()

  const cobrado = await consumeCreditsAction(feature)
  if (!cobrado.ok) {
    return {
      ok: false,
      error: cobrado.error === 'insufficient_credits' ? 'insufficient_credits' : 'generation_failed',
      balance: cobrado.balance,
    }
  }

  if (coupleId) {
    const { data: partner } = await supabase
      .from('couple_members')
      .select('user_id')
      .eq('couple_id', coupleId)
      .neq('user_id', user.id)
      .maybeSingle()
    if (partner) {
      await notifyPartnerCreditsSpent(partner.user_id, CREDIT_COST[feature], cobrado.balance)
    }
  }

  if (cached) {
    await supabase.from('ai_content_cache').update({ hits: cached.hits + 1 }).eq('id', cached.id)
    return { ok: true, content: cached.output as IAGeneratedContent, balance: cobrado.balance, fromCache: true }
  }

  const provider = getAIProvider()
  if (!provider.isConfigured()) {
    await refundCreditsAction(cobrado.idempotencyKey)
    return { ok: false, error: 'generation_failed', balance: undefined }
  }

  const systemPrompt = buildCreditFeatureSystemPrompt(feature, intensidad, tags)

  let raw: string
  try {
    raw = await provider.complete({
      systemPrompt,
      userPrompt: 'Generá el contenido.',
      model: AI_MODEL_BY_TIER[feature],
      // 450, no menos: probado contra la API real con maxTokens 260 y
      // 300 -- Groq devuelve json_validate_failed ("max completion
      // tokens reached before generating a valid document") porque el
      // razonamiento (hasta ~48 reasoning_tokens observados, aun con
      // reasoning_effort 'low') se come el budget antes de terminar el
      // JSON. Con 450, el total observado (razonamiento + JSON) nunca
      // superó ~185 en una docena de corridas -- deja margen real, no
      // un número lindo sin probar.
      maxTokens: 450,
      reasoningEffort: 'low',
      jsonMode: true,
    })
  } catch (err) {
    console.error(`[ritual-ia] Error llamando a ${provider.name} para ${feature}:`, err)
    await refundCreditsAction(cobrado.idempotencyKey)
    return { ok: false, error: 'generation_failed' }
  }

  const content = parseContenido(raw)
  if (!content) {
    console.error(`[ritual-ia] Respuesta de ${provider.name} no matchea el schema esperado para ${feature}:`, raw)
    await refundCreditsAction(cobrado.idempotencyKey)
    return { ok: false, error: 'generation_failed' }
  }

  // Otra pareja pudo haber insertado la misma clave entre el SELECT de
  // arriba y este INSERT -- 23505 (unique_violation) no es un error acá,
  // ya existe el contenido cacheado, no hace falta reintentar nada.
  const { error: cacheError } = await supabase
    .from('ai_content_cache')
    .insert({ feature, context_key: tags, variant, model: AI_MODEL_BY_TIER[feature], output: content })
  if (cacheError && cacheError.code !== '23505') {
    console.error('[ritual-ia] No se pudo cachear el contenido:', cacheError)
  }

  return { ok: true, content, balance: cobrado.balance, fromCache: false }
}
