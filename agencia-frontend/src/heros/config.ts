import type { Field } from 'payload'
import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { link } from '@/fields/link/link'

export const hero: Field = {
  name: 'hero',
  type: 'group',
  fields: [
    {
      name: 'richText',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [
            ...rootFeatures,
            HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
            FixedToolbarFeature(),
            InlineToolbarFeature(),
          ]
        },
      }),
      label: false,
    },
    {
      name: 'media',
      type: 'upload',
      relationTo: 'media',
    },
    link({
      appearances: ['default', 'primary', 'secondary', 'outline', 'ghost', 'link'],
    }),
  ],
  label: false,
}
