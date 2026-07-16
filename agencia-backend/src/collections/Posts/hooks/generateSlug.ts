import type { CollectionBeforeValidateHook } from 'payload'

/**
 * Slugify a string: lowercase, replace special chars with hyphens.
 */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Handles slug generation for non-super-admin users.
 *
 * Super-admin → the built-in `slugField()` handles slug generation via the
 * `generateSlug` checkbox's beforeChange hook. This hook does nothing.
 *
 * Non-super-admin → the slug row is hidden from the admin UI, so we must
 * auto-generate the slug from the title server-side.
 *
 * Also ensures the title has a fallback value (NOT NULL constraint during autosave).
 */
export const generateSlug: CollectionBeforeValidateHook = async ({ data, operation, req }) => {
  if (operation !== 'create' && operation !== 'update') {
    return data
  }

  if (!data) return data

  // Ensure title has a value for NOT NULL constraint during autosave
  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    data.title = `New Post ${new Date().toISOString().split('T')[0]}`
  }

  // Non-super-admin: auto-generate slug from title (they can't see the field)
  if (!req.user?.roles?.includes('super-admin')) {
    if (typeof data.title === 'string' && data.title.trim().length > 0) {
      data.slug = slugify(data.title)
    }
  }

  // Super-admin: the built-in slugField's generateSlug hook handles everything

  return data
}
