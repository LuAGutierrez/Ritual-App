import { describe, expect, it } from 'vitest'
import { nivelActual } from '@/lib/niveles'

describe('nivelActual', () => {
  it('empieza en Calentando', () => {
    expect(nivelActual(0).nivel.nombre).toBe('Calentando')
    expect(nivelActual(4).nivel.nombre).toBe('Calentando')
    expect(nivelActual(4).faltan).toBe(1)
  })

  it('cruza los umbrales 5 / 15 / 35 / 70', () => {
    expect(nivelActual(5).nivel.nombre).toBe('Conociéndonos')
    expect(nivelActual(15).nivel.nombre).toBe('Sin filtros')
    expect(nivelActual(35).nivel.nombre).toBe('Intenso')
    expect(nivelActual(70).nivel.nombre).toBe('Nosotros')
  })

  it('en el último nivel no hay siguiente', () => {
    const top = nivelActual(70)
    expect(top.siguiente).toBeNull()
    expect(top.faltan).toBeNull()
  })
})
