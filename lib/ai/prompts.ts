import type { Intensidad } from '@/lib/intensidad'

// Guardrail que se aplica siempre, sin importar el nivel — el tono "intensa" de este
// producto es sensorial/sugerente (ver contenido seed de verdad_o_reto_items,
// esto_o_aquello_items, eleccion_prompts en migración 037: deseo, piel, fantasías,
// ritmo), nunca descripción explícita de actos sexuales o anatomía. Los proveedores
// de inferencia (Groq incluido) prohíben contenido sexual explícito en sus términos
// de uso — pasarse de este límite no es solo un tema de tono, arriesga la cuenta.
const GUARDRAIL_COMUN = `
Estás generando contenido para Rituales, una app de juegos de intimidad para parejas
establecidas y consintientes. Escribís siempre en español rioplatense, con voseo.

Reglas que no se negocian, en cualquier nivel de intensidad:
- Nunca describas actos sexuales explícitos, anatomía explícita, ni uses lenguaje
  pornográfico o gráfico. El registro es sugerente y sensorial, no descriptivo.
- Nunca generes contenido que involucre menores, no consentimiento, o terceros
  reales sin su participación.
- Si el pedido implica cruzar estos límites, generá una versión más sugerente y
  menos explícita en su lugar — no expliques por qué, simplemente entregá esa versión.
`.trim()

const GUIA_POR_INTENSIDAD: Record<Intensidad, string> = {
  liviana: `
Nivel: liviana. Tono tierno, juguetón, cotidiano. Sin carga sexual — puede ser
romántico o divertido, pero nada que insinúe deseo o intimidad física.
`.trim(),
  media: `
Nivel: media. Tono coqueto, con insinuación y tensión de deseo, pero sin nombrar
actos concretos. Jugá con la anticipación (miradas, cercanía, "qué pasaría si").
`.trim(),
  intensa: `
Nivel: intensa. Tono sensorial y directo sobre deseo, fantasías y atracción —
podés nombrar el deseo explícitamente ("te deseo", "fantaseo con...") y el
contacto físico en términos generales (piel, besos, caricias, ritmo), pero sin
describir actos sexuales específicos ni anatomía. Es el límite superior del
producto, no un salto a contenido explícito.
`.trim(),
}

/**
 * Arma el system prompt para una feature de IA que genera contenido de juego,
 * combinando el guardrail común + la guía de tono según el nivel de intensidad
 * que la pareja tiene configurado (couples.intensidad_maxima), + el prompt
 * específico de la feature (qué generar, formato de salida, etc).
 */
export function buildGameSystemPrompt(
  intensidad: Intensidad,
  promptDeFeature: string
): string {
  return [GUARDRAIL_COMUN, GUIA_POR_INTENSIDAD[intensidad], promptDeFeature.trim()].join(
    '\n\n'
  )
}

/**
 * Mismo guardrail de seguridad de contenido que buildGameSystemPrompt, pero
 * SIN la guía de tono romántico/sensorial por intensidad -- para features que
 * no generan contenido de juego sino que comentan/analizan algo ya jugado
 * (ej. el insight de "¿Cuánto me conoces?"). Esas features deben sonar igual
 * sin importar si la pareja tiene couples.intensidad_maxima en 'intensa': ese
 * campo describe qué tan picante puede ser un JUEGO, no el tono de un
 * comentario analítico.
 */
export function buildNeutralSystemPrompt(promptDeFeature: string): string {
  return [GUARDRAIL_COMUN, promptDeFeature.trim()].join('\n\n')
}
