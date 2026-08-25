import { describe, it, expect, beforeAll, vi } from 'vitest'
import { getPayload } from 'payload'
import config from '@/payload.config'
import {
  adaptSmokeProduct,
  buildFeatures,
  CATEGORIES,
  findCategoryBySlug,
  productToData,
  run,
  SNEAKER_PRODUCTS,
  upsertCategory,
  upsertProduct,
  TENANT_SLUG,
  type SneakerProduct,
} from '../../../scripts/seed-mood-full'
import { SMOKE_PRODUCTS } from '../../../scripts/seed-mood-payments'

describe('buildFeatures', () => {
  it('returns an object with payments, catalog, stripeAccountStatus, and stripeAccountId set', () => {
    const result = buildFeatures({}, 'acct_test_123')

    expect(result).toEqual({
      payments: true,
      catalog: true,
      stripeAccountStatus: 'active',
      stripeAccountId: 'acct_test_123',
    })
  })

  it('preserves existing feature keys not managed by the seed', () => {
    const result = buildFeatures({ welcomeBanner: true, customFlag: 'value' }, 'acct_x')

    expect(result).toEqual({
      welcomeBanner: true,
      customFlag: 'value',
      payments: true,
      catalog: true,
      stripeAccountStatus: 'active',
      stripeAccountId: 'acct_x',
    })
  })

  it('overrides previous payments/catalog values', () => {
    const result = buildFeatures(
      { payments: false, catalog: false, stripeAccountStatus: 'rejected' },
      'acct_new',
    )

    expect(result.payments).toBe(true)
    expect(result.catalog).toBe(true)
    expect(result.stripeAccountStatus).toBe('active')
    expect(result.stripeAccountId).toBe('acct_new')
  })
})

describe('productToData', () => {
  const sampleSneaker: SneakerProduct = {
    title: 'Test Shoe',
    slug: 'test-shoe',
    description: 'A test shoe.',
    price: 9999,
    currency: 'USD',
    categorySlug: 'running',
    stock: 42,
    sku: 'TEST-1',
  }

  it('maps a sneaker to the Payload data shape with all required fields', () => {
    const result = productToData(sampleSneaker, 7, 11)

    expect(result).toMatchObject({
      title: 'Test Shoe',
      slug: 'test-shoe',
      price: 9999,
      currency: 'USD',
      images: [],
      category: 7,
      stock: 42,
      sku: 'TEST-1',
      status: 'published',
      tenant: 11,
    })
    expect(result.description).toMatchObject({ root: expect.any(Object) })
  })

  it('includes compareAtPrice when defined', () => {
    const onSale = { ...sampleSneaker, compareAtPrice: 12999 }
    const result = productToData(onSale, 7, 11)

    expect(result.compareAtPrice).toBe(12999)
  })

  it('omits compareAtPrice when undefined', () => {
    const result = productToData(sampleSneaker, 7, 11)

    expect('compareAtPrice' in result).toBe(false)
  })

  it('wraps description via makeRichText', () => {
    const result = productToData(sampleSneaker, 7, 11)
    const children = (result.description as { root: { children: Array<{ text: string }> } }).root
      .children

    expect(children).toHaveLength(1)
    expect(children[0].text).toBe('A test shoe.')
  })
})

describe('adaptSmokeProduct', () => {
  it('adapts a USD smoke product to the generic shape with stock 100 and a generated SKU', () => {
    const result = adaptSmokeProduct(
      { title: 'Smoke USD', slug: 'smoke-usd', price: 1999, currency: 'USD' },
      11,
    )

    expect(result).toMatchObject({
      title: 'Smoke USD',
      slug: 'smoke-usd',
      price: 1999,
      currency: 'USD',
      images: [],
      category: undefined,
      stock: 100,
      sku: 'SMOKE-USD',
      status: 'published',
      tenant: 11,
    })
    expect(result.description).toMatchObject({ root: expect.any(Object) })
  })

  it('generates SKU using the currency', () => {
    const result = adaptSmokeProduct(
      { title: 'Smoke EUR', slug: 'smoke-eur', price: 1999, currency: 'EUR' },
      11,
    )

    expect(result.sku).toBe('SMOKE-EUR')
  })
})

