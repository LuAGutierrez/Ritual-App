import { describe, expect, it } from 'vitest'
import { addDaysToDateStr, todayInArgentina } from '@/lib/fecha'

describe('todayInArgentina', () => {
  it('a las 20:00 ART sigue siendo el mismo día calendario', () => {
    // 20:00 ART = 23:00 UTC del mismo día
    const now = new Date('2026-09-09T23:00:00.000Z')
    expect(todayInArgentina(now)).toBe('2026-09-09')
  })

  it('a las 21:30 ART no salta de día (el bug UTC cortaba a las 21:00)', () => {
    // 21:30 ART = 00:30 UTC del día siguiente
    const now = new Date('2026-09-10T00:30:00.000Z')
    expect(now.toISOString().split('T')[0]).toBe('2026-09-10')
    expect(todayInArgentina(now)).toBe('2026-09-09')
  })
})

describe('addDaysToDateStr', () => {
  it('resta un día sin ambigüedad de timezone', () => {
    expect(addDaysToDateStr('2026-09-09', -1)).toBe('2026-09-08')
  })

  it('cruza de mes', () => {
    expect(addDaysToDateStr('2026-03-01', -1)).toBe('2026-02-28')
  })
})
