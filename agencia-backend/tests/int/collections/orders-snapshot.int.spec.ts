import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@payload-config'
import { startMemoryDB, stopMemoryDB, seedTenant } from '../../helpers/db'

describe('Orders snapshot immutability', () => {
  let payload: Payload
  let tenant: { id: string | number; slug: string }

  beforeAll(async () => {
    await startMemoryDB()
    payload = await getPayload({ config })
  })

  afterAll(async () => {
    await stopMemoryDB()
  })

  // No beforeEach cleanup: each test uses a stamp-based unique slug so test
  // data does not collide, mirroring the payments-enabled.int.spec.ts pattern.
  // The shared DB may accumulate test fixtures across runs; that's fine.

  const stamp = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const setupTenant = async () => {
    tenant = await seedTenant(payload, {
      slug: `snap-${stamp()}`,
      name: 'Snap',
      features: { payments: true, stripeAccountStatus: 'active', stripeAccountId: 'acct_s' },
    })
  }

  it('order stores items as plain object snapshot, not relationship', async () => {
    await setupTenant()
    const order = await payload.create({
      collection: 'orders',
      data: {
        tenant: tenant.id,
        customerEmail: 'buyer@x.com',
        items: [
          {
            productId: 'fake-product-123',
            name: 'Initial Name',
            unitPrice: 1000,
            quantity: 2,
            imageUrl: 'https://example.com/img.jpg',
          },
        ],
        subtotal: 2000,
        currency: 'USD',
        status: 'pending',
      } as any,
      overrideAccess: true,
    })

    const items = (order as any).items
    expect(items[0].productId).toBe('fake-product-123')
    expect(items[0].name).toBe('Initial Name')
    expect(items[0].unitPrice).toBe(1000)
    // Items must NOT be a relationship — no `relationTo`/`value` Payload overhead
    expect(items[0]).not.toHaveProperty('relationTo')
    expect(items[0]).not.toHaveProperty('value')
  })

  it('order preserves original name and price even if no product exists', async () => {
    await setupTenant()
    const order = await payload.create({
      collection: 'orders',
      data: {
        tenant: tenant.id,
        customerEmail: 'buyer@x.com',
        items: [
          {
            productId: 'never-existed-product-9999',
            name: 'Ghost Product',
            unitPrice: 5000,
            quantity: 1,
          },
        ],
        subtotal: 5000,
        currency: 'USD',
        status: 'paid',
      } as any,
      overrideAccess: true,
    })

    const fetched = await payload.findByID({
      collection: 'orders',
      id: order.id,
      overrideAccess: true,
    })
    expect((fetched as any).items[0].name).toBe('Ghost Product')
    expect((fetched as any).items[0].unitPrice).toBe(5000)
  })

  it('multiple items in order are all snapshotted', async () => {
    await setupTenant()
    const order = await payload.create({
      collection: 'orders',
      data: {
        tenant: tenant.id,
        customerEmail: 'multi@x.com',
        items: [
          { productId: 'p1', name: 'A', unitPrice: 100, quantity: 1 },
          { productId: 'p2', name: 'B', unitPrice: 200, quantity: 3 },
          { productId: 'p3', name: 'C', unitPrice: 50, quantity: 10 },
        ],
        subtotal: 100 + 600 + 500,
        currency: 'USD',
        status: 'pending',
      } as any,
      overrideAccess: true,
    })
    expect((order as any).items).toHaveLength(3)
  })
})
