import type {
  Page,
  Block,
  Header,
  Footer,
  MediaImage,
  HeroBlock,
  ImageBlock,
  ProductBlock,
  MenuBlock,
  Product,
  ProductCategory,
} from './types'
import type { Post, Category, Tag } from './types'

const PAYLOAD_API_URL = process.env.PAYLOAD_API_URL || 'http://localhost:3000/api'
const TENANT_SLUG = process.env.TENANT_SLUG || 'mi-tienda'

const API_BASE_URL = PAYLOAD_API_URL.replace(/\/api\/?$/, '')

function toAbsoluteMedia(media: MediaImage | undefined): MediaImage | undefined {
  if (!media) return undefined
  const toAbs = (url?: string): string | undefined =>
    url && !url.startsWith('http://') && !url.startsWith('https://')
      ? `${API_BASE_URL}${url}`
      : url

  const sizes = media.sizes
    ? {
        thumbnail: media.sizes.thumbnail
          ? {
              ...media.sizes.thumbnail,
              url: toAbs(media.sizes.thumbnail.url) ?? media.sizes.thumbnail.url,
            }
          : media.sizes.thumbnail,
        card: media.sizes.card
          ? {
              ...media.sizes.card,
              url: toAbs(media.sizes.card.url) ?? media.sizes.card.url,
            }
          : media.sizes.card,
        hero: media.sizes.hero
          ? {
              ...media.sizes.hero,
              url: toAbs(media.sizes.hero.url) ?? media.sizes.hero.url,
            }
          : media.sizes.hero,
      }
    : media.sizes

  return {
    ...media,
    url: toAbs(media.url) ?? media.url,
    sizes,
  }
}

function normalizeBlock(block: Block): Block {
  switch (block.blockType) {
    case 'hero': {
      const heroBlock = block as HeroBlock
      return {
        ...heroBlock,
        backgroundImage: toAbsoluteMedia(heroBlock.backgroundImage),
        images: heroBlock.images?.map((item) => ({
          ...item,
          image: toAbsoluteMedia(item.image),
        })),
      }
    }
    case 'image': {
      const imageBlock = block as ImageBlock
      return { ...imageBlock, image: toAbsoluteMedia(imageBlock.image) }
    }
    case 'product': {
      const productBlock = block as ProductBlock
      return {
        ...productBlock,
        images: productBlock.images?.map(toAbsoluteMedia),
      }
    }
    case 'menu': {
      const menuBlock = block as MenuBlock
      return {
        ...menuBlock,
        items: menuBlock.items?.map((item) => ({
          ...item,
          image: toAbsoluteMedia(item.image),
        })),
      }
    }
    default:
      return block
  }
}

export function normalizePage(page: Page): Page {
  return {
    ...page,
    hero: page.hero?.map(normalizeBlock),
    layout: page.layout.map(normalizeBlock),
  }
}

export async function getPages(): Promise<Page[]> {
  try {
    const res = await fetch(
      `${PAYLOAD_API_URL}/pages?where[tenant.slug][equals]=${TENANT_SLUG}&where[_status][equals]=published&depth=1`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        next: { revalidate: 60 },
      },
    )

    if (!res.ok) {
      console.warn(`[payload] getPages: HTTP ${res.status} — returning []`)
      return []
    }

    const data = await res.json()
    return data.docs || []
  } catch (err) {
    console.warn(`[payload] getPages: network error (${(err as Error).message}) — returning []`)
    return []
  }
}

export async function getPageBySlug(slug: string): Promise<Page | null> {
  try {
    const res = await fetch(
      `${PAYLOAD_API_URL}/pages?where[tenant.slug][equals]=${TENANT_SLUG}&where[slug][equals]=${slug}&where[_status][equals]=published&depth=1`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        next: { revalidate: 60 },
      },
    )

    if (!res.ok) {
      console.warn(
        `[payload] getPageBySlug: HTTP ${res.status} for slug="${slug}" — returning null`,
      )
      return null
    }

    const data = await res.json()
    return data.docs?.[0] || null
  } catch (err) {
    console.warn(
      `[payload] getPageBySlug: network error for slug="${slug}" (${(err as Error).message}) — returning null`,
    )
    return null
  }
}

/**
 * Fetches a page including draft versions, for the live preview route only.
 *
 * Uses the custom `/api/pages/preview-page` endpoint on Payload (see
 * agencia-backend/src/collections/Pages.ts `endpoints`) because the standard
 * REST API cannot return drafts to an unauthenticated cross-origin request:
 * the Pages read access is restricted to published for non-authenticated
 * users, and a plain `?draft=true` would 404.
 *
 * The endpoint validates `?secret=` against PREVIEW_SECRET on Payload's
 * side, so this client-side function does not need to know the secret —
 * but the preview page receives it as a query param from the admin iframe
 * and forwards it on.
 *
 * `cache: 'no-store'` bypasses Next.js's data cache and ISR, so changes in
 * the admin show up immediately in the iframe.
 */
