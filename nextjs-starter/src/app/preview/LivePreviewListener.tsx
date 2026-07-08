'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ready, isDocumentEvent } from '@payloadcms/live-preview'

/**
 * Live preview listener (Next.js version).
 *
 * Two things were missing in the previous implementation that prevented
 * the preview from updating after the initial load:
 *
 *   1. The `ready` handshake. The Payload admin does NOT emit postMessage
 *      events to the iframe until the iframe announces it is ready. Without
 *      this call, the admin never sends anything and the preview is frozen
 *      on the first render.
 *
 *   2. The correct event type. For a server-side preview that refreshes the
 *      route, we must listen for `payload-document-event` (save / autosave /
 *      publish), not `payload-live-preview` (as-you-type form state). The
 *      latter fires on every keystroke with unsaved data that a server
 *      refresh cannot pick up — the server only has the last *saved* draft.
 *      isDocumentEvent also validates event.origin === serverURL, which
 *      the previous type-only check skipped.
 *
 * serverURL is passed from the server component (page.tsx) which can read
 * process.env.PAYLOAD_API_URL directly.
 */
export function LivePreviewListener({ serverURL }: { serverURL: string }) {
  const router = useRouter()

  useEffect(() => {
    // Announce to the Payload admin that the iframe is ready to receive events.
    ready({ serverURL })

    let timer: ReturnType<typeof setTimeout> | undefined
    const onMessage = (event: MessageEvent) => {
      if (!isDocumentEvent(event, serverURL)) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        router.refresh()
      }, 100)
    }
    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('message', onMessage)
      if (timer) clearTimeout(timer)
    }
  }, [serverURL, router])
  return null
}
