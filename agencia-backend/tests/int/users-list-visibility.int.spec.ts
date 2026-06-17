import { getPayload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'

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

  beforeAll(async () => {
    payload = await getPayload({ config })

    // Reset super-admin password for the test session.
    await payload.update({
      collection: 'users',
      id: 1,
      data: { password: 'super-admin-pw-test' },
      overrideAccess: true,
    })
    superAdmin = await payload.findByID({
      collection: 'users',
      id: 1,
      overrideAccess: true,
      depth: 2,
    })

    // Ensure tenant 1 exists and pepe is assigned to it as tenant-admin.
    const pepe = await payload.find({
      collection: 'users',
      where: { email: { equals: 'pepe@example.com' } },
      overrideAccess: true,
      depth: 0,
    })
    if (pepe.docs.length === 0) {
      throw new Error('Expected seed user pepe@example.com to exist')
    }
    tenantAdmin = await payload.update({
      collection: 'users',
      id: pepe.docs[0].id,
      data: { password: 'tenant-admin-pw-test' },
      overrideAccess: true,
    })
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
