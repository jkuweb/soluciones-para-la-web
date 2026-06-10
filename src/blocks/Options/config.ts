import { link } from '@/fields/link/link'
import type { Block } from 'payload'

export const OptionsBlock: Block = {
  slug: 'optionsBlock',
  interfaceName: 'OptionsBlock',
  fields: [
    {
      name: 'className',
      type: 'text',
      label: 'Clase personalizada',
    },
    {
      name: 'options',
      type: 'array',
      fields: [
        {
          name: 'media',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'text',
          type: 'richText',
          required: true,
        },
        {
          name: 'price',
          type: 'number',
          required: true,
        },
        link(),
      ],
    },
  ],
}
