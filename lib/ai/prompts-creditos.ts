import { buildGameSystemPrompt } from './prompts'
import type { Intensidad } from '@/lib/intensidad'
import type { CreditFeature } from '@/lib/credits'

// Prompts de las features del sistema de créditos. Separado de
// lib/ai/prompts.ts (que arma el guardrail para los 6 juegos) pero
// reusa buildGameSystemPrompt -- mismo guardrail de tono/contenido,
// distinta instrucción de feature.
const ETIQUETA_ITEM: Record<CreditFeature, string> = {
  ritual_simple: 'paso',
  ritual_profundo: 'paso',
  dinamica_ia: 'pregunta',
}

const INSTRUCCION_POR_FEATURE: Record<CreditFeature, string> = {
  ritual_simple: 'Generá un ritual de pareja corto y simple para hacer ahora mismo, sin necesitar contexto previo.',
  ritual_profundo:
    'Generá un ritual de pareja personalizado -- usá el contexto para elegir un tono y un tema que se sientan hechos a medida, no genéricos.',
  dinamica_ia:
    'Generá un mini test de compatibilidad: 3 preguntas que cada uno responde por separado en voz alta y después comparan.',
}

export function buildCreditFeatureSystemPrompt(feature: CreditFeature, intensidad: Intensidad, tags: string): string {
  const etiqueta = ETIQUETA_ITEM[feature]
  const featurePrompt = `
${INSTRUCCION_POR_FEATURE[feature]}

Contexto de la pareja: ${tags}

Devolvé SOLO un JSON con este schema exacto, sin texto fuera del JSON:
{"titulo": "string, máx 6 palabras", "item1": "string, máx 20 palabras (${etiqueta} 1)", "item2": "string, máx 20 palabras (${etiqueta} 2)", "item3": "string, máx 20 palabras (${etiqueta} 3)", "pregunta_reflexion": "string, máx 25 palabras"}

No agregues campos. No agregues explicación. Solo el JSON.
`.trim()

  return buildGameSystemPrompt(intensidad, featurePrompt)
}
