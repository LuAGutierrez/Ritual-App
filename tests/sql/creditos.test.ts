import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  adminClient,
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

describe('alta de créditos al registrarse (migración 056)', () => {
  it('handle_new_user crea user_credits con 50 de bienvenida', async () => {
    const a = await createQaUser('A')
    createdUserIds.push(a.id)

    const admin = adminClient()
    const { data: credits } = await admin
      .from('user_credits')
      .select('balance')
      .eq('user_id', a.id)
      .single()

    expect(credits?.balance).toBe(50)

    const { data: tx } = await admin
      .from('credit_transactions')
      .select('type, amount, balance_after')
      .eq('user_id', a.id)
      .eq('type', 'welcome_signup')
      .single()

    expect(tx?.amount).toBe(50)
    expect(tx?.balance_after).toBe(50)
  })
})

describe('bono de vinculación (migración 056)', () => {
  it('al vincular via invite code, el pool arranca en 150 y los saldos individuales se ponen en 0', async () => {
    const a = await createQaUser('A')
    const b = await createQaUser('B')
    createdUserIds.push(a.id, b.id)
    const admin = adminClient()

    const clientA = await signedInClient(a.email, a.password)
    const { data: couple } = await admin.from('couples').insert({ name: null }).select('id, invite_code').single()
    await admin.from('couple_members').insert({ user_id: a.id, couple_id: couple!.id })

    const clientB = await signedInClient(b.email, b.password)
    const joined = await rpcJson(clientB, 'join_couple_by_invite', { p_code: couple!.invite_code as string })
    expect(joined.ok).toBe(true)

    const { data: pool } = await admin
      .from('couple_credits')
      .select('balance')
      .eq('couple_id', couple!.id)
      .single()
    expect(pool?.balance).toBe(150)

    const { data: soloA } = await admin.from('user_credits').select('balance').eq('user_id', a.id).single()
    const { data: soloB } = await admin.from('user_credits').select('balance').eq('user_id', b.id).single()
    expect(soloA?.balance).toBe(0)
    expect(soloB?.balance).toBe(0)

    void clientA
  })
})

describe('consume_credits (migración 057)', () => {
  it('modo solo: descuenta del saldo individual', async () => {
    const a = await createQaUser('A')
    createdUserIds.push(a.id)
    const clientA = await signedInClient(a.email, a.password)

    const result = await rpcJson(clientA, 'consume_credits', {
      p_feature: 'ritual_simple',
      p_amount: 5,
      p_idempotency_key: crypto.randomUUID(),
    })

    expect(result.ok).toBe(true)
    expect((result as unknown as { balance: number }).balance).toBe(45)
  })

  it('modo solo: rechaza si no alcanza el saldo', async () => {
    const a = await createQaUser('A')
    createdUserIds.push(a.id)
    const clientA = await signedInClient(a.email, a.password)

    const result = await rpcJson(clientA, 'consume_credits', {
      p_feature: 'dinamica_ia',
      p_amount: 999,
      p_idempotency_key: crypto.randomUUID(),
    })

    expect(result.ok).toBe(false)
    expect(result.error).toBe('insufficient_credits')
  })

  it('la misma idempotency_key no cobra dos veces', async () => {
    const a = await createQaUser('A')
    createdUserIds.push(a.id)
    const clientA = await signedInClient(a.email, a.password)
    const key = crypto.randomUUID()

    const first = await rpcJson(clientA, 'consume_credits', { p_feature: 'ritual_simple', p_amount: 5, p_idempotency_key: key })
    const second = await rpcJson(clientA, 'consume_credits', { p_feature: 'ritual_simple', p_amount: 5, p_idempotency_key: key })

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    expect((first as unknown as { balance: number }).balance).toBe(45)
    expect((second as unknown as { balance: number }).balance).toBe(45)

    const admin = adminClient()
    const { data: txs } = await admin.from('credit_transactions').select('id').eq('idempotency_key', key)
    expect(txs?.length).toBe(1)
  })

  it('modo pareja: dos gastos simultáneos contra un pool chico -- solo uno de los dos pasa', async () => {
    const a = await createQaUser('A')
    const b = await createQaUser('B')
    createdUserIds.push(a.id, b.id)
    const admin = adminClient()

    const { data: couple } = await admin.from('couples').insert({ name: null }).select('id').single()
    await admin.from('couple_members').insert([
      { user_id: a.id, couple_id: couple!.id },
      { user_id: b.id, couple_id: couple!.id },
    ])
    await admin.from('couple_credits').insert({ couple_id: couple!.id, balance: 5 })

    const clientA = await signedInClient(a.email, a.password)
    const clientB = await signedInClient(b.email, b.password)

    const [resA, resB] = await Promise.all([
      rpcJson(clientA, 'consume_credits', { p_feature: 'ritual_simple', p_amount: 5, p_idempotency_key: crypto.randomUUID() }),
      rpcJson(clientB, 'consume_credits', { p_feature: 'ritual_simple', p_amount: 5, p_idempotency_key: crypto.randomUUID() }),
    ])

    const results = [resA, resB]
    const exitosos = results.filter(r => r.ok)
    const rechazados = results.filter(r => !r.ok)

    expect(exitosos.length).toBe(1)
    expect(rechazados.length).toBe(1)
    expect(rechazados[0]?.error).toBe('insufficient_credits')

    const { data: pool } = await admin.from('couple_credits').select('balance').eq('couple_id', couple!.id).single()
    expect(pool?.balance).toBe(0)
  })
})

