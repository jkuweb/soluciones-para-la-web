import type { CollectionBeforeChangeHook, Where } from 'payload'
import { APIError } from 'payload'

/**
 * Validates slug uniqueness within a tenant.
 *
 * Since slugField() uses disableUnique=true (to allow the same slug
 * across different tenants), we enforce uniqueness at the application
 * level via this hook.
 *
 * Runs on both CREATE and UPDATE to prevent duplicate slugs from
 * being created in the first place.
 */
export const validateUniqueSlug: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  if (!data) return

  const slug = data.slug as string | undefined
  if (!slug) return

  // Resolve tenant: prefer current data, fallback to original document
  const tenant = (data.tenant ?? originalDoc?.tenant) as number | undefined
  if (!tenant) return

  // Build query: same tenant + same slug
  const where: Where = {
    tenant: { equals: tenant },
    slug: { equals: slug },
  }

  // On update, exclude the current document so we can detect real duplicates
  if (operation === 'update' && originalDoc?.id) {
    where.id = { not_equals: originalDoc.id }
  }

  const existing = await req.payload.find({
    collection: 'pages',
    where,
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })

  if (existing.docs.length > 0) {
    throw new APIError(
      `A page with slug "${slug}" already exists for this tenant. Please choose a different slug.`,
      400,
    )
  }
}
