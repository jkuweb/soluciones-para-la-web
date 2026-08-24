/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@payload-config'
import { startMemoryDB, stopMemoryDB, seedTenant, seedUser } from '../../helpers/db'

describe('Orders multi-tenant isolation', () => {
  let payload: Payload
  let tenantA: { id: string | number; slug: string }
  let tenantB: { id: string | number; slug: string }
  let userA: { id: string | number }
  let superAdmin: { id: string | number }

  beforeAll(async () => {
    await startMemoryDB()
    payload = await getPayload({ config })
  })

  afterAll(async () => {
    await stopMemoryDB()
  })

  // No beforeEach cleanup: each test uses stamp-based unique slugs/emails so
  // test data does not collide, mirroring the payments-enabled.int.spec.ts
  // pattern. The shared DB may accumulate test fixtures across runs; that's fine.

  const stamp = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const setupTenantsAndUsers = async () => {
    const s = stamp()
    tenantA = await seedTenant(payload, {
      slug: `a-${s}`,
      name: 'A',
      features: { payments: true, stripeAccountStatus: 'active', stripeAccountId: 'acct_a' },
    })
    tenantB = await seedTenant(payload, {
      slug: `b-${s}`,
      name: 'B',
      features: { payments: true, stripeAccountStatus: 'active', stripeAccountId: 'acct_b' },
    })
    userA = await seedUser(payload, { email: `a-${s}@x.com`, tenants: [tenantA.id] })
    superAdmin = await seedUser(payload, { email: `s-${s}@x.com`, roles: 'super-admin' })
  }

  it('tenant A cannot read tenant B orders', async () => {
    await setupTenantsAndUsers()

    const orderB = await payload.create({
      collection: 'orders',
      data: {
        tenant: tenantB.id,
        customerEmail: `b-${stamp()}@x.com`,
        items: [{ productId: 'p1', name: 'X', unitPrice: 100, quantity: 1 }],
        subtotal: 100,
        currency: 'USD',
        status: 'pending',
      } as any,
      overrideAccess: true,
    })

    const list = await payload.find({
      collection: 'orders',
      where: { id: { equals: orderB.id } },
      overrideAccess: false,
      user: userA as any,
    })
    expect(list.docs).toHaveLength(0)
  })

  it('super-admin reads all orders across tenants', async () => {
    await setupTenantsAndUsers()
    const s = stamp()

    const orderA = await payload.create({
      collection: 'orders',
      data: {
        tenant: tenantA.id,
        customerEmail: `a-${s}@x.com`,
        items: [{ productId: 'p1', name: 'X', unitPrice: 100, quantity: 1 }],
        subtotal: 100,
        currency: 'USD',
        status: 'pending',
      } as any,
      overrideAccess: true,
    })
    const orderAId = orderA.id
    const orderB = await payload.create({
      collection: 'orders',
      data: {
        tenant: tenantB.id,
        customerEmail: `b-${s}@x.com`,
        items: [{ productId: 'p1', name: 'X', unitPrice: 100, quantity: 1 }],
        subtotal: 100,
        currency: 'USD',
        status: 'pending',
      } as any,
      overrideAccess: true,
    })
    const orderBId = orderB.id

    const list = await payload.find({
      collection: 'orders',
      overrideAccess: false,
      user: superAdmin as any,
    })
    const matching = list.docs.filter((d) => d.id === orderAId || d.id === orderBId)
    expect(matching.length).toBe(2)
  })

  it('tenant without payments feature cannot create orders via REST', async () => {
    const s = stamp()
    const tenantNoPayments = await seedTenant(payload, {
      slug: `np-${s}`,
      name: 'NP',
      features: { payments: false, stripeAccountStatus: 'active' },
    })
    const userNP = await seedUser(payload, {
      email: `np-${s}@x.com`,
      tenants: [tenantNoPayments.id],
    })

    await expect(
      payload.create({
        collection: 'orders',
        data: {
          tenant: tenantNoPayments.id,
          customerEmail: `np-${s}@x.com`,
          items: [{ productId: 'p1', name: 'X', unitPrice: 100, quantity: 1 }],
          subtotal: 100,
          currency: 'USD',
          status: 'pending',
        } as any,
        overrideAccess: false,
        user: userNP as any,
      }),
    ).rejects.toThrow()
  })

  it('order without tenant fails validation', async () => {
    const s = stamp()
    // Seed an unrelated active tenant so a future hook or access change
    // can't accidentally short-circuit before field validation runs —
    // the assertion must isolate the missing-tenant failure surface.
    await seedTenant(payload, {
      slug: `orphan-${s}`,
      name: 'Orphan',
      features: { payments: true, stripeAccountStatus: 'active' },
    })

    await expect(
      payload.create({
        collection: 'orders',
        data: {
          customerEmail: `orphan-${s}@x.com`,
          items: [{ productId: 'p1', name: 'X', unitPrice: 100, quantity: 1 }],
          subtotal: 100,
          currency: 'USD',
          status: 'pending',
        } as any,
        overrideAccess: true,
      }),
    ).rejects.toThrow()
  })
})
