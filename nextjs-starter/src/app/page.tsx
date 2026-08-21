import { getPageBySlug, normalizePage } from '@/lib/payload'
import { getTenantFeatures } from '@/lib/tenant'
import BlockRenderer from '@/components/BlockRenderer'

export async function generateMetadata() {
  const page = await getPageBySlug('home')
  return {
    title: page?.meta?.title || page?.title,
    description: page?.meta?.description,
  }
}

export default async function HomePage() {
  const rawPage = await getPageBySlug('home')
  const page = rawPage ? normalizePage(rawPage) : null

  if (!page) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <h1 style={{ fontSize: '6rem', marginBottom: '1rem' }}>404</h1>
        <p>No se encontró la página de inicio.</p>
      </div>
    )
  }

  return <BlockRenderer hero={page.hero} layout={page.layout} features={getTenantFeatures()} />
}
