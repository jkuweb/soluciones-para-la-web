import type { CollectionConfig, Condition } from 'payload'
import { slugField } from 'payload'
import { tenantAccess } from '@/access/tenantAccess'
import { validateUniqueSlug } from '@/utilities/validateUniqueSlug'

/**
 * Slugify a string: lowercase, strip special chars, collapse hyphens.
 */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const Tags: CollectionConfig = {
  slug: 'tags',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'tenant', 'updatedAt'],
    group: 'Blog',
  },
  access: {
    read: tenantAccess(),
    create: ({ req: { user } }) => user?.roles?.includes('super-admin') ?? false,
    update: tenantAccess(),
    delete: ({ req: { user } }) => user?.roles?.includes('super-admin') ?? false,
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        // Auto-generate slug from title when slug is empty (e.g. non-super-admin)
        if (data.title && !data.slug) {
          data.slug = slugify(data.title as string)
        }
        return data
      },
    ],
    beforeChange: [validateUniqueSlug('tags')],
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
            if ('name' in f && f.name === 'slug') {
              return {
                ...f,
                admin: {
                  ...f.admin,
                  condition,
                },
              }
            }
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
            return f
          }),
        } as import('payload').RowField
      },
    }),
  ],
  timestamps: true,
}
