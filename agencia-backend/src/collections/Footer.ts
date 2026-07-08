import type { CollectionConfig } from 'payload'
import { link } from '@/fields/link'
import { ensureUniqueTenant } from '@/collections/Footer/hooks/ensureUniqueTenant'

export const Footer: CollectionConfig = {
  slug: 'footer',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['tenant', 'updatedAt'],
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => {
      return user?.roles?.includes('super-admin') ?? false
    },
    update: ({ req: { user } }) => {
      if (user?.roles?.includes('super-admin')) return true
      if (!user?.tenants) return false
      return {
        tenant: {
          in: user.tenants.map((t) => {
            const tenant = t.tenant
            if (typeof tenant === 'string') return tenant
            if (typeof tenant === 'number') return String(tenant)
            return tenant.id
          }),
        },
      }
    },
    delete: ({ req: { user } }) => {
      return user?.roles?.includes('super-admin') ?? false
    },
  },
  fields: [
    {
      name: 'copyright',
      type: 'text',
      label: 'Copyright Text',
      admin: {
        description: 'Copyright notice displayed in the footer',
      },
    },
    {
      name: 'socialLinks',
      type: 'array',
      label: 'Social Links',
      fields: [
        link({
          disableLabel: true,
          appearances: false,
        }),
      ],
      maxRows: 8,
      admin: {
        initCollapsed: true,
      },
    },
    {
      name: 'navColumns',
      type: 'array',
      label: 'Navigation Columns',
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Column Title',
          required: true,
        },
        {
          name: 'links',
          type: 'array',
          label: 'Links',
          fields: [
            link({
              appearances: false,
            }),
          ],
          maxRows: 8,
          admin: {
            initCollapsed: true,
          },
        },
      ],
      maxRows: 4,
      admin: {
        initCollapsed: true,
        components: {
          RowLabel: '@/collections/Footer/RowLabel#RowLabel',
        },
      },
    },
  ],
  hooks: {
    beforeChange: [ensureUniqueTenant('footer')],
  },
}
