import { describe, expect, it } from 'vitest'
import { parseContenido } from '@/lib/ai/parse-generated-content'

describe('parseContenido', () => {
  it('parsea un JSON válido con los 5 campos', () => {
    const raw = JSON.stringify({
      titulo: 'Risas rápidas',
      item1: 'Contá un chiste malo',
      item2: 'Respondé con otro peor',
      item3: 'Abrazo de 30 segundos',
      pregunta_reflexion: '¿Qué te hizo reír más?',
    })
    const result = parseContenido(raw)
    expect(result).toEqual({
      titulo: 'Risas rápidas',
      items: ['Contá un chiste malo', 'Respondé con otro peor', 'Abrazo de 30 segundos'],
      preguntaReflexion: '¿Qué te hizo reír más?',
    })
  })

  it('tolera fences de markdown (```json ... ```) alrededor del JSON', () => {
    const raw = '```json\n' + JSON.stringify({
      titulo: 'x', item1: 'a', item2: 'b', item3: 'c', pregunta_reflexion: 'd',
    }) + '\n```'
    expect(parseContenido(raw)).not.toBeNull()
  })

  it('devuelve null si falta un campo obligatorio', () => {
    const raw = JSON.stringify({ titulo: 'x', item1: 'a', item2: 'b', pregunta_reflexion: 'd' })
    expect(parseContenido(raw)).toBeNull()
  })

  it('devuelve null si un campo está vacío', () => {
    const raw = JSON.stringify({ titulo: '', item1: 'a', item2: 'b', item3: 'c', pregunta_reflexion: 'd' })
    expect(parseContenido(raw)).toBeNull()
  })

  it('devuelve null con JSON inválido o texto plano', () => {
    expect(parseContenido('esto no es JSON')).toBeNull()
    expect(parseContenido('')).toBeNull()
  })
})