describe('grant_purchase_credits (migración 063)', () => {
  it('modo solo: una compra approved sin couple_id acredita a user_credits, no a couple_credits', async () => {
    const a = await createQaUser('A')
    createdUserIds.push(a.id)
    const admin = adminClient()

    const { data: purchase } = await admin
      .from('credit_purchases')
      .insert({ couple_id: null, user_id: a.id, package_id: 'pack_prueba', status: 'approved' })
      .select('id')
      .single()

    const result = await rpcJson(adminClient(), 'grant_purchase_credits', { p_purchase_id: purchase!.id })
    expect(result.ok).toBe(true)

    const { data: credits } = await admin.from('user_credits').select('balance').eq('user_id', a.id).single()
    // 50 de bienvenida + 60 del pack_prueba
    expect(credits?.balance).toBe(110)

    const { data: tx } = await admin
      .from('credit_transactions')
      .select('couple_id, amount')
      .eq('user_id', a.id)
      .eq('type', 'purchase')
      .single()
    expect(tx?.couple_id).toBeNull()
    expect(tx?.amount).toBe(60)
  })

  it('es idempotente: llamarla dos veces no acredita doble', async () => {
    const a = await createQaUser('A')
    createdUserIds.push(a.id)
    const admin = adminClient()

    const { data: purchase } = await admin
      .from('credit_purchases')
      .insert({ couple_id: null, user_id: a.id, package_id: 'pack_prueba', status: 'approved' })
      .select('id')
      .single()

    await rpcJson(adminClient(), 'grant_purchase_credits', { p_purchase_id: purchase!.id })
    const second = await rpcJson(adminClient(), 'grant_purchase_credits', { p_purchase_id: purchase!.id })
    expect((second as unknown as { already_granted?: boolean }).already_granted).toBe(true)

    const { data: credits } = await admin.from('user_credits').select('balance').eq('user_id', a.id).single()
    expect(credits?.balance).toBe(110)
  })
})

describe('ai_content_cache RLS (migración 059)', () => {
  it('un autenticado puede insertar, leer y actualizar hits', async () => {
    const a = await createQaUser('A')
    createdUserIds.push(a.id)
    const clientA = await signedInClient(a.email, a.password)
    const key = `test-${crypto.randomUUID()}`

    const { data: inserted, error: insertError } = await clientA
      .from('ai_content_cache')
      .insert({ feature: 'ritual_simple', context_key: key, model: 'test-model', output: { titulo: 'x' } })
      .select('id, hits')
      .single()

    expect(insertError).toBeNull()
    expect(inserted?.hits).toBe(0)

    const { error: updateError } = await clientA
      .from('ai_content_cache')
      .update({ hits: 1 })
      .eq('id', inserted!.id)

    expect(updateError).toBeNull()

    const { data: leido } = await clientA
      .from('ai_content_cache')
      .select('hits')
      .eq('context_key', key)
      .single()

    expect(leido?.hits).toBe(1)
  })
})

describe('grant_daily_streak_credits (migración 057)', () => {
  it('otorga el bono una sola vez por día', async () => {
    const a = await createQaUser('A')
    const b = await createQaUser('B')
    createdUserIds.push(a.id, b.id)
    const admin = adminClient()

    const { data: couple } = await admin.from('couples').insert({ name: null }).select('id').single()
    await admin.from('couple_members').insert([
      { user_id: a.id, couple_id: couple!.id },
      { user_id: b.id, couple_id: couple!.id },
    ])
    await admin.from('couple_credits').insert({ couple_id: couple!.id, balance: 0 })

    const clientA = await signedInClient(a.email, a.password)

    const first = await rpcJson(clientA, 'grant_daily_streak_credits', { p_couple_id: couple!.id })
    expect(first.ok).toBe(true)
    expect((first as unknown as { granted: number }).granted).toBeGreaterThanOrEqual(1)

    const second = await rpcJson(clientA, 'grant_daily_streak_credits', { p_couple_id: couple!.id })
    expect((second as unknown as { granted: number }).granted).toBe(0)
  })
})
