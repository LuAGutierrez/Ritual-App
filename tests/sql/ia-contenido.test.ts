import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  createCoupleWithMembers,
  createQaUser,
  deleteUsers,
  requireLocalSupabase,
  signedInClient,
} from './helpers'

const createdUserIds: string[] = []

beforeAll(async () => {
  await requireLocalSupabase()
})

afterEach(async () => {
  const ids = createdUserIds.splice(0)
  await deleteUsers(ids)
})

describe('couple_ia_contenido RLS (migración 054)', () => {
  it('un miembro de la pareja puede insertar y leer su propia fila', async () => {
    const a = await createQaUser('A')
    const b = await createQaUser('B')
    createdUserIds.push(a.id, b.id)
    const { coupleId } = await createCoupleWithMembers(a.id, b.id)

    const clientA = await signedInClient(a.email, a.password)

    const { data: inserted, error: insertError } = await clientA
      .from('couple_ia_contenido')
      .insert({
        couple_id: coupleId,
        juego: 'verdad_o_reto',
        modo: 'verdad',
        intensidad: 'media',
        texto: 'consigna de prueba QE',
      })
      .select('id, texto')
      .single()

    expect(insertError).toBeNull()
    expect(inserted?.texto).toBe('consigna de prueba QE')

    const { data: leido, error: selectError } = await clientA
      .from('couple_ia_contenido')
      .select('id')
      .eq('couple_id', coupleId)

    expect(selectError).toBeNull()
    expect(leido?.length).toBe(1)
  })

  it('un usuario ajeno no puede leer ni insertar en la pareja de otro', async () => {
    const a = await createQaUser('A')
    const b = await createQaUser('B')
    const intruso = await createQaUser('Intruso')
    createdUserIds.push(a.id, b.id, intruso.id)
    const { coupleId } = await createCoupleWithMembers(a.id, b.id)

    const clientA = await signedInClient(a.email, a.password)
    await clientA.from('couple_ia_contenido').insert({
      couple_id: coupleId,
      juego: 'verdad_o_reto',
      modo: 'reto',
      intensidad: 'intensa',
      texto: 'consigna que el intruso no debería ver',
    })

    const clientIntruso = await signedInClient(intruso.email, intruso.password)

    const { data: leido, error: selectError } = await clientIntruso
      .from('couple_ia_contenido')
      .select('id')
      .eq('couple_id', coupleId)

    expect(selectError).toBeNull()
    expect(leido).toEqual([])

    const { error: insertError } = await clientIntruso.from('couple_ia_contenido').insert({
      couple_id: coupleId,
      juego: 'verdad_o_reto',
      modo: 'verdad',
      intensidad: 'liviana',
      texto: 'insert que no debería pasar',
    })

    expect(insertError).not.toBeNull()
  })
})
