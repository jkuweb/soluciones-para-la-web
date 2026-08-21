import type { Access } from 'payload'

/**
 * Catalog write/read for the admin panel.
 *
 * - super-admin: always allowed.
 * - tenant-admin/editor: allowed only if their tenant's `features.catalog` is `true`.
 * - anonymous: denied.
 */
export const catalogEnabledTenantAccess: Access = async ({ req }) => {
  const user = req.user
  if (!user) return false
  if (user.roles?.includes('super-admin')) return true

  const tenantRefs = user.tenants ?? []
  if (tenantRefs.length === 0) return false

  const allowedTenantIds: (string | number)[] = []
  for (const ref of tenantRefs) {
    const tenantId =
      typeof ref.tenant === 'object' ? ref.tenant.id : ref.tenant
    if (tenantId == null) continue
    try {
      const tenant = await req.payload.findByID({
        collection: 'tenants',
        id: tenantId,
        depth: 0,
        overrideAccess: true,
      })
      const features = (tenant as { features?: { catalog?: boolean } })?.features
      if (features?.catalog === true) {
        allowedTenantIds.push(tenantId)
      }
    } catch {
      // Tenant lookup failed — skip this one.
    }
  }

  if (allowedTenantIds.length === 0) return false
  return { tenant: { in: allowedTenantIds } }
}

/**
 * Public read for catalog collections. The storefront satisfies this with a
 * TENANT_SLUG env filter applied at the fetch layer (see nextjs-starter
 * `lib/payload.ts`). For direct Payload access, deny anonymous.
 */
export const catalogEnabledPublicRead: Access = ({ req }) => {
  if (!req.user) return false
  if (req.user.roles?.includes('super-admin')) return true
  return {
    tenant: {
      in: (req.user.tenants ?? []).map((t) =>
        typeof t.tenant === 'object' ? t.tenant.id : t.tenant,
      ),
    },
  }
}
