import { describe, it, expect } from 'vitest'
import {
  generateSeoTitle,
  generateSeoDescription,
  generateSeoImage,
} from '@/plugins/seo-helpers'

describe('generateSeoTitle', () => {
  it('appends the tenant name when tenant is populated', () => {
    const result = generateSeoTitle({
      doc: {
        title: 'About Us',
        tenant: { name: 'Acme Studio' },
      } as Record<string, unknown>,
    })
    expect(result).toBe('About Us | Acme Studio')
  })

  it('returns just the title when tenant is missing', () => {
    const result = generateSeoTitle({
      doc: { title: 'About Us' } as Record<string, unknown>,
    })
    expect(result).toBe('About Us')
  })

  it('returns just the title when tenant is an ID-only reference', () => {
    const result = generateSeoTitle({
      doc: { title: 'About Us', tenant: 1 } as Record<string, unknown>,
    })
    expect(result).toBe('About Us')
  })

  it('returns just the title when populated tenant has no name', () => {
    const result = generateSeoTitle({
      doc: { title: 'About Us', tenant: { id: 1 } } as Record<string, unknown>,
    })
    expect(result).toBe('About Us')
  })
})

describe('generateSeoDescription', () => {
  it('returns the post excerpt when present', () => {
    const result = generateSeoDescription({
      doc: { excerpt: 'A short summary.' } as Record<string, unknown>,
    })
    expect(result).toBe('A short summary.')
  })

  it('returns an empty string when there is no excerpt', () => {
    const result = generateSeoDescription({
      doc: { title: 'Page without excerpt' } as Record<string, unknown>,
    })
    expect(result).toBe('')
  })
})

describe('generateSeoImage', () => {
  it('returns heroImage when present', () => {
    const heroImage = { id: 1, url: 'https://example.com/img.jpg' }
    const result = generateSeoImage({
      doc: { heroImage } as Record<string, unknown>,
    })
    expect(result).toBe(heroImage)
  })

  it('returns null when there is no heroImage', () => {
    const result = generateSeoImage({
      doc: { title: 'No image' } as Record<string, unknown>,
    })
    expect(result).toBeNull()
  })
})
