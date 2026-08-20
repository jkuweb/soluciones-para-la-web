import type { CollectionConfig, Condition } from 'payload'
import { slugField } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineToolbarFeature,
  LinkFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import {
  blogEnabledPostRead,
  blogEnabledTenantAccess,
} from '@/access/blogEnabledAccess'
import { generateSlug } from '@/collections/Posts/hooks/generateSlug'
import { validateUniqueSlug } from '@/utilities/validateUniqueSlug'

export const Posts: CollectionConfig = {
  slug: 'posts',
  versions: {
    drafts: {
      autosave: { interval: 500 },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status', 'publishedAt'],
    group: 'Blog',
    listSearchableFields: ['title', 'slug'],
  },
  defaultPopulate: {
    title: true,
    slug: true,
    categories: true,
    meta: true,
  },
  hooks: {
    beforeValidate: [generateSlug],
    beforeChange: [validateUniqueSlug('posts')],
  },
  access: {
    read: blogEnabledPostRead,
    create: blogEnabledTenantAccess,
    update: blogEnabledTenantAccess,
    delete: blogEnabledTenantAccess,
  },
  endpoints: [
    {
      /**
       * Cross-origin draft lookup for the blog live preview in client sites.
       *
       * Why this exists:
       *   - The client starter (astro/next) fetches a post server-side from
       *     Payload, with no authenticated user, across a different origin.
       *   - The Posts read access for unauthenticated users is restricted to
       *     `{ _status: { equals: 'published' } }`, so a plain
       *     `GET /api/posts?draft=true` would 404 on draft versions.
       *   - This endpoint authenticates the request via a shared `secret`
       *     (the same PREVIEW_SECRET the admin sends) and uses Local API
       *     with `overrideAccess: true` to bypass row-level access.
       *
       * Security:
       *   - Returns 403 unless `secret` matches PREVIEW_SECRET.
       *   - The tenant is also matched by slug to prevent a starter for one
       *     client from previewing another client's drafts.
       */
      path: '/preview-post',
      method: 'get',
      handler: async (req) => {
        const expected = process.env.PREVIEW_SECRET
        const provided = req.query.secret
        if (!expected || provided !== expected) {
          return Response.json({ error: 'Invalid preview secret' }, { status: 403 })
        }

        const slug = typeof req.query.slug === 'string' ? req.query.slug : ''
        const tenantSlug = typeof req.query.tenantSlug === 'string' ? req.query.tenantSlug : ''

        if (!slug || !tenantSlug) {
          return Response.json({ error: 'Missing slug or tenantSlug' }, { status: 400 })
        }

        const result = await req.payload.find({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: 'posts' as any,
          draft: true,
          limit: 1,
          pagination: false,
          overrideAccess: true,
          depth: 2,
          where: {
            and: [{ slug: { equals: slug } }, { 'tenant.slug': { equals: tenantSlug } }],
          },
        })

        const doc = result.docs?.[0] || null
        if (!doc) {
          return Response.json({ error: 'Post not found' }, { status: 404 })
        }

        return Response.json(doc)
      },
    },
  ],
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
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
            {
              name: 'heroImage',
              type: 'upload',
              relationTo: 'media',
              required: true,
            },
            {
              name: 'content',
              type: 'richText',
              required: true,
              editor: lexicalEditor({
                features: ({ rootFeatures }) => [
                  ...rootFeatures,
                  HeadingFeature({
                    enabledHeadingSizes: ['h2', 'h3', 'h4'],
                  }),
                  LinkFeature({}),
                  HorizontalRuleFeature(),
                  FixedToolbarFeature({}),
                  InlineToolbarFeature(),
                ],
              }),
            },
            {
              name: 'excerpt',
              type: 'textarea',
              maxLength: 300,
              admin: {
                description: 'Short summary for listing cards (max 300 characters).',
              },
            },
          ],
        },
        {
          label: 'Taxonomy',
          fields: [
            {
              name: 'categories',
              type: 'relationship',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              relationTo: 'categories' as any,
              hasMany: true,
            },
            {
              name: 'tags',
              type: 'relationship',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              relationTo: 'tags' as any,
              hasMany: true,
            },
          ],
        },
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        position: 'sidebar',
      },
      hooks: {
        beforeChange: [
          ({ siblingData, value }) => {
            if (siblingData._status === 'published' && !value) {
              return new Date()
            }
            return value
          },
        ],
      },
    },
  ],
}
