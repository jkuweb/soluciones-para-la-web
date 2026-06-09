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

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
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
