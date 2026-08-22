/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@payload-config'
import { startMemoryDB, stopMemoryDB, seedTenant, seedUser } from '../../helpers/db'
import { paymentsEnabledTenantAccess } from '@/access/paymentsEnabled'

describe('paymentsEnabledTenantAccess', () => {
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
  // test data does not collide, mirroring the add-feature.int.spec.ts pattern.
  // The shared DB may accumulate test fixtures across runs; that's fine.

  const stamp = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const setupTenantsAndUsers = async () => {
    const s = stamp()
    tenantA = await seedTenant(payload, {
      slug: `tenant-a-${s}`,
      name: 'Tenant A',
      features: { payments: true, stripeAccountStatus: 'active' },
    })
    tenantB = await seedTenant(payload, {
      slug: `tenant-b-${s}`,
      name: 'Tenant B',
      features: { payments: true, stripeAccountStatus: 'active' },
    })
    userA = await seedUser(payload, {
      email: `a-${s}@test.com`,
      tenants: [tenantA.id],
    })
    superAdmin = await seedUser(payload, {
      email: `super-${s}@test.com`,
      roles: 'super-admin',
    })
  }

  const runAccess = async (user: { id: string | number } | null) => {
    return paymentsEnabledTenantAccess({
      req: { user: user as any, payload } as any,
    } as any)
  }

  it('returns false for anonymous', async () => {
    expect(await runAccess(null)).toBe(false)
  })

  it('returns true for super-admin regardless of tenant state', async () => {
    await setupTenantsAndUsers()
    expect(await runAccess(superAdmin)).toBe(true)
  })

  it('returns tenant filter when tenant has payments=true and status=active', async () => {
    await setupTenantsAndUsers()
    const result = await runAccess(userA)
    expect(result).toEqual({ tenant: { in: [tenantA.id] } })
  })

  it('returns false when payments=false', async () => {
    await setupTenantsAndUsers()
    await payload.update({
      collection: 'tenants',
      id: tenantA.id,
      data: { features: { payments: false, stripeAccountStatus: 'active' } },
    })
    expect(await runAccess(userA)).toBe(false)
  })

  it('returns false when stripeAccountStatus=pending', async () => {
    await setupTenantsAndUsers()
    await payload.update({
      collection: 'tenants',
      id: tenantA.id,
      data: { features: { payments: true, stripeAccountStatus: 'pending' } },
    })
    expect(await runAccess(userA)).toBe(false)
  })

  it('returns false when stripeAccountStatus=restricted', async () => {
    await setupTenantsAndUsers()
    await payload.update({
      collection: 'tenants',
      id: tenantA.id,
      data: { features: { payments: true, stripeAccountStatus: 'restricted' } },
    })
    expect(await runAccess(userA)).toBe(false)
  })

  it('returns false when stripeAccountStatus=rejected', async () => {
    await setupTenantsAndUsers()
    await payload.update({
      collection: 'tenants',
      id: tenantA.id,
      data: { features: { payments: true, stripeAccountStatus: 'rejected' } },
    })
    expect(await runAccess(userA)).toBe(false)
  })

  it('returns false when stripeAccountStatus=none', async () => {
    await setupTenantsAndUsers()
    await payload.update({
      collection: 'tenants',
      id: tenantA.id,
      data: { features: { payments: true, stripeAccountStatus: 'none' } },
    })
    expect(await runAccess(userA)).toBe(false)
  })

  it('returns false when user has no tenants', async () => {
    const orphan = await seedUser(payload, {
      email: `orphan-${stamp()}@test.com`,
      tenants: [],
    })
    expect(await runAccess(orphan)).toBe(false)
  })

  it('returns filter with only the active tenants among many', async () => {
    await setupTenantsAndUsers()
    await payload.update({
      collection: 'tenants',
      id: tenantA.id,
      data: { features: { payments: true, stripeAccountStatus: 'pending' } },
    })
    const userBoth = await seedUser(payload, {
      email: `both-${stamp()}@test.com`,
      tenants: [tenantA.id, tenantB.id],
    })
    const result = await runAccess(userBoth)
    expect(result).toEqual({ tenant: { in: [tenantB.id] } })
  })
})
