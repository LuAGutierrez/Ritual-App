import Groq from 'groq-sdk'
import type { AICompletionOptions, AIProvider } from '../provider'

// Mismo cliente/lógica que lib/ai/groq.ts (Sprint 4), reimplementado
// contra la interfaz AIProvider para las features nuevas de créditos.
// No se unifica con lib/ai/groq.ts en este pase para no arriesgar
// verdad-o-reto-ia.ts, que ya está en producción -- ver docs/ROADMAP.md.
let client: Groq | null = null

function getClient(): Groq {
  if (!client) {
    client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return client
}

export const groqProvider: AIProvider = {
  name: 'groq',

  isConfigured() {
    return !!process.env.GROQ_API_KEY
  },

  async complete(options: AICompletionOptions): Promise<string> {
    const groq = getClient()

    const completion = await groq.chat.completions.create({
      model: options.model,
      messages: [
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: options.userPrompt },
      ],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
      // Crítico: los modelos gpt-oss razonan antes de responder y ese
      // razonamiento consume del mismo budget de max_tokens -- ver el
      // comentario detallado en lib/ai/groq.ts:5-10. Sin reasoning_effort
      // bajo, un maxTokens ajustado para JSON corto puede volver vacío.
      reasoning_effort: options.reasoningEffort ?? 'low',
      ...(options.jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
    })

    return completion.choices[0]?.message?.content ?? ''
  },
}
