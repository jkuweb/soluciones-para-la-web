import type { Access } from 'payload'
import { paymentsEnabledTenantAccess } from '@/access/paymentsEnabled'

/**
 * Orders access control.
 *
 * - super-admin: always allowed.
 * - tenant-admin/editor: only if their tenant has `features.payments === true`
 *   AND `features.stripeAccountStatus === 'active'`.
 * - anonymous: denied.
 *
 * The strict gate (`paymentsEnabledTenantAccess`, defined in
 * `@/access/paymentsEnabled`) is applied to all four operations: unconfigured
 * tenants cannot create, read, update, or delete orders. The storefront can
 * fetch a single order by ID only when the tenant is active.
 */
export const ordersTenantAccess: Access = paymentsEnabledTenantAccess
