# Next.js Starter — Live Preview Route Fix

## Problem

The `nextjs-starter` template has a preview route (`/preview`) for Payload CMS live preview, but it does not work. The `LivePreviewListener` has two bugs that were fixed in `astro-starter` and in the `tienda-pepe` client:

1. **Missing `ready({ serverURL })` handshake** — the Payload admin does not send `postMessage` events to the iframe until the iframe announces it is ready. Without this, the admin never emits events and the preview stays frozen on the first render.
2. **Wrong event type** — listens for `payload-live-preview` (as-you-type keystroke events with unsaved form state) instead of `payload-document-event` (autosave / save / publish). The `payload-live-preview` events carry unsaved data that a server reload cannot pick up — the server only has the last saved draft.
3. **Missing origin validation** — `isDocumentEvent` validates `event.origin === serverURL`, the current check only looks at `event.data.type` which is insufficient.

The fix was already applied directly to the `tienda-pepe` client in a previous session, but never backported to the template.

## Scope

| File | Change |
|------|--------|
| `nextjs-starter/package.json` | Add `@payloadcms/live-preview` dependency |
| `nextjs-starter/src/app/preview/LivePreviewListener.tsx` | Rewrite to use `ready()` + `isDocumentEvent()` from `@payloadcms/live-preview` + `router.refresh()` |
| `nextjs-starter/src/app/preview/page.tsx` | Compute `serverURL` from `PAYLOAD_API_URL` and pass it as a prop to `LivePreviewListener` |

No other files touched. No backend changes.

## Architecture

The Preview component tree remains the same — a server component fetches draft data and a client component handles the live preview message protocol. The only change is inside `LivePreviewListener`.

### Data Flow

```
Payload admin (origin A)
  │  opens https://admin/preview?path=/&secret=xxx
  ▼
nextjs-starter preview/page.tsx (server component)
  │  validates secret
  │  fetches draft via /api/pages/preview-page?slug=...&tenantSlug=...&secret=...
  │  computes serverURL = PAYLOAD_API_URL without /api suffix
  │  renders <LivePreviewListener serverURL={serverURL} /> + blocks
  ▼
LivePreviewListener (client component)
  │  calls ready({ serverURL }) → admin starts sending messages
  │  on message: isDocumentEvent(event, serverURL)? → router.refresh()
  │  debounce 100ms to coalesce rapid autosaves
  │  100ms after last autosave → Next.js re-renders the server component
  ▼
  React Server Components fetch fresh draft → page updates
```

## Key Decisions

- **`@payloadcms/live-preview` over manual implementation** — the official package handles the postMessage protocol correctly. The Astro starter already uses it and proved it works.
- **`router.refresh()` over `window.location.reload()`** — refresh triggers a **server component re-render** without a full page navigation, preserving client-side state. `reload()` would cause a flash and lose any ephemeral UI state.
- **`serverURL` passed as a prop** — the server component reads `process.env.PAYLOAD_API_URL` directly and passes the extracted origin to the client component. No data attributes needed (unlike Astro where env vars aren't available client-side).

## Files Changed (delta from `tienda-pepe`)

The template gets the exact same implementation already proven in `tienda-pepe`:

- `LivePreviewListener.tsx` — identical to `tienda-pepe`'s version
- `preview/page.tsx` — identical to `tienda-pepe`'s version (already has `serverURL` computation, just needs to pass it)
- `package.json` — add `"@payloadcms/live-preview": "^3"` (semver match)

## Testing

The preview route is verified by:
1. `pnpm build` in `nextjs-starter` — must typecheck and build clean
2. Manual test against an existing Next.js client: load admin, open live preview, edit a field, confirm the iframe updates after autosave
