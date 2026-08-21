import type { Block } from 'payload'

export const ProductGridBlock: Block = {
  slug: 'product-grid',
  labels: {
    singular: 'Cuadrícula de productos',
    plural: 'Cuadrículas de productos',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      admin: {
        description: 'Título visible encima de la cuadrícula (opcional).',
      },
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'product-categories',
      admin: {
        description:
          'Si se establece, filtra los productos por esta categoría. Si está vacío, muestra todos.',
      },
    },
    {
      name: 'limit',
      type: 'number',
      defaultValue: 12,
      min: 1,
      max: 48,
    },
    {
      name: 'columns',
      type: 'select',
      defaultValue: '3',
      options: [
        { label: '2 columnas', value: '2' },
        { label: '3 columnas', value: '3' },
        { label: '4 columnas', value: '4' },
      ],
    },
  ],
}
