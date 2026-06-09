import type { Block } from 'payload'

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
  labels: {
    singular: 'Product',
    plural: 'Product Blocks',
  },
}
