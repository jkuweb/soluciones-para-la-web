import type { CollectionConfig } from 'payload'

import { HeroBlock } from '@/blocks/HeroBlock'
import { TextBlock } from '@/blocks/TextBlock'
import { ImageBlock } from '@/blocks/ImageBlock'
import { ContactBlock } from '@/blocks/ContactBlock'
import { MenuBlock } from '@/blocks/MenuBlock'
import { ProductBlock } from '@/blocks/ProductBlock'
import { CartBlock } from '@/blocks/CartBlock'
import { CourseBlock } from '@/blocks/CourseBlock'
import { FooterBlock } from '@/blocks/FooterBlock'
import { RestrictedBlocksField } from '@/components/RestrictedBlocksField'
import { validateLayoutStructure } from '@/hooks/validateLayoutStructure'

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'tenant', 'slug', 'status', 'updatedAt'],
    listSearchableFields: ['title', 'slug'],
  },
  hooks: {
    beforeChange: [validateLayoutStructure],
  },
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
      return user?.roles?.includes('super-admin') ?? false
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
      name: 'slug',
      type: 'text',
      required: true,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'layout',
      type: 'blocks',
      blocks: [
        HeroBlock,
        TextBlock,
        ImageBlock,
        ContactBlock,
        MenuBlock,
        ProductBlock,
        CartBlock,
        CourseBlock,
        FooterBlock,
      ],
      admin: {
        components: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Field: RestrictedBlocksField as any,
        },
      },
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Borrador', value: 'draft' },
        { label: 'Publicado', value: 'published' },
      ],
      defaultValue: 'draft',
      required: true,
    },
    {
      name: 'meta',
      type: 'group',
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Meta Title',
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Meta Description',
        },
      ],
    },
  ],
}
