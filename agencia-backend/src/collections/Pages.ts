import type { CollectionConfig, Condition, Payload } from 'payload'
import { slugField } from 'payload'

import { HeroBlock } from '@/blocks/HeroBlock'
import { TextBlock } from '@/blocks/TextBlock'
import { ImageBlock } from '@/blocks/ImageBlock'
import { ContactBlock } from '@/blocks/ContactBlock'
import { MenuBlock } from '@/blocks/MenuBlock'
import { ProductBlock } from '@/blocks/ProductBlock'
import { WelcomeBannerBlock as WelcomeBanner } from '@/blocks/WelcomeBanner'
import { CartSummaryBlock } from '@/blocks/CartSummaryBlock'
import { CourseBlock } from '@/blocks/CourseBlock'
import {
  ProductGridBlock,
  FeaturedProductBlock,
  CategoryListBlock,
} from '@/blocks/ecommerce'
import { RestrictedBlocksField } from '@/components/RestrictedBlocksField'
import { generateSlug } from '@/collections/Pages/hooks/generateSlug'
import { validateLayoutStructure } from '@/collections/Pages/hooks/validateLayoutStructure'
import { validateUniqueSlug } from '@/collections/Pages/hooks/validateUniqueSlug'

/**
 * Resolves the preview base URL for a Page document by inspecting its tenant.
 *
 * Resolution order:
 *   1. tenant.devUrl      — local dev (e.g. http://localhost:4321)
 *   2. tenant.domain      — production (https://...)
 *   3. LIVE_PREVIEW_BASE_URL env var — fallback when tenant is missing/empty
 *
 * Returns `null` if the tenant ref is present but cannot be fetched, so the
 * caller can fall back to the env var. The function intentionally never throws
 * — a missing tenant must not break the admin live preview.
 */
async function resolvePreviewBaseUrl(
  payload: Payload,
  data: { tenant?: number | { id: number | string } | null } | undefined,
): Promise<string> {
  const envBase = process.env.LIVE_PREVIEW_BASE_URL || 'http://localhost'
  const tenantRef = data?.tenant
  if (!tenantRef) return envBase

  const tenantId = typeof tenantRef === 'object' ? tenantRef.id : tenantRef
  if (tenantId == null) return envBase

  try {
    const tenant = await payload.findByID({
      collection: 'tenants',
      id: tenantId,
      depth: 0,
      overrideAccess: true,
    })
    // 1) devUrl always wins — explicit per-tenant override
    if (tenant?.devUrl) return tenant.devUrl
    // 2) derive the port from tenant.frontendType, using envBase as the host
    if (tenant?.frontendType) {
      const port =
        tenant.frontendType === 'nextjs'
          ? process.env.LIVE_PREVIEW_NEXTJS_PORT || '3000'
          : process.env.LIVE_PREVIEW_ASTRO_PORT || '4321'
      try {
        const url = new URL(envBase)
        url.port = port
        return url.toString().replace(/\/$/, '')
      } catch {
        // envBase is not a valid URL — fall through to domain
      }
    }
    // 3) production: use the real domain
    if (tenant?.domain) {
      return `https://${tenant.domain.replace(/^https?:\/\//, '')}`
    }
  } catch {
    // Tenant lookup failed (DB down, etc.) — fall back silently so the admin
    // iframe still loads something rather than throwing inside Payload's UI.
  }

  return envBase
}

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
      url: async ({ data, req }) => {
        const baseUrl = await resolvePreviewBaseUrl(req.payload, data)
        const previewSecret = process.env.PREVIEW_SECRET || ''
        const slug = data?.slug || 'home'
        const path = `/${slug}`
        return `${baseUrl}/preview?path=${encodeURIComponent(path)}&secret=${encodeURIComponent(previewSecret)}`
      },
    },
  },
  defaultPopulate: { title: true, slug: true, tenant: true },
  hooks: {
    beforeValidate: [generateSlug],
    beforeChange: [validateLayoutStructure, validateUniqueSlug],
  },
  access: {
    read: ({ req: { user } }) => {
      if (user?.roles?.includes('super-admin')) return true
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const constraints: any = user
        ? {
            tenant: {
              in: user?.tenants?.map((t) => {
                const tenant = t.tenant
                if (typeof tenant === 'string') return tenant
                if (typeof tenant === 'number') return String(tenant)
                return tenant.id
              }),
            },
          }
        : { _status: { equals: 'published' } }
      return constraints
    },
    create: ({ req: { user } }) => {
      return user?.roles?.includes('super-admin') ?? false
    },
    update: ({ req: { user } }) => {
      if (user?.roles?.includes('super-admin')) return true
      return {
        tenant: {
          in: user?.tenants?.map((t) => {
            const tenant = t.tenant
            if (typeof tenant === 'string') return tenant
            if (typeof tenant === 'number') return String(tenant)
            return tenant.id
          }),
        },
      }
    },
    delete: ({ req: { user } }) => {
      return user?.roles?.includes('super-admin') ?? false
    },
  },
  endpoints: [
    {
      /**
       * Cross-origin draft lookup for the live preview iframe in client sites.
       *
       * Why this exists:
       *   - The client starter (astro/next) fetches a page server-side from
       *     Payload, with no authenticated user, across a different origin.
       *   - The Pages read access for unauthenticated users is restricted to
       *     `{ _status: { equals: 'published' } }`, so a plain
       *     `GET /api/pages?draft=true` would 404 on draft versions.
       *   - This endpoint authenticates the request via a shared `secret`
       *     (the same PREVIEW_SECRET the admin sends) and uses Local API
       *     with `overrideAccess: true` to bypass row-level access.
       *
       * Security:
       *   - Returns 403 unless `secret` matches PREVIEW_SECRET.
       *   - The tenant is also matched by slug to prevent a starter for one
       *     client from previewing another client's drafts.
       */
      path: '/preview-page',
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
          collection: 'pages',
          draft: true,
          limit: 1,
          pagination: false,
          overrideAccess: true,
          depth: 1,
          where: {
            and: [{ slug: { equals: slug } }, { 'tenant.slug': { equals: tenantSlug } }],
          },
        })

        const doc = result.docs?.[0] || null
        if (!doc) {
          return Response.json({ error: 'Page not found' }, { status: 404 })
        }

        return Response.json(doc)
      },
    },
  ],
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
                WelcomeBanner,
                ProductBlock,
                CartSummaryBlock,
                CourseBlock,
                ProductGridBlock,
                FeaturedProductBlock,
                CategoryListBlock,
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
      ],
    },
  ],
}
