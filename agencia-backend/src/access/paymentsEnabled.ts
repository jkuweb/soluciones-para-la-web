import type { Access } from 'payload'

/**
 * Strict payments gate. Read/write/create all share this gate because the
 * spec (§3.2.1) requires it for every Orders operation.
 *
 * Returns `true` if the user is super-admin.
 * Returns `{ tenant: { in: [...] } }` if the user has at least one tenant
 *   with `features.payments === true` AND `features.stripeAccountStatus === 'active'`.
 * Returns `false` otherwise (fail-closed).
 *
 * Stripe status values: 'none' | 'pending' | 'active' | 'restricted' | 'rejected'.
 * Only 'active' is accepted. This is intentionally strict: OAuth not complete
 * or KYC partial = no orders.
 */
export const paymentsEnabledTenantAccess: Access = async ({ req }) => {
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
      const features = (tenant as { features?: {
        payments?: boolean
        stripeAccountStatus?: string
      } })?.features
      if (
        features?.payments === true &&
        features?.stripeAccountStatus === 'active'
      ) {
        allowedTenantIds.push(tenantId)
      }
    } catch {
      // Tenant lookup failed — skip this one.
    }
  }

  if (allowedTenantIds.length === 0) return false
  return { tenant: { in: allowedTenantIds } }
}
