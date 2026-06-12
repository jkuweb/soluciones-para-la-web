import type { User } from '@/payload-types'

/**
 * Extracts tenant IDs from a user object regardless of the polymorphic format.
 * The `tenants[].tenant` field can be at runtime:
 * - A string (ID reference stored as plain string)
 * - A number (ID reference stored as number)
 * - An object with `.id` (populated relationship, e.g. `Tenant`)
 */
export function resolveTenantIds(user: User | null | undefined): (string | number)[] {
  if (!user?.tenants?.length) return []

  const ids: (string | number)[] = []

  for (const t of user.tenants) {
    const tenant = t.tenant
    if (!tenant) continue

    if (typeof tenant === 'string' || typeof tenant === 'number') {
      ids.push(tenant)
    } else if (typeof tenant === 'object' && 'id' in tenant) {
      ids.push(tenant.id)
    }
  }

  return ids
}
