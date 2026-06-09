import type { CollectionConfig } from 'payload'
import {
  HeroBlock,
  TextBlock,
  ImageBlock,
  ContactBlock,
  MenuBlock,
  ProductBlock,
  CartBlock,
  CourseBlock,
  FooterBlock,
} from '../blocks'

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    group: 'Multi-Tenant',
    defaultColumns: ['title', 'slug', 'status', 'tenant'],
  },
  fields: [
    {
      name: 'slug',
      type: 'text',
      required: true,
      label: 'Slug',
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Title',
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
      label: 'Layout',
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Borrador', value: 'draft' },
        { label: 'Publicado', value: 'published' },
      ],
      defaultValue: 'draft',
      label: 'Status',
    },
    {
      name: 'meta',
      type: 'group',
      label: 'Meta',
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
        {
          name: 'ogImage',
          type: 'upload',
          relationTo: 'media',
          label: 'OG Image',
        },
      ],
    },
  ],
}
