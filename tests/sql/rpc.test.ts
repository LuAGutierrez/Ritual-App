import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  anonClient,
  createCoupleWithMembers,
  createQaUser,
  createRitualSession,
  deleteUsers,
  requireLocalSupabase,
  rpcJson,
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

describe('submit_ritual_response', () => {
  it('sin sesión rechaza el submit', async () => {
    const a = await createQaUser('A')
    const b = await createQaUser('B')
    createdUserIds.push(a.id, b.id)
    const { coupleId } = await createCoupleWithMembers(a.id, b.id)
    const sessionId = await createRitualSession(coupleId, a.id, b.id)

    const result = await rpcJson(anonClient(), 'submit_ritual_response', {
      p_session_id: sessionId,
      p_response: 'hola',
    })

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/autenticado|permission|not authorized/i)
  })

  it('A no puede escribir la respuesta de B', async () => {
    const a = await createQaUser('A')
    const b = await createQaUser('B')
    createdUserIds.push(a.id, b.id)
    const { coupleId } = await createCoupleWithMembers(a.id, b.id)
    const sessionId = await createRitualSession(coupleId, a.id, b.id)
    const clientA = await signedInClient(a.email, a.password)

    const { error: updateErr } = await clientA
      .from('couple_ritual_sessions')
      .update({ user2_response: 'hackeado' })
      .eq('id', sessionId)
    expect(updateErr).toBeTruthy()

    const submitted = await rpcJson(clientA, 'submit_ritual_response', {
      p_session_id: sessionId,
      p_response: 'respuesta de A',
    })
    expect(submitted.ok).toBe(true)
    expect(submitted.session?.user1_response).toBe('respuesta de A')
    expect(submitted.session?.user2_response).toBeNull()
  })

  it('cuando responde el segundo, setea revealed_at', async () => {
    const a = await createQaUser('A')
    const b = await createQaUser('B')
    createdUserIds.push(a.id, b.id)
    const { coupleId } = await createCoupleWithMembers(a.id, b.id)
    const sessionId = await createRitualSession(coupleId, a.id, b.id)
    const clientA = await signedInClient(a.email, a.password)
    const clientB = await signedInClient(b.email, b.password)

    const first = await rpcJson(clientA, 'submit_ritual_response', {
      p_session_id: sessionId,
      p_response: 'de A',
    })
    expect(first.ok).toBe(true)
    expect(first.session?.revealed_at).toBeNull()

    const second = await rpcJson(clientB, 'submit_ritual_response', {
      p_session_id: sessionId,
      p_response: 'de B',
    })
    expect(second.ok).toBe(true)
    expect(second.session?.revealed_at).toBeTruthy()
    expect(second.session?.user1_response).toBe('de A')
    expect(second.session?.user2_response).toBe('de B')
  })
})

describe('join_couple_by_invite', () => {
  it('acepta código válido, rechaza inválido y no deja unirse a una segunda pareja', async () => {
    const a = await createQaUser('A')
    const b = await createQaUser('B')
    const c = await createQaUser('C')
    createdUserIds.push(a.id, b.id, c.id)

    const coupleA = await createCoupleWithMembers(a.id)
    const coupleC = await createCoupleWithMembers(c.id)
    const clientB = await signedInClient(b.email, b.password)

    const invalid = await rpcJson(clientB, 'join_couple_by_invite', { p_code: 'NOEXISTE1' })
    expect(invalid.ok).toBe(false)

    const joined = await rpcJson(clientB, 'join_couple_by_invite', { p_code: coupleA.inviteCode })
    expect(joined.ok).toBe(true)

    const second = await rpcJson(clientB, 'join_couple_by_invite', { p_code: coupleC.inviteCode })
    expect(second.ok).toBe(false)
    expect(second.error).toMatch(/ya tenés una pareja/i)
  })
})
