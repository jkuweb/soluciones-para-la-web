import type { CollectionBeforeChangeHook, Where } from 'payload'
import { APIError } from 'payload'

/**
 * Factory that returns a beforeChange hook enforcing per-tenant slug uniqueness.
 *
 * @param collectionSlug - The slug of the collection to query (e.g. 'posts', 'categories')
 * @returns A CollectionBeforeChangeHook that rejects duplicates within the same tenant
 *
 * Two different tenants MAY share the same slug. Within a single tenant,
 * duplicates are rejected. On update, the current document is excluded from
 * the duplicate check.
 */
export function validateUniqueSlug(collectionSlug: string): CollectionBeforeChangeHook {
  return async ({ data, originalDoc, operation, req }) => {
    if (!data) return

    const slug = data.slug as string | undefined
    if (!slug) return

    const tenant = (data.tenant ?? originalDoc?.tenant) as number | undefined
    if (!tenant) return

    const where: Where = {
      tenant: { equals: tenant },
      slug: { equals: slug },
    }

    if (operation === 'update' && originalDoc?.id) {
      where.id = { not_equals: originalDoc.id }
    }

    const existing = await req.payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: collectionSlug as any,
      where,
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })

    if (existing.docs.length > 0) {
      throw new APIError(
        `A document with slug "${slug}" already exists for this tenant. Please choose a different slug.`,
        400,
      )
    }
  }
}