export async function getPageBySlugDraft(slug: string, secret: string): Promise<Page | null> {
  const url = new URL(`${PAYLOAD_API_URL}/pages/preview-page`)
  url.searchParams.set('slug', slug)
  url.searchParams.set('tenantSlug', TENANT_SLUG)
  url.searchParams.set('secret', secret)

  const res = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    return null
  }

  return res.json()
}

export async function getHeader(): Promise<Header | null> {
  try {
    const res = await fetch(
      `${PAYLOAD_API_URL}/header?where[tenant.slug][equals]=${TENANT_SLUG}&limit=1&depth=1`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        next: { revalidate: 60 },
      },
    )

    if (!res.ok) {
      console.warn(`[payload] getHeader: HTTP ${res.status} — returning null`)
      return null
    }

    const data = await res.json()
    return data.docs?.[0] || null
  } catch (err) {
    console.warn(`[payload] getHeader: network error (${(err as Error).message}) — returning null`)
    return null
  }
}

export async function getFooter(): Promise<Footer | null> {
  try {
    const res = await fetch(
      `${PAYLOAD_API_URL}/footer?where[tenant.slug][equals]=${TENANT_SLUG}&limit=1&depth=1`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        next: { revalidate: 60 },
      },
    )

    if (!res.ok) {
      console.warn(`[payload] getFooter: HTTP ${res.status} — returning null`)
      return null
    }

    const data = await res.json()
    return data.docs?.[0] || null
  } catch (err) {
    console.warn(`[payload] getFooter: network error (${(err as Error).message}) — returning null`)
    return null
  }
}

export function renderBlock(block: Block) {
  switch (block.blockType) {
    case 'hero':
      return { component: 'HeroBlock', props: block }
    case 'text':
      return { component: 'TextBlock', props: block }
    case 'image':
      return { component: 'ImageBlock', props: block }
    case 'contact':
      return { component: 'ContactBlock', props: block }
    case 'menu':
      return { component: 'MenuBlock', props: block }
    case 'product':
      return { component: 'ProductBlock', props: block }
    case 'cart':
      return { component: 'CartBlock', props: block }
    case 'course':
      return { component: 'CourseBlock', props: block }
    default:
      return null
  }
}

/**
 * Resolves a media URL returned by Payload to an absolute URL the browser can fetch.
 * Mirrors the helper in the Astro starter (astro-starter/src/lib/payload.ts).
 */
export function getMediaUrl(url: string): string {
  if (!url) return url
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const baseUrl = PAYLOAD_API_URL.replace(/\/$/, '')
  if (baseUrl.endsWith('/api') && url.startsWith('/api/')) {
    return `${baseUrl}${url.replace(/^\/api/, '')}`
  }
  return `${baseUrl}${url}`
}

// ── Blog query helpers ────────────────────────────────────────────────────────

const blogQ = <T>(path: string, qs = ''): Promise<T | null> =>
  fetch(`${PAYLOAD_API_URL}${path}?where[tenant.slug][equals]=${TENANT_SLUG}${qs}`, {
    headers: { 'Content-Type': 'application/json' },
    next: { revalidate: 60 },
  })
    .then((r) => (r.ok ? r.json() : null))
    .catch((e: Error) => {
      console.warn(`[payload] ${path} — ${e.message}`)
      return null
    })

export const getLatestPosts = (limit = 10): Promise<Post[]> =>
  blogQ<{ docs: Post[] }>(
    '/posts',
    `&where[_status][equals]=published&sort=-publishedAt&limit=${limit}&depth=2`,
  ).then((d) => d?.docs ?? [])

export const getPostBySlug = (slug: string): Promise<Post | null> =>
  blogQ<{ docs: Post[] }>(
    '/posts',
    `&where[slug][equals]=${slug}&where[_status][equals]=published&limit=1&depth=2`,
  ).then((d) => d?.docs?.[0] ?? null)

export const getCategories = (): Promise<Category[]> =>
  blogQ<{ docs: Category[] }>('/categories', '&sort=title&depth=0').then((d) => d?.docs ?? [])

export const getCategoryBySlug = (slug: string): Promise<Category | null> =>
  blogQ<{ docs: Category[] }>('/categories', `&where[slug][equals]=${slug}&limit=1&depth=0`).then(
    (d) => d?.docs?.[0] ?? null,
  )

