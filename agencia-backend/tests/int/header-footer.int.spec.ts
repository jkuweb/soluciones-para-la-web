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
