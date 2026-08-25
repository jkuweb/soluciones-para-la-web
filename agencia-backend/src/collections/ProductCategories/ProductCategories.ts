import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { catalogEnabledPublicRead, catalogEnabledTenantAccess } from '@/access/catalogEnabled'

export const ProductCategories: CollectionConfig = {
  slug: 'product-categories',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'updatedAt'],
    group: 'Catálogo',
  },
  access: {
    read: catalogEnabledPublicRead,
    create: catalogEnabledTenantAccess,
    update: catalogEnabledTenantAccess,
    delete: ({ req: { user } }) => user?.roles?.includes('super-admin') ?? false,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    slugField({ fieldToUse: 'name' }),
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
  ],
}
