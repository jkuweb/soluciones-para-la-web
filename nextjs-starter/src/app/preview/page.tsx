import { notFound } from 'next/navigation'
import BlockRenderer from '@/components/BlockRenderer'
import { getPageBySlugDraft, normalizePage } from '@/lib/payload'
import { LivePreviewListener } from './LivePreviewListener'

// Force SSR — the admin live preview iframe must see the latest draft on
// every navigation. Without this, Next.js may try to statically pre-render
// or cache the page, defeating the whole point of live preview.
export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ path?: string; secret?: string }>

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const path = params.path || '/'
  const secret = params.secret || ''
  const expected = process.env.PREVIEW_SECRET || ''

  if (!expected || secret !== expected) {
    notFound()
  }

  const slug = path.replace(/^\//, '') || 'home'
  const rawPage = await getPageBySlugDraft(slug, secret)
  if (!rawPage) notFound()

  // normalizePage rewrites media URLs to absolute, which is required because
  // the iframe origin (the client domain) is different from Payload's origin
  // and the API returns relative paths in the media collection.
  const page = normalizePage(rawPage)

  return (
    <>
      <LivePreviewListener />
      <BlockRenderer hero={page.hero} layout={page.layout} />
    </>
  )
}
