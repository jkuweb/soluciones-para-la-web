import { describe, it, expect } from 'vitest'
import { buildFeatures } from '../../../scripts/seed-mood-full'

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
