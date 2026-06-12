import { Block } from 'payload'
import { defaultLexical } from '@/fields'

export const ProductBlock: Block = {
  slug: 'product',
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'richText',
      editor: defaultLexical(),
    },
    {
      name: 'price',
      type: 'number',
      required: true,
    },
    {
      name: 'images',
      type: 'array',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
    {
      name: 'stock',
      type: 'number',
    },
    {
      name: 'category',
      type: 'text',
    },
  ],
}
