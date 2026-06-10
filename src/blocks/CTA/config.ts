import { linkGroup } from '@/fields/linkGroup/linkGroup'
import {
  lexicalEditor,
  HeadingFeature,
  FixedToolbarFeature,
  InlineToolbarFeature,
} from '@payloadcms/richtext-lexical'
import { Block } from 'payload'

export const CTABlock: Block = {
  slug: 'cta',
  interfaceName: 'CTABlock',
  fields: [
    {
      name: 'media',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'title',
      type: 'text',
    },
    {
      name: 'content',
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
    linkGroup({
      appearances: ['default', 'primary', 'secondary', 'tertiary', 'ghost', 'link', 'outline'],
      overrides: {
        maxRows: 2,
      },
    }),
    {
      name: 'className',
      type: 'text',
      label: 'Clase personalizada',
    },
  ],
}
