import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Ensures only one Footer document exists per tenant.
 *
 * Uses a beforeChange hook instead of a DB unique constraint because the
 * multi-tenant plugin injects `tenant` as a relationship field (not a direct
 * column), and `unique: true` does not compose with relationship fields.
 *
 * Checks on create (and on update if the tenant reference changed).
 */
export const ensureUniqueTenant =
  (collectionSlug: string): CollectionBeforeChangeHook =>
  async ({ data, req: { payload }, operation, originalDoc }) => {
    if (operation === 'create') {
      const tenantId =
        typeof data.tenant === 'object' ? data.tenant.id : data.tenant
      if (!tenantId) return data

      const existing = await payload.find({
        collection: collectionSlug as 'footer',
        where: { tenant: { equals: tenantId } },
        limit: 1,
        pagination: false,
        overrideAccess: true,
      })

      if (existing.docs.length > 0) {
        throw new Error(
          `This tenant already has a ${collectionSlug}. Only one ${collectionSlug} per tenant is allowed.`,
        )
      }
    }

    return data
  }
