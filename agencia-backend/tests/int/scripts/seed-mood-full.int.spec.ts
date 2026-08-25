import { describe, it, expect } from 'vitest'
import {
  adaptSmokeProduct,
  buildFeatures,
  productToData,
  type SneakerProduct,
} from '../../../scripts/seed-mood-full'

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
    const children = (result.description as { root: { children: Array<{ text: string }> } }).root.children

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
