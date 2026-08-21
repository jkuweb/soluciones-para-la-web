import { describe, it, expect } from 'vitest'
import {
  ECOMMERCE_TIERS,
  FEATURE_KEYS,
  DEFAULT_FEATURES,
  isValidEcommerceTier,
  isValidFeatureName,
  defaultFeaturesForTier,
  isValidFeaturesObject,
} from '../../../../scripts/lib/feature-keys'

describe('feature-keys', () => {
  describe('constants', () => {
    it('exports the four expected tiers', () => {
      expect(ECOMMERCE_TIERS).toEqual(['none', 'lite', 'standard', 'full'])
    })

    it('exports the ten expected feature keys', () => {
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
        'welcomeBanner',
      ]
      for (const key of expected) {
        expect(FEATURE_KEYS).toContain(key)
      }
      expect(FEATURE_KEYS).toHaveLength(expected.length)
    })

    it('every feature key has a default of false', () => {
      for (const key of FEATURE_KEYS) {
        expect(DEFAULT_FEATURES[key]).toBe(false)
      }
    })
  })

  describe('isValidEcommerceTier', () => {
    it('accepts valid tiers', () => {
      for (const tier of ECOMMERCE_TIERS) {
        expect(isValidEcommerceTier(tier)).toBe(true)
      }
    })

    it('rejects unknown values', () => {
      expect(isValidEcommerceTier('pro')).toBe(false)
      expect(isValidEcommerceTier('')).toBe(false)
      expect(isValidEcommerceTier(null)).toBe(false)
      expect(isValidEcommerceTier(42)).toBe(false)
    })
  })

  describe('isValidFeatureName', () => {
    it('accepts valid feature keys', () => {
      for (const key of FEATURE_KEYS) {
        expect(isValidFeatureName(key)).toBe(true)
      }
    })

    it('rejects unknown feature names', () => {
      expect(isValidFeatureName('blog')).toBe(false)
      expect(isValidFeatureName('Catalog')).toBe(false) // case-sensitive
      expect(isValidFeatureName('')).toBe(false)
    })
  })

  describe('defaultFeaturesForTier', () => {
    it('returns all false for tier "none"', () => {
      const features = defaultFeaturesForTier('none')
      expect(features.catalog).toBe(false)
      expect(features.payments).toBe(false)
      expect(Object.values(features).every((v) => v === false)).toBe(true)
    })

    it('returns catalog + payments for tier "lite"', () => {
      const features = defaultFeaturesForTier('lite')
      expect(features.catalog).toBe(true)
      expect(features.payments).toBe(true)
      expect(features.shipping).toBe(false)
    })

    it('returns catalog + payments + shipping + coupons for tier "standard"', () => {
      const features = defaultFeaturesForTier('standard')
      expect(features.catalog).toBe(true)
      expect(features.payments).toBe(true)
      expect(features.shipping).toBe(true)
      expect(features.coupons).toBe(true)
      expect(features.reviews).toBe(false)
      expect(features.wishlist).toBe(false)
    })

    it('returns catalog + payments + shipping + coupons + reviews + wishlist + taxes for tier "full"', () => {
      const features = defaultFeaturesForTier('full')
      expect(features.catalog).toBe(true)
      expect(features.payments).toBe(true)
      expect(features.shipping).toBe(true)
      expect(features.coupons).toBe(true)
      expect(features.reviews).toBe(true)
      expect(features.wishlist).toBe(true)
      expect(features.taxes).toBe(true)
      expect(features.abandonedCart).toBe(false)
      expect(features.subscriptions).toBe(false)
    })

    it('returns a fresh object each call (no shared mutation)', () => {
      const a = defaultFeaturesForTier('lite')
      const b = defaultFeaturesForTier('lite')
      a.catalog = false
      expect(b.catalog).toBe(true)
    })
  })

  describe('isValidFeaturesObject', () => {
    it('accepts a complete features object', () => {
      expect(isValidFeaturesObject({ ...DEFAULT_FEATURES, catalog: true })).toBe(true)
    })

    it('rejects objects missing keys', () => {
      const incomplete: Record<string, unknown> = { ...DEFAULT_FEATURES }
      delete incomplete.catalog
      expect(isValidFeaturesObject(incomplete)).toBe(false)
    })

    it('rejects objects with non-boolean values', () => {
      expect(isValidFeaturesObject({ ...DEFAULT_FEATURES, catalog: 'yes' as unknown as boolean })).toBe(false)
    })

    it('rejects null, arrays, and primitives', () => {
      expect(isValidFeaturesObject(null)).toBe(false)
      expect(isValidFeaturesObject([])).toBe(false)
      expect(isValidFeaturesObject('foo')).toBe(false)
    })
  })
})
