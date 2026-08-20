import { describe, it, expect } from 'vitest'
import { FEATURES, getFeature, listFeatureSlugs } from '../../../../scripts/features'

describe('features registry', () => {
  it('exports 9 features', () => {
    expect(listFeatureSlugs()).toHaveLength(9)
  })

  it('includes all expected slugs', () => {
    const expected = [
      'catalog',
      'payments',
      'shipping',
      'coupons',
      'reviews',
      'wishlist',
      'taxes',
      'abandonedCart',
      'subscriptions',
    ]
    for (const slug of expected) {
      expect(getFeature(slug)).toBeDefined()
    }
  })

  it('every feature has slug, displayName, description, install, uninstall', () => {
    for (const [slug, mod] of Object.entries(FEATURES)) {
      expect(mod.slug).toBe(slug)
      expect(typeof mod.displayName).toBe('string')
      expect(typeof mod.description).toBe('string')
      expect(typeof mod.install).toBe('function')
      expect(typeof mod.uninstall).toBe('function')
    }
  })

  it('every feature stub installs successfully with a minimal context', async () => {
    const ctx = {
      tenantSlug: 'test',
      destDir: '/tmp/nonexistent',
      log: () => {},
    }
    for (const [, mod] of Object.entries(FEATURES)) {
      const result = await mod.install(ctx)
      expect(result.ok).toBe(true)
      expect(Array.isArray(result.copiedFiles)).toBe(true)
    }
  })

  it('every feature stub uninstalls successfully', async () => {
    const ctx = {
      tenantSlug: 'test',
      destDir: '/tmp/nonexistent',
      log: () => {},
    }
    for (const [, mod] of Object.entries(FEATURES)) {
      const result = await mod.uninstall(ctx)
      expect(result.ok).toBe(true)
    }
  })
})
