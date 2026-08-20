import type { Config } from 'payload'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { seoPlugin } from '@payloadcms/plugin-seo'
import type { User } from '@/payload-types'

import {
  generateSeoTitle,
  generateSeoDescription,
  generateSeoImage,
} from './seo-helpers'

export const plugins: Config['plugins'] = [
  multiTenantPlugin<Config>({
    collections: {
      pages: {},
      media: {},
      header: {},
      footer: {},
      posts: {},
      categories: {},
      tags: {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    tenantsSlug: 'tenants',
    userHasAccessToAllTenants: (user: User) => {
      return user?.roles?.includes('super-admin') ?? false
    },
    // The cookie-based baseFilter on the admin users collection hides
    // users (including those we just created) whenever the payload-tenant
    // cookie is set, because it is checked BEFORE userHasAccessToAllTenants.
    // Access control wrapping (via addCollectionAccess) still correctly
    // restricts tenant-admins to their own tenants, so disabling this
    // filter is safe and matches the intended UX for super-admins.
    useUsersTenantFilter: false,
    tenantField: {
      admin: {
        disableListColumn: false,
        disableListFilter: false,
      },
    },
  }),
  seoPlugin({
    collections: ['pages', 'posts'],
    uploadsCollection: 'media',
    tabbedUI: true,
    interfaceName: 'SeoMeta',
    generateTitle: generateSeoTitle,
    generateDescription: generateSeoDescription,
    generateImage: generateSeoImage as any,
  }),
]
