import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'

export async function getRedirects(depth = 1) {
  const payload = await getPayload({ config: configPromise })

  try {
    const { docs: redirects } = await payload.find({
      collection: 'redirects' as any,
      depth,
      limit: 0,
      pagination: false,
    })

    return redirects
  } catch {
    return []
  }
}

/**
 * Returns a unstable_cache function mapped with the cache tag for 'redirects'.
 *
 * Cache all redirects together to avoid multiple fetches.
 */
export const getCachedRedirects = () =>
  unstable_cache(async () => getRedirects(), ['redirects'], {
    tags: ['redirects'],
  })
