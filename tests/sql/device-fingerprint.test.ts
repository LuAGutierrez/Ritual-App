import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  adminClient,
  anonClient,
  createQaUser,
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

describe('record_device_fingerprint (migración 065)', () => {
  it('guarda el fingerprint del usuario autenticado', async () => {
    const a = await createQaUser('A')
    createdUserIds.push(a.id)
    const clientA = await signedInClient(a.email, a.password)

    const result = await rpcJson(clientA, 'record_device_fingerprint', { p_fingerprint_hash: 'dispositivo-1' })
    expect(result.error).toBeUndefined()

    const admin = adminClient()
    const { data } = await admin
      .from('device_fingerprints')
      .select('fingerprint_hash')
      .eq('user_id', a.id)
    expect(data?.map(d => d.fingerprint_hash)).toEqual(['dispositivo-1'])
  })

  it('llamarla dos veces con el mismo fingerprint no duplica la fila', async () => {
    const a = await createQaUser('A')
    createdUserIds.push(a.id)
    const clientA = await signedInClient(a.email, a.password)

    await rpcJson(clientA, 'record_device_fingerprint', { p_fingerprint_hash: 'dispositivo-1' })
    await rpcJson(clientA, 'record_device_fingerprint', { p_fingerprint_hash: 'dispositivo-1' })

    const admin = adminClient()
    const { data } = await admin.from('device_fingerprints').select('id').eq('user_id', a.id)
    expect(data?.length).toBe(1)
  })

  it('sin sesión no inserta nada y no rompe', async () => {
    const result = await rpcJson(anonClient(), 'record_device_fingerprint', { p_fingerprint_hash: 'dispositivo-1' })
    expect(result.error).toBeUndefined()
  })
})

describe('grant_pairing_bonus detecta fingerprint compartido (migración 056 + 065)', () => {
  it('el segundo pairing desde el mismo dispositivo que ya cobró un bono se otorga en 0, pero la vinculación igual se permite', async () => {
    const a1 = await createQaUser('A1')
    const a2 = await createQaUser('A2')
    const b1 = await createQaUser('B1')
    const b2 = await createQaUser('B2')
    createdUserIds.push(a1.id, a2.id, b1.id, b2.id)
    const admin = adminClient()

    // Pareja 1: A1 + A2, ambos desde "dispositivo-x"
    const clientA1 = await signedInClient(a1.email, a1.password)
    const clientA2 = await signedInClient(a2.email, a2.password)
    await rpcJson(clientA1, 'record_device_fingerprint', { p_fingerprint_hash: 'dispositivo-x' })
    await rpcJson(clientA2, 'record_device_fingerprint', { p_fingerprint_hash: 'dispositivo-x' })

    const { data: coupleA } = await admin.from('couples').insert({ name: null }).select('id, invite_code').single()
    await admin.from('couple_members').insert({ user_id: a1.id, couple_id: coupleA!.id })
    const joinedA = await rpcJson(clientA2, 'join_couple_by_invite', { p_code: coupleA!.invite_code as string })
    expect(joinedA.ok).toBe(true)

    const { data: poolA } = await admin.from('couple_credits').select('balance').eq('couple_id', coupleA!.id).single()
    expect(poolA?.balance).toBe(150)

    // Pareja 2: B1 (mismo "dispositivo-x" que A1) + B2 (dispositivo distinto)
    const clientB1 = await signedInClient(b1.email, b1.password)
    const clientB2 = await signedInClient(b2.email, b2.password)
    await rpcJson(clientB1, 'record_device_fingerprint', { p_fingerprint_hash: 'dispositivo-x' })
    await rpcJson(clientB2, 'record_device_fingerprint', { p_fingerprint_hash: 'dispositivo-y' })

    const { data: coupleB } = await admin.from('couples').insert({ name: null }).select('id, invite_code').single()
    await admin.from('couple_members').insert({ user_id: b1.id, couple_id: coupleB!.id })
    const joinedB = await rpcJson(clientB2, 'join_couple_by_invite', { p_code: coupleB!.invite_code as string })

    // La vinculación nunca se bloquea por esto -- solo se retiene el bono.
    expect(joinedB.ok).toBe(true)

    // couple_credits siempre se crea (0 o 150) -- balance 0 es la prueba
    // de que el riesgo se detectó y el bono se retuvo.
    const { data: poolB } = await admin.from('couple_credits').select('balance').eq('couple_id', coupleB!.id).single()
    expect(poolB?.balance).toBe(0)

    // Con amount=0 no se loguea en el ledger (violaría CHECK(amount<>0),
    // ver migración 066) -- balance 0 arriba ya es la prueba del flag.
    const { data: tx } = await admin
      .from('credit_transactions')
      .select('id')
      .eq('couple_id', coupleB!.id)
      .eq('type', 'pairing_bonus')
    expect(tx?.length).toBe(0)
  })
})
