import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, afterAll, expect } from 'vitest'

let payload: Payload

// Track created IDs for cleanup
let tenantId: number | string
let tenantSlug: string
let secondTenantId: number | string
let secondTenantSlug: string
let headerId: number | string
let footerId: number | string
let tenantAdminUserId: number | string | undefined

describe('Header and Footer Collections', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })

    const ts = Date.now()

    // Create a test tenant
    const tenant = await payload.create({
      collection: 'tenants',
      data: {
        name: `Header Test Tenant ${ts}`,
        slug: `header-test-${ts}`,
        domain: `header-test-${ts}.example.com`,
        serviceType: 'web-estatica',
        frontendType: 'astro',
        status: 'active',
        ecommerceTier: 'none',
      },
      overrideAccess: true,
    })
    tenantId = tenant.id
    tenantSlug = `header-test-${ts}`

    // Create a second tenant for isolation tests
    const secondTenant = await payload.create({
      collection: 'tenants',
      data: {
        name: `Header Test Tenant 2 ${ts}`,
        slug: `header-test-2-${ts}`,
        domain: `header-test-2-${ts}.example.com`,
        serviceType: 'tienda-online',
        frontendType: 'nextjs',
        status: 'active',
        ecommerceTier: 'none',
      },
      overrideAccess: true,
    })
    secondTenantId = secondTenant.id
    secondTenantSlug = `header-test-2-${ts}`
  }, 60000)

  afterAll(async () => {
    if (payload) {
      // Clean up in reverse dependency order
      try { await payload.delete({ collection: 'header', id: headerId, overrideAccess: true }) } catch { /* ignore */ }
      try { await payload.delete({ collection: 'footer', id: footerId, overrideAccess: true }) } catch { /* ignore */ }
      if (tenantAdminUserId !== undefined) {
        try { await payload.delete({ collection: 'users', id: tenantAdminUserId, overrideAccess: true }) } catch { /* ignore */ }
      }
      try { await payload.delete({ collection: 'tenants', id: secondTenantId, overrideAccess: true }) } catch { /* ignore */ }
      try { await payload.delete({ collection: 'tenants', id: tenantId, overrideAccess: true }) } catch { /* ignore */ }
    }
  })

  describe('Header Collection', () => {
    it('creates a header for a tenant', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const headerData: any = {
        tenant: tenantId,
        navItems: [
          {
            title: 'Home',
            link: {
              type: 'custom',
              url: '/',
              newTab: false,
            },
          },
          {
            title: 'About',
            link: {
              type: 'custom',
              url: '/about',
              newTab: false,
            },
          },
        ],
      }
      const header = await payload.create({
        collection: 'header',
        data: headerData,
        overrideAccess: true,
      })

      expect(header).toBeDefined()
      expect(header.id).toBeDefined()
      expect(header.navItems).toHaveLength(2)
      expect(header.navItems?.[0]?.title).toBe('Home')
      headerId = header.id
    })

    it('enforces tenant uniqueness on create', async () => {
      await expect(
        payload.create({
          collection: 'header',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: { tenant: tenantId, navItems: [] } as any,
          overrideAccess: true,
        }),
      ).rejects.toThrow(/already has a header/i)
    })

    it('is publicly readable via REST API', async () => {
      const headers = await payload.find({
        collection: 'header',
        depth: 1,
        where: {
          'tenant.slug': { equals: tenantSlug },
        },
      })

      expect(headers.docs).toHaveLength(1)
      expect(headers.docs[0].id).toBe(headerId)
    })

    it('isolates header data between tenants', async () => {
      const otherHeaders = await payload.find({
        collection: 'header',
        where: {
          'tenant.slug': { equals: secondTenantSlug },
        },
      })

      expect(otherHeaders.docs).toHaveLength(0)
    })

    it('defaults navigationType to "withSubItems" for backwards compatibility', async () => {
      const fetched = await payload.findByID({
        collection: 'header',
        id: headerId,
        overrideAccess: true,
      })

      expect(fetched.navigationType).toBe('withSubItems')
    })

    it('supports a "simple" navigation with flat links (no subItems)', async () => {
      const updated = await payload.update({
        collection: 'header',
        id: headerId,
        data: {
          navigationType: 'simple',
          navItems: [
            {
              title: 'Inicio',
              link: { type: 'custom', url: '/', newTab: false },
            },
            {
              title: 'Contacto',
              link: { type: 'custom', url: '/contacto', newTab: false },
            },
          ],
        },
        overrideAccess: true,
      })

      expect(updated.navigationType).toBe('simple')
      expect(updated.navItems).toHaveLength(2)
      expect(updated.navItems?.[0]?.title).toBe('Inicio')
      // Payload normalises an empty array to [] (not undefined). We only care
      // that no sub-items were attached for the "simple" navigation type.
      expect(updated.navItems?.[0]?.subItems?.length ?? 0).toBe(0)
    })

    it('supports "withSubItems" navigation with sub-items persisted', async () => {
      const updated = await payload.update({
        collection: 'header',
        id: headerId,
        data: {
          navigationType: 'withSubItems',
          navItems: [
            {
              title: 'Servicios',
              link: { type: 'custom', url: '/servicios', newTab: false },
              subItems: [
                {
                  title: 'Diseño web',
                  description: 'Diseño moderno y responsivo',
                  link: { type: 'custom', url: '/servicios/diseno', newTab: false },
                },
              ],
            },
          ],
        },
        overrideAccess: true,
      })

      expect(updated.navigationType).toBe('withSubItems')
      expect(updated.navItems?.[0]?.subItems).toHaveLength(1)
      expect(updated.navItems?.[0]?.subItems?.[0]?.title).toBe('Diseño web')
    })

    it('exposes navigationType in the REST API payload', async () => {
      await payload.update({
        collection: 'header',
        id: headerId,
        data: { navigationType: 'simple' },
        overrideAccess: true,
      })

      const headers = await payload.find({
        collection: 'header',
        where: { 'tenant.slug': { equals: tenantSlug } },
        overrideAccess: true,
      })

      expect(headers.docs[0].navigationType).toBe('simple')
    })

    it('blocks tenant-admin from changing navigationType (only super-admin can)', async () => {
      // Reset the header to a known state for this test.
      await payload.update({
        collection: 'header',
        id: headerId,
        data: { navigationType: 'withSubItems' },
        overrideAccess: true,
      })

      // Create a tenant-admin user scoped to the test tenant.
      const ts = Date.now()
      const tenantAdmin = await payload.create({
        collection: 'users',
        data: {
          email: `tenant-admin-header-${ts}@example.com`,
          password: 'password123',
          name: 'Tenant Admin (header test)',
          roles: 'tenant-admin',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tenants: [{ tenant: tenantId }] as any,
        },
        overrideAccess: true,
      })
      tenantAdminUserId = tenantAdmin.id

      // Sanity check: tenant-admin can still edit navItems (content edit allowed).
      const allowed = await payload.update({
        collection: 'header',
        id: headerId,
        data: {
          navItems: [
            {
              title: 'Tenant-edited item',
              link: { type: 'custom', url: '/x', newTab: false },
            },
          ],
        },
        user: tenantAdmin,
        overrideAccess: false,
      })
      expect(allowed.navItems?.[0]?.title).toBe('Tenant-edited item')

      // The actual assertion: tenant-admin cannot change navigationType.
      // The field-level access (superAdminOnly) strips or blocks the change.
      // We pass an explicit navigationType in the update payload; the access
      // control should prevent it from being persisted.
      const attempted = await payload.update({
        collection: 'header',
        id: headerId,
        data: {
          navigationType: 'simple',
          navItems: [
            {
              title: 'Tenant-edited item 2',
              link: { type: 'custom', url: '/y', newTab: false },
            },
          ],
        },
        user: tenantAdmin,
        overrideAccess: false,
      })

      // navigationType must still be 'withSubItems' (the value before the
      // tenant-admin's update). The navItem edit itself is allowed.
      expect(attempted.navigationType).toBe('withSubItems')
      expect(attempted.navItems?.[0]?.title).toBe('Tenant-edited item 2')

      // And super-admin can still change it normally.
      const adminChange = await payload.update({
        collection: 'header',
        id: headerId,
        data: { navigationType: 'simple' },
        overrideAccess: true,
      })
      expect(adminChange.navigationType).toBe('simple')

      // Restore the default for the rest of the suite.
      await payload.update({
        collection: 'header',
        id: headerId,
        data: { navigationType: 'withSubItems' },
        overrideAccess: true,
      })
    })
  })

  describe('Footer Collection', () => {
    it('creates a footer for a tenant', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const footerData: any = {
        tenant: tenantId,
        copyright: `© ${new Date().getFullYear()} Test Company`,
        socialLinks: [
          {
            link: {
              type: 'custom',
              url: 'https://twitter.com/test',
              newTab: true,
            },
          },
        ],
        navColumns: [
          {
            title: 'Products',
            links: [
              {
                link: {
                  type: 'custom',
                  url: '/product-1',
                  label: 'Product 1',
                  newTab: false,
                },
              },
            ],
          },
        ],
      }
      const footer = await payload.create({
        collection: 'footer',
        data: footerData,
        overrideAccess: true,
      })

      expect(footer).toBeDefined()
      expect(footer.id).toBeDefined()
      expect(footer.copyright).toContain('Test Company')
      expect(footer.socialLinks).toHaveLength(1)
      expect(footer.navColumns).toHaveLength(1)
      expect(footer.navColumns?.[0]?.title).toBe('Products')
      expect(footer.navColumns?.[0]?.links).toHaveLength(1)
      expect(footer.navColumns?.[0]?.links?.[0]?.link?.label).toBe('Product 1')
      footerId = footer.id
    })

    it('enforces tenant uniqueness on create', async () => {
      await expect(
        payload.create({
          collection: 'footer',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: { tenant: tenantId, copyright: 'Duplicate test', navColumns: [] } as any,
          overrideAccess: true,
        }),
      ).rejects.toThrow(/already has a footer/i)
    })

    it('is publicly readable via REST API', async () => {
      const footers = await payload.find({
        collection: 'footer',
        depth: 1,
        where: {
          'tenant.slug': { equals: tenantSlug },
        },
      })

      expect(footers.docs).toHaveLength(1)
      expect(footers.docs[0].id).toBe(footerId)
      expect(footers.docs[0].copyright).toContain('Test Company')
    })

    it('isolates footer data between tenants', async () => {
      const otherFooters = await payload.find({
        collection: 'footer',
        where: {
          'tenant.slug': { equals: secondTenantSlug },
        },
      })

      expect(otherFooters.docs).toHaveLength(0)
    })
  })
})
