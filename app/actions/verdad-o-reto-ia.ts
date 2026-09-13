'use server'

import { createClient } from '@/lib/supabase/server'
import { completeWithGroq, isGroqConfigured } from '@/lib/ai/groq'
import { buildGameSystemPrompt } from '@/lib/ai/prompts'
import type { Intensidad } from '@/lib/intensidad'
import type { VerdadORetoItem } from '@/types'

type Modo = 'verdad' | 'reto'

// Cuántas consignas previas se le pasan al modelo como "no repitas esto".
// Ver migración 054 -- couple_ia_contenido guarda el historial completo,
// esto solo decide cuánto de esa cola entra en el prompt.
const HISTORIAL_MAX = 15

async function getCoupleId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from('couple_members')
    .select('couple_id')
    .eq('user_id', user.id)
    .single()

  return membership?.couple_id ?? null
}

function promptDeFeature(modo: Modo, yaGenerados: string[]): string {
  const consigna =
    modo === 'verdad'
      ? 'una PREGUNTA personal para que la otra persona responda con sinceridad'
      : 'un RETO: una acción o desafío concreto para hacer ahora mismo con la pareja'

  const partes = [
    `Generá UNA sola consigna nueva para el juego "Verdad o Reto" de esta app: ${consigna}.`,
    'Una sola oración, directa. Devolvé SOLO el texto de la consigna -- sin comillas, sin numeración, sin explicación de tu parte.',
  ]

  if (yaGenerados.length > 0) {
    partes.push(
      `No repitas ninguna de estas consignas ya usadas para esta pareja, ni generes algo muy parecido en tema o estructura:\n${yaGenerados
        .map(t => `- ${t}`)
        .join('\n')}`
    )
  }

  return partes.join('\n\n')
}

export type GenerarVerdadORetoIAResult =
  | { ok: true; item: VerdadORetoItem }
  | { ok: false; error: string }

// Genera una consigna nueva con IA en vez de sacarla del pool fijo
// (verdad_o_reto_items). Solo para la tab picante -- ver comentario en
// app/juegos/verdad-o-reto/page.tsx sobre por qué no se mezcla con la
// tab normal en esta primera versión.
export async function generarVerdadORetoConIAAction(
  modo: Modo,
  intensidad: Intensidad
): Promise<GenerarVerdadORetoIAResult> {
  if (!isGroqConfigured()) {
    return { ok: false, error: 'No se pudo generar la consigna. Probá de nuevo.' }
  }

  const coupleId = await getCoupleId()
  if (!coupleId) {
    return { ok: false, error: 'No se encontró la pareja.' }
  }

  const supabase = await createClient()

  const { data: historial } = await supabase
    .from('couple_ia_contenido')
    .select('texto')
    .eq('couple_id', coupleId)
    .eq('juego', 'verdad_o_reto')
    .eq('modo', modo)
    .order('created_at', { ascending: false })
    .limit(HISTORIAL_MAX)

  const yaGenerados = (historial ?? []).map(row => row.texto as string)

  const systemPrompt = buildGameSystemPrompt(intensidad, promptDeFeature(modo, yaGenerados))

  let texto: string
  try {
    texto = (await completeWithGroq('Generá la consigna.', { systemPrompt, maxTokens: 150 })).trim()
  } catch {
    return { ok: false, error: 'No se pudo generar la consigna. Probá de nuevo.' }
  }

  if (!texto) {
    return { ok: false, error: 'No se pudo generar la consigna. Probá de nuevo.' }
  }

  const { data: inserted, error } = await supabase
    .from('couple_ia_contenido')
    .insert({ couple_id: coupleId, juego: 'verdad_o_reto', modo, intensidad, texto })
    .select('id')
    .single()

  if (error || !inserted) {
    return { ok: false, error: 'No se pudo guardar la consigna generada.' }
  }

  return {
    ok: true,
    item: {
      id: inserted.id as string,
      modo,
      texto,
      picante: true,
      par_picante_id: null,
      intensidad,
      categoria: 'ia',
    },
  }
}