export const getTags = (): Promise<Tag[]> =>
  blogQ<{ docs: Tag[] }>('/tags', '&sort=title&depth=0').then((d) => d?.docs ?? [])

export const getTagBySlug = (slug: string): Promise<Tag | null> =>
  blogQ<{ docs: Tag[] }>('/tags', `&where[slug][equals]=${slug}&limit=1&depth=0`).then(
    (d) => d?.docs?.[0] ?? null,
  )

export const getPostsByCategory = (
  categorySlug: string,
  page = 1,
  limit = 10,
): Promise<{ docs: Post[]; totalPages: number; page: number }> =>
  blogQ<{ docs: Post[]; totalPages: number; page: number }>(
    '/posts',
    `&where[_status][equals]=published&where[categories.slug][equals]=${categorySlug}&sort=-publishedAt&limit=${limit}&page=${page}&depth=2`,
  ).then((d) => d ?? { docs: [], totalPages: 0, page })

export const getPostsByTag = (
  tagSlug: string,
  page = 1,
  limit = 10,
): Promise<{ docs: Post[]; totalPages: number; page: number }> =>
  blogQ<{ docs: Post[]; totalPages: number; page: number }>(
    '/posts',
    `&where[_status][equals]=published&where[tags.slug][equals]=${tagSlug}&sort=-publishedAt&limit=${limit}&page=${page}&depth=2`,
  ).then((d) => d ?? { docs: [], totalPages: 0, page })

/**
 * Fetches a post including draft versions, for the live preview route only.
 * Uses the /api/posts/preview-post endpoint. cache: 'no-store'.
 */
export async function getPostBySlugDraft(slug: string, secret: string): Promise<Post | null> {
  const url = new URL(`${PAYLOAD_API_URL}/posts/preview-post`)
  url.searchParams.set('slug', slug)
  url.searchParams.set('tenantSlug', TENANT_SLUG)
  url.searchParams.set('secret', secret)
  const res = await fetch(url.toString(), {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  })
  return res.ok ? res.json() : null
}

// ── Catalog query helpers ────────────────────────────────────────────────────

function normalizeProductCategory(c: ProductCategory | string): ProductCategory | string {
  if (typeof c === 'string') return c
  return { ...c, image: toAbsoluteMedia(c.image) }
}

function normalizeProduct(p: Product): Product {
  return {
    ...p,
    images: p.images?.map((item) => ({
      ...item,
      image: toAbsoluteMedia(item.image) ?? item.image,
    })),
  }
}

const catalogQ = <T>(path: string, qs = ''): Promise<T | null> =>
  fetch(`${PAYLOAD_API_URL}${path}?where[tenant.slug][equals]=${TENANT_SLUG}${qs}`, {
    headers: { 'Content-Type': 'application/json' },
    next: { revalidate: 60 },
  })
    .then((r) => (r.ok ? r.json() : null))
    .catch((e: Error) => {
      console.warn(`[payload] ${path} — ${e.message}`)
      return null
    })

export const getProducts = async (
  page = 1,
  limit = 12,
  categorySlug?: string,
): Promise<{ docs: Product[]; totalPages: number; page: number }> => {
  const cat = categorySlug
    ? `&where[category.slug][equals]=${encodeURIComponent(categorySlug)}`
    : ''
  const data = await catalogQ<{ docs: Product[]; totalPages: number; page: number }>(
    '/products',
    `&where[status][equals]=published&sort=-updatedAt&limit=${limit}&page=${page}&depth=2${cat}`,
  )
  const result = data ?? { docs: [], totalPages: 0, page }
  return {
    ...result,
    docs: result.docs.map(normalizeProduct),
  }
}

export const getProductBySlug = async (slug: string): Promise<Product | null> => {
  const data = await catalogQ<{ docs: Product[] }>(
    '/products',
    `&where[slug][equals]=${encodeURIComponent(slug)}&where[status][equals]=published&limit=1&depth=2`,
  )
  const doc = data?.docs?.[0]
  return doc ? normalizeProduct(doc) : null
}

export const getProductCategories = async (): Promise<ProductCategory[]> => {
  const data = await catalogQ<{ docs: ProductCategory[] }>(
    '/product-categories',
    '&sort=name&depth=1',
  )
  return (data?.docs ?? []).map((c) => normalizeProductCategory(c) as ProductCategory)
}

export const getProductCategoryBySlug = async (
  slug: string,
): Promise<ProductCategory | null> => {
  const data = await catalogQ<{ docs: ProductCategory[] }>(
    '/product-categories',
    `&where[slug][equals]=${encodeURIComponent(slug)}&limit=1&depth=1`,
  )
  const doc = data?.docs?.[0]
  return doc ? (normalizeProductCategory(doc) as ProductCategory) : null
}
