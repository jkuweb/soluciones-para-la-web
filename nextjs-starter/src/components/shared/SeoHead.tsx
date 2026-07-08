/**
 * SEO metadata helpers for Next.js.
 *
 * Use `buildMetadata()` inside `generateMetadata()` on page files to keep
 * metadata consistent across the site. The SeoHead component is available
 * for use cases that need inline meta tags (e.g. special pages where
 * generateMetadata is not suitable).
 */

export interface SeoProps {
  /** Page title used for <title>, og:title, and twitter:title */
  title: string
  /** Meta description used for description, og:description, and twitter:description */
  description?: string
  /** Image URL used for og:image and twitter:image */
  imageUrl?: string
}

export function buildMetadata({ title, description, imageUrl }: SeoProps) {
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(imageUrl ? { images: [{ url: imageUrl }] } : {}),
    },
    twitter: {
      card: 'summary_large_image' as const,
      title,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
    robots: 'index, follow',
  }
}

/**
 * Inline SEO meta tags for pages that cannot use generateMetadata.
 * Renders a fragment with <meta> tags that Next.js hoists into <head>.
 */
export default function SeoHead({ title, description, imageUrl }: SeoProps) {
  return (
    <>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      {description && <meta property="og:description" content={description} />}
      {imageUrl && <meta property="og:image" content={imageUrl} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="robots" content="index, follow" />
    </>
  )
}
