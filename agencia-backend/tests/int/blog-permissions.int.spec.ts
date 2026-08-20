import { getPayload, type Payload, type CollectionSlug } from 'payload'
import config from '@/payload.config'
import sharp from 'sharp'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'

let payload: Payload

let superAdminId: number
let tenantAdminWithBlogId: number
let tenantEditorWithBlogId: number
let tenantAdminWithoutBlogId: number
let tenantEditorWithoutBlogId: number

let tenantWithBlogId: number
let tenantWithoutBlogId: number

let postInBlogTenant: number
let postInNoBlogTenant: number
let categoryInBlogTenant: number
let categoryInNoBlogTenant: number
let tagInBlogTenant: number
let tagInNoBlogTenant: number

let heroMediaBlogId: number
let heroMediaNoBlogId: number

const ts = Date.now()
const SLUG_BLOG = `blog-test-${ts}`
const SLUG_NO_BLOG = `no-blog-test-${ts}`

// PNG 1x1 transparente válido generado con sharp. Payload valida que el
// archivo sea un PNG real, así que generamos uno programáticamente en lugar
// de hardcodear bytes que pueden no cumplir la spec.
async function makePng1x1(): Promise<Buffer> {
  return sharp({
    create: { width: 1, height: 1, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .png()
    .toBuffer()
}

// Helper para crear un Media mínimo con un PNG inline.
// Payload Local API requiere `file: { data, mimetype, name, size }`.
// Convertimos Buffer → Uint8Array porque la lib `file-type` (que usa
// Payload para validar) no acepta Node Buffer directamente.
async function createHeroMedia(altPrefix: string, tenantId: number): Promise<number> {
  const png = await makePng1x1()
  const media = await payload!.create({
    collection: 'media',
    data: {
      alt: `${altPrefix}-${ts}`,
      tenant: tenantId,
    },
    file: {
      data: new Uint8Array(png) as unknown as Buffer,
      mimetype: 'image/png',
      name: `${altPrefix}-${ts}.png`,
      size: png.length,
    },
    overrideAccess: true,
  })
  return media.id
}

// Helper para construir el JSON de un richText mínimo válido en formato
// Lexical moderno (SerializedEditorState con root.children).
function makeRichText(text: string) {
  return {
    root: {
      type: 'root' as const,
      format: '' as const,
      indent: 0,
      version: 1,
      direction: 'ltr' as const,
      children: [
        {
          type: 'text' as const,
          format: 0,
          style: '',
          text,
          mode: 'normal' as const,
          detail: 0,
          version: 1,
        },
      ],
    },
  }
}

describe('blog tenant permissions (blogEnabled flag)', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })

    // 1) Dos tenants: uno con blog, otro sin
    const tenantWithBlog = await payload.create({
      collection: 'tenants',
      data: {
        name: `Blog Tenant ${ts}`,
        slug: SLUG_BLOG,
        domain: `blog-${ts}.example.com`,
        serviceType: 'web-estatica',
        frontendType: 'astro',
        status: 'active',
        blogEnabled: true,
        ecommerceTier: 'none',
      },
      overrideAccess: true,
    })
    tenantWithBlogId = tenantWithBlog.id

    const tenantWithoutBlog = await payload.create({
      collection: 'tenants',
      data: {
        name: `No Blog Tenant ${ts}`,
        slug: SLUG_NO_BLOG,
        domain: `no-blog-${ts}.example.com`,
        serviceType: 'web-estatica',
        frontendType: 'astro',
        status: 'active',
        // blogEnabled: false (default)
        ecommerceTier: 'none',
      },
      overrideAccess: true,
    })
    tenantWithoutBlogId = tenantWithoutBlog.id

    // 2) Usuarios: 1 super-admin, 2 con blog, 2 sin
    const superAdmin = await payload.create({
      collection: 'users',
      data: {
        email: `super-${ts}@example.com`,
        password: 'test-password-123',
        name: 'Super',
        roles: 'super-admin',
      },
      overrideAccess: true,
    })
    superAdminId = superAdmin.id

    const tenantAdminWithBlog = await payload.create({
      collection: 'users',
      data: {
        email: `ta-blog-${ts}@example.com`,
        password: 'test-password-123',
        name: 'TA Blog',
        roles: 'tenant-admin',
        tenants: [{ tenant: tenantWithBlogId }],
      },
      overrideAccess: true,
    })
    tenantAdminWithBlogId = tenantAdminWithBlog.id

    const tenantEditorWithBlog = await payload.create({
      collection: 'users',
      data: {
        email: `te-blog-${ts}@example.com`,
        password: 'test-password-123',
        name: 'TE Blog',
        roles: 'tenant-editor',
        tenants: [{ tenant: tenantWithBlogId }],
      },
      overrideAccess: true,
    })
    tenantEditorWithBlogId = tenantEditorWithBlog.id

    const tenantAdminWithoutBlog = await payload.create({
      collection: 'users',
      data: {
        email: `ta-noblog-${ts}@example.com`,
        password: 'test-password-123',
        name: 'TA NoBlog',
        roles: 'tenant-admin',
        tenants: [{ tenant: tenantWithoutBlogId }],
      },
      overrideAccess: true,
    })
    tenantAdminWithoutBlogId = tenantAdminWithoutBlog.id

    const tenantEditorWithoutBlog = await payload.create({
      collection: 'users',
      data: {
        email: `te-noblog-${ts}@example.com`,
        password: 'test-password-123',
        name: 'TE NoBlog',
        roles: 'tenant-editor',
        tenants: [{ tenant: tenantWithoutBlogId }],
      },
      overrideAccess: true,
    })
    tenantEditorWithoutBlogId = tenantEditorWithoutBlog.id

    // 3) Hero images: Posts requiere heroImage (upload required).
    // Creamos dos Media mínimos (uno por tenant) y los referenciamos.
    heroMediaBlogId = await createHeroMedia('hero-blog', tenantWithBlogId)
    heroMediaNoBlogId = await createHeroMedia('hero-noblog', tenantWithoutBlogId)

    // 4) Contenido de prueba: posts/categories/tags en cada tenant.
    // Creamos como super-admin con overrideAccess: true.
    const postA = await payload.create({
      collection: 'posts',
      data: {
        title: `Post Blog ${ts}`,
        slug: `post-blog-${ts}`,
        heroImage: heroMediaBlogId,
        content: makeRichText('hola'),
        _status: 'published',
        tenant: tenantWithBlogId,
      },
      overrideAccess: true,
    })
    postInBlogTenant = postA.id

    const postB = await payload.create({
      collection: 'posts',
      data: {
        title: `Post NoBlog ${ts}`,
        slug: `post-noblog-${ts}`,
        heroImage: heroMediaNoBlogId,
        content: makeRichText('hola'),
        _status: 'published',
        tenant: tenantWithoutBlogId,
      },
      overrideAccess: true,
    })
    postInNoBlogTenant = postB.id

    const catA = await payload.create({
      collection: 'categories',
      data: { title: `Cat Blog ${ts}`, slug: `cat-blog-${ts}`, tenant: tenantWithBlogId },
      overrideAccess: true,
    })
    categoryInBlogTenant = catA.id

    const catB = await payload.create({
      collection: 'categories',
      data: { title: `Cat NoBlog ${ts}`, slug: `cat-noblog-${ts}`, tenant: tenantWithoutBlogId },
      overrideAccess: true,
    })
    categoryInNoBlogTenant = catB.id

    const tagA = await payload.create({
      collection: 'tags',
      data: { title: `Tag Blog ${ts}`, slug: `tag-blog-${ts}`, tenant: tenantWithBlogId },
      overrideAccess: true,
    })
    tagInBlogTenant = tagA.id

    const tagB = await payload.create({
      collection: 'tags',
      data: { title: `Tag NoBlog ${ts}`, slug: `tag-noblog-${ts}`, tenant: tenantWithoutBlogId },
      overrideAccess: true,
    })
    tagInNoBlogTenant = tagB.id
  }, 60000)

  afterAll(async () => {
    if (!payload) return
    // cleanup en orden inverso: contenido → users → tenants
    const tryDelete = async (collection: CollectionSlug, id: number | undefined) => {
      if (id == null) return
      try {
        await payload.delete({ collection, id, overrideAccess: true })
      } catch {
        /* ignore */
      }
    }
    await tryDelete('posts', postInBlogTenant)
    await tryDelete('posts', postInNoBlogTenant)
    await tryDelete('categories', categoryInBlogTenant)
    await tryDelete('categories', categoryInNoBlogTenant)
    await tryDelete('tags', tagInBlogTenant)
    await tryDelete('tags', tagInNoBlogTenant)
    await tryDelete('media', heroMediaBlogId)
    await tryDelete('media', heroMediaNoBlogId)
    await tryDelete('users', superAdminId)
    await tryDelete('users', tenantAdminWithBlogId)
    await tryDelete('users', tenantEditorWithBlogId)
    await tryDelete('users', tenantAdminWithoutBlogId)
    await tryDelete('users', tenantEditorWithoutBlogId)
    await tryDelete('tenants', tenantWithBlogId)
    await tryDelete('tenants', tenantWithoutBlogId)
  }, 60000)

  // ─── SUPER-ADMIN ───────────────────────────────────────────────────────

  describe('super-admin', () => {
    it('can read all posts from any tenant', async () => {
      const result = await payload.find({
        collection: 'posts',
        overrideAccess: false,
        user: { id: superAdminId, roles: ['super-admin'], tenants: [] } as any,
        limit: 1000,
        pagination: false,
        where: { slug: { like: `post-%-${ts}` } },
      })
      const slugs = result.docs.map((d) => d.slug)
      expect(slugs).toContain(`post-blog-${ts}`)
      expect(slugs).toContain(`post-noblog-${ts}`)
    })

    it('can create a post in a tenant with blogEnabled: false', async () => {
      const created = await payload.create({
        collection: 'posts',
        data: {
          title: `SA Post NoBlog ${ts}`,
          slug: `sa-post-noblog-${ts}`,
          heroImage: heroMediaNoBlogId,
          content: makeRichText('x'),
          tenant: tenantWithoutBlogId,
        },
        user: { id: superAdminId, roles: ['super-admin'], tenants: [] } as any,
        overrideAccess: false,
      })
      expect(created.id).toBeDefined()
      // cleanup
      await payload.delete({ collection: 'posts', id: created.id, overrideAccess: true })
    })

    it('can toggle blogEnabled on Tenants', async () => {
      const updated = await payload.update({
        collection: 'tenants',
        id: tenantWithoutBlogId,
        data: { blogEnabled: true },
        user: { id: superAdminId, roles: ['super-admin'], tenants: [] } as any,
        overrideAccess: false,
      })
      expect(updated.blogEnabled).toBe(true)
      // revertir
      await payload.update({
        collection: 'tenants',
        id: tenantWithoutBlogId,
        data: { blogEnabled: false },
        overrideAccess: true,
      })
    })
  })

  // ─── TENANT-ADMIN / TENANT-EDITOR CON BLOG ─────────────────────────────

  describe('tenant-admin with blogEnabled: true', () => {
    it('can read all posts (drafts + published) of own tenant', async () => {
      const result = await payload.find({
        collection: 'posts',
        overrideAccess: false,
        user: { id: tenantAdminWithBlogId, roles: ['tenant-admin'], tenants: [{ tenant: tenantWithBlogId }] } as any,
        limit: 1000,
        pagination: false,
        where: { slug: { like: `post-%-${ts}` } },
      })
      const slugs = result.docs.map((d) => d.slug)
      expect(slugs).toContain(`post-blog-${ts}`)
      expect(slugs).not.toContain(`post-noblog-${ts}`)
    })

    it('can create a post in own tenant', async () => {
      const created = await payload.create({
        collection: 'posts',
        data: {
          title: `TA Post Blog ${ts}`,
          slug: `ta-post-blog-${ts}`,
          heroImage: heroMediaBlogId,
          content: makeRichText('x'),
          tenant: tenantWithBlogId,
        },
        user: { id: tenantAdminWithBlogId, roles: ['tenant-admin'], tenants: [{ tenant: tenantWithBlogId }] } as any,
        overrideAccess: false,
      })
      expect(created.id).toBeDefined()
      // cleanup
      await payload.delete({ collection: 'posts', id: created.id, overrideAccess: true })
    })

    it('CANNOT create a post in another tenant (blogEnabled: false)', async () => {
      await expect(
        payload.create({
          collection: 'posts',
          data: {
            title: `TA Cross ${ts}`,
            slug: `ta-cross-${ts}`,
            heroImage: undefined,
            content: [{ type: 'text', text: 'x' }],
            tenant: tenantWithoutBlogId,
          } as any,
          user: { id: tenantAdminWithBlogId, roles: ['tenant-admin'], tenants: [{ tenant: tenantWithBlogId }] } as any,
          overrideAccess: false,
        }),
      ).rejects.toThrow(/not allowed|forbidden/i)
    })

    it('can update a post in own tenant', async () => {
      const updated = await payload.update({
        collection: 'posts',
        id: postInBlogTenant,
        data: { title: `Updated by TA ${ts}` },
        user: { id: tenantAdminWithBlogId, roles: ['tenant-admin'], tenants: [{ tenant: tenantWithBlogId }] } as any,
        overrideAccess: false,
      })
      expect(updated.title).toBe(`Updated by TA ${ts}`)
    })

    it('can delete a post in own tenant', async () => {
      // Crear uno throwaway para borrar
      const temp = await payload.create({
        collection: 'posts',
        data: {
          title: `Throwaway ${ts}`,
          slug: `throwaway-${ts}`,
          heroImage: heroMediaBlogId,
          content: makeRichText('x'),
          tenant: tenantWithBlogId,
        },
        overrideAccess: true,
      })
      await expect(
        payload.delete({
          collection: 'posts',
          id: temp.id,
          user: { id: tenantAdminWithBlogId, roles: ['tenant-admin'], tenants: [{ tenant: tenantWithBlogId }] } as any,
          overrideAccess: false,
        }),
      ).resolves.toBeDefined()
    })
  })

  describe('tenant-editor with blogEnabled: true', () => {
    it('can also create/update/delete (mismas capacidades que tenant-admin)', async () => {
      const created = await payload.create({
        collection: 'posts',
        data: {
          title: `TE Post ${ts}`,
          slug: `te-post-${ts}`,
          heroImage: heroMediaBlogId,
          content: makeRichText('x'),
          tenant: tenantWithBlogId,
        },
        user: { id: tenantEditorWithBlogId, roles: ['tenant-editor'], tenants: [{ tenant: tenantWithBlogId }] } as any,
        overrideAccess: false,
      })
      expect(created.id).toBeDefined()
      await payload.delete({ collection: 'posts', id: created.id, overrideAccess: true })
    })

    it('CANNOT toggle blogEnabled on Tenants', async () => {
      await expect(
        payload.update({
          collection: 'tenants',
          id: tenantWithBlogId,
          data: { blogEnabled: false },
          user: { id: tenantEditorWithBlogId, roles: ['tenant-editor'], tenants: [{ tenant: tenantWithBlogId }] } as any,
          overrideAccess: false,
        }),
      ).rejects.toThrow(/not allowed|forbidden/i)
    })
  })

  // ─── TENANT-ADMIN / TENANT-EDITOR SIN BLOG ─────────────────────────────

  describe('tenant-admin with blogEnabled: false', () => {
    it('CANNOT read posts (lista vacía) de su tenant', async () => {
      const result = await payload.find({
        collection: 'posts',
        overrideAccess: false,
        user: { id: tenantAdminWithoutBlogId, roles: ['tenant-admin'], tenants: [{ tenant: tenantWithoutBlogId }] } as any,
        limit: 1000,
        pagination: false,
        where: { slug: { like: `post-%-${ts}` } },
      })
      expect(result.docs).toEqual([])
    })

    it('CANNOT create a post en su tenant', async () => {
      await expect(
        payload.create({
          collection: 'posts',
          data: {
            title: `TA NoBlog Post ${ts}`,
            slug: `ta-noblog-post-${ts}`,
            heroImage: undefined,
            content: [{ type: 'text', text: 'x' }],
            tenant: tenantWithoutBlogId,
          } as any,
          user: { id: tenantAdminWithoutBlogId, roles: ['tenant-admin'], tenants: [{ tenant: tenantWithoutBlogId }] } as any,
          overrideAccess: false,
        }),
      ).rejects.toThrow(/not allowed|forbidden/i)
    })

    it('CANNOT update a post existente en su tenant', async () => {
      await expect(
        payload.update({
          collection: 'posts',
          id: postInNoBlogTenant,
          data: { title: `Hijack ${ts}` },
          user: { id: tenantAdminWithoutBlogId, roles: ['tenant-admin'], tenants: [{ tenant: tenantWithoutBlogId }] } as any,
          overrideAccess: false,
        }),
      ).rejects.toThrow(/not allowed|forbidden/i)
    })

    it('CANNOT delete a post existente en su tenant', async () => {
      await expect(
        payload.delete({
          collection: 'posts',
          id: postInNoBlogTenant,
          user: { id: tenantAdminWithoutBlogId, roles: ['tenant-admin'], tenants: [{ tenant: tenantWithoutBlogId }] } as any,
          overrideAccess: false,
        }),
      ).rejects.toThrow(/not allowed|forbidden/i)
    })

    it('CANNOT read categories de su tenant', async () => {
      const result = await payload.find({
        collection: 'categories',
        overrideAccess: false,
        user: { id: tenantAdminWithoutBlogId, roles: ['tenant-admin'], tenants: [{ tenant: tenantWithoutBlogId }] } as any,
        limit: 1000,
        pagination: false,
        where: { slug: { like: `cat-%-${ts}` } },
      })
      expect(result.docs).toEqual([])
    })
  })

  describe('tenant-editor with blogEnabled: false', () => {
    it('CANNOT create posts (mismas restricciones que tenant-admin)', async () => {
      await expect(
        payload.create({
          collection: 'posts',
          data: {
            title: `TE NoBlog Post ${ts}`,
            slug: `te-noblog-post-${ts}`,
            heroImage: undefined,
            content: [{ type: 'text', text: 'x' }],
            tenant: tenantWithoutBlogId,
          } as any,
          user: { id: tenantEditorWithoutBlogId, roles: ['tenant-editor'], tenants: [{ tenant: tenantWithoutBlogId }] } as any,
          overrideAccess: false,
        }),
      ).rejects.toThrow(/not allowed|forbidden/i)
    })
  })

  // ─── API PÚBLICA (sin auth) ────────────────────────────────────────────

  describe('public API (no user)', () => {
    it('returns only published posts from tenants with blogEnabled: true', async () => {
      // Filtramos por tenant (no por slug) porque el hook `generateSlug`
      // de Posts regenera el slug cuando se actualiza el title — el slug
      // inicial `post-blog-${ts}` puede no ser el actual al momento del
      // query público.
      const result = await payload.find({
        collection: 'posts',
        overrideAccess: false,
        // sin user
        limit: 1000,
        pagination: false,
        where: {
          or: [
            { tenant: { equals: tenantWithBlogId } },
            { tenant: { equals: tenantWithoutBlogId } },
          ],
        },
      })
      const returned = result.docs.map((d) => ({
        slug: d.slug,
        tenant: typeof d.tenant === 'object' ? (d.tenant as any).id : d.tenant,
      }))
      const hasFromBlogTenant = returned.some((d) => d.tenant === tenantWithBlogId)
      const hasFromNoBlogTenant = returned.some((d) => d.tenant === tenantWithoutBlogId)
      expect(hasFromBlogTenant).toBe(true)
      expect(hasFromNoBlogTenant).toBe(false)
    })

    it('does NOT return drafts from blogEnabled tenants', async () => {
      // Crear un draft en el tenant con blog
      const draft = await payload.create({
        collection: 'posts',
        data: {
          title: `Draft Blog ${ts}`,
          slug: `draft-blog-${ts}`,
          heroImage: heroMediaBlogId,
          content: makeRichText('x'),
          _status: 'draft',
          tenant: tenantWithBlogId,
        },
        overrideAccess: true,
      })

      const result = await payload.find({
        collection: 'posts',
        overrideAccess: false,
        limit: 1000,
        pagination: false,
        where: { slug: { like: `draft-%-${ts}` } },
      })
      expect(result.docs).toEqual([])

      // cleanup
      await payload.delete({ collection: 'posts', id: draft.id, overrideAccess: true })
    })
  })
})
