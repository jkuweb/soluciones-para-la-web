import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { catalogEnabledTenantAccess } from '@/access/catalogEnabled'

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'price', 'status', 'updatedAt'],
    group: 'Catálogo',
  },
  access: {
    read: catalogEnabledTenantAccess,
    create: catalogEnabledTenantAccess,
    update: catalogEnabledTenantAccess,
    delete: ({ req: { user } }) => user?.roles?.includes('super-admin') ?? false,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    slugField({ fieldToUse: 'title' }),
    {
      name: 'description',
      type: 'richText',
    },
    {
      name: 'price',
      type: 'number',
      required: true,
      min: 0,
      admin: { description: 'Precio en céntimos (ej: 1999 = 19,99€).' },
    },
    {
      name: 'compareAtPrice',
      type: 'number',
      min: 0,
      admin: { description: 'Precio tachado (opcional).' },
    },
    {
      name: 'currency',
      type: 'select',
      defaultValue: 'EUR',
      options: [
        { label: 'EUR (€)', value: 'EUR' },
        { label: 'USD ($)', value: 'USD' },
        { label: 'GBP (£)', value: 'GBP' },
      ],
      required: true,
    },
    {
      name: 'images',
      type: 'array',
      minRows: 0,
      maxRows: 8,
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'product-categories',
      hasMany: false,
    },
    {
      name: 'stock',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'sku',
      type: 'text',
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Borrador', value: 'draft' },
        { label: 'Publicado', value: 'published' },
        { label: 'Archivado', value: 'archived' },
      ],
      required: true,
    },
  ],
}
