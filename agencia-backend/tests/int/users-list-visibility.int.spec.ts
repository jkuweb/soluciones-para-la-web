import { getPayload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { seedUser, seedTenant } from '../helpers/db'

/**
 * Regression test for the multi-tenant users-list bug.
 *
 * Bug: super-admin created users appeared as "No Results" in the admin
 * UI list whenever the `payload-tenant` cookie was set (e.g., after
 * visiting the Tenants collection). The plugin's `filterDocumentsByTenants`
 * function reads the cookie BEFORE checking `userHasAccessToAllTenants`,
 * so even super-admins were filtered to a specific tenant.
 *
 * Fix: disable the cookie-based baseFilter for the admin users
 * collection via `useUsersTenantFilter: false`. The access-control
 * wrapping still correctly restricts tenant-admins to their own tenants.
 */
describe('Users list visibility with multi-tenant cookie', () => {
  let payload: Awaited<ReturnType<typeof getPayload>>
  let superAdmin: any
  let tenantAdmin: any

  const SUPER_ADMIN_EMAIL = 'test-super-admin@agencia.test'
  const TENANT_ADMIN_EMAIL = 'test-tenant-admin@agencia.test'
  // Use a timestamp suffix so re-runs (or parallel test files that also
  // seed a tenant) don't collide on the unique slug.
  const TENANT_SLUG = `tenant-admin-test-${Date.now()}`

  beforeAll(async () => {
    payload = await getPayload({ config })

    // Find or seed a super-admin. Don't hardcode id=1 — the shared test
    // DB may not have any super-admin, and the id is not stable.
    const existingSuper = await payload.find({
      collection: 'users',
      where: { email: { equals: SUPER_ADMIN_EMAIL } },
      overrideAccess: true,
      limit: 1,
    })
    superAdmin =
      existingSuper.docs[0] ??
      (await seedUser(payload, { email: SUPER_ADMIN_EMAIL, roles: 'super-admin' }))

    // Make the test self-contained: seed a tenant + tenant-admin instead
    // of depending on external seed state (pepe@example.com, tenant 1).
    const tenant = await seedTenant(payload, {
      slug: TENANT_SLUG,
      name: 'Tenant Admin Test',
    })
    const existingAdmin = await payload.find({
      collection: 'users',
      where: { email: { equals: TENANT_ADMIN_EMAIL } },
      overrideAccess: true,
      limit: 1,
    })
    tenantAdmin =
      existingAdmin.docs[0] ??
      (await seedUser(payload, {
        email: TENANT_ADMIN_EMAIL,
        roles: 'tenant-admin',
        tenants: [tenant.id],
      }))
  })

  afterAll(async () => {
    // No-op: tests do not pollute DB beyond resetting two passwords.
  })

  it('super-admin sees ALL users even when payload-tenant cookie is set', async () => {
    const totalUsers = await payload.count({
      collection: 'users',
      overrideAccess: true,
    })

    // Simulate the cookie that the multi-tenant plugin sets when
    // navigating to a tenant-aware collection.
    const result = await payload.find({
      collection: 'users',
      overrideAccess: false,
      user: superAdmin,
      req: {
        user: superAdmin,
        headers: new Headers({ cookie: 'payload-tenant=1' }),
        payload,
      } as any,
      limit: 100,
    })

    expect(result.totalDocs).toBe(totalUsers.totalDocs)
  })

  it('tenant-admin is still restricted to their own tenant (access control still works)', async () => {
    // tenantAdmin has no tenants assigned in this seed, so they should
    // only see themselves per the plugin's wrapping access control.
    const result = await payload.find({
      collection: 'users',
      overrideAccess: false,
      user: tenantAdmin,
      req: {
        user: tenantAdmin,
        headers: new Headers({ cookie: 'payload-tenant=1' }),
        payload,
      } as any,
      limit: 100,
    })

    // tenant-admin without assigned tenants sees only their own user.
    const visibleEmails = result.docs.map((u) => u.email)
    expect(visibleEmails).toContain(tenantAdmin.email)
    expect(visibleEmails).not.toContain(superAdmin.email)
  })

  it('super-admin can still create users (no regression on POST)', async () => {
    const stamp = Date.now()
    const created = await payload.create({
      collection: 'users',
      data: {
        email: `regression-${stamp}@example.com`,
        password: 'regression-pw',
        roles: 'tenant-admin',
      },
      user: superAdmin,
      overrideAccess: false,
    })

    expect(created.email).toBe(`regression-${stamp}@example.com`)
    expect(created.roles).toBe('tenant-admin')

    // Cleanup
    await payload.delete({
      collection: 'users',
      id: created.id,
      overrideAccess: true,
    })
  })
})
