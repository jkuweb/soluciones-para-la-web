import type { Block, Header, Footer, Page } from './types'

const PAYLOAD_API_URL = import.meta.env.PAYLOAD_API_URL || 'http://localhost:3000/api'
const TENANT_SLUG = import.meta.env.TENANT_SLUG || 'mi-cliente'

export async function getPages(): Promise<Page[]> {
  const res = await fetch(
    `${PAYLOAD_API_URL}/pages?where[tenant.slug][equals]=${TENANT_SLUG}&where[status][equals]=published&depth=1`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
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
    case 'footer':
      return { component: 'FooterBlock', props: block }
    default:
      return null
  }
}

// Helper para construir URLs absolutas de imágenes
export function getMediaUrl(url: string): string {
  if (url.startsWith('http')) return url
  const baseUrl = PAYLOAD_API_URL.replace(/\/$/, '')
  // Si baseUrl termina en /api y la url empieza en /api, evitar duplicar
  if (baseUrl.endsWith('/api') && url.startsWith('/api/')) {
    return `${baseUrl}${url.replace(/^\/api/, '')}`
  }
  return `${baseUrl}${url}`
}
