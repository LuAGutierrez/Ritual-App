// Separado de app/actions/ritual-ia.ts porque un archivo 'use server'
// solo puede exportar funciones async (Next.js las compila como
// server actions) -- esta es sincrónica y necesita exportarse para
// poder testearla sin pasar por todo el server action.
export type IAGeneratedContent = {
  titulo: string
  items: string[]
  preguntaReflexion: string
}

export function parseContenido(raw: string): IAGeneratedContent | null {
  try {
    const limpio = raw.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim()
    const parsed = JSON.parse(limpio) as Record<string, unknown>
    const { titulo, item1, item2, item3 } = parsed
    const pregunta = parsed.pregunta_reflexion

    const campos = [titulo, item1, item2, item3, pregunta]
    if (campos.some(c => typeof c !== 'string' || !c.trim())) return null

    return {
      titulo: (titulo as string).trim(),
      items: [item1 as string, item2 as string, item3 as string].map(s => s.trim()),
      preguntaReflexion: (pregunta as string).trim(),
    }
  } catch {
    return null
  }
}

export function parseConocesInsight(raw: string): string | null {
  try {
    const limpio = raw.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim()
    const parsed = JSON.parse(limpio) as Record<string, unknown>
    const { insight } = parsed
    if (typeof insight !== 'string' || !insight.trim()) return null
    return insight.trim()
  } catch {
    return null
  }
}
