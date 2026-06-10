import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: ({ req: { user } }) => {
      if (user?.roles?.includes('super-admin')) return true
      return { tenant: { in: user?.tenants?.map((t) => {
        const tenant = t.tenant
        if (typeof tenant === 'string') return tenant
        if (typeof tenant === 'number') return String(tenant)
        return tenant.id
      }) } }
    },
    create: ({ req: { user } }) => {
      if (user?.roles?.includes('super-admin')) return true
      return { tenant: { in: user?.tenants?.map((t) => {
        const tenant = t.tenant
        if (typeof tenant === 'string') return tenant
        if (typeof tenant === 'number') return String(tenant)
        return tenant.id
      }) } }
    },
    update: ({ req: { user } }) => {
      if (user?.roles?.includes('super-admin')) return true
      return { tenant: { in: user?.tenants?.map((t) => {
        const tenant = t.tenant
        if (typeof tenant === 'string') return tenant
        if (typeof tenant === 'number') return String(tenant)
        return tenant.id
      }) } }
    },
    delete: ({ req: { user } }) => {
      return user?.roles?.includes('super-admin') ?? false
    },
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 300, position: 'centre' },
      { name: 'card', width: 768, height: 1024, position: 'centre' },
      { name: 'hero', width: 1920, height: 1080, position: 'centre' },
    ],
  },
}
