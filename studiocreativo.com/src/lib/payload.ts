import type { Block, Header, Footer, Page } from './types'

const PAYLOAD_API_URL = import.meta.env.PAYLOAD_API_URL || 'http://localhost:3000/api'
const TENANT_SLUG = import.meta.env.TENANT_SLUG || 'mi-cliente'

export async function getPages(): Promise<Page[]> {
  try {
    const res = await fetch(
      `${PAYLOAD_API_URL}/pages?where[tenant.slug][equals]=${TENANT_SLUG}&where[status][equals]=published&depth=1`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!res.ok) {
      console.warn(`[Payload] API returned ${res.status}, using demo data`)
      return getDemoPages()
    }

    const data = await res.json()
    if (!data.docs || data.docs.length === 0) {
      return getDemoPages()
    }
    return data.docs || []
  } catch (err) {
    console.warn('[Payload] API not available, using demo data')
    return getDemoPages()
  }
}

export async function getPageBySlug(slug: string): Promise<Page | null> {
  try {
    const res = await fetch(
      `${PAYLOAD_API_URL}/pages?where[tenant.slug][equals]=${TENANT_SLUG}&where[slug][equals]=${slug}&where[status][equals]=published&depth=1`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!res.ok) {
      console.warn(`[Payload] API returned ${res.status}, using demo data`)
      return getDemoPageBySlug(slug)
    }

    const data = await res.json()
    if (!data.docs || data.docs.length === 0) {
      return getDemoPageBySlug(slug)
    }
    return data.docs?.[0] || null
  } catch (err) {
    console.warn('[Payload] API not available, using demo data')
    return getDemoPageBySlug(slug)
  }
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

// ── Demo data for testing without backend ──

const DEMO_PAGES: Page[] = [
  {
    id: 'demo-home',
    slug: 'home',
    title: 'Studio Creativo',
    status: 'published',
    layout: [
      {
        id: 'hero-1',
        blockType: 'hero',
        title: 'Bienvenido a Studio Creativo',
        subtitle: 'Diseño web profesional para tu negocio',
      } as Block,
      {
        id: 'text-1',
        blockType: 'text',
        heading: 'Nuestros Servicios',
        content: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Ofrecemos diseño web, branding y marketing digital para hacer crecer tu negocio.' }] }] } as any,
      } as Block,
      {
        id: 'footer-1',
        blockType: 'footer',
        copyright: '© 2026 Studio Creativo',
      } as Block,
    ],
    meta: {
      title: 'Studio Creativo - Diseño Web Profesional',
      description: 'Diseño web profesional y branding para tu negocio',
    },
  },
  {
    id: 'demo-contacto',
    slug: 'contacto',
    title: 'Contacto',
    status: 'published',
    layout: [
      {
        id: 'contact-1',
        blockType: 'contact',
        email: 'info@studiocreativo.com',
        phone: '+34 123 456 789',
        address: 'Calle Falsa 123, Madrid',
      } as Block,
      {
        id: 'footer-2',
        blockType: 'footer',
        copyright: '© 2026 Studio Creativo',
      } as Block,
    ],
    meta: {
      title: 'Contacto - Studio Creativo',
      description: 'Contacta con Studio Creativo',
    },
  },
]

function getDemoPages(): Page[] {
  return DEMO_PAGES
}

function getDemoPageBySlug(slug: string): Page | null {
  return DEMO_PAGES.find((p) => p.slug === slug) || null
}
