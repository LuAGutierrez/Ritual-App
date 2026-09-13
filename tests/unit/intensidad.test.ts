import { describe, expect, it } from 'vitest'
import { dentroDelTecho } from '@/lib/intensidad'

describe('dentroDelTecho', () => {
  it('deja pasar ítems igual o más suaves que el techo', () => {
    expect(dentroDelTecho('liviana', 'liviana')).toBe(true)
    expect(dentroDelTecho('liviana', 'media')).toBe(true)
    expect(dentroDelTecho('media', 'intensa')).toBe(true)
    expect(dentroDelTecho('intensa', 'intensa')).toBe(true)
  })

  it('bloquea ítems más intensos que el techo', () => {
    expect(dentroDelTecho('media', 'liviana')).toBe(false)
    expect(dentroDelTecho('intensa', 'liviana')).toBe(false)
    expect(dentroDelTecho('intensa', 'media')).toBe(false)
  })
})
