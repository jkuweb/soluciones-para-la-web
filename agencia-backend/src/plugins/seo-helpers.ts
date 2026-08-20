/**
 * SEO auto-generation helpers used by @payloadcms/plugin-seo.
 *
 * Extracted into a separate module so the unit tests can import them
 * directly without booting the full Payload harness.
 */

import type { GenerateImage } from '@payloadcms/plugin-seo/types'

export function generateSeoTitle({ doc }: { doc: Record<string, unknown> }): string {
  const title = (doc?.title as string) || ''
  const tenant =
    typeof doc?.tenant === 'object' && doc.tenant !== null
      ? (doc.tenant as { name?: string })
      : undefined
  const siteName = tenant?.name
  return siteName ? `${title} | ${siteName}` : title
}

export function generateSeoDescription({ doc }: { doc: Record<string, unknown> }): string {
  if (doc && 'excerpt' in doc && typeof doc.excerpt === 'string') {
    return doc.excerpt
  }
  return ''
}

export const generateSeoImage = ({
  doc,
}: {
  doc: Record<string, unknown>
}): ReturnType<GenerateImage> => {
  if (doc && 'heroImage' in doc && doc.heroImage) {
    return doc.heroImage as { id: number | string }
  }
  // Empty string signals "no image" — the plugin's GenerateImage return
  // union ({ id } | number | string | Promise<...>) does not include
  // null or undefined, so falsy values are coerced to '' at runtime.
  return ''
}
