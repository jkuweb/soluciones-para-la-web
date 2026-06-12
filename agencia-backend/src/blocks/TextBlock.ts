import { Block } from 'payload'
import { defaultLexical } from '@/fields'

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
      editor: defaultLexical(),
    },
  ],
}
