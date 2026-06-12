import type { Config } from 'payload'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import type { User } from '@/payload-types'

export const plugins: Config['plugins'] = [
  multiTenantPlugin<Config>({
    collections: {
      pages: {},
      media: {},
    },
    tenantsSlug: 'tenants',
    userHasAccessToAllTenants: (user: User) => {
      return user?.roles?.includes('super-admin') ?? false
    },
    tenantField: {
      admin: {
        disableListColumn: false,
        disableListFilter: false,
      },
    },
  }),
]
