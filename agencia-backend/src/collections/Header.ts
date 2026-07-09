import type { CollectionConfig } from 'payload'
import { link } from '@/fields/link'
import { ensureUniqueTenant } from '@/collections/Header/hooks/ensureUniqueTenant'
import { superAdminOnly } from '@/access/superAdminOnly'

export const Header: CollectionConfig = {
  slug: 'header',
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
      name: 'navigationType',
      type: 'radio',
      label: 'Tipo de navegación',
      defaultValue: 'withSubItems',
      options: [
        {
          label: 'Simple (links planos sin subítems)',
          value: 'simple',
        },
        {
          label: 'Con subítems (mega-menú con dropdowns)',
          value: 'withSubItems',
        },
      ],
      admin: {
        layout: 'horizontal',
        description:
          'Elegí cómo querés que se renderice la navegación. En modo "Simple" el campo Subítems se oculta para cada item. Solo super-admin puede modificar este campo.',
      },
      // Only super-admin can toggle the navigation type. Tenant clients can
      // still read the value (so the admin.condition on subItems keeps working)
      // and can still edit navItems, but they cannot switch between simple and
      // mega-menu.
      access: {
        read: () => true,
        create: superAdminOnly,
        update: superAdminOnly,
      },
    },
    {
      name: 'navItems',
      type: 'array',
      label: 'Navigation Items',
      maxRows: 10,
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Título',
          required: true,
        },
        link({
          appearances: false,
          disableLabel: true,
        }),
        {
          name: 'subItems',
          type: 'array',
          label: 'Subítems',
          maxRows: 20,
          admin: {
            initCollapsed: true,
            // Only show sub-items when the header is configured for "withSubItems" navigation.
            // The first arg (`data`) is the whole document, so we can read navigationType from it.
            condition: (data) => data?.navigationType === 'withSubItems',
            description:
              'Solo disponible cuando el tipo de navegación es "Con subítems".',
          },
          fields: [
            {
              name: 'title',
              type: 'text',
              label: 'Título',
              required: true,
            },
            {
              name: 'description',
              type: 'textarea',
              label: 'Descripción',
            },
            {
              name: 'enableImage',
              type: 'checkbox',
              label: '¿Añadir imagen?',
            },
            {
              name: 'image',
              type: 'upload',
              relationTo: 'media',
              label: 'Imagen',
              admin: {
                condition: (_, siblingData) => Boolean(siblingData?.enableImage),
              },
            },
            link({
              appearances: false,
              disableLabel: true,
            }),
          ],
        },
      ],
      admin: {
        initCollapsed: true,
        components: {
          RowLabel: '@/collections/Header/RowLabel#RowLabel',
        },
      },
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      label: 'Logo',
      admin: {
        description: 'Site logo for the header',
      },
    },
    {
      name: 'ctaText',
      type: 'text',
      label: 'CTA Button Text',
      admin: {
        description: 'Call-to-action button text',
      },
    },
    {
      name: 'ctaLink',
      type: 'group',
      label: 'CTA Link',
      admin: {
        hideGutter: true,
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'type',
              type: 'radio',
              options: [
                { label: 'Internal Link', value: 'reference' },
                { label: 'Custom URL', value: 'custom' },
              ],
              defaultValue: 'reference',
              admin: { layout: 'horizontal', width: '50%' },
            },
            {
              name: 'newTab',
              type: 'checkbox',
              label: 'Open in new tab',
              admin: { width: '50%', style: { alignSelf: 'flex-end' } },
            },
          ],
        },
        {
          name: 'reference',
          type: 'relationship',
          relationTo: ['pages'],
          admin: {
            condition: (_, siblingData) => siblingData?.type === 'reference',
          },
        },
        {
          name: 'url',
          type: 'text',
          admin: {
            condition: (_, siblingData) => siblingData?.type === 'custom',
          },
        },
        {
          name: 'label',
          type: 'text',
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [ensureUniqueTenant('header')],
  },
}
