import type { Block } from 'payload'

export const CategoryListBlock: Block = {
  slug: 'category-list',
  labels: {
    singular: 'Lista de categorías',
    plural: 'Listas de categorías',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      defaultValue: 'Categorías',
    },
    {
      name: 'layout',
      type: 'select',
      defaultValue: 'grid',
      options: [
        { label: 'Cuadrícula', value: 'grid' },
        { label: 'Lista vertical', value: 'list' },
      ],
    },
  ],
}
