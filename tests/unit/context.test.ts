import { describe, expect, it } from 'vitest'
import { buildContextTags } from '@/lib/ai/context'

describe('buildContextTags', () => {
  it('arma las tags obligatorias en orden, sin edad si no viene', () => {
    const tags = buildContextTags({
      animo: 'cansados',
      tiempoDisponible: '15m',
      objetivo: 'risas',
      rachaActual: 3,
    })
    expect(tags).toBe('[Ánimo: cansados] [Tiempo: 15m] [Objetivo: risas] [Racha: 3d]')
  })

  it('agrega edad y categoría favorita solo cuando vienen', () => {
    const tags = buildContextTags({
      animo: 'con ganas',
      tiempoDisponible: '30m+',
      objetivo: 'conexion',
      rachaActual: 12,
      categoriaFavorita: 'intimidad',
      edadA: 28,
      edadB: 26,
    })
    expect(tags).toBe(
      '[Edad: 28/26] [Ánimo: con ganas] [Tiempo: 30m+] [Objetivo: conexion] [Racha: 12d] [Favorita: intimidad]'
    )
  })

  it('mismo input siempre da la misma clave -- necesario para que el caché pegue', () => {
    const input = { animo: 'jugando', tiempoDisponible: '15m', objetivo: 'sorpresa', rachaActual: 5 }
    expect(buildContextTags(input)).toBe(buildContextTags({ ...input }))
  })
})
