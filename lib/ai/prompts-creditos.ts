import { buildGameSystemPrompt, buildNeutralSystemPrompt } from './prompts'
import type { Intensidad } from '@/lib/intensidad'
import type { GenericCreditFeature } from '@/lib/credits'

// Prompts de las features del sistema de créditos. Separado de
// lib/ai/prompts.ts (que arma el guardrail para los 6 juegos) pero
// reusa buildGameSystemPrompt -- mismo guardrail de tono/contenido,
// distinta instrucción de feature.
const ETIQUETA_ITEM: Record<GenericCreditFeature, string> = {
  ritual_simple: 'paso',
  ritual_profundo: 'paso',
  dinamica_ia: 'pregunta',
}

const INSTRUCCION_POR_FEATURE: Record<GenericCreditFeature, string> = {
  ritual_simple: 'Generá un ritual de pareja corto y simple para hacer ahora mismo, sin necesitar contexto previo.',
  ritual_profundo:
    'Generá un ritual de pareja personalizado -- usá el contexto para elegir un tono y un tema que se sientan hechos a medida, no genéricos.',
  dinamica_ia:
    'Generá un mini test de compatibilidad: 3 preguntas que cada uno responde por separado en voz alta y después comparan.',
}

export function buildCreditFeatureSystemPrompt(feature: GenericCreditFeature, intensidad: Intensidad, tags: string): string {
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

// Insight post-reveal de "¿Cuánto me conoces?" (conoces_insight). No encaja
// en el schema titulo/item1/item2/item3 de arriba -- es un solo párrafo
// comentando un acierto/desacuerdo puntual, no contenido nuevo para jugar.
// Sin nombres reales (mismo criterio de privacidad que ritual-ia.ts): se
// etiqueta a la pareja como "Persona A" / "Persona B".
//
// A propósito NO usa buildGameSystemPrompt/intensidad -- conoces_items
// siempre tiene picante=false (ver app/actions/conoces.ts), así que este
// insight no debe sonar romántico/sensorial ni aunque la pareja tenga
// couples.intensidad_maxima en 'intensa' (eso describe qué tan picante
// puede ser un JUEGO, no el tono de un comentario analítico). Usa
// buildNeutralSystemPrompt, que mantiene el guardrail de seguridad de
// contenido pero sin la guía de tono por intensidad.
export function buildConocesInsightSystemPrompt(
  pregunta: string,
  respuestaSujeto: string,
  respuestaAdivinador: string,
  acerto: boolean
): string {
  const featurePrompt = `
Estás comentando el resultado de una ronda ya jugada del juego "¿Cuánto me conoces?": Persona A
respondió sobre sí misma, Persona B intentó adivinar qué iba a responder.

Pregunta: "${pregunta}"
Persona A respondió: "${respuestaSujeto}"
Persona B adivinó: "${respuestaAdivinador}"
Resultado: ${acerto ? 'Persona B acertó' : 'Persona B no acertó'}

Tono: cálido y liviano, pero NO romántico ni sensorial -- pensalo como el comentario de une amigue
perspicaz mirando desde afuera, no como una línea de seducción ni de pareja. Nada de "deseo",
"conexión íntima" ni lenguaje sensorial. Podés ser gracioso, curioso u observador.

Escribí un comentario breve sobre lo que este resultado puede decir de qué tan bien se conocen --
no expliques el juego ni repitas la pregunta, andá directo a la reflexión. No suena a diagnóstico
psicológico ni es solemne.

Devolvé SOLO un JSON con este schema exacto, sin texto fuera del JSON:
{"insight": "string, máx 45 palabras"}

No agregues campos. No agregues explicación. Solo el JSON.
`.trim()

  return buildNeutralSystemPrompt(featurePrompt)
}
