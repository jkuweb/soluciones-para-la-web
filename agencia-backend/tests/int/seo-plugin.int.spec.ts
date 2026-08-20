import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, expect } from 'vitest'

/**
 * Verifies that @payloadcms/plugin-seo injects the `meta` group into
 * the SEO-enabled collections (pages, posts) and not into the others.
 */
describe('SEO plugin field injection', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  }, 60000)

  function findMetaGroup(fields: any[] | undefined): any | undefined {
    for (const f of fields ?? []) {
      if (!f) continue
      if (f?.name === 'meta' && f?.type === 'group') return f
      if (Array.isArray(f?.fields)) {
        const found = findMetaGroup(f.fields)
        if (found) return found
      }
      if (Array.isArray(f?.tabs)) {
        for (const tab of f.tabs) {
          const found = findMetaGroup(tab?.fields)
          if (found) return found
        }
      }
    }
    return undefined
  }

  /**
   * Recursively find a field by `name` anywhere in the field tree.
   * When `skipInsideGroup` is provided, recursion stops at any group
   * whose `name` matches — useful for excluding `meta.title` when
   * looking for the collection's own `title` field.
   */
  function findFieldByName(
    fields: any[] | undefined,
    targetName: string,
    skipInsideGroup?: string,
  ): any | undefined {
    for (const f of fields ?? []) {
      if (!f) continue
      if (Array.isArray(f?.fields)) {
        if (skipInsideGroup && f?.type === 'group' && f?.name === skipInsideGroup) {
          // Skip recursing into this group
        } else {
          const found = findFieldByName(f.fields, targetName, skipInsideGroup)
          if (found) return found
        }
      }
      if (Array.isArray(f?.tabs)) {
        for (const tab of f.tabs) {
          const found = findFieldByName(tab?.fields, targetName, skipInsideGroup)
          if (found) return found
        }
      }
      if (f?.name === targetName) {
        return f
      }
    }
    return undefined
  }

  function namesOf(fields: any[]): string[] {
    return (fields ?? []).map((f) => f?.name).filter(Boolean)
  }

  it('adds a top-level `meta` group to `pages`', () => {
    const pages = payload.collections['pages']
    const meta = findMetaGroup(pages.config.fields)
    expect(meta).toBeDefined()
    expect(namesOf(meta.fields)).toEqual(expect.arrayContaining(['title', 'description', 'image']))
  })

  it('adds a top-level `meta` group to `posts`', () => {
    const posts = payload.collections['posts']
    const meta = findMetaGroup(posts.config.fields)
    expect(meta).toBeDefined()
    expect(namesOf(meta.fields)).toEqual(expect.arrayContaining(['title', 'description', 'image']))
  })

  it('does NOT add a `meta` group to header, footer, categories, tags, media, users, tenants', () => {
    const outOfScope = ['header', 'footer', 'categories', 'tags', 'media', 'users', 'tenants']
    for (const slug of outOfScope) {
      const collection = payload.collections[slug as keyof typeof payload.collections]
      expect(collection, `collection ${slug} should exist`).toBeDefined()
      const meta = findMetaGroup(collection.config.fields)
      expect(meta, `${slug} should not have a meta group`).toBeUndefined()
    }
  })

  it('preserves the root-level `title` field on `pages` (no shadowing)', () => {
    const pages = payload.collections['pages']
    const rootTitle = findFieldByName(pages.config.fields, 'title', 'meta')
    expect(rootTitle).toBeDefined()
    expect(rootTitle?.type).toBe('text')
  })
})
