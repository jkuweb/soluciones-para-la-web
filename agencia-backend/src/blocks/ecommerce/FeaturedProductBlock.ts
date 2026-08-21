import type { Block } from 'payload'

export const FeaturedProductBlock: Block = {
  slug: 'featured-product',
  labels: {
    singular: 'Producto destacado',
    plural: 'Productos destacados',
  },
  fields: [
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
    },
    {
      name: 'showPrice',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'ctaLabel',
      type: 'text',
      defaultValue: 'Ver producto',
    },
  ],
}
