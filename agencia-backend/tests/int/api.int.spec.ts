import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload

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

    // Create a published page (_status not in generated types until regen)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const publishedPageData: any = {
      slug: `api-public-${ts}`,
      title: 'Public Page',
      tenant: tenant.id,
      layout: [],
      _status: 'published',
    }
    await payload.create({
      collection: 'pages',
      data: publishedPageData,
      overrideAccess: true,
    })

    // Create a draft page (Payload auto-creates as draft with versions)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const draftPageData: any = {
      slug: `api-draft-${ts}`,
      title: 'Draft Page',
      tenant: tenant.id,
      layout: [],
    }
    await payload.create({
      collection: 'pages',
      data: draftPageData,
      overrideAccess: true,
    })
  })

  it('fetches users', async () => {
    const users = await payload.find({
      collection: 'users',
    })
    expect(users).toBeDefined()
  })

  it('returns only published pages for unauthenticated read', async () => {
    // Simulate unauthenticated read by not passing a user
    const pages = await payload.find({
      collection: 'pages',
      depth: 0,
    })

    // Unauthenticated find should return only published pages
    for (const page of pages.docs) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((page as any)._status).toBe('published')
    }

    // All returned docs should have _status === 'published'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(pages.docs.every((p) => (p as any)._status === 'published')).toBe(true)
  })
})
