import type { AICompletionOptions, AIProvider } from '../provider'

// Stub listo para el día que se migre a Together AI (modelos sin
// censura, para cuando el contenido picante generado con IA necesite
// salir del guardrail de contenido que imponen los términos de Groq --
// ver el comentario en lib/ai/prompts.ts sobre por qué existe ese
// guardrail hoy). Sin dependencia nueva en package.json: Together
// expone una API compatible con OpenAI, alcanza con fetch() directo.
//
// Para activarlo: TOGETHER_API_KEY en el entorno + AI_PROVIDER=together.
// No se prueba en CI hasta que haya una key real configurada.
const TOGETHER_URL = 'https://api.together.xyz/v1/chat/completions'

export const togetherProvider: AIProvider = {
  name: 'together',

  isConfigured() {
    return !!process.env.TOGETHER_API_KEY
  },

  async complete(options: AICompletionOptions): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('TOGETHER_API_KEY no está configurada')
    }

    const res = await fetch(TOGETHER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model,
        messages: [
          { role: 'system', content: options.systemPrompt },
          { role: 'user', content: options.userPrompt },
        ],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        ...(options.jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
      }),
    })

    if (!res.ok) {
      throw new Error(`Together AI respondió ${res.status}: ${await res.text()}`)
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    return data.choices?.[0]?.message?.content ?? ''
  },
}
