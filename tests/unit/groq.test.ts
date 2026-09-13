import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

const originalKey = process.env.GROQ_API_KEY

describe('isGroqConfigured', () => {
  afterEach(() => {
    process.env.GROQ_API_KEY = originalKey
  })

  it('es false sin GROQ_API_KEY', async () => {
    delete process.env.GROQ_API_KEY
    vi.resetModules()
    const { isGroqConfigured } = await import('@/lib/ai/groq')
    expect(isGroqConfigured()).toBe(false)
  })

  it('es true con GROQ_API_KEY seteada', async () => {
    process.env.GROQ_API_KEY = 'test-key'
    vi.resetModules()
    const { isGroqConfigured } = await import('@/lib/ai/groq')
    expect(isGroqConfigured()).toBe(true)
  })
})

describe('completeWithGroq', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    process.env.GROQ_API_KEY = originalKey
    vi.doUnmock('groq-sdk')
  })

  it('tira error claro si falta GROQ_API_KEY', async () => {
    delete process.env.GROQ_API_KEY
    const { completeWithGroq } = await import('@/lib/ai/groq')
    await expect(completeWithGroq('hola')).rejects.toThrow('GROQ_API_KEY')
  })

  it('arma los mensajes (system + user) y devuelve el content de la respuesta', async () => {
    process.env.GROQ_API_KEY = 'test-key'

    const create = vi.fn().mockResolvedValue({
      choices: [{ message: { content: 'respuesta simulada' } }],
    })

    vi.doMock('groq-sdk', () => ({
      default: vi.fn().mockImplementation(() => ({
        chat: { completions: { create } },
      })),
    }))

    const { completeWithGroq } = await import('@/lib/ai/groq')

    const result = await completeWithGroq('decime un ritual', {
      systemPrompt: 'sos un asistente de rituales para parejas',
    })

    expect(result).toBe('respuesta simulada')
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { role: 'system', content: 'sos un asistente de rituales para parejas' },
          { role: 'user', content: 'decime un ritual' },
        ],
      })
    )
  })
})
