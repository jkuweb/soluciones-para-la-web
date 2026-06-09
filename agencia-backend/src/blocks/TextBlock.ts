import type { Block } from 'payload'

export const TextBlock: Block = {
  slug: 'text',
  fields: [
    {
      name: 'heading',
      type: 'text',
    },
    {
      name: 'content',
      type: 'richText',
    },
  ],
  labels: {
    singular: 'Text',
    plural: 'Text Blocks',
  },
}
