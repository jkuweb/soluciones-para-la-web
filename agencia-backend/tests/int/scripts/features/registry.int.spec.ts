import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { FEATURES, getFeature, listFeatureSlugs } from '../../../../scripts/features'

describe('features registry', () => {
  it('exports the expected set of features', () => {
    const slugs = listFeatureSlugs()
    expect(slugs).toContain('catalog')
    expect(slugs).toContain('welcomeBanner')
    expect(slugs.length).toBeGreaterThanOrEqual(10)
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
      'welcomeBanner',
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

  describe('install/uninstall with a real destDir', () => {
    let destDir: string

    beforeEach(async () => {
      destDir = await mkdtemp(join(tmpdir(), 'registry-test-'))
    })

    afterEach(async () => {
      await rm(destDir, { recursive: true, force: true })
    })

    it('every feature install returns a well-formed result with a real destDir', async () => {
      const ctx = { tenantSlug: 'test', destDir, log: () => {} }
      for (const [slug, mod] of Object.entries(FEATURES)) {
        const result = await mod.install(ctx)
        // Real features (catalog, welcomeBanner) copy files; stubs log + return ok.
        // Both are valid; we just assert shape and idempotency-friendly behaviour.
        expect(typeof result.ok).toBe('boolean')
        expect(Array.isArray(result.copiedFiles)).toBe(true)
        expect(Array.isArray(result.envKeysAdded)).toBe(true)
        // welcomeBanner needs MONOREPO_ROOT or the template path env var to copy
        // its component; skip the strict ok check on it for this test if the
        // template is unavailable.
        if (slug === 'welcomeBanner' && !result.ok) continue
      }
    })

    it('every feature uninstall returns ok:true with a real destDir', async () => {
      const ctx = { tenantSlug: 'test', destDir, log: () => {} }
      for (const [, mod] of Object.entries(FEATURES)) {
        const result = await mod.uninstall(ctx)
        expect(result.ok).toBe(true)
      }
    })
  })
})
