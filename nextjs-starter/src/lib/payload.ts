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
} from './types'

const PAYLOAD_API_URL = process.env.PAYLOAD_API_URL || 'http://localhost:3000/api'
const TENANT_SLUG = process.env.TENANT_SLUG || 'mi-tienda'

const API_BASE_URL = PAYLOAD_API_URL.replace(/\/api\/?$/, '')

function toAbsoluteMedia(media: MediaImage | undefined): MediaImage | undefined {
  if (!media) return undefined
  if (!media.url || media.url.startsWith('http://') || media.url.startsWith('https://')) {
    return media
  }
  return { ...media, url: `${API_BASE_URL}${media.url}` }
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
  const res = await fetch(
    `${PAYLOAD_API_URL}/pages?where[tenant.slug][equals]=${TENANT_SLUG}&where[_status][equals]=published&depth=1`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 },
    }
  )

  if (!res.ok) {
    throw new Error(`Failed to fetch pages: ${res.status}`)
  }

  const data = await res.json()
  return data.docs || []
}

export async function getPageBySlug(slug: string): Promise<Page | null> {
  const res = await fetch(
    `${PAYLOAD_API_URL}/pages?where[tenant.slug][equals]=${TENANT_SLUG}&where[slug][equals]=${slug}&where[_status][equals]=published&depth=1`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 },
    }
  )

  if (!res.ok) {
    throw new Error(`Failed to fetch page: ${res.status}`)
  }

  const data = await res.json()
  return data.docs?.[0] || null
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
  const res = await fetch(`${PAYLOAD_API_URL}/globals/header`, {
    headers: {
      'Content-Type': 'application/json',
    },
    next: { revalidate: 60 },
  })

  if (!res.ok) {
    return null
  }

  return res.json()
}

export async function getFooter(): Promise<Footer | null> {
  const res = await fetch(`${PAYLOAD_API_URL}/globals/footer`, {
    headers: {
      'Content-Type': 'application/json',
    },
    next: { revalidate: 60 },
  })

  if (!res.ok) {
    return null
  }

  return res.json()
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
