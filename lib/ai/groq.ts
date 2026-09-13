import Groq from 'groq-sdk'

// Modelo por defecto: gpt-oss-120b, el flagship open source disponible en Groq.
// Ver docs/ROADMAP.md Sprint 4 para las features que van a consumir esto.
// Ojo: los modelos gpt-oss razonan antes de responder y ese razonamiento consume
// del mismo budget de max_tokens — probado a mano contra la API real: con el
// reasoning_effort por defecto del modelo y max_tokens: 60, gastó los 60 tokens
// pensando (81 reasoning_tokens) y volvió con content: "". Con reasoning_effort:
// 'low' bajó a 11 reasoning_tokens y el content llegó bien. Default en 'low' acá
// para que el caso común (prompt corto, respuesta corta) no se rompa por esto.
const DEFAULT_MODEL = 'openai/gpt-oss-120b'

let client: Groq | null = null

export function isGroqConfigured(): boolean {
  return !!process.env.GROQ_API_KEY
}

function getGroqClient(): Groq {
  if (!isGroqConfigured()) {
    throw new Error('GROQ_API_KEY no está configurada')
  }
  if (!client) {
    client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return client
}

export type GroqCompletionOptions = {
  systemPrompt?: string
  model?: string
  temperature?: number
  maxTokens?: number
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high'
}

/**
 * Completion genérico contra Groq. Server-only (usa GROQ_API_KEY, nunca exponer al browser).
 * Sin lógica de producto acá adentro — cada feature arma su propio systemPrompt/prompt.
 */
export async function completeWithGroq(
  prompt: string,
  options: GroqCompletionOptions = {}
): Promise<string> {
  const groq = getGroqClient()

  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = []
  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt })
  }
  messages.push({ role: 'user', content: prompt })

  const completion = await groq.chat.completions.create({
    model: options.model ?? DEFAULT_MODEL,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 512,
    reasoning_effort: options.reasoningEffort ?? 'low',
  })

  return completion.choices[0]?.message?.content ?? ''
}
