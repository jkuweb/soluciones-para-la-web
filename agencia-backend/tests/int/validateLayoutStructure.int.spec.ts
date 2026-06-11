import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { validateLayoutStructure } from '@/hooks/validateLayoutStructure'
import { describe, it, beforeAll, expect } from 'vitest'
import type { Page, User } from '@/payload-types'

let payload: Payload
let pageId: number
let superAdminUser: User
let tenantAdminUser: User

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

    // Create a page as super-admin with 2 blocks
    const createdPage = await payload.create({
      collection: 'pages',
      data: {
        slug: `vls-page-${ts}`,
        title: 'Test Page',
        status: 'draft',
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
      },
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
    }) as Page
    return fresh.layout ?? []
  }

  // ── Test 1: Tenant-admin structural changes are rejected ──────────────

  it('rejects layout structure changes for tenant-admin', async () => {
    const layout = await getFreshLayout()
    const originalCount = layout.length

    // 1a. Adding a block
    const addLayout = [
      ...layout,
      { blockType: 'text', heading: 'New Block' } as any,
    ]
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
        data: { layout: removeLayout },
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
        data: { layout: reorderLayout },
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
    const contentEditLayout = layout.map((block) => {
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
      data: { layout: contentEditLayout as any },
      user: tenantAdminUser,
      overrideAccess: true,
    }) as Page

    expect(result).toBeDefined()
    expect(result.id).toBe(pageId)
  })

  // ── Test 3: Super-admin bypasses the hook ──────────────────────────────

  it('allows super-admin to make any structural changes', async () => {
    const layout = await getFreshLayout()

    // Super-admin adds a block
    const newBlock = { blockType: 'text', heading: 'Added by Super Admin' } as any
    const superAdminLayout = [...layout, newBlock]

    const result = await payload.update({
      collection: 'pages',
      id: pageId,
      data: { layout: superAdminLayout },
      user: superAdminUser,
      overrideAccess: true,
    }) as Page

    expect(result).toBeDefined()
    // Verify the new block was actually stored
    expect(result.layout).toHaveLength(layout.length + 1)
  })

  // ── Test 4: Metadata-only changes pass for tenant-admin ────────────────

  it('allows metadata-only updates for tenant-admin', async () => {
    const result = await payload.update({
      collection: 'pages',
      id: pageId,
      data: {
        title: 'Updated Title',
        status: 'published',
      },
      user: tenantAdminUser,
      overrideAccess: true,
    }) as Page

    expect(result).toBeDefined()
    expect(result.title).toBe('Updated Title')
    expect(result.status).toBe('published')
  })
})