describe('findCategoryBySlug + upsertCategory (integration)', () => {
  let payload: Awaited<ReturnType<typeof getPayload>>
  let tenantId: number

  beforeAll(async () => {
    payload = await getPayload({ config })
    // Self-contained seed: re-use an existing mood tenant if present,
    // otherwise create the bare minimum needed for the helpers under test.
    const existing = await payload.find({
      collection: 'tenants',
      where: { slug: { equals: TENANT_SLUG } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.totalDocs > 0) {
      tenantId = (existing.docs[0] as { id: number }).id
      return
    }
    const created = await payload.create({
      collection: 'tenants',
      data: {
        slug: TENANT_SLUG,
        name: 'Mood',
        domain: 'mood.localhost',
        serviceType: 'tienda-online',
        frontendType: 'nextjs',
        status: 'active',
        ecommerceTier: 'none',
        features: { catalog: true, payments: true },
      },
      overrideAccess: true,
    })
    tenantId = (created as { id: number }).id
  })

  it('returns null when the category does not exist', async () => {
    const result = await findCategoryBySlug(payload, tenantId, 'no-such-category')
    expect(result).toBeNull()
  })

  it('upsertCategory creates when missing and returns "created"', async () => {
    const unique = `running-${Date.now()}`
    const { action } = await upsertCategory(payload, tenantId, {
      name: 'Running',
      slug: unique,
    })

    expect(action).toBe('created')
    const found = await findCategoryBySlug(payload, tenantId, unique)
    expect(found).not.toBeNull()
  })

  it('upsertCategory updates when present and returns "updated" (idempotent)', async () => {
    const unique = `casual-${Date.now()}`
    const first = await upsertCategory(payload, tenantId, { name: 'Casual', slug: unique })
    const second = await upsertCategory(payload, tenantId, {
      name: 'Casual Renamed',
      slug: unique,
      description: 'Updated desc',
    })

    expect(first.action).toBe('created')
    expect(second.action).toBe('updated')

    const found = await findCategoryBySlug(payload, tenantId, unique)
    expect(found).not.toBeNull()
    const doc = await payload.findByID({
      collection: 'product-categories',
      id: found!.id,
      overrideAccess: true,
    })
    expect((doc as { name: string }).name).toBe('Casual Renamed')
    expect((doc as { description?: string }).description).toBe('Updated desc')
  })
})

describe('upsertProduct (integration)', () => {
  let payload: Awaited<ReturnType<typeof getPayload>>
  let tenantId: number
  let runningCategoryId: number

  beforeAll(async () => {
    payload = await getPayload({ config })
    const tenant = await payload.find({
      collection: 'tenants',
      where: { slug: { equals: TENANT_SLUG } },
      limit: 1,
      overrideAccess: true,
    })
    tenantId = (tenant.docs[0] as { id: number }).id

    const unique = `running-upsert-${Date.now()}`
    await upsertCategory(payload, tenantId, { name: 'Running', slug: unique })
    const found = await findCategoryBySlug(payload, tenantId, unique)
    runningCategoryId = found!.id
  })

  it('creates a product when slug is absent and returns "created"', async () => {
    const unique = `nike-pegasus-test-${Date.now()}`
    const data = productToData(
      {
        title: 'Nike Test',
        slug: unique,
        description: 'Test product',
        price: 14999,
        currency: 'USD',
        categorySlug: 'running',
        stock: 10,
        sku: `TEST-${Date.now()}`,
      },
      runningCategoryId,
      tenantId,
    )

    const { action } = await upsertProduct(payload, tenantId, data)
    expect(action).toBe('created')
  })

  it('updates the product when slug is present and returns "updated" (idempotent)', async () => {
    const unique = `nike-pegasus-update-${Date.now()}`
    const baseData = productToData(
      {
        title: 'Nike Test',
        slug: unique,
        description: 'Test product',
        price: 14999,
        currency: 'USD',
        categorySlug: 'running',
        stock: 10,
        sku: `TEST-${Date.now()}`,
      },
      runningCategoryId,
      tenantId,
    )

    const first = await upsertProduct(payload, tenantId, baseData)
    const updatedData = { ...baseData, stock: 50, price: 19999 }
    const second = await upsertProduct(payload, tenantId, updatedData)

    expect(first.action).toBe('created')
    expect(second.action).toBe('updated')

    const found = await payload.find({
      collection: 'products',
      where: {
        and: [{ slug: { equals: unique } }, { tenant: { equals: tenantId } }],
      },
      limit: 1,
      overrideAccess: true,
    })
    expect(found.totalDocs).toBe(1)
    const doc = found.docs[0] as { stock: number; price: number }
    expect(doc.stock).toBe(50)
    expect(doc.price).toBe(19999)
  })
})

describe('run() end-to-end (integration)', () => {
  let payload: Awaited<ReturnType<typeof getPayload>>
  let initialProductCount: number
  let initialCategoryCount: number
  let tenantId: number

  beforeAll(async () => {
    payload = await getPayload({ config })
    const moodTenant = await payload.find({
      collection: 'tenants',
      where: { slug: { equals: TENANT_SLUG } },
      limit: 1,
      overrideAccess: true,
    })
    if (moodTenant.totalDocs === 0) {
      throw new Error(`Test requires tenant "${TENANT_SLUG}"`)
    }
    tenantId = (moodTenant.docs[0] as { id: number }).id

    // Clean up any pre-existing seed data so this test is re-runnable on the same
    // DB. run() is idempotent, so without cleanup a second test run would see the
    // docs created by the first run and report a delta of 0 instead of 4 + 14.
    // Delete products first to avoid FK constraint issues with categories.
    const seedProductSlugs = [
      ...SNEAKER_PRODUCTS.map((p) => p.slug),
      ...SMOKE_PRODUCTS.map((p) => p.slug),
    ]
    const existingProducts = await payload.find({
      collection: 'products',
      where: {
        and: [{ slug: { in: seedProductSlugs } }, { tenant: { equals: tenantId } }],
      },
      overrideAccess: true,
      limit: 100,
    })
    for (const doc of existingProducts.docs) {
      await payload.delete({
        collection: 'products',
        id: (doc as { id: number }).id,
        overrideAccess: true,
      })
    }

    const seedCategorySlugs = CATEGORIES.map((c) => c.slug)
    const existingCategories = await payload.find({
      collection: 'product-categories',
      where: {
        and: [{ slug: { in: seedCategorySlugs } }, { tenant: { equals: tenantId } }],
      },
      overrideAccess: true,
      limit: 100,
    })
    for (const doc of existingCategories.docs) {
      await payload.delete({
        collection: 'product-categories',
        id: (doc as { id: number }).id,
        overrideAccess: true,
      })
    }

    // Snapshot current counts (after cleanup, so seed slugs are gone).
    const productsBefore = await payload.find({
      collection: 'products',
      where: { tenant: { equals: tenantId } },
      overrideAccess: true,
      limit: 0,
    })
    const categoriesBefore = await payload.find({
      collection: 'product-categories',
      where: { tenant: { equals: tenantId } },
      overrideAccess: true,
      limit: 0,
    })
    initialProductCount = productsBefore.totalDocs
    initialCategoryCount = categoriesBefore.totalDocs
  })

  it('upserts all 4 categories and 14 products, and is idempotent on re-run', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called')
    }) as never)

    try {
      await expect(run()).rejects.toThrow('process.exit called')
      await expect(run()).rejects.toThrow('process.exit called')
    } finally {
      exitSpy.mockRestore()
    }

    const productsAfter = await payload.find({
      collection: 'products',
      where: { tenant: { equals: tenantId } },
      overrideAccess: true,
      limit: 0,
    })
    const categoriesAfter = await payload.find({
      collection: 'product-categories',
      where: { tenant: { equals: tenantId } },
      overrideAccess: true,
      limit: 0,
    })

    const newCategories = categoriesAfter.totalDocs - initialCategoryCount
    const newProducts = productsAfter.totalDocs - initialProductCount

    expect(newCategories).toBe(4)
    expect(newProducts).toBe(14)
  }, 60_000)
})
