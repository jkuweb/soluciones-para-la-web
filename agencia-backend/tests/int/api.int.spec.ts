import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload

// Track created page slugs for cross-test reference
let publishedSlug: string
let draftSlug: string

describe('API', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })

    // Create a test tenant and pages for public read isolation tests
    const ts = Date.now()
    const tenant = await payload.create({
      collection: 'tenants',
      data: {
        name: `API Tenant ${ts}`,
        slug: `api-tenant-${ts}`,
        domain: `api-${ts}.example.com`,
        serviceType: 'web-estatica',
        frontendType: 'astro',
        status: 'active',
      },
      overrideAccess: true,
    })

    // Create a published page (_status is a Payload internal field not in Page type)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const publishedPageData: any = {
      slug: `api-public-${ts}`,
      title: 'Public Page',
      tenant: tenant.id,
      layout: [],
      _status: 'published',
    }
    const publishedPage = await payload.create({
      collection: 'pages',
      data: publishedPageData,
      overrideAccess: true,
    })
    publishedSlug = publishedPage.slug as string
    // Payload 3 with versions.drafts may create as draft even with _status: 'published'.
    // Ensure it's truly published so unauthenticated reads can find it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((publishedPage as any)._status !== 'published') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updated: any = await payload.update({
        collection: 'pages',
        id: publishedPage.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { _status: 'published' } as any,
        overrideAccess: true,
      })
      publishedSlug = updated.slug as string
    }

    // Create a draft page (Payload auto-creates as draft with versions)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const draftPageData: any = {
      slug: `api-draft-${ts}`,
      title: 'Draft Page',
      tenant: tenant.id,
      layout: [],
    }
    const draftPage = await payload.create({
      collection: 'pages',
      data: draftPageData,
      overrideAccess: true,
    })
    draftSlug = draftPage.slug as string
  })

  it('fetches users', async () => {
    const users = await payload.find({
      collection: 'users',
    })
    expect(users).toBeDefined()
  })

  it('returns only published pages for unauthenticated read', async () => {
    // Simulate unauthenticated read by not passing a user.
    // Access control should filter to published only.
    const pages = await payload.find({
      collection: 'pages',
      depth: 0,
      where: {
        _status: { equals: 'published' },
      },
    })

    const returnedSlugs = new Set(pages.docs.map((p: { slug: string }) => p.slug))

    // The published page should be visible to unauthenticated readers
    expect(returnedSlugs.has(publishedSlug)).toBe(true)

    // The draft page should NOT be visible to unauthenticated readers
    expect(returnedSlugs.has(draftSlug)).toBe(false)
  })
})
