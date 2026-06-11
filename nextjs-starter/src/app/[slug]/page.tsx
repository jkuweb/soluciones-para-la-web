import { getPages, getPageBySlug } from '@/lib/payload'
import BlockRenderer from '@/components/BlockRenderer'

export async function generateStaticParams() {
  const pages = await getPages()
  return pages.map((page) => ({
    slug: page.slug,
  }))
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const page = await getPageBySlug(params.slug)
  const title = page?.meta?.title || page?.title
  const description = page?.meta?.description
  const image = page?.meta?.image?.url

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
  }
}

export default async function Page({ params }: { params: { slug: string } }) {
  const page = await getPageBySlug(params.slug)

  if (!page) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <h1 style={{ fontSize: '6rem', marginBottom: '1rem' }}>404</h1>
        <p>La página que buscas no existe.</p>
      </div>
    )
  }

  return <BlockRenderer layout={page.layout} />
}
