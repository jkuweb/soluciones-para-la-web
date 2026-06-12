import type { Access } from 'payload'
import { resolveTenantIds } from '@/utilities/resolveTenantIds'

interface TenantAccessOptions {
  fieldName?: string
}

/**
 * Returns an Access function scoped to the user's tenants.
 * - super-admin sees all
 * - tenant users see only their assigned tenants
 * - unauthenticated gets denied
 *
 * @param options.fieldName - The field name to constrain by (default: 'tenant')
 */
export const tenantAccess = ({ fieldName = 'tenant' }: TenantAccessOptions = {}): Access => {
  return ({ req: { user } }) => {
    if (!user) return false
    if (user?.roles?.includes('super-admin')) return true

    const tenantIds = resolveTenantIds(user)
    if (tenantIds.length === 0) return false

    return { [fieldName]: { in: tenantIds } }
  }
}

// Convenience alias for the default tenant-scoped access
export const tenantReadAccess = tenantAccess()
