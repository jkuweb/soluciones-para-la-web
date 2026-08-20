import { describe, it, expect, beforeEach } from 'vitest'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { handleEnableFeature, handleDisableFeature, handleStatus, getTenantBySlug } from '../../../scripts/add-feature'
import { DEFAULT_FEATURES } from '../../../scripts/lib/feature-keys'

let testTenantId: number

beforeEach(async () => {
  const payload = await getPayload({ config })
  const slug = `test-${Date.now()}`
  const created = await payload.create({
    collection: 'tenants',
    data: {
      name: `Test ${slug}`,
      slug,
      domain: `${slug}.test`,
      serviceType: 'tienda-online',
      frontendType: 'nextjs',
      status: 'pending',
      ecommerceTier: 'none',
      features: { ...DEFAULT_FEATURES },
      blogEnabled: false,
    },
  })
  testTenantId = created.id as number
})

describe('add-feature enable/disable/status', () => {
  const resolveSlug = async (): Promise<string> => {
    const payload = await getPayload({ config })
    const tenants = await payload.find({
      collection: 'tenants',
      where: { id: { equals: testTenantId } },
      limit: 1,
    })
    return (tenants.docs[0] as { slug: string }).slug
  }

  it('enables a feature on a tenant', async () => {
    const slug = await resolveSlug()
    await handleEnableFeature(slug, 'catalog')
    const tenant = await getTenantBySlug(slug)
    expect(tenant?.features.catalog).toBe(true)
  })

  it('is idempotent: enabling twice does not throw', async () => {
    const slug = await resolveSlug()
    await handleEnableFeature(slug, 'catalog')
    await expect(handleEnableFeature(slug, 'catalog')).resolves.toBeUndefined()
    const tenant = await getTenantBySlug(slug)
    expect(tenant?.features.catalog).toBe(true)
  })

  it('disables a feature', async () => {
    const slug = await resolveSlug()
    await handleEnableFeature(slug, 'catalog')
    await handleDisableFeature(slug, 'catalog')
    const tenant = await getTenantBySlug(slug)
    expect(tenant?.features.catalog).toBe(false)
  })

  it('disable is idempotent: disabling twice does not throw', async () => {
    const slug = await resolveSlug()
    await expect(handleDisableFeature(slug, 'shipping')).resolves.toBeUndefined()
    const tenant = await getTenantBySlug(slug)
    expect(tenant?.features.shipping).toBe(false)
  })

  it('throws on non-existent tenant', async () => {
    await expect(handleEnableFeature('does-not-exist', 'catalog')).rejects.toThrow()
  })

  it('throws on invalid feature name', async () => {
    const slug = await resolveSlug()
    await expect(handleEnableFeature(slug, 'bogus')).rejects.toThrow()
  })

  it('status does not modify anything', async () => {
    const slug = await resolveSlug()
    const before = await getTenantBySlug(slug)
    await handleStatus(slug)
    const after = await getTenantBySlug(slug)
    expect(after?.features).toEqual(before?.features)
  })
})
