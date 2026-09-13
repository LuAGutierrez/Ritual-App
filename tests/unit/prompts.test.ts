import { describe, expect, it } from 'vitest'
import { buildGameSystemPrompt } from '@/lib/ai/prompts'

describe('buildGameSystemPrompt', () => {
  it('incluye el guardrail común en cualquier nivel', () => {
    for (const nivel of ['liviana', 'media', 'intensa'] as const) {
      const prompt = buildGameSystemPrompt(nivel, 'Generá una consigna de reto.')
      expect(prompt.toLowerCase()).toContain('nunca')
      expect(prompt.toLowerCase()).toContain('explícit')
    }
  })

  it('agrega la guía específica del nivel pedido', () => {
    expect(buildGameSystemPrompt('liviana', 'x')).toContain('Nivel: liviana')
    expect(buildGameSystemPrompt('media', 'x')).toContain('Nivel: media')
    expect(buildGameSystemPrompt('intensa', 'x')).toContain('Nivel: intensa')
  })

  it('no mezcla la guía de otro nivel', () => {
    const prompt = buildGameSystemPrompt('liviana', 'x')
    expect(prompt).not.toContain('Nivel: media')
    expect(prompt).not.toContain('Nivel: intensa')
  })

  it('agrega el prompt específico de la feature al final', () => {
    const prompt = buildGameSystemPrompt('media', 'Generá una pregunta de Verdad o Reto.')
    expect(prompt.trim().endsWith('Generá una pregunta de Verdad o Reto.')).toBe(true)
  })
})
