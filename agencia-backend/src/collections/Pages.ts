import type { CollectionConfig, Condition } from 'payload'
import { slugField } from 'payload'

import { HeroBlock } from '@/blocks/HeroBlock'
import { TextBlock } from '@/blocks/TextBlock'
import { ImageBlock } from '@/blocks/ImageBlock'
import { ContactBlock } from '@/blocks/ContactBlock'
import { MenuBlock } from '@/blocks/MenuBlock'
import { ProductBlock } from '@/blocks/ProductBlock'
import { CartBlock } from '@/blocks/CartBlock'
import { CourseBlock } from '@/blocks/CourseBlock'
import { FooterBlock } from '@/blocks/FooterBlock'
import { RestrictedBlocksField } from '@/components/RestrictedBlocksField'
import { generateSlug } from '@/collections/Pages/hooks/generateSlug'
import { validateLayoutStructure } from '@/collections/Pages/hooks/validateLayoutStructure'
import { validateUniqueSlug } from '@/collections/Pages/hooks/validateUniqueSlug'

export const Pages: CollectionConfig = {
  slug: 'pages',
  versions: {
    drafts: {
      autosave: { interval: 500 },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'tenant', 'slug', '_status', 'updatedAt'],
    listSearchableFields: ['title', 'slug'],
    livePreview: {
      url: ({ data }) => {
        const baseUrl = process.env.LIVE_PREVIEW_BASE_URL || 'http://localhost:3001'
        const previewSecret = process.env.PREVIEW_SECRET || ''
        const slug = data?.slug || ''
        const path = `/${slug}`
        return `${baseUrl}/preview?path=${path}&previewSecret=${previewSecret}`
      },
    },
  },
  defaultPopulate: { title: true, slug: true },
  hooks: {
    beforeValidate: [generateSlug],
    beforeChange: [validateLayoutStructure, validateUniqueSlug],
  },
  access: {
    read: ({ req: { user } }) => {
      if (user?.roles?.includes('super-admin')) return true
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const constraints: any = user
        ? { tenant: { in: user?.tenants?.map((t) => {
            const tenant = t.tenant
            if (typeof tenant === 'string') return tenant
            if (typeof tenant === 'number') return String(tenant)
            return tenant.id
          }) } }
        : { _status: { equals: 'published' } }
      return constraints
    },
    create: ({ req: { user } }) => {
      return user?.roles?.includes('super-admin') ?? false
    },
    update: ({ req: { user } }) => {
      if (user?.roles?.includes('super-admin')) return true
      return { tenant: { in: user?.tenants?.map((t) => {
        const tenant = t.tenant
        if (typeof tenant === 'string') return tenant
        if (typeof tenant === 'number') return String(tenant)
        return tenant.id
      }) } }
    },
    delete: ({ req: { user } }) => {
      return user?.roles?.includes('super-admin') ?? false
    },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    slugField({
      disableUnique: true,
      overrides: (baseField) => {
        const condition: Condition = (_data, _siblingData, { user }) => {
          return user?.roles?.includes('super-admin') ?? false
        }
        return {
          ...baseField,
          fields: baseField.fields.map((f) => {
            if ('name' in f && f.name === 'generateSlug') {
              return {
                ...f,
                admin: {
                  ...f.admin,
                  hidden: false,
                  condition,
                },
              }
            }
            if ('name' in f && f.name === 'slug') {
              return {
                ...f,
                admin: {
                  ...f.admin,
                  condition,
                },
              }
            }
            return f
          }),
        } as import('payload').RowField
      },
    }),
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Hero',
          fields: [
            {
              name: 'hero',
              type: 'blocks',
              blocks: [HeroBlock],
              maxRows: 1,
              admin: {
                components: {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  Field: RestrictedBlocksField as any,
                },
              },
            },
          ],
        },
        {
          label: 'Content',
          fields: [
            {
              name: 'layout',
              type: 'blocks',
              blocks: [
                TextBlock,
                ImageBlock,
                ContactBlock,
                MenuBlock,
                ProductBlock,
                CartBlock,
                CourseBlock,
                FooterBlock,
              ],
              admin: {
                components: {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  Field: RestrictedBlocksField as any,
                },
              },
            },
          ],
        },
        {
          label: 'SEO',
          name: 'meta',
          fields: [
            {
              name: 'title',
              type: 'text',
              label: 'Meta Title',
            },
            {
              name: 'description',
              type: 'textarea',
              label: 'Meta Description',
            },
          ],
        },
      ],
    },
  ],
}
