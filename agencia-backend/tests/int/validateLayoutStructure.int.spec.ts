import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { validateLayoutStructure } from '@/hooks/validateLayoutStructure'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import type { Page, User } from '@/payload-types'

let payload: Payload
let pageId: number
let superAdminUser: User
let tenantAdminUser: User
let cleanupTenantId: number | string

describe('validateLayoutStructure', () => {
  beforeAll(async () => {
    // Wire the hook into Pages for testing
    const payloadConfig = await config
    const pagesConfig = payloadConfig.collections?.find(
      (c: { slug?: string }) => c.slug === 'pages',
    )
    if (pagesConfig) {
      pagesConfig.hooks = {
        ...(pagesConfig.hooks || {}),
        beforeChange: [validateLayoutStructure],
      }
    }

    payload = await getPayload({ config: payloadConfig })

    // Create test tenant (unique slug per run)
    const ts = Date.now()
    const tenant = await payload.create({
      collection: 'tenants',
      data: {
        name: `VLS Tenant ${ts}`,
        slug: `vls-tenant-${ts}`,
        domain: `vls-${ts}.example.com`,
        serviceType: 'web-estatica',
        frontendType: 'astro',
        status: 'active',
      },
      overrideAccess: true,
    })
    cleanupTenantId = tenant.id

    // Create super-admin user
    superAdminUser = await payload.create({
      collection: 'users',
      data: {
        email: `sa-vls-${ts}@example.com`,
        password: 'password123',
        name: 'Super Admin',
        roles: 'super-admin',
      },
      overrideAccess: true,
    })

    // Create tenant-admin user (associated with the test tenant)
    tenantAdminUser = await payload.create({
      collection: 'users',
      data: {
        email: `ta-vls-${ts}@example.com`,
        password: 'password123',
        name: 'Tenant Admin',
        roles: 'tenant-admin',
        tenants: [{ tenant: tenant.id }],
      },
      overrideAccess: true,
    })

    // Create a page as super-admin with 2 blocks (creates as draft with versions)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pageData: any = {
      slug: `vls-page-${ts}`,
      title: 'Test Page',
      tenant: tenant.id,
      layout: [
        {
          blockType: 'hero',
          title: 'Original Hero Title',
          subtitle: 'Original Subtitle',
          cta: { type: 'custom', url: '#', label: 'Click' },
        },
        {
          blockType: 'text',
          heading: 'Original Heading',
        },
      ],
    }
    const createdPage = await payload.create({
      collection: 'pages',
      data: pageData,
      overrideAccess: true,
    })
    pageId = createdPage.id as number
  })

  /**
   * Helper: fetch the current page from the database to get
   * the authoritative layout (with auto-generated block IDs).
   */
  async function getFreshLayout(): Promise<NonNullable<Page['layout']>> {
    const fresh = await payload.findByID({
      collection: 'pages',
      id: pageId,
      overrideAccess: true,
    }) as unknown as Page
    return fresh.layout ?? []
  }

  // ── Test 1: Tenant-admin structural changes are rejected ──────────────

  it('rejects layout structure changes for tenant-admin', async () => {
    const layout = await getFreshLayout()
    const originalCount = layout.length

    // 1a. Adding a block
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addLayout: any = [...layout, { blockType: 'text', heading: 'New Block' }]
    await expect(
      payload.update({
        collection: 'pages',
        id: pageId,
        data: { layout: addLayout },
        user: tenantAdminUser,
        overrideAccess: true,
      }),
    ).rejects.toThrow(
      /restricted to super-admin/,
    )

    // 1b. Removing a block
    const removeLayout = layout.slice(0, originalCount - 1)
    await expect(
      payload.update({
        collection: 'pages',
        id: pageId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { layout: removeLayout } as any,
        user: tenantAdminUser,
        overrideAccess: true,
      }),
    ).rejects.toThrow(
      /restricted to super-admin/,
    )

    // 1c. Reordering blocks
    const reorderLayout = [layout[1], layout[0]]
    await expect(
      payload.update({
        collection: 'pages',
        id: pageId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { layout: reorderLayout } as any,
        user: tenantAdminUser,
        overrideAccess: true,
      }),
    ).rejects.toThrow(
      /restricted to super-admin/,
    )
  })

  // ── Test 2: Tenant-admin content edits are allowed ─────────────────────

  it('allows content-only edits for tenant-admin', async () => {
    const layout = await getFreshLayout()

    // Change only the hero title — keep everything else identical
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contentEditLayout: any = layout.map((block) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((block as any).blockType === 'hero') {
        return {
          ...block,
          title: 'Updated Hero Title via tenant-admin',
        }
      }
      return { ...block }
    })

    const result = await payload.update({
      collection: 'pages',
      id: pageId,
      data: { layout: contentEditLayout },
      user: tenantAdminUser,
      overrideAccess: true,
    })

    expect(result).toBeDefined()
    expect(result.id).toBe(pageId)
  })

  // ── Test 3: Super-admin bypasses the hook ──────────────────────────────

  it('allows super-admin to make any structural changes', async () => {
    const layout = await getFreshLayout()

    // Super-admin adds a block
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newBlock: any = { blockType: 'text', heading: 'Added by Super Admin' }
    const superAdminLayout = [...layout, newBlock]

    const result = await payload.update({
      collection: 'pages',
      id: pageId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { layout: superAdminLayout } as any,
      user: superAdminUser,
      overrideAccess: true,
    })
    const resultPage = result as unknown as Page

    expect(result).toBeDefined()
    // Verify the new block was actually stored
    expect(resultPage.layout).toHaveLength(layout.length + 1)
  })

  // ── Test 4: Metadata-only changes pass for tenant-admin ────────────────

  it('allows metadata-only updates for tenant-admin', async () => {
    const result = await payload.update({
      collection: 'pages',
      id: pageId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { title: 'Updated Title' } as any,
      user: tenantAdminUser,
      overrideAccess: true,
    })

    expect(result).toBeDefined()
    expect(result.title).toBe('Updated Title')
  })

  afterAll(async () => {
    if (payload) {
      try { await payload.delete({ collection: 'pages', id: pageId, overrideAccess: true }) } catch { /* ignore */ }
      try { await payload.delete({ collection: 'users', id: superAdminUser.id, overrideAccess: true }) } catch { /* ignore */ }
      try { await payload.delete({ collection: 'users', id: tenantAdminUser.id, overrideAccess: true }) } catch { /* ignore */ }
      try { await payload.delete({ collection: 'tenants', id: cleanupTenantId, overrideAccess: true }) } catch { /* ignore */ }
    }
  })
})
