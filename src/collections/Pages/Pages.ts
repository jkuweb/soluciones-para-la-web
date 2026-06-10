import { slugField } from '@/fields/slug'
import { CollectionConfig } from 'payload'
import { hero } from '@/heros/config'
import { revalidateDelete, revalidatePage } from './hooks/revalidatePage'
import { populatePublishedAt } from '@/hooks/populatePublishedAt'
import { MediaBlock } from '@/blocks/MediaBlock/config'
import { OptionsBlock } from '@/blocks/Options/config'
import { ListBlock } from '@/blocks/List/config'
import { CTABlock } from '@/blocks/CTA/config'
import { ContentBlock } from '@/blocks/Content/config'

export const Pages: CollectionConfig<'pages'> = {
  slug: 'pages',
  labels: { singular: 'Página', plural: ' Lista de Páginas' },
  access: {
    read: () => true,
  },
  defaultPopulate: {
    title: true,
    slug: true,
  },
  admin: {
    defaultColumns: ['title', 'slug', 'updatedAt'],
    useAsTitle: 'title',
    group: 'Páginas',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      type: 'tabs',
      tabs: [
        {
          fields: [hero],
          label: 'Hero',
        },
        {
          fields: [
            {
              name: 'layout',
              type: 'blocks',
              blocks: [MediaBlock, OptionsBlock, ListBlock, CTABlock, ContentBlock],
              required: true,
              admin: {
                initCollapsed: true,
              },
            },
          ],
          label: 'Content',
        },
        // {
        //   name: 'meta',
        //   label: 'SEO',
        //   fields: [
        //     OverviewField({
        //       titlePath: 'meta.title',
        //       descriptionPath: 'meta.description',
        //       imagePath: 'meta.image',
        //     }),
        //     MetaTitleField({
        //       hasGenerateFn: true,
        //     }),
        //     MetaImageField({
        //       relationTo: 'media',
        //     }),

        //     MetaDescriptionField({}),
        //     PreviewField({
        //       hasGenerateFn: true,
        //       titlePath: 'meta.title',
        //       descriptionPath: 'meta.description',
        //     }),
        //   ],
        // },
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
      },
    },
    ...slugField(),
  ],
  hooks: {
    afterChange: [revalidatePage],
    beforeChange: [populatePublishedAt],
    afterDelete: [revalidateDelete],
  },
  versions: {
    drafts: {
      autosave: {
        interval: 5000,
      },
      schedulePublish: false,
    },
    maxPerDoc: 10,
  },
}
