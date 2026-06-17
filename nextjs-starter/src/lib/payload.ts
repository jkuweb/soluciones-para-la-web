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
      return { ...heroBlock, backgroundImage: toAbsoluteMedia(heroBlock.backgroundImage) }
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
    case 'footer':
      return { component: 'FooterBlock', props: block }
    default:
      return null
  }
}
