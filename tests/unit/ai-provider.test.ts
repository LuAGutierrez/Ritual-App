import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

const originalGroqKey = process.env.GROQ_API_KEY
const originalTogetherKey = process.env.TOGETHER_API_KEY
const originalProvider = process.env.AI_PROVIDER

describe('getAIProvider', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    process.env.GROQ_API_KEY = originalGroqKey
    process.env.TOGETHER_API_KEY = originalTogetherKey
    process.env.AI_PROVIDER = originalProvider
  })

  it('usa groq por default', async () => {
    delete process.env.AI_PROVIDER
    const { getAIProvider } = await import('@/lib/ai/provider')
    expect(getAIProvider().name).toBe('groq')
  })

  it('usa together cuando AI_PROVIDER=together', async () => {
    process.env.AI_PROVIDER = 'together'
    const { getAIProvider } = await import('@/lib/ai/provider')
    expect(getAIProvider().name).toBe('together')
  })
})

describe('groqProvider.complete', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    process.env.GROQ_API_KEY = originalGroqKey
    vi.doUnmock('groq-sdk')
  })

  it('arma la llamada con json_object cuando jsonMode=true y devuelve el content', async () => {
    process.env.GROQ_API_KEY = 'test-key'

    const create = vi.fn().mockResolvedValue({
      choices: [{ message: { content: '{"titulo":"x"}' } }],
    })

    vi.doMock('groq-sdk', () => ({
      default: vi.fn().mockImplementation(() => ({
        chat: { completions: { create } },
      })),
    }))

    const { groqProvider } = await import('@/lib/ai/providers/groq')

    const result = await groqProvider.complete({
      systemPrompt: 'sistema',
      userPrompt: 'Generá el contenido.',
      model: 'openai/gpt-oss-20b',
      maxTokens: 450,
      reasoningEffort: 'low',
      jsonMode: true,
    })

    expect(result).toBe('{"titulo":"x"}')
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'openai/gpt-oss-20b',
        max_tokens: 450,
        reasoning_effort: 'low',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'sistema' },
          { role: 'user', content: 'Generá el contenido.' },
        ],
      })
    )
  })

  it('no manda response_format cuando jsonMode no viene', async () => {
    process.env.GROQ_API_KEY = 'test-key'
    const create = vi.fn().mockResolvedValue({ choices: [{ message: { content: 'texto libre' } }] })
    vi.doMock('groq-sdk', () => ({
      default: vi.fn().mockImplementation(() => ({ chat: { completions: { create } } })),
    }))

    const { groqProvider } = await import('@/lib/ai/providers/groq')
    await groqProvider.complete({
      systemPrompt: 's', userPrompt: 'u', model: 'm', maxTokens: 100,
    })

    expect(create).toHaveBeenCalledWith(expect.not.objectContaining({ response_format: expect.anything() }))
  })
})
