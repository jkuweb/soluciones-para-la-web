import type { Page, Block } from './types'

const PAYLOAD_API_URL = process.env.PAYLOAD_API_URL || 'http://localhost:3000/api'
const TENANT_SLUG = process.env.TENANT_SLUG || 'mi-tienda'

export async function getPages(): Promise<Page[]> {
  const res = await fetch(
    `${PAYLOAD_API_URL}/pages?where[tenant.slug][equals]=${TENANT_SLUG}&where[status][equals]=published&depth=1`,
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
    `${PAYLOAD_API_URL}/pages?where[tenant.slug][equals]=${TENANT_SLUG}&where[slug][equals]=${slug}&where[status][equals]=published&depth=1`,
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
