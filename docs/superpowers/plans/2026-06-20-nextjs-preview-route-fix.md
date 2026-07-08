# Next.js Starter — Live Preview Route Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Backport the working live preview fix from `tienda-pepe` to `nextjs-starter` so new Next.js clients get live preview out of the box.

**Approach:** Copy the known-good implementation from `tienda-pepe` — add `@payloadcms/live-preview`, rewrite `LivePreviewListener` to use `ready()` + `isDocumentEvent()` + `router.refresh()`, pass `serverURL` from the server component.

**Tech Stack:** Next.js 16, React 19, `@payloadcms/live-preview`

---

### Task 1: Add `@payloadcms/live-preview` dependency

**Files:**
- Modify: `nextjs-starter/package.json`

- [ ] **Add the dependency**

Run in `nextjs-starter/`:

```bash
pnpm add @payloadcms/live-preview
```

Expected: package is added to `dependencies` in `package.json` and `pnpm-lock.yaml` is updated.

---

### Task 2: Update `preview/page.tsx` to pass `serverURL`

**Files:**
- Modify: `nextjs-starter/src/app/preview/page.tsx`

- [ ] **Read current file** to confirm it matches what we expect (it should already compute `serverURL`).

- [ ] **Remove the unused comment about the old implementation** and ensure `serverURL` is computed and passed as a prop.

The server component already has this block (lines 36-39):

```typescript
// Origin of the Payload admin (without /api). The admin posts messages from
// this origin, and isDocumentEvent checks event.origin === serverURL.
const payloadApiUrl = process.env.PAYLOAD_API_URL || 'http://localhost:3000/api'
const serverURL = payloadApiUrl.replace(/\/api\/?$/, '')
```

We need to ensure `LivePreviewListener` receives `serverURL`:

```tsx
<LivePreviewListener serverURL={serverURL} />
```

Current state: this is already in the file (line 43 shows `<LivePreviewListener serverURL={serverURL} />`). Let's verify the full file matches the `tienda-pepe` version.

- [ ] **Verify the file matches** — the current `page.tsx` already has `serverURL` computed and passed. No changes needed if it already matches.

---

### Task 3: Rewrite `LivePreviewListener.tsx`

**Files:**
- Modify: `nextjs-starter/src/app/preview/LivePreviewListener.tsx`

- [ ] **Write the fixed LivePreviewListener**

Replace the entire file with:

```tsx
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
```

Key changes from the old version:
- Added `ready({ serverURL })` handshake
- Changed `event.data.type === 'payload-live-preview'` to `isDocumentEvent(event, serverURL)`
- Changed `window.location.reload()` to `router.refresh()`
- Added proper cleanup with timer cleared on unmount

- [ ] **Verify the file compiles**

```bash
pnpm typecheck
```

Expected: No TypeScript errors. `@payloadcms/live-preview` exports `ready` and `isDocumentEvent`.

---

### Task 4: Build

- [ ] **Build nextjs-starter**

```bash
pnpm build
```

Expected: Build succeeds with no errors. The preview route compiles and bundles correctly.

---

### Task 5: Verify with `tienda-pepe` (optional)

The `tienda-pepe` client already has the working fix and should build clean.

```bash
cd /home/joseba/Clientes/clientes/tienda-pepe
pnpm build
```

Expected: Build succeeds. This confirms the pattern is stable across projects.
