import type { CollectionBeforeValidateHook } from 'payload'

/**
 * Auto-generates slug and title when empty (for autosave/create flow).
 *
 * Priority for slug:
 * 1. Existing slug (already set by the form)
 * 2. Title → slugified
 * 3. Fallback: page-{timestamp} (autosave before user types anything)
 *
 * Title gets a fallback label when empty so it doesn't violate NOT NULL.
 */
export const generateSlug: CollectionBeforeValidateHook = async ({ data, operation }) => {
  if (operation !== 'create' && operation !== 'update') {
    return data
  }

  if (!data) return data

  // Ensure title has a value for NOT NULL constraint
  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    data.title = data.slug && typeof data.slug === 'string'
      ? data.slug
      : `New Page ${new Date().toISOString().split('T')[0]}`
  }

  // Already has a slug, nothing else to do
  if (data.slug && typeof data.slug === 'string' && data.slug.trim().length > 0) {
    return data
  }

  // Generate slug from title
  data.slug = data.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim()

  // If title was just a fallback and produced an empty slug, use timestamp
  if (!data.slug) {
    data.slug = `page-${Date.now()}`
  }

  return data
}
