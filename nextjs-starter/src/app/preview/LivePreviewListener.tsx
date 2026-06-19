'use client'

import { useEffect } from 'react'

/**
 * Live preview listener (Next.js version).
 *
 * The Payload admin sends a `postMessage` to this iframe on every edit with
 * shape `{ type: 'payload-live-preview', data: { ... } }`. We reload the
 * route so the server component re-fetches the latest draft from Payload
 * and re-renders with the new data.
 *
 * The 100ms debounce coalesces rapid keystroke events (typing in a text
 * field) into a single reload. Without it, every character would trigger
 * a full re-render and the iframe would feel laggy.
 *
 * Filter rationale: we only check `event.data.type === 'payload-live-preview'`,
 * not the event origin, because:
 *   1. The reload is benign — the worst a malicious parent can do is force
 *      a fresh GET, which the secret guard already blocks from leaking
 *      draft data.
 *   2. Cross-origin iframes can't reliably read `event.origin` of the admin
 *      in all browsers, and `ancestorOrigins` is non-standard.
 */
export function LivePreviewListener() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string } | null
      if (data?.type !== 'payload-live-preview') return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        window.location.reload()
      }, 100)
    }
    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('message', onMessage)
      if (timer) clearTimeout(timer)
    }
  }, [])
  return null
}
