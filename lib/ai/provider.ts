// Capa de abstracción sobre el proveedor de inferencia. lib/ai/groq.ts
// (Sprint 4, Verdad o Reto con IA) sigue existiendo tal cual y no se
// toca acá -- esta capa es para las features NUEVAS del sistema de
// créditos (Ritual Simple/Profundo, Dinámica de compatibilidad),
// pensada para que migrar a Together AI (modelos sin censura, ver
// docs/ROADMAP.md) sea cambiar una env var, no tocar cada feature.

import { groqProvider } from './providers/groq'
import { togetherProvider } from './providers/together'

export type AICompletionOptions = {
  systemPrompt: string
  userPrompt: string
  model: string
  maxTokens: number
  temperature?: number
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high'
  jsonMode?: boolean
}

export interface AIProvider {
  readonly name: string
  isConfigured(): boolean
  complete(options: AICompletionOptions): Promise<string>
}

export function getAIProvider(): AIProvider {
  return process.env.AI_PROVIDER === 'together' ? togetherProvider : groqProvider
}

// Modelos por tier de feature -- ver docs/ROADMAP.md "Sistema de
// créditos" para la justificación de cada elección. Vive acá (no en
// cada feature) para que cambiar de proveedor solo implique tocar
// estos IDs, no la lógica de cada generación.
export const AI_MODEL_BY_TIER = {
  ritual_simple: 'openai/gpt-oss-20b',    // tags cortas -> output corto, modelo chico alcanza
  ritual_profundo: 'openai/gpt-oss-120b', // necesita "razonar" sobre historial real de la pareja
  dinamica_ia: 'openai/gpt-oss-120b',
  conoces_insight: 'openai/gpt-oss-20b',  // un párrafo corto sobre una ronda ya resuelta
} as const
