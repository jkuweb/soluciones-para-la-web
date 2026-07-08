import type { Block, Header, Footer, Page } from './types'

const PAYLOAD_API_URL = import.meta.env.PAYLOAD_API_URL || 'http://localhost:3000/api'
const TENANT_SLUG = import.meta.env.TENANT_SLUG || 'mi-cliente'

export async function getPages(): Promise<Page[]> {
  try {
    const res = await fetch(
      `${PAYLOAD_API_URL}/pages?where[tenant.slug][equals]=${TENANT_SLUG}&where[_status][equals]=published&depth=1`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
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
      }
    )

    if (!res.ok) {
      console.warn(`[payload] getPageBySlug: HTTP ${res.status} for slug="${slug}" — returning null`)
      return null
    }

    const data = await res.json()
    return data.docs?.[0] || null
  } catch (err) {
    console.warn(`[payload] getPageBySlug: network error for slug="${slug}" (${(err as Error).message}) — returning null`)
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
 * side, so this client-side function does not need to know the secret.
 *
 * `cache: 'no-store'` bypasses any build-time / CDN cache, so changes in
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
